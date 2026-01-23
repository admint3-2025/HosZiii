-- ============================================================================
-- VERIFICAR Y FORZAR ACTUALIZACIÓN DEL ESQUEMA
-- ============================================================================

-- 1. Verificar que las columnas existen
SELECT 
  'Verificando columnas...' as paso,
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name IN ('assets_it', 'assets_maintenance')
AND column_name IN ('updated_by', 'department', 'processor', 'ram_gb', 'storage_gb', 'os', 'dynamic_specs')
ORDER BY table_name, column_name;

-- 2. Si no existen, agregarlas de nuevo
DO $$ 
BEGIN
  -- Agregar updated_by si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assets_it' AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE assets_it ADD COLUMN updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    RAISE NOTICE 'Columna updated_by agregada a assets_it';
  ELSE
    RAISE NOTICE 'Columna updated_by ya existe en assets_it';
  END IF;

  -- Agregar department si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assets_it' AND column_name = 'department'
  ) THEN
    ALTER TABLE assets_it ADD COLUMN department TEXT;
    RAISE NOTICE 'Columna department agregada a assets_it';
  ELSE
    RAISE NOTICE 'Columna department ya existe en assets_it';
  END IF;
END $$;

-- 3. Forzar múltiples recargas del esquema
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- 4. Esperar y verificar nuevamente
SELECT 
  'Columnas verificadas después de reload' as resultado,
  COUNT(*) as columnas_encontradas
FROM information_schema.columns
WHERE table_name = 'assets_it'
AND column_name IN ('updated_by', 'department', 'processor', 'ram_gb', 'storage_gb', 'os', 'dynamic_specs');

-- 5. Ver la estructura completa de assets_it
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'assets_it'
ORDER BY ordinal_position;
