-- Verificar qué tablas de activos existen

-- 1. Verificar si existe tabla 'assets'
SELECT 
  'TABLA ASSETS' as info,
  COUNT(*) as registros
FROM assets;

-- 2. Verificar si existe tabla 'assets_it'  
SELECT 
  'TABLA ASSETS_IT' as info,
  COUNT(*) as registros
FROM assets_it;

-- 3. Ver estructura de la tabla que existe
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name IN ('assets', 'assets_it')
  AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 4. Verificar si 'assets' es una vista
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('assets', 'assets_it');
