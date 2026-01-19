-- ============================================================================
-- VERIFICAR SI HAY ACTIVOS EN LA BASE DE DATOS
-- ============================================================================

-- 1. Contar TODOS los activos sin filtros
SELECT 'assets' as tabla, COUNT(*) as total FROM assets;
SELECT 'assets_maintenance' as tabla, COUNT(*) as total FROM assets_maintenance;

-- 2. Contar activos NO eliminados
SELECT 'assets (no eliminados)' as tabla, COUNT(*) as total 
FROM assets WHERE deleted_at IS NULL;

SELECT 'assets_maintenance (no eliminados)' as tabla, COUNT(*) as total 
FROM assets_maintenance WHERE deleted_at IS NULL;

-- 3. Contar activos con status válido
SELECT 'assets OPERATIONAL/MAINTENANCE' as tabla, COUNT(*) as total
FROM assets 
WHERE deleted_at IS NULL 
  AND status IN ('OPERATIONAL', 'MAINTENANCE');

SELECT 'assets_maintenance ACTIVE/MAINTENANCE' as tabla, COUNT(*) as total
FROM assets_maintenance 
WHERE deleted_at IS NULL 
  AND status IN ('ACTIVE', 'MAINTENANCE');

-- 4. Ver TODOS los status únicos que existen
SELECT DISTINCT status, COUNT(*) as cantidad
FROM assets
WHERE deleted_at IS NULL
GROUP BY status
ORDER BY cantidad DESC;

SELECT DISTINCT status, COUNT(*) as cantidad
FROM assets_maintenance
WHERE deleted_at IS NULL
GROUP BY status
ORDER BY cantidad DESC;

-- 5. Ver algunos activos de ejemplo (CUALQUIER status)
SELECT id, asset_tag, asset_type, brand, status, deleted_at
FROM assets
ORDER BY created_at DESC
LIMIT 5;

SELECT id, asset_code, category, brand, status, deleted_at
FROM assets_maintenance
ORDER BY created_at DESC
LIMIT 5;
