CREATE OR REPLACE FUNCTION is_super_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND profile_type = 'System Administrator'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Then use in policies as before
CREATE POLICY "Super admins see all organizations" 
ON organizations FOR ALL
USING (is_super_admin_user());

-- Super admin policies for all tables in public schema
CREATE POLICY "Super admins see all users" 
ON users FOR ALL
USING (is_super_admin_user());

CREATE POLICY "Super admins see all roles" 
ON roles FOR ALL
USING (is_super_admin_user());

CREATE POLICY "Super admins see all profiles" 
ON profiles FOR ALL
USING (is_super_admin_user());

CREATE POLICY "Super admins see all profile_object_permissions" 
ON profile_object_permissions FOR ALL
USING (is_super_admin_user());

CREATE POLICY "Super admins see all profile_field_permissions" 
ON profile_field_permissions FOR ALL
USING (is_super_admin_user());

CREATE POLICY "Super admins see all org_wide_defaults" 
ON org_wide_defaults FOR ALL
USING (is_super_admin_user());

CREATE POLICY "Super admins see all sharing_rules" 
ON sharing_rules FOR ALL
USING (is_super_admin_user());

CREATE POLICY "Super admins see all manual_shares" 
ON manual_shares FOR ALL
USING (is_super_admin_user());

CREATE POLICY "Super admins see all list_views" 
ON list_views FOR ALL
USING (is_super_admin_user());