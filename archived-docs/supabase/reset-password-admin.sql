-- ========================================
-- Script para resetear contraseña de ADMIN
-- ========================================
-- Uso rápido para recuperar acceso de administrador

-- ADMIN: admin@tuempresa.com -> Password: Admin2026!
UPDATE auth.users 
SET 
  encrypted_password = crypt('Admin2026!', gen_salt('bf')),
  updated_at = now(),
  email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email = 'admin@tuempresa.com';

-- Asegurar que tenga rol de admin
UPDATE profiles
SET 
  role = 'admin',
  full_name = 'Administrador'
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@tuempresa.com');

-- Limpiar sesiones
DELETE FROM auth.sessions
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@tuempresa.com');

-- Mostrar resultado
SELECT 
  u.email,
  p.full_name,
  p.role,
  'Admin2026!' as nueva_password
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE u.email = 'admin@tuempresa.com';
