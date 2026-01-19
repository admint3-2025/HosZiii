-- ============================================================================
-- DIAGNÓSTICO: Encontrar dónde están los activos
-- ============================================================================

-- Ver TODAS las tablas que contengan "asset" en el nombre
SELECT 
  table_schema,
  table_name,
  table_type
FROM information_schema.tables
WHERE table_name LIKE '%asset%'
  AND table_schema = 'public'
ORDER BY table_name;

-- Contar registros en cada tabla de activos
SELECT 'assets' as tabla, COUNT(*) as total FROM assets;
SELECT 'assets_it' as tabla, COUNT(*) as total FROM assets_it WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assets_it');
SELECT 'assets_maintenance' as tabla, COUNT(*) as total FROM assets_maintenance;

-- Ver estructura de la tabla assets
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'assets'
  AND table_schema = 'public'
ORDER BY ordinal_position;
