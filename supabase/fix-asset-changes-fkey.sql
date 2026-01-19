-- ============================================================================
-- FIX: Quitar foreign key de asset_changes para soportar múltiples tablas
-- ============================================================================
-- El problema: asset_changes.asset_id tiene FK a la tabla assets original
-- Pero ahora tenemos assets_it y assets_maintenance con sus propios IDs
-- Solución: Quitar la FK para permitir IDs de cualquier tabla de activos
-- ============================================================================

-- 1. Eliminar la foreign key constraint
ALTER TABLE asset_changes 
DROP CONSTRAINT IF EXISTS asset_changes_asset_id_fkey;

-- 2. Agregar índice para mejorar performance de búsquedas
CREATE INDEX IF NOT EXISTS idx_asset_changes_asset_id ON asset_changes(asset_id);

-- 3. Verificación
SELECT 'FK eliminada - asset_changes ahora acepta IDs de assets_it y assets_maintenance' as resultado;
