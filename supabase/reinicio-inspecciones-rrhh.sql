-- ============================================================================
-- REINICIO DE DATOS DE INSPECCIONES RRHH
-- Elimina: registros de inspecciones realizadas
-- Preserva: estructura, configuración, usuarios, sedes
-- ============================================================================

-- 1. Desactivar temporalmente RLS para limpieza
SET session_replication_role = replica;

-- 2. Eliminar items de inspecciones (valores capturados)
DELETE FROM inspections_rrhh_items;

-- 3. Eliminar áreas de inspecciones (instancias por inspección)
DELETE FROM inspections_rrhh_areas;

-- 4. Eliminar inspecciones (registros de inspecciones realizadas)
DELETE FROM inspections_rrhh;

-- 5. Reactivar RLS
SET session_replication_role = DEFAULT;

-- 6. Verificar limpieza
SELECT 
  'inspections_rrhh' as tabla, COUNT(*) as registros FROM inspections_rrhh
UNION ALL SELECT 'inspections_rrhh_areas', COUNT(*) FROM inspections_rrhh_areas
UNION ALL SELECT 'inspections_rrhh_items', COUNT(*) FROM inspections_rrhh_items;

-- Resultado esperado: 0 en todas las tablas
-- La estructura y definiciones se mantienen intactas
-- Al crear una nueva inspección se generarán los items automáticamente
