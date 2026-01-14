-- ========================================
-- Script para cambiar contraseña de usuario
-- ========================================
-- Ejecutar en Supabase SQL Editor

-- OPCIÓN 1: Cambiar por EMAIL
-- Reemplaza 'usuario@ejemplo.com' y 'NuevaPassword123!'
UPDATE auth.users 
SET 
  encrypted_password = crypt('NuevaPassword123!', gen_salt('bf')),
  updated_at = now()
WHERE email = 'usuario@ejemplo.com';

-- Verificar el cambio
SELECT 
  id,
  email,
  created_at,
  updated_at,
  last_sign_in_at
FROM auth.users 
WHERE email = 'usuario@ejemplo.com';


-- ========================================
-- OPCIÓN 2: Cambiar por ID de usuario
-- ========================================
-- Reemplaza 'UUID-DEL-USUARIO' y 'NuevaPassword123!'
UPDATE auth.users 
SET 
  encrypted_password = crypt('NuevaPassword123!', gen_salt('bf')),
  updated_at = now()
WHERE id = 'UUID-DEL-USUARIO';


-- ========================================
-- OPCIÓN 3: Resetear contraseña temporal
-- ========================================
-- Asignar contraseña temporal "Temporal123!" a un usuario
UPDATE auth.users 
SET 
  encrypted_password = crypt('Temporal123!', gen_salt('bf')),
  updated_at = now(),
  email_confirmed_at = COALESCE(email_confirmed_at, now()) -- Confirmar email si no está confirmado
WHERE email = 'usuario@ejemplo.com';

-- Mostrar la info actualizada
SELECT 
  email,
  'Temporal123!' as password_temporal,
  updated_at as fecha_cambio
FROM auth.users 
WHERE email = 'usuario@ejemplo.com';


-- ========================================
-- OPCIÓN 4: Cambiar contraseñas de múltiples usuarios
-- ========================================
-- Asignar misma contraseña a varios usuarios
UPDATE auth.users 
SET 
  encrypted_password = crypt('Password2026!', gen_salt('bf')),
  updated_at = now()
WHERE email IN (
  'usuario1@ejemplo.com',
  'usuario2@ejemplo.com',
  'usuario3@ejemplo.com'
);


-- ========================================
-- FUNCIÓN ÚTIL: Ver usuarios sin contraseña válida
-- ========================================
SELECT 
  id,
  email,
  encrypted_password IS NULL as sin_password,
  created_at,
  last_sign_in_at,
  CASE 
    WHEN last_sign_in_at IS NULL THEN 'Nunca ha ingresado'
    WHEN last_sign_in_at < now() - interval '30 days' THEN 'Inactivo +30 días'
    ELSE 'Activo'
  END as estado
FROM auth.users
ORDER BY last_sign_in_at DESC NULLS LAST;


-- ========================================
-- LIMPIEZA: Eliminar sesiones activas (forzar re-login)
-- ========================================
-- Después de cambiar contraseña, eliminar sesiones para forzar nuevo login
DELETE FROM auth.sessions
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'usuario@ejemplo.com'
);


-- ========================================
-- SCRIPT COMPLETO: Cambiar password + limpiar sesiones
-- ========================================
DO $$ 
DECLARE
  v_email text := 'usuario@ejemplo.com';
  v_password text := 'NuevaPassword2026!';
  v_user_id uuid;
BEGIN
  -- Actualizar contraseña
  UPDATE auth.users 
  SET 
    encrypted_password = crypt(v_password, gen_salt('bf')),
    updated_at = now()
  WHERE email = v_email
  RETURNING id INTO v_user_id;
  
  -- Eliminar sesiones activas
  DELETE FROM auth.sessions WHERE user_id = v_user_id;
  
  -- Mostrar resultado
  RAISE NOTICE 'Contraseña cambiada para: %', v_email;
  RAISE NOTICE 'Nueva contraseña: %', v_password;
  RAISE NOTICE 'Usuario debe hacer login nuevamente';
END $$;
