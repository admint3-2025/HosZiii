-- ============================================================================
-- FIX: Agregar columna image_url y migrar datos a assets_it
-- ============================================================================

-- 1. Agregar columna image_url a assets_it
ALTER TABLE assets_it
ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN assets_it.image_url IS 'URL de la imagen del activo almacenada en Supabase Storage';

-- 2. Crear índice para image_url
CREATE INDEX IF NOT EXISTS idx_assets_it_image 
ON assets_it(image_url) 
WHERE image_url IS NOT NULL;

-- 3. Migrar imágenes desde tabla assets original
UPDATE assets_it ait
SET image_url = a.image_url
FROM assets a
WHERE (
  ait.asset_code = a.asset_tag 
  OR ait.asset_code = a.asset_code
  OR ait.id = a.id
)
AND a.image_url IS NOT NULL
AND (ait.image_url IS NULL OR ait.image_url = '');

-- 4. Políticas RLS para UPDATE en assets_it (si no existen)
DROP POLICY IF EXISTS "assets_it_update" ON assets_it;
CREATE POLICY "assets_it_update" ON assets_it FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.role = 'admin' 
      OR (profiles.role = 'supervisor' AND profiles.asset_category = 'IT')
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.role = 'admin' 
      OR (profiles.role = 'supervisor' AND profiles.asset_category = 'IT')
    )
  )
);

-- 5. Políticas RLS para INSERT en assets_it
DROP POLICY IF EXISTS "assets_it_insert" ON assets_it;
CREATE POLICY "assets_it_insert" ON assets_it FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.role = 'admin' 
      OR (profiles.role = 'supervisor' AND profiles.asset_category = 'IT')
    )
  )
);

-- 6. Verificar resultado
SELECT 
  COUNT(*) as total,
  COUNT(image_url) as con_imagen
FROM assets_it
WHERE deleted_at IS NULL;
