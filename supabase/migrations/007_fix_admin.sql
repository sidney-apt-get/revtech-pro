-- Remove admin do email antigo
UPDATE user_roles SET role = 'viewer'
WHERE email = 'sidneyalves@msn.com';

-- Define novo email como admin
INSERT INTO user_roles (user_id, role, email)
SELECT id, 'admin', email FROM auth.users
WHERE email = 'sidneycomvoce@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
