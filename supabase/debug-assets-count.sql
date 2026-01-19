-- ============================================================================
-- DEBUG: Verificar conteo de activos en las tablas
-- ============================================================================

-- Contar activos IT (tabla assets)
SELECT 
  'assets (IT)' as tabla,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE deleted_at IS NULL) as activos,
  COUNT(*) FILTER (WHERE deleted_at IS NULL AND status IN ('OPERATIONAL', 'MAINTENANCE')) as disponibles
FROM assets;

-- Contar activos de Mantenimiento
SELECT 
  'assets_maintenance' as tabla,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE deleted_at IS NULL) as activos,
  COUNT(*) FILTER (WHERE deleted_at IS NULL AND status IN ('ACTIVE', 'MAINTENANCE')) as disponibles
FROM assets_maintenance;

-- Ver algunos activos de ejemplo (IT)
SELECT 
  id, 
  asset_tag, 
  asset_type, 
  brand, 
  model, 
  status, 
  location_id,
  deleted_at
FROM assets 
WHERE deleted_at IS NULL 
  AND status IN ('OPERATIONAL', 'MAINTENANCE')
LIMIT 5;

-- Ver algunos activos de ejemplo (Mantenimiento)
SELECT 
  id, 
  asset_code, 
  category, 
  brand, 
  model, 
  status, 
  location_id,
  deleted_at
FROM assets_maintenance 
WHERE deleted_at IS NULL 
  AND status IN ('ACTIVE', 'MAINTENANCE')
LIMIT 5;

-- Verificar política RLS actual para assets
SELECT 
  tablename,
  policyname,
  cmd,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('assets', 'assets_maintenance')
ORDER BY tablename, policyname;
