-- ============================================
-- CRM SCHEMA MIGRATION
-- ============================================
-- This migration creates the crm schema with:
-- 1. entity table - stores corporate clients, individual clients, and contacts
-- 2. entity_junction table - manages many-to-many relationships
-- 3. Enums, triggers, functions, views, and RLS policies
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create crm schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS crm;

-- ============================================
-- ENUM TYPES
-- ============================================

-- Create entity_type enum for type safety
CREATE TYPE crm.entity_type_enum AS ENUM (
    'corporate_client',
    'individual_client',
    'contact'
);

-- Create relationship_type enum
CREATE TYPE crm.relationship_type_enum AS ENUM (
    'emergency_contact',
    'family_member',
    'caregiver',
    'referral_source',
    'insurance_provider',
    'primary_care_physician',
    'power_of_attorney',
    'billing_contact',
    'case_manager',
    'other'
);

-- ============================================
-- ENTITY TABLE
-- ============================================
-- Stores all types of entities: corporate clients, individual clients, and contacts
CREATE TABLE crm.entity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type crm.entity_type_enum NOT NULL,

    -- Name fields
    legal_name TEXT,                -- For corporate clients
    first_name TEXT,                -- For individual clients and contacts
    last_name TEXT,                 -- For individual clients and contacts
    display_name TEXT,              -- Auto-populated by trigger
    name TEXT,                      -- Primary display field (Salesforce pattern)

    -- Personal information
    date_of_birth DATE,             -- For individual clients
    gender TEXT,                    -- 'male', 'female', 'other', 'prefer_not_to_say'
    marital_status TEXT,            -- 'single', 'married', 'divorced', 'widowed'
    preferred_language TEXT DEFAULT 'en',

    -- Identification
    tax_id TEXT,                    -- Tax ID / EIN / SSN
    insurance_number TEXT,          -- Insurance policy/member number

    -- Contact information
    email TEXT,
    phone TEXT,
    phone_alternative TEXT,

    -- Address
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'US',

    -- Additional information
    notes TEXT,
    is_active BOOLEAN DEFAULT true,

    -- Audit timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT entity_legal_name_required_for_corporate
        CHECK (entity_type != 'corporate_client' OR legal_name IS NOT NULL),
    CONSTRAINT entity_first_name_required_for_individual
        CHECK (entity_type != 'individual_client' OR first_name IS NOT NULL),
    CONSTRAINT entity_last_name_required_for_individual
        CHECK (entity_type != 'individual_client' OR last_name IS NOT NULL),
    CONSTRAINT entity_first_name_required_for_contact
        CHECK (entity_type != 'contact' OR first_name IS NOT NULL),
    CONSTRAINT entity_last_name_required_for_contact
        CHECK (entity_type != 'contact' OR last_name IS NOT NULL),
    CONSTRAINT entity_no_corporate_with_dob
        CHECK (entity_type = 'individual_client' OR date_of_birth IS NULL)
);

-- Indexes for entity table
CREATE INDEX idx_entity_type ON crm.entity(entity_type);
CREATE INDEX idx_entity_active ON crm.entity(is_active);
CREATE INDEX idx_entity_name ON crm.entity(name);

-- ============================================
-- ENTITY_JUNCTION TABLE
-- ============================================
-- Manages many-to-many relationships between entities
CREATE TABLE crm.entity_junction (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_entity_id UUID NOT NULL REFERENCES crm.entity(id) ON DELETE CASCADE,
    target_entity_id UUID NOT NULL REFERENCES crm.entity(id) ON DELETE CASCADE,
    relationship_type crm.relationship_type_enum NOT NULL,

    -- Relationship metadata
    is_primary BOOLEAN DEFAULT false,
    effective_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    notes TEXT,

    -- Audit timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT entity_junction_no_self_relationship
        CHECK (source_entity_id != target_entity_id),
    CONSTRAINT entity_junction_valid_date_range
        CHECK (end_date IS NULL OR end_date >= effective_date),
    CONSTRAINT entity_junction_unique_relationship
        UNIQUE (source_entity_id, target_entity_id, relationship_type, effective_date)
);

