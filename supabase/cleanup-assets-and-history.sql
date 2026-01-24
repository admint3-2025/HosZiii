-- ============================================================================
-- SCRIPT: Eliminar Activos de IT y Mantenimiento + Auditoría e Historial
-- ============================================================================
-- 
-- ADVERTENCIA: Este script es DESTRUCTIVO. Realiza una copia de seguridad antes.
-- 
-- Este script limpia:
-- 1. Activos de IT (assets_it) y Mantenimiento (assets_maintenance)
-- 2. Historial de cambios (asset_changes)
-- 3. Auditoría de cambios (audit_log)
-- 4. Solicitudes de baja (asset_disposal_requests)
-- 5. Attachments relacionados (asset_disposal_attachments)
-- 6. Opcionalmente: tickets relacionados (comentado por seguridad)
--
-- MODO DE USO:
-- - Opción 1: Limpiar TODO (descomentar TRUNCATE al final)
-- - Opción 2: Limpiar activos específicos (usar filtro WHERE)
-- - Opción 3: Limpiar solo historial sin tocar activos (comentar secciones de DELETE)
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- OPCIÓN 1: VER ESTADÍSTICAS ANTES DE LIMPIAR
-- ============================================================================

SELECT 
  (SELECT COUNT(*) FROM assets_it WHERE deleted_at IS NULL) as "Activos IT (activos)",
  (SELECT COUNT(*) FROM assets_it WHERE deleted_at IS NOT NULL) as "Activos IT (eliminados)",
  (SELECT COUNT(*) FROM assets_maintenance WHERE deleted_at IS NULL) as "Activos Mantenimiento (activos)",
  (SELECT COUNT(*) FROM assets_maintenance WHERE deleted_at IS NOT NULL) as "Activos Mantenimiento (eliminados)",
  (SELECT COUNT(*) FROM asset_changes) as "Cambios registrados",
  (SELECT COUNT(*) FROM audit_log WHERE entity_type = 'asset') as "Auditoría de activos",
  (SELECT COUNT(*) FROM asset_disposal_requests) as "Solicitudes de baja";

-- ============================================================================
-- OPCIÓN 2: LIMPIAR ACTIVOS ESPECÍFICOS (FILTRADO)
-- ============================================================================

-- Descomentar si quieres limpiar activos por condición específica:
-- Ejemplo 1: Limpiar solo activos con estado "INACTIVE"
-- Ejemplo 2: Limpiar solo activos creados antes de fecha X
-- Ejemplo 3: Limpiar solo activos de una ubicación específica

-- Variables para filtrado (EDITA SEGÚN NECESITES):
-- SET @filter_status = 'INACTIVE';  -- NULL = no filtrar por estado
-- SET @filter_location_id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';  -- NULL = no filtrar
-- SET @filter_before_date = '2024-01-01';  -- NULL = no filtrar

-- ============================================================================
-- PASO 1: Guardar información de activos a eliminar (para auditoría manual)
-- ============================================================================

-- Crear tabla temporal con info de activos a eliminar
CREATE TEMP TABLE assets_to_delete AS
SELECT 
  id, asset_code, asset_type, name, status, created_at
FROM assets_it
WHERE deleted_at IS NULL
  -- AND status = 'INACTIVE'  -- Descomentar para filtrar
  -- AND location_id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'  -- Filtrar por sede
  -- AND created_at < '2024-01-01'  -- Filtrar por fecha
UNION ALL
SELECT 
  id, asset_code, category, name, status, created_at
FROM assets_maintenance
WHERE deleted_at IS NULL;

SELECT '📋 ACTIVOS A ELIMINAR:' as info;
SELECT * FROM assets_to_delete;

-- ============================================================================
-- PASO 2: LIMPIAR EN ORDEN (respetando FK)
-- ============================================================================

-- 2.1. Eliminar attachments de solicitudes de baja
DELETE FROM asset_disposal_attachments
WHERE disposal_request_id IN (
  SELECT id FROM asset_disposal_requests
  WHERE asset_id IN (SELECT id FROM assets_to_delete)
);

-- 2.2. Eliminar solicitudes de baja
DELETE FROM asset_disposal_requests
WHERE asset_id IN (SELECT id FROM assets_to_delete);

-- 2.3. Eliminar historial de cambios (asset_changes)
DELETE FROM asset_changes
WHERE asset_id IN (SELECT id FROM assets_to_delete);

-- 2.4. Eliminar auditoría (audit_log)
DELETE FROM audit_log
WHERE entity_type = 'asset' 
  AND entity_id::text = ANY(ARRAY(SELECT id::text FROM assets_to_delete));

-- 2.5. OPCIÓN: Eliminar tickets relacionados (comentado por seguridad)
-- DELETE FROM tickets
-- WHERE asset_id IN (SELECT id FROM assets_to_delete);
--
-- DELETE FROM tickets_maintenance
-- WHERE asset_id IN (SELECT id FROM assets_to_delete);

-- 2.6. Eliminar activos IT
DELETE FROM assets_it
WHERE id IN (SELECT id FROM assets_to_delete WHERE asset_type IS NOT NULL);

-- 2.7. Eliminar activos Mantenimiento
DELETE FROM assets_maintenance
WHERE id IN (SELECT id FROM assets_to_delete);

-- ============================================================================
-- PASO 3: VERIFICAR RESULTADO
-- ============================================================================

SELECT 
  (SELECT COUNT(*) FROM assets_it WHERE deleted_at IS NULL) as "Activos IT restantes",
  (SELECT COUNT(*) FROM assets_maintenance WHERE deleted_at IS NULL) as "Activos Mantenimiento restantes",
  (SELECT COUNT(*) FROM asset_changes) as "Cambios registrados (restantes)",
  (SELECT COUNT(*) FROM audit_log WHERE entity_type = 'asset') as "Auditoría (restante)";

-- ============================================================================
-- PASO 4: CONFIRMAR O DESHACER
-- ============================================================================

-- COMMIT;     -- Descomentar para confirmar cambios
-- ROLLBACK;   -- Comentar si quieres confirmar con COMMIT

-- ============================================================================
-- OPCIÓN 3: LIMPIAR TODO (tablas completas) - ¡PELIGRO!
-- ============================================================================

-- Solo si necesitas limpiar TODAS las tablas (sin filtro)
-- Descomentar CON CUIDADO:

-- TRUNCATE TABLE asset_disposal_attachments CASCADE;
-- TRUNCATE TABLE asset_disposal_requests CASCADE;
-- TRUNCATE TABLE asset_changes CASCADE;
-- DELETE FROM audit_log WHERE entity_type = 'asset';
-- TRUNCATE TABLE assets_it CASCADE;
-- TRUNCATE TABLE assets_maintenance CASCADE;

-- ============================================================================
-- NOTAS:
-- ============================================================================
-- 
-- 1. Este script usa TRANSACCIÓN (BEGIN/COMMIT/ROLLBACK)
--    Permite revisar cambios antes de confirmar.
--
-- 2. Para FILTRAR por condición, descomenta las líneas marcadas en PASO 2
--
-- 3. Para ELIMINAR TICKETS, descomenta la sección 2.5
--
-- 4. Si quieres VACIAR TODO sin filtro, descomenta OPCIÓN 3 (¡cuidado!)
--
-- 5. Si algo falla, el ROLLBACK deshace TODO (mientras no hayas hecho COMMIT)
--
-- ============================================================================
