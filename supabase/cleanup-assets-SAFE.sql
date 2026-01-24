-- ============================================================================
-- SCRIPT SEGURO: Soft Delete de Activos + Limpieza de Historial
-- ============================================================================
--
-- VENTAJAS:
-- - NO rompe foreign keys (usa soft delete: marca deleted_at)
-- - Limpia historial y auditoría
-- - Los datos quedan guardados (no se pierden)
-- - Todas las queries usan deleted_at IS NULL, así no se ven
--
-- OPCIÓN 1: LIMPIAR TODO (ejecuta tal cual)
-- OPCIÓN 2: LIMPIAR SOLO CIERTOS ACTIVOS (edita el WHERE)
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- ESTADÍSTICAS ANTES
-- ============================================================================

SELECT 
  (SELECT COUNT(*) FROM assets_it WHERE deleted_at IS NULL) as "IT Activos",
  (SELECT COUNT(*) FROM assets_it WHERE deleted_at IS NOT NULL) as "IT Eliminados",
  (SELECT COUNT(*) FROM assets_maintenance WHERE deleted_at IS NULL) as "Mant Activos",
  (SELECT COUNT(*) FROM assets_maintenance WHERE deleted_at IS NOT NULL) as "Mant Eliminados",
  (SELECT COUNT(*) FROM asset_changes) as "Cambios en historial",
  (SELECT COUNT(*) FROM asset_disposal_requests) as "Solicitudes baja";

-- ============================================================================
-- PASO 1: Soft Delete de ACTIVOS IT (no rompe FK)
-- ============================================================================

UPDATE assets_it
SET deleted_at = NOW(), deleted_by = auth.uid()
WHERE deleted_at IS NULL
  -- DESCOMENTA Y EDITA PARA FILTRAR:
  -- AND status = 'INACTIVE'
  -- AND location_id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
  -- AND created_at < '2024-01-01'
  -- AND asset_code LIKE '%PATTERN%'
;

-- ============================================================================
-- PASO 2: Soft Delete de ACTIVOS MANTENIMIENTO (no rompe FK)
-- ============================================================================

UPDATE assets_maintenance
SET deleted_at = NOW(), deleted_by = auth.uid()
WHERE deleted_at IS NULL
  -- DESCOMENTA Y EDITA PARA FILTRAR:
  -- AND status = 'INACTIVE'
  -- AND location_id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
  -- AND created_at < '2024-01-01'
;

-- ============================================================================
-- PASO 3: LIMPIAR HISTORIAL (asset_changes)
-- ============================================================================

DELETE FROM asset_changes
WHERE asset_id IN (
  SELECT id FROM assets_it WHERE deleted_at IS NOT NULL
    UNION
  SELECT id FROM assets_maintenance WHERE deleted_at IS NOT NULL
);

-- ============================================================================
-- PASO 4: LIMPIAR SOLICITUDES DE BAJA
-- ============================================================================

DELETE FROM asset_disposal_attachments
WHERE disposal_request_id IN (
  SELECT id FROM asset_disposal_requests
  WHERE asset_id IN (
    SELECT id FROM assets_it WHERE deleted_at IS NOT NULL
      UNION
    SELECT id FROM assets_maintenance WHERE deleted_at IS NOT NULL
  )
);

DELETE FROM asset_disposal_requests
WHERE asset_id IN (
  SELECT id FROM assets_it WHERE deleted_at IS NOT NULL
    UNION
  SELECT id FROM assets_maintenance WHERE deleted_at IS NOT NULL
);

-- ============================================================================
-- PASO 5: LIMPIAR AUDITORÍA (audit_log)
-- ============================================================================

DELETE FROM audit_log
WHERE entity_type = 'asset'
  AND entity_id::text IN (
    SELECT id::text FROM assets_it WHERE deleted_at IS NOT NULL
      UNION
    SELECT id::text FROM assets_maintenance WHERE deleted_at IS NOT NULL
  );

-- ============================================================================
-- ESTADÍSTICAS DESPUÉS
-- ============================================================================

SELECT 
  (SELECT COUNT(*) FROM assets_it WHERE deleted_at IS NULL) as "IT Activos",
  (SELECT COUNT(*) FROM assets_it WHERE deleted_at IS NOT NULL) as "IT Eliminados",
  (SELECT COUNT(*) FROM assets_maintenance WHERE deleted_at IS NULL) as "Mant Activos",
  (SELECT COUNT(*) FROM assets_maintenance WHERE deleted_at IS NOT NULL) as "Mant Eliminados",
  (SELECT COUNT(*) FROM asset_changes) as "Cambios (restantes)",
  (SELECT COUNT(*) FROM asset_disposal_requests) as "Solicitudes (restantes)";

-- ============================================================================
-- CONFIRMAR O DESHACER
-- ============================================================================

COMMIT;    -- Ejecuta los cambios
-- ROLLBACK;  -- Descomenta para deshacer todo

-- ============================================================================
-- NOTAS:
-- ============================================================================
--
-- 1. "Soft Delete" = marca deleted_at, no borra físicamente
--    ✓ No rompe foreign keys de tickets
--    ✓ Los datos quedan en DB para auditoría/recuperación
--    ✓ Las queries ya usan "WHERE deleted_at IS NULL"
--
-- 2. Para filtrar qué activos eliminar, descomenta/edita las líneas "AND"
--
-- 3. El historial (asset_changes, audit_log) se borra físicamente
--    Si lo necesitas para auditoría, comenta esos bloques
--
-- 4. Si algo falla, vuelve a ejecutar con ROLLBACK en lugar de COMMIT
--
-- 5. Para recuperar activos: UPDATE assets_it SET deleted_at = NULL
--
-- ============================================================================