-- Indexes for entity_junction table
CREATE INDEX idx_entity_junction_source ON crm.entity_junction(source_entity_id);
CREATE INDEX idx_entity_junction_target ON crm.entity_junction(target_entity_id);
CREATE INDEX idx_entity_junction_type ON crm.entity_junction(relationship_type);
CREATE INDEX idx_entity_junction_active ON crm.entity_junction(end_date) WHERE end_date IS NULL;
CREATE INDEX idx_entity_junction_name ON crm.entity_junction(name);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION crm.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-populate display_name and name fields
CREATE OR REPLACE FUNCTION crm.update_display_name()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.entity_type = 'corporate_client' THEN
        NEW.display_name = NEW.legal_name;
        NEW.name = NEW.legal_name;
    ELSE
        -- For individual_client and contact
        NEW.display_name = COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '');
        NEW.display_name = TRIM(NEW.display_name);
        NEW.name = NEW.display_name;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-populate name for entity_junction
CREATE OR REPLACE FUNCTION crm.update_entity_junction_name()
RETURNS TRIGGER AS $$
DECLARE
    source_display TEXT;
    target_display TEXT;
BEGIN
    -- Get display names for source and target entities
    SELECT display_name INTO source_display
    FROM crm.entity
    WHERE id = NEW.source_entity_id;

    SELECT display_name INTO target_display
    FROM crm.entity
    WHERE id = NEW.target_entity_id;

    -- Build name in format: "Source -> Target (relationship_type)"
    NEW.name = COALESCE(source_display, 'Unknown') || ' -> ' ||
               COALESCE(target_display, 'Unknown') || ' (' ||
               NEW.relationship_type::TEXT || ')';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to prevent duplicate reverse relationships
CREATE OR REPLACE FUNCTION crm.prevent_duplicate_reverse_relationship()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if reverse relationship already exists
    IF EXISTS (
        SELECT 1 FROM crm.entity_junction
        WHERE source_entity_id = NEW.target_entity_id
        AND target_entity_id = NEW.source_entity_id
        AND relationship_type = NEW.relationship_type
        AND (end_date IS NULL OR end_date >= CURRENT_DATE)
    ) THEN
        RAISE EXCEPTION 'A relationship already exists between these entities for relationship type %', NEW.relationship_type;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Apply updated_at trigger to entity table
CREATE TRIGGER entity_updated_at
    BEFORE UPDATE ON crm.entity
    FOR EACH ROW
    EXECUTE FUNCTION crm.update_updated_at_column();

-- Apply updated_at trigger to entity_junction table
CREATE TRIGGER entity_junction_updated_at
    BEFORE UPDATE ON crm.entity_junction
    FOR EACH ROW
    EXECUTE FUNCTION crm.update_updated_at_column();

-- Apply display_name trigger
CREATE TRIGGER entity_set_display_name
    BEFORE INSERT OR UPDATE ON crm.entity
    FOR EACH ROW
    EXECUTE FUNCTION crm.update_display_name();

-- Apply duplicate reverse relationship prevention trigger
CREATE TRIGGER entity_junction_prevent_duplicate_reverse
    BEFORE INSERT ON crm.entity_junction
    FOR EACH ROW
    EXECUTE FUNCTION crm.prevent_duplicate_reverse_relationship();

-- Apply entity_junction name trigger
CREATE TRIGGER entity_junction_set_name
    BEFORE INSERT OR UPDATE ON crm.entity_junction
    FOR EACH ROW
    EXECUTE FUNCTION crm.update_entity_junction_name();


-- ============================================
-- PERMISSIONS
-- ============================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA crm TO postgres, anon, authenticated, service_role;

-- Grant select on tables
GRANT ALL ON ALL TABLES IN SCHEMA crm TO postgres, anon, authenticated, service_role;


-- Grant usage on custom types
GRANT USAGE ON TYPE crm.entity_type_enum TO postgres, anon, authenticated, service_role;
GRANT USAGE ON TYPE crm.relationship_type_enum TO postgres, anon, authenticated, service_role;


-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE crm.entity ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.entity_junction ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "service_role_all_entity"
    ON crm.entity
    FOR ALL
    TO service_role, authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service_role_all_entity_junction"
    ON crm.entity_junction
    FOR ALL
    TO service_role, authenticated
    USING (true)
    WITH CHECK (true);


;
