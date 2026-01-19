-- ============================================================================
-- VERIFICACIÓN Y CORRECCIÓN DEL FILTRADO DE ACTIVOS POR SEDE
-- ============================================================================
-- Este script verifica que los activos tengan el status correcto para aparecer
-- en los selectores de tickets tanto de IT como de Mantenimiento

-- ============================================================================
-- PARTE 1: DIAGNÓSTICO
-- ============================================================================

-- 1.1 Ver cuántos activos de mantenimiento hay por sede
SELECT 
  l.code as sede_code,
  l.name as sede_name,
  COUNT(am.id) as total_activos,
  COUNT(CASE WHEN am.status = 'ACTIVE' THEN 1 END) as activos_ACTIVE,
  COUNT(CASE WHEN am.status = 'MAINTENANCE' THEN 1 END) as activos_MAINTENANCE,
  COUNT(CASE WHEN am.status IS NULL THEN 1 END) as activos_SIN_STATUS,
  COUNT(CASE WHEN am.status NOT IN ('ACTIVE', 'MAINTENANCE') AND am.status IS NOT NULL THEN 1 END) as activos_OTRO_STATUS
FROM locations l
LEFT JOIN assets_maintenance am ON am.location_id = l.id AND am.deleted_at IS NULL
GROUP BY l.id, l.code, l.name
ORDER BY l.code;

-- 1.2 Ver qué valores de status existen en assets_maintenance
SELECT 
  status,
  COUNT(*) as cantidad
FROM assets_maintenance
WHERE deleted_at IS NULL
GROUP BY status
ORDER BY status;

-- 1.3 Ver cuántos activos de IT hay por sede
SELECT 
  l.code as sede_code,
  l.name as sede_name,
  COUNT(a.id) as total_activos,
  COUNT(CASE WHEN a.status = 'OPERATIONAL' THEN 1 END) as activos_OPERATIONAL,
  COUNT(CASE WHEN a.status = 'MAINTENANCE' THEN 1 END) as activos_MAINTENANCE,
  COUNT(CASE WHEN a.status IS NULL THEN 1 END) as activos_SIN_STATUS,
  COUNT(CASE WHEN a.status NOT IN ('OPERATIONAL', 'MAINTENANCE') AND a.status IS NOT NULL THEN 1 END) as activos_OTRO_STATUS
FROM locations l
LEFT JOIN assets a ON a.location_id = l.id AND a.deleted_at IS NULL
GROUP BY l.id, l.code, l.name
ORDER BY l.code;

-- 1.4 Ver qué valores de status existen en assets (IT)
SELECT 
  status,
  COUNT(*) as cantidad
FROM assets
WHERE deleted_at IS NULL
GROUP BY status
ORDER BY status;

-- 1.5 Verificar user_locations - usuarios con múltiples sedes
SELECT 
  p.full_name,
  p.role,
  p.location_id as sede_principal,
  pl.code as sede_principal_code,
  ARRAY_AGG(ul.location_id) as sedes_adicionales,
  ARRAY_AGG(l.code) as sedes_adicionales_codes
FROM profiles p
LEFT JOIN locations pl ON pl.id = p.location_id
LEFT JOIN user_locations ul ON ul.user_id = p.id
LEFT JOIN locations l ON l.id = ul.location_id
WHERE p.role::text IN ('supervisor', 'admin', 'corporate_admin')
GROUP BY p.id, p.full_name, p.role, p.location_id, pl.code
ORDER BY p.role, p.full_name;

-- ============================================================================
-- PARTE 2: CORRECCIÓN (EJECUTAR SOLO SI ES NECESARIO)
-- ============================================================================

-- 2.1 Corregir activos de mantenimiento sin status -> ACTIVE
UPDATE assets_maintenance
SET status = 'ACTIVE'
WHERE status IS NULL AND deleted_at IS NULL;

-- 2.2 Corregir activos de mantenimiento con status inválido -> ACTIVE
UPDATE assets_maintenance
SET status = 'ACTIVE'
WHERE status NOT IN ('ACTIVE', 'MAINTENANCE', 'DISPOSED', 'DECOMMISSIONED') 
  AND deleted_at IS NULL;

-- 2.3 Corregir activos de IT sin status -> OPERATIONAL
UPDATE assets
SET status = 'OPERATIONAL'
WHERE status IS NULL AND deleted_at IS NULL;

-- 2.4 Corregir activos de IT con status inválido -> OPERATIONAL  
UPDATE assets
SET status = 'OPERATIONAL'
WHERE status NOT IN ('OPERATIONAL', 'MAINTENANCE', 'DISPOSED', 'DECOMMISSIONED', 'RETIRED')
  AND deleted_at IS NULL;

-- ============================================================================
-- PARTE 3: VERIFICACIÓN FINAL
-- ============================================================================

SELECT '=== RESUMEN ASSETS_MAINTENANCE ===' as info;
SELECT status, COUNT(*) as cantidad 
FROM assets_maintenance WHERE deleted_at IS NULL 
GROUP BY status;

SELECT '=== RESUMEN ASSETS (IT) ===' as info;
SELECT status, COUNT(*) as cantidad 
FROM assets WHERE deleted_at IS NULL 
GROUP BY status;

SELECT '=== ACTIVOS VISIBLES POR SEDE (MANTENIMIENTO) ===' as info;
SELECT 
  l.code,
  COUNT(*) as activos_visibles
FROM assets_maintenance am
JOIN locations l ON l.id = am.location_id
WHERE am.deleted_at IS NULL 
  AND am.status IN ('ACTIVE', 'MAINTENANCE')
GROUP BY l.code
ORDER BY l.code;

SELECT '=== ACTIVOS VISIBLES POR SEDE (IT) ===' as info;
SELECT 
  l.code,
  COUNT(*) as activos_visibles
FROM assets a
JOIN locations l ON l.id = a.location_id
WHERE a.deleted_at IS NULL 
  AND a.status IN ('OPERATIONAL', 'MAINTENANCE')
GROUP BY l.code
ORDER BY l.code;
