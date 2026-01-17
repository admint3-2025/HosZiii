-- Agregar el nuevo rol corporate_admin al ENUM user_role
-- Ejecutar en Supabase SQL Editor
-- Fecha: 2026-01-17

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'user_role'
      AND e.enumlabel = 'corporate_admin'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'corporate_admin';
  END IF;
END $$;

-- Verificar que el rol fue agregado correctamente
SELECT enum_range(NULL::user_role);

-- Para asignar usuarios al rol corporate_admin (reemplaza emails según corresponda):
-- UPDATE profiles
-- SET role = 'corporate_admin'
-- WHERE id IN (
--   SELECT u.id FROM auth.users u
--   WHERE u.email = 'usuario@ejemplo.com'
-- );

-- Para ver todos los usuarios con el nuevo rol:
-- SELECT email, full_name, role
-- FROM profiles
-- WHERE role = 'corporate_admin';
