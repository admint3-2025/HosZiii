-- ============================================================================
-- FORZAR ACTUALIZACIÓN DEL CACHÉ DE POSTGREST
-- Este truco fuerza a PostgREST a recargar el esquema haciendo un cambio menor
-- ============================================================================

-- 1. Hacer un cambio menor en la tabla (agregar/actualizar comentario)
COMMENT ON COLUMN assets_it.updated_by IS 'Usuario que realizó la última actualización (v2)';

-- 2. Recargar esquema
NOTIFY pgrst, 'reload schema';

-- 3. Hacer otro cambio
COMMENT ON COLUMN assets_it.department IS 'Departamento al que pertenece el activo (v2)';

-- 4. Recargar de nuevo
NOTIFY pgrst, 'reload schema';

-- 5. Verificar
SELECT 
  'Cache refresh forzado - columnas verificadas' as resultado,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'assets_it'
AND column_name IN ('updated_by', 'department', 'processor', 'ram_gb', 'storage_gb', 'os', 'dynamic_specs')
ORDER BY column_name;
