-- ============================================================================
-- MIGRATION: Importar Activos Existentes de tabla 'assets' a tablas separadas
-- Descripción: Migrar datos de assets (tabla antigua) a assets_it y assets_maintenance
-- Fecha: 2026-01-17
-- Autor: Sistema
-- ============================================================================

-- NOTA: Este script asume que ya ejecutaste migration-separate-it-maintenance-tables.sql
-- y que tienes datos en una tabla llamada 'assets' que necesitan ser migrados.

-- ============================================================================
-- PARTE 1: VERIFICAR QUE EXISTEN LAS TABLAS NUEVAS
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assets_it') THEN
    RAISE EXCEPTION 'La tabla assets_it no existe. Ejecuta primero migration-separate-it-maintenance-tables.sql';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assets_maintenance') THEN
    RAISE EXCEPTION 'La tabla assets_maintenance no existe. Ejecuta primero migration-separate-it-maintenance-tables.sql';
  END IF;
  
  RAISE NOTICE 'Tablas verificadas OK. Procediendo con migración...';
END $$;

-- ============================================================================
-- PARTE 2: MIGRAR ACTIVOS DE IT
-- ============================================================================

-- Los activos IT son aquellos de categorías/tipos de IT
-- Basado en la tabla asset_types o inferido por asset_type enum

INSERT INTO assets_it (
  id,
  asset_code,
  name,
  description,
  category,
  brand,
  model,
  serial_number,
  status,
  location_id,
  assigned_to_user_id,
  purchase_date,
  warranty_expiry,
  cost,
  notes,
  created_at,
  updated_at,
  deleted_at,
  created_by
)
SELECT 
  a.id,
  COALESCE(a.asset_tag, a.asset_code, 'IT-' || a.id::text) as asset_code,
  COALESCE(a.asset_name, a.model, 'Activo IT') as name,
  a.notes as description,
  COALESCE(a.asset_type::text, 'OTHER') as category,
  a.brand,
  a.model,
  a.serial_number,
  CASE 
    WHEN a.status = 'OPERATIONAL' THEN 'ACTIVE'
    WHEN a.status = 'MAINTENANCE' THEN 'MAINTENANCE'
    WHEN a.status = 'OUT_OF_SERVICE' THEN 'INACTIVE'
    WHEN a.status = 'RETIRED' THEN 'DISPOSED'
    ELSE 'ACTIVE'
  END as status,
  a.location_id,
  a.assigned_to as assigned_to_user_id,
  a.purchase_date,
  a.warranty_end_date as warranty_expiry,
  NULL as cost,
  a.notes,
  a.created_at,
  a.updated_at,
  a.deleted_at,
  a.created_by
