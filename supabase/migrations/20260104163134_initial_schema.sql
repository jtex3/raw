-- =====================================================
-- MULTI-TENANT SALESFORCE-LIKE SYSTEM MIGRATION
-- =====================================================
-- This migration creates a complete multi-tenant system with:
-- - Organization isolation (RLS)
-- - Role hierarchy
-- - Profile-based permissions (CRUD + Field-Level Security)
-- - Sharing rules (OWD, criteria-based, manual sharing)
-- - JWT token integration for org_id
-- - Proper GRANT statements
-- =====================================================

-- Ensure required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Organizations (Tenants)
CREATE TABLE system.organizations (
  org_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_name TEXT NOT NULL,
  subdomain TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(subdomain)
);

-- Roles (with hierarchy)
CREATE TABLE system.roles (
  role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES system.organizations(org_id) ON DELETE CASCADE,
  role_name TEXT NOT NULL,
  parent_role_id UUID REFERENCES system.roles(role_id) ON DELETE SET NULL,
  level INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(org_id, role_name),
  CHECK (role_id != parent_role_id)
);

-- Profiles
CREATE TABLE system.profiles (
  profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES system.organizations(org_id) ON DELETE CASCADE,
  profile_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(org_id, profile_name)
);

-- Users
CREATE TABLE system.users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES system.organizations(org_id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES system.profiles(profile_id) ON DELETE RESTRICT,
  role_id UUID REFERENCES system.roles(role_id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(org_id, email)
);

-- =====================================================
-- PERMISSION TABLES
-- =====================================================

-- Profile Object Permissions (CRUD per object/table)
CREATE TABLE system.profile_object_permissions (
  permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES system.profiles(profile_id) ON DELETE CASCADE,
  object_name TEXT NOT NULL,
  can_create BOOLEAN DEFAULT false,
  can_read BOOLEAN DEFAULT false,
  can_update BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_id, object_name)
);

-- Profile Field Permissions (Field-Level Security)
CREATE TABLE system.profile_field_permissions (
  permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES system.profiles(profile_id) ON DELETE CASCADE,
  object_name TEXT NOT NULL,
  field_name TEXT NOT NULL,
  can_read BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_id, object_name, field_name)
);

-- =====================================================
-- SHARING TABLES
-- =====================================================

