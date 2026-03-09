-- ============================================================================
-- RESET TOTAL: Planificacion / OPS
-- Objetivo: dejar el modulo de planificacion en cero sin borrar esquema,
-- vistas, funciones, politicas RLS ni migraciones.
--
-- Ejecutar en Supabase SQL Editor o contra la base correcta.
-- Despues de correr esto NO quedaran:
--   - ejecuciones operativas
--   - agenda operativa
--   - planes maestros
--   - entidades objetivo
--   - responsables / proveedores
--
-- Si quieres arrancar realmente limpio, NO vuelvas a ejecutar los seeds
-- importados como seed-ops-mtto-preventivo-2026.sql.
-- ============================================================================

BEGIN;

-- 1) Limpiar transaccional primero
DELETE FROM ops.ejecucion_operativa;
DELETE FROM ops.agenda_operativa;

-- 2) Limpiar catalogos funcionales de planificacion
DELETE FROM ops.planes_maestros;
DELETE FROM ops.entidades_objetivo;
DELETE FROM ops.responsables_proveedores;

COMMIT;

-- 3) Verificacion rapida
SELECT 'ops.responsables_proveedores' AS tabla, COUNT(*) AS total FROM ops.responsables_proveedores
UNION ALL
SELECT 'ops.entidades_objetivo' AS tabla, COUNT(*) AS total FROM ops.entidades_objetivo
UNION ALL
SELECT 'ops.planes_maestros' AS tabla, COUNT(*) AS total FROM ops.planes_maestros
UNION ALL
SELECT 'ops.agenda_operativa' AS tabla, COUNT(*) AS total FROM ops.agenda_operativa
UNION ALL
SELECT 'ops.ejecucion_operativa' AS tabla, COUNT(*) AS total FROM ops.ejecucion_operativa;
