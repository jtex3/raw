DO $$
DECLARE
  -- Configuration Arrays
  org_names TEXT[] := ARRAY['ORG-0001', 'ORG-0002'];
  admin_emails TEXT[] := ARRAY['admin@org0001.com', 'admin@org0002.com'];
  common_password TEXT := 'smartsolution';
  
  -- Variable Holders
  v_org_id UUID;
  v_profile_id UUID;
  v_role_id UUID;
  v_auth_user_id UUID;
  v_password_hash TEXT := extensions.crypt(common_password, extensions.gen_salt('bf', 10));
  i INTEGER;
BEGIN

  FOR i IN 1 .. array_upper(org_names, 1) LOOP
    
    -- 1. Create Organization (audit fields set after user created)
    INSERT INTO  system.organizations (id, name, org_name, subdomain, is_active)
    VALUES (gen_random_uuid(), org_names[i], org_names[i], lower(replace(org_names[i], '-', '')), true)
    RETURNING id INTO v_org_id;

    -- 2. Create Organization Administrator Profile (Unique per Org, audit fields set after user created)
    INSERT INTO  system.profiles (id, name, org_id, profile_name, description)
    VALUES (gen_random_uuid(), org_names[i] || ' Admin Profile', v_org_id, 'Organization Administrator', 'Full access within organization')
    RETURNING id INTO v_profile_id;

    -- 3. Create Organization Administrator Role (Unique per Org, audit fields set after user created)
    INSERT INTO  system.roles (id, name, org_id, role_name, parent_role_id, level)
    VALUES (gen_random_uuid(), org_names[i] || ' Admin Role', v_org_id, 'Organization Administrator', NULL, 0)
    RETURNING id INTO v_role_id;

    -- 4. Create Auth User (Internal Flow)
    v_auth_user_id := gen_random_uuid();
    
    INSERT INTO  auth.users (
      instance_id, id, aud, role, email, encrypted_password, 
      email_confirmed_at, last_sign_in_at, raw_app_meta_data, 
      raw_user_meta_data, is_super_admin, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, 
      email_change, phone_change, phone_change_token, email_change_confirm_status
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000', v_auth_user_id, 'authenticated', 
      'authenticated', admin_emails[i], v_password_hash, now(), now(), 
      '{"provider":"email","providers":["email"]}', '{}', FALSE, now(), now(),
      '', '', '', '', '', '', 0
    );

    INSERT INTO  auth.identities (
      id, user_id, identity_data, provider, provider_id, 
      last_sign_in_at, created_at, updated_at
    )
    VALUES (
      gen_random_uuid(), v_auth_user_id, 
      jsonb_build_object('sub', v_auth_user_id, 'email', admin_emails[i], 'email_verified', true), 
      'email', v_auth_user_id, now(), now(), now()
    );

    -- 5. Link to Public.Users
    INSERT INTO  system.users (id, name, org_id, profile_id, role_id, email, is_active, owner_id, createdby_id, updatedby_id)
    VALUES (v_auth_user_id, org_names[i] || ' Admin User', v_org_id, v_profile_id, v_role_id, admin_emails[i], true, v_auth_user_id, v_auth_user_id, v_auth_user_id);

    -- 6. Update audit fields on previously created records (now that user exists)
    UPDATE system.organizations SET owner_id = v_auth_user_id, createdby_id = v_auth_user_id, updatedby_id = v_auth_user_id WHERE id = v_org_id;
    UPDATE system.profiles SET owner_id = v_auth_user_id, createdby_id = v_auth_user_id, updatedby_id = v_auth_user_id WHERE id = v_profile_id;
    UPDATE system.roles SET owner_id = v_auth_user_id, createdby_id = v_auth_user_id, updatedby_id = v_auth_user_id WHERE id = v_role_id;

    -- 7. Grant Organization Administrator read-only permissions on all system tables
    INSERT INTO system.profile_object_permissions (name, profile_id, object_name, can_create, can_read, can_update, can_delete, owner_id, createdby_id, updatedby_id)
    VALUES
      (org_names[i] || ' Admin User', v_profile_id, 'list_views', false, true, false, false, v_auth_user_id, v_auth_user_id, v_auth_user_id),
      (org_names[i] || ' Admin User', v_profile_id, 'manual_shares', false, true, false, false, v_auth_user_id, v_auth_user_id, v_auth_user_id),
      (org_names[i] || ' Admin User', v_profile_id, 'org_wide_defaults', false, true, false, false, v_auth_user_id, v_auth_user_id, v_auth_user_id),
      (org_names[i] || ' Admin User', v_profile_id, 'organizations', false, true, false, false, v_auth_user_id, v_auth_user_id, v_auth_user_id),
      (org_names[i] || ' Admin User', v_profile_id, 'profile_field_permissions', false, true, false, false, v_auth_user_id, v_auth_user_id, v_auth_user_id),
      (org_names[i] || ' Admin User', v_profile_id, 'profile_object_permissions', false, true, false, false, v_auth_user_id, v_auth_user_id, v_auth_user_id),
      (org_names[i] || ' Admin User', v_profile_id, 'profiles', false, true, false, false, v_auth_user_id, v_auth_user_id, v_auth_user_id),
      (org_names[i] || ' Admin User', v_profile_id, 'roles', false, true, false, false, v_auth_user_id, v_auth_user_id, v_auth_user_id),
      (org_names[i] || ' Admin User', v_profile_id, 'sharing_rules', false, true, false, false, v_auth_user_id, v_auth_user_id, v_auth_user_id),
      (org_names[i] || ' Admin User', v_profile_id, 'users', false, true, false, false, v_auth_user_id, v_auth_user_id, v_auth_user_id);

    RAISE NOTICE 'Created Organization and Admin for: %', org_names[i];

  END LOOP;

END $$;