-- Organization-Wide Defaults
CREATE TABLE system.org_wide_defaults (
  owd_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES system.organizations(org_id) ON DELETE CASCADE,
  object_name TEXT NOT NULL,
  default_access TEXT NOT NULL CHECK (default_access IN ('private', 'public_read_only', 'public_read_write')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(org_id, object_name)
);

-- Sharing Rules
CREATE TABLE system.sharing_rules (
  rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES system.organizations(org_id) ON DELETE CASCADE,
  object_name TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('criteria_based', 'ownership_based')),
  shared_to_role_id UUID REFERENCES system.roles(role_id) ON DELETE CASCADE,
  include_subordinates BOOLEAN DEFAULT false,
  access_level TEXT NOT NULL CHECK (access_level IN ('read', 'read_write')),
  criteria JSONB,
  owner_role_id UUID REFERENCES system.roles(role_id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(org_id, object_name, rule_name)
);

-- Manual Shares
CREATE TABLE system.manual_shares (
  share_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES system.organizations(org_id) ON DELETE CASCADE,
  object_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  shared_by_user_id UUID NOT NULL REFERENCES system.users(user_id) ON DELETE CASCADE,
  shared_to_user_id UUID NOT NULL REFERENCES system.users(user_id) ON DELETE CASCADE,
  access_level TEXT NOT NULL CHECK (access_level IN ('read', 'read_write')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(object_name, record_id, shared_to_user_id)
);

-- =====================================================
-- LIST VIEWS
-- =====================================================

-- List Views
CREATE TABLE system.list_views (
  view_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES system.organizations(org_id) ON DELETE CASCADE,
  object_name TEXT NOT NULL,
  view_name TEXT NOT NULL,
  created_by_user_id UUID NOT NULL REFERENCES system.users(user_id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT false,
  owner_user_id UUID REFERENCES system.users(user_id) ON DELETE CASCADE,
  filters JSONB,
  columns JSONB,
  sort_by JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(org_id, object_name, view_name)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Organizations
CREATE INDEX idx_system_organizations_subdomain ON system.organizations(subdomain);
CREATE INDEX idx_system_organizations_active ON system.organizations(is_active);

-- Roles
CREATE INDEX idx_system_roles_org ON system.roles(org_id);
CREATE INDEX idx_system_roles_parent ON system.roles(parent_role_id);
CREATE INDEX idx_system_roles_org_name ON system.roles(org_id, role_name);

-- Profiles
CREATE INDEX idx_system_profiles_org ON system.profiles(org_id);

-- Users
CREATE INDEX idx_system_users_org ON system.users(org_id);
CREATE INDEX idx_system_users_profile ON system.users(profile_id);
CREATE INDEX idx_system_users_role ON system.users(role_id);
CREATE INDEX idx_system_users_email ON system.users(email);
CREATE INDEX idx_system_users_org_email ON system.users(org_id, email);
CREATE INDEX idx_system_users_active ON system.users(is_active);

-- Profile Object Permissions
CREATE INDEX idx_system_profile_obj_perms_profile ON system.profile_object_permissions(profile_id);
CREATE INDEX idx_system_profile_obj_perms_object ON system.profile_object_permissions(object_name);

-- Profile Field Permissions
CREATE INDEX idx_system_profile_field_perms_profile ON system.profile_field_permissions(profile_id);
CREATE INDEX idx_system_profile_field_perms_object ON system.profile_field_permissions(object_name);

-- Org Wide Defaults
CREATE INDEX idx_system_owd_org ON system.org_wide_defaults(org_id);
CREATE INDEX idx_system_owd_object ON system.org_wide_defaults(object_name);

-- Sharing Rules
CREATE INDEX idx_system_sharing_rules_org ON system.sharing_rules(org_id);
CREATE INDEX idx_system_sharing_rules_object ON system.sharing_rules(object_name);
CREATE INDEX idx_system_sharing_rules_role ON system.sharing_rules(shared_to_role_id);
CREATE INDEX idx_system_sharing_rules_owner_role ON system.sharing_rules(owner_role_id);
CREATE INDEX idx_system_sharing_rules_active ON system.sharing_rules(is_active);

-- Manual Shares
CREATE INDEX idx_system_manual_shares_org ON system.manual_shares(org_id);
CREATE INDEX idx_system_manual_shares_object_record ON system.manual_shares(object_name, record_id);
CREATE INDEX idx_system_manual_shares_shared_to ON system.manual_shares(shared_to_user_id);
CREATE INDEX idx_system_manual_shares_shared_by ON system.manual_shares(shared_by_user_id);

-- List Views
CREATE INDEX idx_system_list_views_org ON system.list_views(org_id);
CREATE INDEX idx_system_list_views_object ON system.list_views(object_name);
CREATE INDEX idx_system_list_views_owner ON system.list_views(owner_user_id);
CREATE INDEX idx_system_list_views_public ON system.list_views(is_public);

-- =====================================================
-- JWT METADATA SETUP - ADD org_id TO JWT
-- =====================================================

-- Function to set org_id and profile_id in JWT on user creation
CREATE OR REPLACE FUNCTION system.handle_user_org_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Update auth.users to include org_id and profile_id in app_metadata
  UPDATE auth.users
  SET raw_app_meta_data = 
      COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object(
        'org_id', NEW.org_id::text,
        'profile_id', NEW.profile_id::text
      )
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
   SECURITY DEFINER 
   SET search_path = system, pg_temp;

-- Trigger on INSERT
CREATE TRIGGER on_user_created_set_org_metadata
  AFTER INSERT ON system.users
  FOR EACH ROW
  EXECUTE FUNCTION system.handle_user_org_metadata();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get current user's org_id from JWT (FAST - no DB query)
CREATE OR REPLACE FUNCTION system.get_user_org()
RETURNS UUID AS $$
BEGIN
  RETURN (auth.jwt() -> 'app_metadata' ->> 'org_id')::UUID;
END;
$$ LANGUAGE plpgsql 
   SECURITY DEFINER 
   SET search_path = system, pg_temp;

-- Get current user's role_id (uses SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION system.get_user_role()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT role_id 
    FROM system.users 
    WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql 
   SECURITY DEFINER 
   SET search_path = system, pg_temp;

-- Get current user's profile_id (uses SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION system.get_user_profile()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT profile_id 
    FROM system.users 
    WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql 
   SECURITY DEFINER 
   SET search_path = system, pg_temp;

-- Create a function that bypasses RLS when checking if user profile is System Administrator
CREATE OR REPLACE FUNCTION system.current_user_is_system_admin()
RETURNS BOOLEAN AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- This SELECT bypasses RLS because of SECURITY DEFINER
  SELECT EXISTS (
    SELECT 1
    FROM system.profiles
    WHERE profile_id = (auth.jwt() -> 'app_metadata' ->> 'profile_id')::uuid
    AND profile_name = 'System Administrator'
  ) INTO is_admin;
  
  RETURN COALESCE(is_admin, false);
END;
$$ LANGUAGE plpgsql 
   SECURITY DEFINER 
   SET search_path = system, pg_temp;

-- =====================================================
-- ROLE HIERARCHY FUNCTIONS
-- =====================================================

-- Check if user can access record via role hierarchy
CREATE OR REPLACE FUNCTION system.can_access_via_role(
  checking_user_id UUID,
  record_owner_id UUID
)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO system, pg_temp
AS $$
DECLARE
  checking_role_id UUID;
  owner_role_id UUID;
BEGIN
  -- User can always access their own records
  IF checking_user_id = record_owner_id THEN
    RETURN TRUE;
  END IF;
  
  -- Get roles
  SELECT role_id INTO checking_role_id FROM system.users WHERE user_id = checking_user_id;
  SELECT role_id INTO owner_role_id FROM system.users WHERE user_id = record_owner_id;
  
  -- If either user has no role, deny access
  IF checking_role_id IS NULL OR owner_role_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if checking_user's role is above owner's role in hierarchy
  RETURN system.is_role_above(checking_role_id, owner_role_id);
END;
$$;

-- Check if parent_role is above child_role in hierarchy
CREATE OR REPLACE FUNCTION system.is_role_above(
  parent_role_id UUID,
  child_role_id UUID
)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO system, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    WITH RECURSIVE role_tree AS (
      -- Start from child role
      SELECT role_id, parent_role_id
      FROM system.roles
      WHERE role_id = child_role_id
      
      UNION ALL
      
      -- Walk up the tree
      SELECT r.role_id, r.parent_role_id
      FROM system.roles r
      JOIN role_tree rt ON r.role_id = rt.parent_role_id
    )
    SELECT 1 FROM role_tree WHERE role_id = parent_role_id
  );
END;
$$;

-- Check if role is subordinate of another role
CREATE OR REPLACE FUNCTION system.is_subordinate_of(
  child_role_id UUID,
  parent_role_id UUID
)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO system, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    WITH RECURSIVE role_tree AS (
      -- Start from parent role
      SELECT role_id, parent_role_id
      FROM system.roles
      WHERE role_id = parent_role_id
      
      UNION ALL
      
      -- Walk down the tree
      SELECT r.role_id, r.parent_role_id
      FROM system.roles r
      JOIN role_tree rt ON r.parent_role_id = rt.role_id
    )
    SELECT 1 FROM role_tree WHERE role_id = child_role_id
  );
END;
$$;

-- =====================================================
-- PERMISSION CHECKING FUNCTIONS
-- =====================================================

-- Check if user has object permission
CREATE OR REPLACE FUNCTION system.has_object_permission(
  checking_user_id UUID,
  object_name TEXT,
  permission_type TEXT -- 'create', 'read', 'update', 'delete'
)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO system, pg_temp
AS $$
DECLARE
  user_profile_id UUID;
BEGIN
  -- Validate that checking_user_id is the current user (security)
  IF checking_user_id != auth.uid() THEN
    RETURN FALSE;
  END IF;
  
  -- Get user's profile
  SELECT profile_id INTO user_profile_id FROM system.users WHERE user_id = checking_user_id;
  
  IF user_profile_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check permission based on type
  RETURN EXISTS (
    SELECT 1 
    FROM system.profile_object_permissions 
    WHERE profile_id = user_profile_id
      AND system.profile_object_permissions.object_name = has_object_permission.object_name
      AND (
        (permission_type = 'create' AND can_create = true) OR
        (permission_type = 'read' AND can_read = true) OR
        (permission_type = 'update' AND can_update = true) OR
        (permission_type = 'delete' AND can_delete = true)
      )
  );
END;
$$;

-- Check if user has field permission
CREATE OR REPLACE FUNCTION system.has_field_permission(
  checking_user_id UUID,
  object_name TEXT,
  field_name TEXT,
  permission_type TEXT -- 'read', 'edit'
)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO system, pg_temp
AS $$
DECLARE
  user_profile_id UUID;
BEGIN
  -- Validate that checking_user_id is the current user (security)
  IF checking_user_id != auth.uid() THEN
    RETURN FALSE;
  END IF;
  
  -- Get user's profile
  SELECT profile_id INTO user_profile_id FROM system.users WHERE user_id = checking_user_id;
  
  IF user_profile_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check field permission (deny by default)
  RETURN EXISTS (
    SELECT 1 
    FROM system.profile_field_permissions 
    WHERE profile_id = user_profile_id
      AND system.profile_field_permissions.object_name = has_field_permission.object_name
      AND system.profile_field_permissions.field_name = has_field_permission.field_name
      AND (
        (permission_type = 'read' AND can_read = true) OR
        (permission_type = 'edit' AND can_edit = true)
      )
  );
END;
$$;

-- Get visible fields for user on an object
CREATE OR REPLACE FUNCTION system.get_visible_fields(
  checking_user_id UUID,
  object_name TEXT
)
RETURNS TEXT[] AS $$
DECLARE
  user_profile_id UUID;
BEGIN
  -- Validate that checking_user_id is the current user (security)
  IF checking_user_id != auth.uid() THEN
    RETURN ARRAY[]::TEXT[];
  END IF;
  
  -- Get user's profile
  SELECT profile_id INTO user_profile_id FROM system.users WHERE user_id = checking_user_id;
  
  IF user_profile_id IS NULL THEN
    RETURN ARRAY[]::TEXT[];
  END IF;
  
  -- Return array of readable field names (deny by default)
  RETURN ARRAY(
    SELECT field_name
    FROM system.profile_field_permissions
    WHERE profile_id = user_profile_id
      AND system.profile_field_permissions.object_name = get_visible_fields.object_name
      AND can_read = true
  );
END;
$$ LANGUAGE plpgsql 
   SECURITY DEFINER 
   STABLE
   SET search_path = system, pg_temp;

-- =====================================================
-- SHARING RULES FUNCTIONS
-- =====================================================

-- Get OWD access level for an object
CREATE OR REPLACE FUNCTION system.get_owd_access(
  checking_org_id UUID,
  object_name TEXT
)
RETURNS TEXT
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO system, pg_temp
AS $$
BEGIN
  RETURN (
    SELECT default_access
    FROM system.org_wide_defaults
    WHERE org_id = checking_org_id
      AND system.org_wide_defaults.object_name = get_owd_access.object_name
  );
END;
$$;

-- Check if user has access via sharing rules
CREATE OR REPLACE FUNCTION system.has_sharing_rule_access(
  checking_user_id UUID,
  record_owner_id UUID,
  object_name TEXT
)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO system, pg_temp
AS $$
DECLARE
  user_role_id UUID;
  user_org_id UUID;
BEGIN
  -- Get user's role and org
  SELECT role_id, org_id INTO user_role_id, user_org_id 
  FROM system.users 
  WHERE user_id = checking_user_id;
  
  IF user_role_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if any active sharing rule grants access
  RETURN EXISTS (
    SELECT 1 
    FROM system.sharing_rules sr
    WHERE sr.org_id = user_org_id
      AND sr.object_name = has_sharing_rule_access.object_name
      AND sr.is_active = true
      AND (
        -- Role match
        sr.shared_to_role_id = user_role_id
        OR
        -- Role and subordinates
        (sr.include_subordinates = true AND system.is_subordinate_of(user_role_id, sr.shared_to_role_id))
      )
      -- TODO: Add criteria evaluation for criteria_based rules
  );
END;
$$;

-- Check if user has manual share access
CREATE OR REPLACE FUNCTION system.has_manual_share(
  checking_user_id UUID,
  record_id UUID,
  object_name TEXT
)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO system, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM system.manual_shares
    WHERE shared_to_user_id = checking_user_id
      AND system.manual_shares.record_id = has_manual_share.record_id
      AND system.manual_shares.object_name = has_manual_share.object_name
  );
END;
$$;

-- To list all tables of public schema
CREATE OR REPLACE FUNCTION system.get_schema_public_tables()
RETURNS TABLE (table_name text, table_type text) 
LANGUAGE sql SECURITY DEFINER
SET search_path = pg_catalog, information_schema, public, pg_temp
AS $$
  SELECT 
    t.table_name::text,
    t.table_type::text
  FROM information_schema.tables t 
  WHERE t.table_schema = 'system' 
    AND t.table_type = 'BASE TABLE'
    AND t.table_name <> 'schema_migrations';
$$;

-- To list all tables of system schema
CREATE OR REPLACE FUNCTION system.get_schema_system_tables()
RETURNS TABLE (table_name text, table_type text) 
LANGUAGE sql SECURITY DEFINER
SET search_path = pg_catalog, information_schema, system, pg_temp
AS $$
  SELECT 
    t.table_name::text,
    t.table_type::text
  FROM information_schema.tables t 
  WHERE t.table_schema = 'system' 
    AND t.table_type = 'BASE TABLE'
    AND t.table_name <> 'schema_migrations';
$$;

-- To list all columns for a specific table of system schema
CREATE OR REPLACE FUNCTION system.get_schema_system_tables_columns(target_table text)
RETURNS TABLE (
  column_name text,
  data_type text,
  is_nullable text,
  column_default text
) 
LANGUAGE sql SECURITY DEFINER
SET search_path = pg_catalog, information_schema, system, pg_temp
AS $$
  SELECT 
    c.column_name::text,
    c.data_type::text,
    c.is_nullable::text,
    c.column_default::text
  FROM information_schema.columns c
  WHERE c.table_schema = 'system' 
    AND c.table_name = target_table
  ORDER BY c.ordinal_position;
$$;

CREATE OR REPLACE FUNCTION system.get_table_foreign_keys(table_name text)
RETURNS TABLE (
    column_name text,
    foreign_table_name text,
    foreign_column_name text
) 
LANGUAGE sql 
STABLE
AS $$
  SELECT 
    kcu.column_name::text,
    ccu.table_name::text AS foreign_table_name,
    ccu.column_name::text AS foreign_column_name
  FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = get_table_foreign_keys.table_name
    AND tc.table_schema = 'system' 
  ORDER BY kcu.column_name;
$$;

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE system.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE system.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE system.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE system.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE system.profile_object_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system.profile_field_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system.org_wide_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE system.sharing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE system.manual_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE system.list_views ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Organizations: Users can only see their own org
CREATE POLICY "Users see own organization" ON system.organizations
  FOR SELECT
  USING (org_id = system.get_user_org());

-- Users: Users can see users in their org
CREATE POLICY "Users see org users" ON system.users
  FOR SELECT
  USING (org_id = system.get_user_org());

-- Roles: Users can see roles in their org
CREATE POLICY "Users see org roles" ON system.roles
  FOR SELECT
  USING (org_id = system.get_user_org());

-- Profiles: Users can see profiles in their org
CREATE POLICY "Users see org profiles" ON system.profiles
  FOR SELECT
  USING (org_id = system.get_user_org());

-- Profile Object Permissions: Users can see permissions for their profile
CREATE POLICY "Users see own profile object permissions" ON system.profile_object_permissions
  FOR SELECT
  USING (profile_id = system.get_user_profile());

-- Profile Field Permissions: Users can see permissions for their profile
CREATE POLICY "Users see own profile field permissions" ON system.profile_field_permissions
  FOR SELECT
  USING (profile_id = system.get_user_profile());

-- Org Wide Defaults: Users can see OWD in their org
CREATE POLICY "Users see org OWD" ON system.org_wide_defaults
  FOR SELECT
  USING (org_id = system.get_user_org());

-- Sharing Rules: Users can see sharing rules in their org
CREATE POLICY "Users see org sharing rules" ON system.sharing_rules
  FOR SELECT
  USING (org_id = system.get_user_org());

-- Manual Shares: Users can see shares they created or received
CREATE POLICY "Users see relevant manual shares" ON system.manual_shares
  FOR SELECT
  USING (
    org_id = system.get_user_org() 
    AND (shared_by_user_id = auth.uid() OR shared_to_user_id = auth.uid())
  );

-- List Views: Users can see public views or their own views
CREATE POLICY "Users see accessible list views" ON system.list_views
  FOR SELECT
  USING (
    org_id = system.get_user_org() 
    AND (is_public = true OR owner_user_id = auth.uid())
  );

-- =====================================================
-- RLS POLICIES FOR System Administrators
-- =====================================================
-- Policy for System Administrators to have full access to organizations
CREATE POLICY "System Administrators have full access to organizations"
ON system.organizations
FOR ALL
TO authenticated
USING (
  system.current_user_is_system_admin()
);

-- Policy for System Administrators to have full access to roles
CREATE POLICY "System Administrators have full access to roles"
ON system.roles
FOR ALL
TO authenticated
USING (
  system.current_user_is_system_admin()
);

-- Policy for System Administrators to have full access to users
CREATE POLICY "System Administrators have full access to users"
ON system.users
FOR ALL
TO authenticated
USING (
  system.current_user_is_system_admin()
);

-- Policy for System Administrators to have full access to profiles
CREATE POLICY "System Administrators have full access to profiles"
ON system.profiles
FOR ALL
TO authenticated
USING (
  system.current_user_is_system_admin()
);

-- Policy for System Administrators to have full access to profile_object_permissions
CREATE POLICY "System Administrators have full access to profile_object_permissions"
ON system.profile_object_permissions
FOR ALL
TO authenticated
USING (
  system.current_user_is_system_admin()
);

-- Policy for System Administrators to have full access to profile_field_permissions
CREATE POLICY "System Administrators have full access to profile_field_permissions"
ON system.profile_field_permissions
FOR ALL
TO authenticated
USING (
  system.current_user_is_system_admin()
);

-- Policy for System Administrators to have full access to org_wide_defaults
CREATE POLICY "System Administrators have full access to org_wide_defaults"
ON system.org_wide_defaults
FOR ALL
TO authenticated
USING (
  system.current_user_is_system_admin()
);

-- Policy for System Administrators to have full access to sharing_rules
CREATE POLICY "System Administrators have full access to sharing_rules"
ON system.sharing_rules
FOR ALL
TO authenticated
USING (
  system.current_user_is_system_admin()
);

-- Policy for System Administrators to have full access to manual_shares
CREATE POLICY "System Administrators have full access to manual_shares"
ON system.manual_shares
FOR ALL
TO authenticated
USING (
  system.current_user_is_system_admin()
);

-- Policy for System Administrators to have full access to list_views
CREATE POLICY "System Administrators have full access to list_views"
ON system.list_views
FOR ALL
TO authenticated
USING (
  system.current_user_is_system_admin()
);

-- =====================================================
-- TRIGGERS FOR TIMESTAMP UPDATES
-- =====================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION system.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON system.organizations
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON system.users
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

CREATE TRIGGER update_list_views_updated_at
  BEFORE UPDATE ON system.list_views
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

-- =====================================================
-- GRANT STATEMENTS - TABLE PERMISSIONS
-- =====================================================
-- Grant USAGE on system schema to authenticated
GRANT USAGE ON SCHEMA system TO authenticated;


-- Grant CRUD permissions on all tables to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON system.organizations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON system.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON system.roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON system.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON system.profile_object_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON system.profile_field_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON system.org_wide_defaults TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON system.sharing_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON system.manual_shares TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON system.list_views TO authenticated;

-- Grant sequence usage (needed for UUID generation and auto-increment)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA system TO authenticated;

-- =====================================================
-- GRANT STATEMENTS - FUNCTION PERMISSIONS
-- =====================================================

-- Grant EXECUTE on all functions to authenticated users
GRANT EXECUTE ON FUNCTION system.handle_user_org_metadata() TO authenticated;
GRANT EXECUTE ON FUNCTION system.get_user_org() TO authenticated;
GRANT EXECUTE ON FUNCTION system.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION system.get_user_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION system.current_user_is_system_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION system.can_access_via_role(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION system.is_role_above(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION system.is_subordinate_of(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION system.has_object_permission(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION system.has_field_permission(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION system.get_visible_fields(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION system.get_owd_access(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION system.has_sharing_rule_access(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION system.has_manual_share(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION system.update_updated_at() TO authenticated;
GRANT EXECUTE ON FUNCTION system.get_schema_system_tables() TO authenticated;
GRANT EXECUTE ON FUNCTION system.get_schema_system_tables_columns(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION system.get_table_foreign_keys(TEXT) TO authenticated;

-- =====================================================
-- DEFAULT PRIVILEGES FOR FUTURE OBJECTS
-- =====================================================

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA system 
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

-- Set default privileges for future sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA system 
GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

-- Set default privileges for future functions
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
GRANT EXECUTE ON FUNCTIONS TO authenticated;

-- =====================================================
-- TABLE COMMENTS
-- =====================================================

COMMENT ON TABLE system.organizations IS 'Multi-tenant organizations (orgs). Each org is completely isolated.';
COMMENT ON TABLE system.users IS 'Users belonging to organizations with profile and role assignments.';
COMMENT ON TABLE system.roles IS 'Role hierarchy within each org. Self-referencing for parent-child relationships.';
COMMENT ON TABLE system.profiles IS 'Profiles control CRUD and field-level permissions.';
COMMENT ON TABLE system.profile_object_permissions IS 'Object-level CRUD permissions per profile.';
COMMENT ON TABLE system.profile_field_permissions IS 'Field-level read/edit permissions per profile (deny by default).';
COMMENT ON TABLE system.org_wide_defaults IS 'Organization-wide default access levels for objects.';
COMMENT ON TABLE system.sharing_rules IS 'Criteria-based and ownership-based sharing rules.';
COMMENT ON TABLE system.manual_shares IS 'Ad-hoc record sharing between users.';
COMMENT ON TABLE system.list_views IS 'Custom list views with filters, columns, and sorting configuration.';
