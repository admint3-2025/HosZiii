-- Cambiar contraseña de un usuario
-- Reemplaza 'email@ejemplo.com' y 'NuevaPassword123'

UPDATE auth.users 
SET 
  encrypted_password = crypt('NuevaPassword123', gen_salt('bf')),
  updated_at = NOW()
WHERE email = 'email@ejemplo.com';
