-- ============================================================================
-- DIAGNÓSTICO: Verificar estado de imágenes en assets_maintenance
-- ============================================================================

-- 1. Ver cuántos activos de mantenimiento tienen imagen
SELECT 
  COUNT(*) as total_assets,
  COUNT(image_url) as con_imagen,
  COUNT(*) - COUNT(image_url) as sin_imagen
FROM assets_maintenance
WHERE deleted_at IS NULL;

-- 2. Ver activos de mantenimiento con sus imágenes
SELECT id, asset_code, name, image_url 
FROM assets_maintenance 
WHERE deleted_at IS NULL
LIMIT 10;

-- 3. Ver si hay imágenes en la tabla assets original para los mismos IDs
SELECT 
  am.id,
  am.asset_code,
  am.image_url as maintenance_image,
  a.image_url as original_image
FROM assets_maintenance am
LEFT JOIN assets a ON am.id = a.id
WHERE am.deleted_at IS NULL
LIMIT 10;

-- 4. Contar cuántos activos en assets tienen imagen
SELECT 
  COUNT(*) as total,
  COUNT(image_url) as con_imagen
FROM assets
WHERE deleted_at IS NULL;

-- 5. FORZAR migración de imágenes (si los IDs no coinciden, usar asset_tag/asset_code)
-- Primero veamos si hay coincidencias por código
SELECT 
  am.id as maint_id,
  am.asset_code,
  a.id as original_id,
  a.asset_tag,
  a.image_url
FROM assets_maintenance am
JOIN assets a ON (
  am.asset_code = a.asset_tag 
  OR am.asset_code = a.asset_code
  OR am.id = a.id
)
WHERE a.image_url IS NOT NULL
  AND am.deleted_at IS NULL
LIMIT 20;
