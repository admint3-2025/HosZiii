-- ============================================================================
-- SOLUCIÓN TEMPORAL: DESHABILITAR RLS PARA DEBUGGING
-- ============================================================================
-- ADVERTENCIA: Esto hace que TODOS los usuarios vean TODOS los activos
-- Solo para debugging. Después restauraremos las políticas correctas.
-- ============================================================================

-- Deshabilitar RLS en assets
ALTER TABLE assets DISABLE ROW LEVEL SECURITY;

-- Deshabilitar RLS en assets_maintenance
ALTER TABLE assets_maintenance DISABLE ROW LEVEL SECURITY;

-- Verificar que RLS está deshabilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('assets', 'assets_maintenance');

-- El campo rowsecurity debe mostrar 'f' (false) para ambas tablas
