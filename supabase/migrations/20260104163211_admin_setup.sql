-- =====================================================
-- STEP 1: CREATE AUTH USER (Internal Supabase Flow)
-- =====================================================
  
DO $$
DECLARE
  -- Configuration
  v_email TEXT := 'admin@system.com';
  v_password TEXT := 'smartsolution';
  
  -- Variable Holders
  v_auth_user_id UUID := gen_random_uuid();
  v_org_id UUID;
  v_profile_id UUID;
  v_role_id UUID;
  v_password_hash TEXT := extensions.crypt('smartsolution', extensions.gen_salt('bf', 10));
BEGIN

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, 
    email_confirmed_at, last_sign_in_at, raw_app_meta_data, 
    raw_user_meta_data, is_super_admin, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, 
    email_change, phone_change, phone_change_token, email_change_confirm_status
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000', v_auth_user_id, 'authenticated', 
    'authenticated', v_email, v_password_hash, now(), now(), 
    '{"provider":"email","providers":["email"]}', '{}', FALSE, now(), now(),
    '', '', '', '', '', '', 0
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, 
    last_sign_in_at, created_at, updated_at
  )
  VALUES (
    gen_random_uuid(), v_auth_user_id, 
    jsonb_build_object('sub', v_auth_user_id, 'email', v_email, 'email_verified', true), 
    'email', v_auth_user_id, now(), now(), now()
  );

  RAISE NOTICE 'Auth User created: %', v_auth_user_id;

  -- =====================================================
  -- STEP 2: CREATE SYSTEM ORGANIZATION
  -- =====================================================
  
  INSERT INTO system.organizations (org_id, org_name, subdomain, is_active)
  VALUES (gen_random_uuid(), 'System Organization', 'system', true)
  RETURNING org_id INTO v_org_id;
  
  RAISE NOTICE 'Organization created: %', v_org_id;

  -- =====================================================
  -- STEP 3: CREATE SYSTEM ADMINISTRATOR PROFILE
  -- =====================================================
  
  INSERT INTO system.profiles (profile_id, org_id, profile_name, description)
  VALUES (gen_random_uuid(), v_org_id, 'System Administrator', 'Full access to all features and data')
  RETURNING profile_id INTO v_profile_id;
  
  RAISE NOTICE 'Profile created: %', v_profile_id;

  -- =====================================================
  -- STEP 4: CREATE CEO/ADMIN ROLE
  -- =====================================================
  
  INSERT INTO system.roles (role_id, org_id, role_name, parent_role_id, level)
  VALUES (gen_random_uuid(), v_org_id, 'System Administrator', NULL, 0)
  RETURNING role_id INTO v_role_id;
  
  RAISE NOTICE 'Role created: %', v_role_id;

  -- =====================================================
  -- STEP 5: LINK AUTH USER TO PUBLIC.USERS TABLE
  -- =====================================================
  
  INSERT INTO system.users (user_id, org_id, profile_id, role_id, email, name, is_active)
  VALUES (v_auth_user_id, v_org_id, v_profile_id, v_role_id, v_email, 'System Administrator', true);
  
  RAISE NOTICE 'User linked successfully to system.users!';

  -- =====================================================
  -- STEP 6: INITIAL PERMISSIONS (Optional but recommended)
  -- =====================================================
  
  -- Grant Admin full CRUD on Organizations as an example
  INSERT INTO system.profile_object_permissions (profile_id, object_name, can_create, can_read, can_update, can_delete)
  VALUES (v_profile_id, 'organizations', true, true, true, true);

END $$;