-- ============================================================================
-- TEST: Verificar si el usuario admin puede ver activos con RLS
-- ============================================================================
-- Ejecutar esto mientras estés autenticado como el usuario admin
-- en el navegador (usando el mismo token de sesión)
-- ============================================================================

-- 1. Verificar tu usuario actual y rol
SELECT 
  auth.uid() as current_user_id,
  p.id,
  p.role,
  p.location_id
FROM profiles p
WHERE p.id = auth.uid();

-- 2. Contar activos que deberías poder ver (sin RLS - tabla completa)
SELECT 
  COUNT(*) FILTER (WHERE deleted_at IS NULL AND status IN ('OPERATIONAL', 'MAINTENANCE')) as total_assets_it
FROM assets;

SELECT 
  COUNT(*) FILTER (WHERE deleted_at IS NULL AND status IN ('ACTIVE', 'MAINTENANCE')) as total_assets_maintenance
FROM assets_maintenance;

-- 3. Intentar ver activos CON RLS habilitado (lo que ve la app)
-- Esto debería retornar los mismos números si RLS funciona correctamente
SELECT COUNT(*) as assets_visible_with_rls
FROM assets 
WHERE deleted_at IS NULL 
  AND status IN ('OPERATIONAL', 'MAINTENANCE');

SELECT COUNT(*) as assets_maintenance_visible_with_rls
FROM assets_maintenance
WHERE deleted_at IS NULL 
  AND status IN ('ACTIVE', 'MAINTENANCE');

-- 4. Ver algunos ejemplos de activos
SELECT 
  id,
  asset_tag,
  asset_type,
  brand,
  model,
  status,
  location_id
FROM assets
WHERE deleted_at IS NULL 
  AND status IN ('OPERATIONAL', 'MAINTENANCE')
LIMIT 3;

-- 5. Verificar la política de nuevo
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'assets'
  AND policyname = 'assets_unified_select';
