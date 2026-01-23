-- ============================================================================
-- RECARGAR ESQUEMA DE SUPABASE
-- Ejecutar esto después de agregar columnas para actualizar el caché
-- ============================================================================

NOTIFY pgrst, 'reload schema';

-- Esperar un momento y luego verificar que las columnas existen
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'assets_it'
AND column_name = 'updated_by';
