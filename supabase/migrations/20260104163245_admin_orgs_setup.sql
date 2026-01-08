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
    
    -- 1. Create Organization
    INSERT INTO  system.organizations (org_name, subdomain, is_active)
    VALUES (org_names[i], lower(replace(org_names[i], '-', '')), true)
    RETURNING org_id INTO v_org_id;

    -- 2. Create Organization Administrator Profile (Unique per Org)
    INSERT INTO  system.profiles (org_id, profile_name, description)
    VALUES (v_org_id, 'Organization Administrator', 'Full access within the organization')
    RETURNING profile_id INTO v_profile_id;

    -- 3. Create Organization Administrator Role (Unique per Org)
    INSERT INTO  system.roles (org_id, role_name, parent_role_id, level)
    VALUES (v_org_id, 'Organization Administrator', NULL, 0)
    RETURNING role_id INTO v_role_id;

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
    INSERT INTO  system.users (user_id, org_id, profile_id, role_id, email, name, is_active)
    VALUES (v_auth_user_id, v_org_id, v_profile_id, v_role_id, admin_emails[i], org_names[i] || ' Admin', true);

    RAISE NOTICE 'Created Organization and Admin for: %', org_names[i];

  END LOOP;

END $$;