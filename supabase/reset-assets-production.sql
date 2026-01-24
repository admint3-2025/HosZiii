-- ============================================================================
-- RESET COMPLETO: Elimina TODO de Activos (IT + Mantenimiento + Historial)
-- Para Producción - DESTRUCTIVO
-- ============================================================================
--
-- ADVERTENCIA: Este script BORRA FÍSICAMENTE todos los activos y su historial.
-- 
-- Limpia en orden (respeta FK):
-- 1. Attachments de solicitudes de baja
-- 2. Solicitudes de baja (asset_disposal_requests)
-- 3. Historial de cambios (asset_changes)
-- 4. Auditoría de activos (audit_log)
-- 5. Tickets relacionados (OPCIONAL)
-- 6. Activos IT (assets_it)
-- 7. Activos Mantenimiento (assets_maintenance)
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- ESTADÍSTICAS ANTES
-- ============================================================================

SELECT 
  '📊 ESTADO ACTUAL' as info,
  (SELECT COUNT(*) FROM assets_it) as "IT Total",
  (SELECT COUNT(*) FROM assets_maintenance) as "Mant Total",
  (SELECT COUNT(*) FROM asset_changes) as "Cambios",
  (SELECT COUNT(*) FROM asset_disposal_requests) as "Bajas pendientes",
  (SELECT COUNT(*) FROM tickets WHERE asset_id IS NOT NULL) as "Tickets IT",
  (SELECT COUNT(*) FROM tickets_maintenance WHERE asset_id IS NOT NULL) as "Tickets Mant";

-- ============================================================================
-- PASO 1: Limpiar solicitudes de baja (si existen)
-- ============================================================================

DELETE FROM asset_disposal_requests WHERE TRUE;

-- ============================================================================
-- PASO 2: Limpiar historial de cambios
-- ============================================================================

DELETE FROM asset_changes;

-- ============================================================================
-- PASO 3: Limpiar auditoría de activos
-- ============================================================================

DELETE FROM audit_log
WHERE entity_type = 'asset';

-- ============================================================================
-- PASO 4: OPCIONAL - Limpiar Tickets relacionados
-- ============================================================================
-- Descomenta si quieres borrar tickets también:
--
-- DELETE FROM ticket_comments
-- WHERE ticket_id IN (
--   SELECT id FROM tickets WHERE asset_id IS NOT NULL
--     UNION
--   SELECT id FROM tickets_maintenance WHERE asset_id IS NOT NULL
-- );
--
-- DELETE FROM tickets
-- WHERE asset_id IS NOT NULL;
--
-- DELETE FROM tickets_maintenance
-- WHERE asset_id IS NOT NULL;

-- ============================================================================
-- PASO 5: Limpiar Activos IT
-- ============================================================================

DELETE FROM assets_it;

-- ============================================================================
-- PASO 6: Limpiar Activos Mantenimiento
-- ============================================================================

DELETE FROM assets_maintenance;

-- ============================================================================
-- RESETEAR SECUENCIAS (si existen)
-- ============================================================================
-- Esto reinicia los ID auto-increment para que los nuevos activos comiencen desde 1

-- ALTER SEQUENCE assets_it_id_seq RESTART WITH 1;
-- ALTER SEQUENCE assets_maintenance_id_seq RESTART WITH 1;
-- ALTER SEQUENCE asset_changes_id_seq RESTART WITH 1;

-- ============================================================================
-- ESTADÍSTICAS DESPUÉS
-- ============================================================================

SELECT 
  '✅ RESET COMPLETADO' as info,
  (SELECT COUNT(*) FROM assets_it) as "IT Total",
  (SELECT COUNT(*) FROM assets_maintenance) as "Mant Total",
  (SELECT COUNT(*) FROM asset_changes) as "Cambios",
  (SELECT COUNT(*) FROM asset_disposal_requests) as "Bajas pendientes";

-- ============================================================================
-- CONFIRMAR O DESHACER
-- ============================================================================

COMMIT;    -- Ejecuta el RESET
-- ROLLBACK;  -- Descomenta para deshacer todo

-- ============================================================================
-- NOTAS:
-- ============================================================================
--
-- ✓ Este script elimina FÍSICAMENTE (DELETE, no soft delete)
-- ✓ No rompe FK porque limpia en orden
-- ✓ Transacción: puedes ROLLBACK si algo falla
-- ✓ Si hay tickets referenciando activos, descomenta PASO 5
-- ✓ Las secuencias se pueden resetear (descomenta PASO 6)
--
-- RECUPERACIÓN:
-- Si ejecutas ROLLBACK antes de COMMIT, se deshace todo.
-- Si ya hiciste COMMIT, los datos se borraron (backup es tu única opción).
--
-- ============================================================================
