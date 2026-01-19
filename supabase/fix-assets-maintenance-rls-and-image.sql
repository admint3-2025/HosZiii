-- ============================================================================
-- FIX: Agregar columna image_url y políticas RLS para assets_maintenance
-- ============================================================================
-- Problema: La tabla assets_maintenance no tiene:
-- 1. Columna image_url para fotos de activos
-- 2. Políticas RLS de UPDATE/INSERT (solo tiene SELECT)
-- 3. Las imágenes no fueron migradas de la tabla assets original
-- ============================================================================

-- 1. Agregar columna image_url a assets_maintenance
ALTER TABLE assets_maintenance
ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN assets_maintenance.image_url IS 'URL de la imagen del activo almacenada en Supabase Storage';

-- 2. Crear índice para image_url
CREATE INDEX IF NOT EXISTS idx_assets_maintenance_image 
ON assets_maintenance(image_url) 
WHERE image_url IS NOT NULL;

-- 3. Migrar imágenes existentes de la tabla assets original (si existen)
UPDATE assets_maintenance am
SET image_url = a.image_url
FROM assets a
WHERE am.id = a.id
  AND a.image_url IS NOT NULL
  AND am.image_url IS NULL;

-- 4. Políticas RLS para UPDATE en assets_maintenance
-- Permitir que supervisores de mantenimiento y admins actualicen activos
DROP POLICY IF EXISTS "assets_maintenance_update" ON assets_maintenance;
CREATE POLICY "assets_maintenance_update" ON assets_maintenance FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.role = 'admin' 
      OR (profiles.role = 'supervisor' AND profiles.asset_category = 'MAINTENANCE')
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.role = 'admin' 
      OR (profiles.role = 'supervisor' AND profiles.asset_category = 'MAINTENANCE')
    )
  )
);

-- 4. Políticas RLS para INSERT en assets_maintenance
-- Permitir que supervisores de mantenimiento y admins creen activos
DROP POLICY IF EXISTS "assets_maintenance_insert" ON assets_maintenance;
CREATE POLICY "assets_maintenance_insert" ON assets_maintenance FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.role = 'admin' 
      OR (profiles.role = 'supervisor' AND profiles.asset_category = 'MAINTENANCE')
    )
  )
);

-- 5. Políticas RLS para DELETE en assets_maintenance (solo admins)
DROP POLICY IF EXISTS "assets_maintenance_delete" ON assets_maintenance;
CREATE POLICY "assets_maintenance_delete" ON assets_maintenance FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
-- Ejecutar para verificar que las políticas se crearon:
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'assets_maintenance';
-- 
-- Resultado esperado:
-- assets_maintenance_select | SELECT
-- assets_maintenance_update | UPDATE
-- assets_maintenance_insert | INSERT
-- assets_maintenance_delete | DELETE
-- ============================================================================