FROM assets a
WHERE a.deleted_at IS NULL
  AND a.asset_type IN (
    'DESKTOP', 'LAPTOP', 'TABLET', 'PHONE', 'MONITOR', 
    'PRINTER', 'SCANNER', 'SERVER', 'NETWORK_DEVICE', 
    'PERIPHERAL', 'UPS', 'PROJECTOR', 'NETWORK'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PARTE 3: MIGRAR ACTIVOS DE MANTENIMIENTO
-- ============================================================================

-- Los activos de mantenimiento son aquellos de categorías específicas de mantenimiento

INSERT INTO assets_maintenance (
  id,
  asset_code,
  name,
  description,
  category,
  brand,
  model,
  serial_number,
  status,
  location_id,
  assigned_to_user_id,
  purchase_date,
  warranty_expiry,
  cost,
  notes,
  created_at,
  updated_at,
  deleted_at,
  created_by
)
SELECT 
  a.id,
  COALESCE(a.asset_tag, a.asset_code, 'MNT-' || a.id::text) as asset_code,
  COALESCE(a.asset_name, a.model, 'Activo Mantenimiento') as name,
  a.notes as description,
  COALESCE(a.asset_type::text, 'OTHER') as category,
  a.brand,
  a.model,
  a.serial_number,
  CASE 
    WHEN a.status = 'OPERATIONAL' THEN 'ACTIVE'
    WHEN a.status = 'MAINTENANCE' THEN 'MAINTENANCE'
    WHEN a.status = 'OUT_OF_SERVICE' THEN 'INACTIVE'
    WHEN a.status = 'RETIRED' THEN 'DISPOSED'
    ELSE 'ACTIVE'
  END as status,
  a.location_id,
  a.assigned_to as assigned_to_user_id,
  a.purchase_date,
  a.warranty_end_date as warranty_expiry,
  NULL as cost,
  a.notes,
  a.created_at,
  a.updated_at,
  a.deleted_at,
  a.created_by
FROM assets a
WHERE a.deleted_at IS NULL
  AND a.asset_type IN (
    'AIR_CONDITIONING', 'HVAC_SYSTEM', 'BOILER',
    'REFRIGERATOR', 'KITCHEN_EQUIPMENT',
    'WASHING_MACHINE', 'DRYER',
    'WATER_HEATER', 'PUMP', 'GENERATOR', 'ELEVATOR',
    'FURNITURE', 'FIXTURE', 'CLEANING_EQUIPMENT',
    'SECURITY_SYSTEM', 'FIRE_SYSTEM',
    'PLUMBING', 'ELECTRICAL', 'LIGHTING', 'VEHICLE', 'OTHER'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PARTE 4: VERIFICAR MIGRACIÓN
-- ============================================================================

DO $$
DECLARE
  v_assets_count bigint;
  v_it_count bigint;
  v_maint_count bigint;
BEGIN
  -- Contar activos originales (no eliminados)
  SELECT COUNT(*) INTO v_assets_count
  FROM assets
  WHERE deleted_at IS NULL;
  
  -- Contar activos IT migrados
  SELECT COUNT(*) INTO v_it_count
  FROM assets_it
  WHERE deleted_at IS NULL;
  
  -- Contar activos Mantenimiento migrados
  SELECT COUNT(*) INTO v_maint_count
  FROM assets_maintenance
  WHERE deleted_at IS NULL;
  
  RAISE NOTICE '============================================';
  RAISE NOTICE 'RESULTADOS DE MIGRACIÓN DE ACTIVOS:';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Activos originales (no eliminados): %', v_assets_count;
  RAISE NOTICE 'Activos IT migrados: %', v_it_count;
  RAISE NOTICE 'Activos Mantenimiento migrados: %', v_maint_count;
  RAISE NOTICE 'Total migrado: %', v_it_count + v_maint_count;
  RAISE NOTICE '============================================';
  
  IF v_assets_count = 0 THEN
    RAISE WARNING 'No hay activos en la tabla assets para migrar';
  ELSIF (v_it_count + v_maint_count) = 0 THEN
    RAISE WARNING 'No se migraron activos. Verifica que los asset_type coincidan con los valores esperados';
  END IF;
END $$;

-- ============================================================================
-- PARTE 5: CONSULTAS DE VERIFICACIÓN (Opcional - Comentadas)
-- ============================================================================

-- Descomenta estas queries para ver detalles de la migración:

/*
-- Ver distribución de activos IT por categoría
SELECT category, COUNT(*) as total
FROM assets_it
WHERE deleted_at IS NULL
GROUP BY category
ORDER BY total DESC;

-- Ver distribución de activos Mantenimiento por categoría
SELECT category, COUNT(*) as total
FROM assets_maintenance
WHERE deleted_at IS NULL
GROUP BY category
ORDER BY total DESC;

-- Ver activos IT por ubicación
SELECT l.name as location, COUNT(*) as total
FROM assets_it a
LEFT JOIN locations l ON a.location_id = l.id
WHERE a.deleted_at IS NULL
GROUP BY l.name
ORDER BY total DESC;

-- Ver activos Mantenimiento por ubicación
SELECT l.name as location, COUNT(*) as total
FROM assets_maintenance a
LEFT JOIN locations l ON a.location_id = l.id
WHERE a.deleted_at IS NULL
GROUP BY l.name
ORDER BY total DESC;

-- Ver activos que NO fueron migrados (si existen tipos no considerados)
SELECT asset_type, COUNT(*) as total
FROM assets
WHERE deleted_at IS NULL
  AND asset_type NOT IN (
    'DESKTOP', 'LAPTOP', 'TABLET', 'PHONE', 'MONITOR', 
    'PRINTER', 'SCANNER', 'SERVER', 'NETWORK_DEVICE', 
    'PERIPHERAL', 'UPS', 'PROJECTOR', 'NETWORK',
    'AIR_CONDITIONING', 'HVAC_SYSTEM', 'BOILER',
    'REFRIGERATOR', 'KITCHEN_EQUIPMENT',
    'WASHING_MACHINE', 'DRYER',
    'WATER_HEATER', 'PUMP', 'GENERATOR', 'ELEVATOR',
    'FURNITURE', 'FIXTURE', 'CLEANING_EQUIPMENT',
    'SECURITY_SYSTEM', 'FIRE_SYSTEM',
    'PLUMBING', 'ELECTRICAL', 'LIGHTING', 'VEHICLE', 'OTHER'
  )
GROUP BY asset_type;
*/

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================
