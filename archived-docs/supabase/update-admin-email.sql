-- Script para actualizar el email del usuario admin
-- Cambiar: helpdesk@integrational3.com.mx -> ziiihelpdesk@gmail.com

-- Actualizar email en auth.users
UPDATE auth.users
SET 
  email = 'ziiihelpdesk@gmail.com',
  raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{email}',
    '"ziiihelpdesk@gmail.com"'
  )
WHERE id = '5bbcb355-45de-49e8-858a-35d0bf96ccbf';

-- Verificar el cambio
SELECT 
  id,
  email,
  raw_user_meta_data->>'full_name' as full_name,
  created_at
FROM auth.users
WHERE id = '5bbcb355-45de-49e8-858a-35d0bf96ccbf';
