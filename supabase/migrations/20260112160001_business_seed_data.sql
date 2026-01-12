-- ============================================
-- BUSINESS SEED DATA
-- ============================================
-- This migration creates example records for testing:
-- 1. A corporate client (Home Care Services Inc.)
-- 2. An individual client (Jane Smith, an elderly person needing care)
-- 3. A relationship between them via entity_junction
-- ============================================

-- ============================================
-- INSERT CORPORATE CLIENT
-- ============================================
INSERT INTO business.entity (
    id,
    entity_type,
    legal_name,
    display_name,
    email,
    phone,
    address_line1,
    city,
    state,
    postal_code,
    country,
    notes,
    is_active
) VALUES (
    '550e8400-e29b-41d4-a716-446655440001'::uuid,
    'corporate_client',
    'Home Care Services Inc.',
    'Home Care Services Inc.',
    'info@homecareservices.com',
    '(555) 123-4567',
    '123 Healthcare Boulevard',
    'Springfield',
    'IL',
    '62701',
    'US',
    'Primary corporate client providing home care services for elderly and injured individuals.',
    true
);

-- ============================================
-- INSERT INDIVIDUAL CLIENT
-- ============================================
INSERT INTO business.entity (
    id,
    entity_type,
    first_name,
    last_name,
    display_name,
    date_of_birth,
    gender,
    marital_status,
    preferred_language,
    email,
    phone,
    address_line1,
    city,
    state,
    postal_code,
    country,
    notes,
    is_active
) VALUES (
    '550e8400-e29b-41d4-a716-446655440002'::uuid,
    'individual_client',
    'Jane',
    'Smith',
    'Jane Smith',
    '1945-03-15',
    'female',
    'widowed',
    'en',
    'jane.smith@email.com',
    '(555) 987-6543',
    '456 Oak Street',
    'Springfield',
    'IL',
    '62702',
    'US',
    'Elderly client requiring home care services. Lives alone, needs assistance with daily activities.',
    true
);

-- ============================================
-- CREATE RELATIONSHIP VIA ENTITY_JUNCTION
-- ============================================
-- The corporate client is the referral source for the individual client
INSERT INTO business.entity_junction (
    id,
    source_entity_id,
    target_entity_id,
    relationship_type,
    is_primary,
    effective_date,
    notes
) VALUES (
    '550e8400-e29b-41d4-a716-446655440003'::uuid,
    '550e8400-e29b-41d4-a716-446655440001'::uuid, -- Home Care Services Inc.
    '550e8400-e29b-41d4-a716-446655440002'::uuid, -- Jane Smith
    'referral_source',
    true,
    CURRENT_DATE,
    'Home Care Services Inc. is the primary referral source for this client.'
);
