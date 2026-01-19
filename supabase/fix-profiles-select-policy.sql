-- ============================================================================
-- FIX: Permitir a supervisores leer perfiles para asignar responsables
-- ============================================================================

-- 1. Ver políticas actuales de profiles
SELECT 
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename = 'profiles';

-- 2. Crear política para permitir SELECT a usuarios autenticados
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;

CREATE POLICY "Users can view all profiles"
ON profiles
FOR SELECT
USING (
  -- Cualquier usuario autenticado puede ver perfiles básicos
  auth.uid() IS NOT NULL
);

-- 3. Verificar
SELECT 'Política SELECT creada para profiles' as resultado;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles' AND cmd = 'SELECT';
