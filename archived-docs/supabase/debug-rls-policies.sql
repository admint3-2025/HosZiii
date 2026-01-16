-- ============================================================================
-- DEBUG: VERIFICAR TODAS LAS POLÍTICAS RLS ACTUALES
-- ============================================================================
-- Este script te muestra TODAS las políticas activas para assets y locations
-- para identificar por qué los supervisores siguen viendo todo.
-- ============================================================================

-- 1. Ver TODAS las políticas en assets (SELECT, INSERT, UPDATE, DELETE, ALL)
SELECT 
  'ASSETS' as tabla,
  policyname, 
  cmd,
  permissive,
  roles,
  substring(qual::text, 1, 100) as using_clause,
  substring(with_check::text, 1, 100) as with_check_clause
FROM pg_policies 
WHERE tablename = 'assets'
ORDER BY cmd, policyname;

-- 2. Ver TODAS las políticas en locations
SELECT 
  'LOCATIONS' as tabla,
  policyname, 
  cmd,
  permissive,
  roles,
  substring(qual::text, 1, 100) as using_clause,
  substring(with_check::text, 1, 100) as with_check_clause
FROM pg_policies 
WHERE tablename = 'locations'
ORDER BY cmd, policyname;

-- 3. Verificar estado de RLS en ambas tablas
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('assets', 'locations');

-- 4. Verificar usuario actual y su rol
SELECT 
  auth.uid() as user_id,
  p.full_name,
  p.role,
  p.location_id as primary_location,
  l.name as primary_location_name
FROM profiles p
LEFT JOIN locations l ON l.id = p.location_id
WHERE p.id = auth.uid();

-- 5. Verificar ubicaciones asignadas al usuario actual
SELECT 
  ul.user_id,
  ul.location_id,
  l.code,
  l.name
FROM user_locations ul
JOIN locations l ON l.id = ul.location_id
WHERE ul.user_id = auth.uid();

-- 6. TEST: Contar cuántos activos ve el usuario actual
SELECT COUNT(*) as total_assets_visible
FROM assets
WHERE deleted_at IS NULL;

-- 7. TEST: Contar cuántas ubicaciones ve el usuario actual
SELECT COUNT(*) as total_locations_visible
FROM locations
WHERE is_active = true;
