-- ============================================
-- BUSINESS SCHEMA MIGRATION
-- ============================================
-- This migration creates the business schema with:
-- 1. entity table - stores corporate clients, individual clients, and contacts
-- 2. entity_junction table - manages many-to-many relationships
-- 3. Enums, triggers, functions, views, and RLS policies
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create business schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS business;

-- ============================================
-- ENUM TYPES
-- ============================================

-- Create entity_type enum for type safety
CREATE TYPE business.entity_type_enum AS ENUM (
    'corporate_client',
    'individual_client',
    'contact'
);

-- Create relationship_type enum
CREATE TYPE business.relationship_type_enum AS ENUM (
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
CREATE TABLE business.entity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type business.entity_type_enum NOT NULL,

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
CREATE INDEX idx_entity_type ON business.entity(entity_type);
CREATE INDEX idx_entity_active ON business.entity(is_active);
CREATE INDEX idx_entity_name ON business.entity(name);

-- ============================================
-- ENTITY_JUNCTION TABLE
-- ============================================
-- Manages many-to-many relationships between entities
CREATE TABLE business.entity_junction (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_entity_id UUID NOT NULL REFERENCES business.entity(id) ON DELETE CASCADE,
    target_entity_id UUID NOT NULL REFERENCES business.entity(id) ON DELETE CASCADE,
    relationship_type business.relationship_type_enum NOT NULL,

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
CREATE INDEX idx_entity_junction_source ON business.entity_junction(source_entity_id);
CREATE INDEX idx_entity_junction_target ON business.entity_junction(target_entity_id);
CREATE INDEX idx_entity_junction_type ON business.entity_junction(relationship_type);
CREATE INDEX idx_entity_junction_active ON business.entity_junction(end_date) WHERE end_date IS NULL;
CREATE INDEX idx_entity_junction_name ON business.entity_junction(name);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION business.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-populate display_name and name fields
CREATE OR REPLACE FUNCTION business.update_display_name()
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
CREATE OR REPLACE FUNCTION business.update_entity_junction_name()
RETURNS TRIGGER AS $$
DECLARE
    source_display TEXT;
    target_display TEXT;
BEGIN
    -- Get display names for source and target entities
    SELECT display_name INTO source_display
    FROM business.entity
    WHERE id = NEW.source_entity_id;

    SELECT display_name INTO target_display
    FROM business.entity
    WHERE id = NEW.target_entity_id;

    -- Build name in format: "Source -> Target (relationship_type)"
    NEW.name = COALESCE(source_display, 'Unknown') || ' -> ' ||
               COALESCE(target_display, 'Unknown') || ' (' ||
               NEW.relationship_type::TEXT || ')';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to prevent duplicate reverse relationships
CREATE OR REPLACE FUNCTION business.prevent_duplicate_reverse_relationship()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if reverse relationship already exists
    IF EXISTS (
        SELECT 1 FROM business.entity_junction
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
    BEFORE UPDATE ON business.entity
    FOR EACH ROW
    EXECUTE FUNCTION business.update_updated_at_column();

-- Apply updated_at trigger to entity_junction table
CREATE TRIGGER entity_junction_updated_at
    BEFORE UPDATE ON business.entity_junction
    FOR EACH ROW
    EXECUTE FUNCTION business.update_updated_at_column();

-- Apply display_name trigger
CREATE TRIGGER entity_set_display_name
    BEFORE INSERT OR UPDATE ON business.entity
    FOR EACH ROW
    EXECUTE FUNCTION business.update_display_name();

-- Apply duplicate reverse relationship prevention trigger
CREATE TRIGGER entity_junction_prevent_duplicate_reverse
    BEFORE INSERT ON business.entity_junction
    FOR EACH ROW
    EXECUTE FUNCTION business.prevent_duplicate_reverse_relationship();

-- Apply entity_junction name trigger
CREATE TRIGGER entity_junction_set_name
    BEFORE INSERT OR UPDATE ON business.entity_junction
    FOR EACH ROW
    EXECUTE FUNCTION business.update_entity_junction_name();

-- ============================================
-- VIEWS
-- ============================================

-- View for individual clients with their contacts
CREATE OR REPLACE VIEW business.individual_clients_with_contacts AS
SELECT
    c.id AS client_id,
    c.name AS client_name,
    c.date_of_birth,
    c.email AS client_email,
    c.phone AS client_phone,
    contact.id AS contact_id,
    contact.name AS contact_name,
    contact.email AS contact_email,
    contact.phone AS contact_phone,
    j.relationship_type,
    j.is_primary,
    j.effective_date,
    j.notes AS relationship_notes
FROM business.entity c
LEFT JOIN business.entity_junction j ON j.target_entity_id = c.id AND j.end_date IS NULL
LEFT JOIN business.entity contact ON contact.id = j.source_entity_id AND contact.entity_type = 'contact'
WHERE c.entity_type = 'individual_client'
ORDER BY c.name, j.is_primary DESC, contact.name;

-- View for individual clients
CREATE OR REPLACE VIEW business.individual_clients AS
SELECT
    id,
    name,
    first_name,
    last_name,
    date_of_birth,
    gender,
    marital_status,
    email,
    phone,
    city,
    state,
    is_active,
    created_at,
    updated_at
FROM business.entity
WHERE entity_type = 'individual_client'
ORDER BY name;

-- View for corporate clients
CREATE OR REPLACE VIEW business.corporate_clients AS
SELECT
    id,
    name,
    legal_name,
    email,
    phone,
    city,
    state,
    is_active,
    created_at,
    updated_at
FROM business.entity
WHERE entity_type = 'corporate_client'
ORDER BY name;

-- View for all contacts
CREATE OR REPLACE VIEW business.all_contacts AS
SELECT
    id,
    name,
    entity_type,
    legal_name,
    first_name,
    last_name,
    email,
    phone,
    city,
    state,
    is_active,
    created_at,
    updated_at
FROM business.entity
WHERE entity_type = 'contact'
ORDER BY name;

-- View for entity relationships (useful for seeing all connections)
CREATE OR REPLACE VIEW business.entity_relationships AS
SELECT
    j.id AS junction_id,
    source.name AS source_name,
    source.entity_type AS source_type,
    target.name AS target_name,
    target.entity_type AS target_type,
    j.relationship_type,
    j.is_primary,
    j.effective_date,
    j.end_date,
    j.notes,
    j.created_at,
    j.updated_at
FROM business.entity_junction j
INNER JOIN business.entity source ON source.id = j.source_entity_id
INNER JOIN business.entity target ON target.id = j.target_entity_id;

-- ============================================
-- PERMISSIONS
-- ============================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA business TO postgres, anon, authenticated, service_role;

-- Grant select on tables
GRANT SELECT ON ALL TABLES IN SCHEMA business TO postgres, anon, authenticated, service_role;

-- Grant all on tables to service_role
GRANT ALL ON ALL TABLES IN SCHEMA business TO service_role;

-- Grant usage on custom types
GRANT USAGE ON TYPE business.entity_type_enum TO postgres, anon, authenticated, service_role;
GRANT USAGE ON TYPE business.relationship_type_enum TO postgres, anon, authenticated, service_role;

-- Grant select on specific views
GRANT SELECT ON business.individual_clients_with_contacts TO postgres, anon, authenticated, service_role;
GRANT SELECT ON business.individual_clients TO postgres, anon, authenticated, service_role;
GRANT SELECT ON business.corporate_clients TO postgres, anon, authenticated, service_role;
GRANT SELECT ON business.all_contacts TO postgres, anon, authenticated, service_role;
GRANT SELECT ON business.entity_relationships TO postgres, anon, authenticated, service_role;

-- Grant insert/update/delete to authenticated users
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA business TO authenticated, service_role;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE business.entity ENABLE ROW LEVEL SECURITY;
ALTER TABLE business.entity_junction ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "service_role_all_entity" ON business.entity;
DROP POLICY IF EXISTS "service_role_all_entity_junction" ON business.entity_junction;
DROP POLICY IF EXISTS "authenticated_read_entity" ON business.entity;
DROP POLICY IF EXISTS "authenticated_read_entity_junction" ON business.entity_junction;
DROP POLICY IF EXISTS "authenticated_insert_entity" ON business.entity;
DROP POLICY IF EXISTS "authenticated_insert_entity_junction" ON business.entity_junction;
DROP POLICY IF EXISTS "authenticated_update_entity" ON business.entity;
DROP POLICY IF EXISTS "authenticated_update_entity_junction" ON business.entity_junction;
DROP POLICY IF EXISTS "authenticated_delete_entity" ON business.entity;
DROP POLICY IF EXISTS "authenticated_delete_entity_junction" ON business.entity_junction;

-- Service role can do everything
CREATE POLICY "service_role_all_entity"
    ON business.entity
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service_role_all_entity_junction"
    ON business.entity_junction
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Authenticated users can read
CREATE POLICY "authenticated_read_entity"
    ON business.entity
    TO authenticated
    USING (true);

CREATE POLICY "authenticated_read_entity_junction"
    ON business.entity_junction
    TO authenticated
    USING (true);

-- Authenticated users can insert
CREATE POLICY "authenticated_insert_entity"
    ON business.entity
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "authenticated_insert_entity_junction"
    ON business.entity_junction
    TO authenticated
    WITH CHECK (true);

-- Authenticated users can update
CREATE POLICY "authenticated_update_entity"
    ON business.entity
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "authenticated_update_entity_junction"
    ON business.entity_junction
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Authenticated users can delete
CREATE POLICY "authenticated_delete_entity"
    ON business.entity
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "authenticated_delete_entity_junction"
    ON business.entity_junction
    TO authenticated
    USING (true)
    WITH CHECK (true);
