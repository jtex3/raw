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
  
  INSERT INTO system.organizations (id, name, org_name, subdomain, is_active, owner_id, createdby_id, updatedby_id)
  VALUES (gen_random_uuid(), 'System Organization', 'System Organization', 'system', true, v_auth_user_id, v_auth_user_id, v_auth_user_id)
  RETURNING id INTO v_org_id;
  
  RAISE NOTICE 'Organization created: %', v_org_id;

  -- =====================================================
  -- STEP 3: CREATE SYSTEM ADMINISTRATOR PROFILE
  -- =====================================================
  
  INSERT INTO system.profiles (id, name, org_id, profile_name, description, owner_id, createdby_id, updatedby_id)
  VALUES (gen_random_uuid(), 'System Administrator Profile', v_org_id, 'System Administrator', 'Full access to all features and data', v_auth_user_id, v_auth_user_id, v_auth_user_id)
  RETURNING id INTO v_profile_id;
  
  RAISE NOTICE 'Profile created: %', v_profile_id;

  -- =====================================================
  -- STEP 4: CREATE CEO/ADMIN ROLE
  -- =====================================================
  
  INSERT INTO system.roles (id, name, org_id, role_name, parent_role_id, level, owner_id, createdby_id, updatedby_id)
  VALUES (gen_random_uuid(), 'System Administrator Role', v_org_id, 'System Administrator', NULL, 0, v_auth_user_id, v_auth_user_id, v_auth_user_id)
  RETURNING id INTO v_role_id;
  
  RAISE NOTICE 'Role created: %', v_role_id;

  -- =====================================================
  -- STEP 5: LINK AUTH USER TO PUBLIC.USERS TABLE
  -- =====================================================
  
  INSERT INTO system.users (id, name, org_id, profile_id, role_id, email, is_active, owner_id, createdby_id, updatedby_id)
  VALUES (v_auth_user_id, 'System Administrator User', v_org_id, v_profile_id, v_role_id, v_email, true, v_auth_user_id, v_auth_user_id, v_auth_user_id);
  
  RAISE NOTICE 'User linked successfully to system.users!';

  -- =====================================================
  -- STEP 6: INITIAL PERMISSIONS (Optional but recommended)
  -- =====================================================
  
  -- Grant Admin full CRUD on all system tables
  INSERT INTO system.profile_object_permissions (id, name, profile_id, object_name, can_create, can_read, can_update, can_delete, owner_id, createdby_id, updatedby_id)
  VALUES
    (gen_random_uuid(), 'Admin Organizations Permission', v_profile_id, 'organizations', true, true, true, true, v_auth_user_id, v_auth_user_id, v_auth_user_id),
    (gen_random_uuid(), 'Admin Roles Permission', v_profile_id, 'roles', true, true, true, true, v_auth_user_id, v_auth_user_id, v_auth_user_id),
    (gen_random_uuid(), 'Admin Profiles Permission', v_profile_id, 'profiles', true, true, true, true, v_auth_user_id, v_auth_user_id, v_auth_user_id),
    (gen_random_uuid(), 'Admin Users Permission', v_profile_id, 'users', true, true, true, true, v_auth_user_id, v_auth_user_id, v_auth_user_id),
    (gen_random_uuid(), 'Admin Profile Object Permissions Permission', v_profile_id, 'profile_object_permissions', true, true, true, true, v_auth_user_id, v_auth_user_id, v_auth_user_id),
    (gen_random_uuid(), 'Admin Profile Field Permissions Permission', v_profile_id, 'profile_field_permissions', true, true, true, true, v_auth_user_id, v_auth_user_id, v_auth_user_id),
    (gen_random_uuid(), 'Admin Org Wide Defaults Permission', v_profile_id, 'org_wide_defaults', true, true, true, true, v_auth_user_id, v_auth_user_id, v_auth_user_id),
    (gen_random_uuid(), 'Admin Sharing Rules Permission', v_profile_id, 'sharing_rules', true, true, true, true, v_auth_user_id, v_auth_user_id, v_auth_user_id),
    (gen_random_uuid(), 'Admin Manual Shares Permission', v_profile_id, 'manual_shares', true, true, true, true, v_auth_user_id, v_auth_user_id, v_auth_user_id),
    (gen_random_uuid(), 'Admin List Views Permission', v_profile_id, 'list_views', true, true, true, true, v_auth_user_id, v_auth_user_id, v_auth_user_id);

END $$;