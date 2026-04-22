-- Add PIN to app_settings
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS admin_pin text DEFAULT '1234';

-- User roles table (extended with profile fields for UserManagement UI)
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  role text DEFAULT 'viewer' CHECK (role IN ('admin','technician','viewer')),
  email text,
  display_name text,
  avatar_url text,
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Any user can read their own row
CREATE POLICY "users_see_own_role" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Any user can insert their own row (first-access)
CREATE POLICY "users_insert_own_role" ON user_roles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Any user can update their own last_seen / avatar
CREATE POLICY "users_update_own_role" ON user_roles
  FOR UPDATE USING (auth.uid() = user_id);

-- Admins can do everything (SELECT all rows, UPDATE roles)
CREATE POLICY "admin_manage_all_roles" ON user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Auto-promote Sidney to admin
INSERT INTO user_roles (user_id, role, email)
SELECT id, 'admin', email
FROM auth.users
WHERE email = 'sidneyalves@msn.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
