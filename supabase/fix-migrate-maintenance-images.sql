-- ============================================================================
-- FIX: Migrar imágenes a assets_maintenance usando asset_code/asset_tag
-- ============================================================================
-- Si los IDs no coinciden entre tablas, usar el código del activo para match

-- Opción 1: Migrar usando coincidencia por código
UPDATE assets_maintenance am
SET image_url = a.image_url
FROM assets a
WHERE (
  am.asset_code = a.asset_tag 
  OR am.asset_code = a.asset_code
)
AND a.image_url IS NOT NULL
AND (am.image_url IS NULL OR am.image_url = '');

-- Opción 2: Si aún no funciona, migrar por ID
UPDATE assets_maintenance am
SET image_url = a.image_url
FROM assets a
WHERE am.id = a.id
AND a.image_url IS NOT NULL
AND (am.image_url IS NULL OR am.image_url = '');

-- Verificar resultado
SELECT 
  COUNT(*) as total,
  COUNT(image_url) as con_imagen
FROM assets_maintenance
WHERE deleted_at IS NULL;
