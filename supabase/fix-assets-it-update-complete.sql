-- ============================================================================
-- FIX COMPLETO: Actualización de activos IT
-- Ejecutar este archivo para corregir todos los problemas de actualización
-- Fecha: 2025-01-17
-- ============================================================================

-- ============================================================================
-- PARTE 1: Asegurar que asset_changes no tiene FK restrictiva
-- ============================================================================

-- Eliminar la foreign key constraint si existe (para soportar assets_it y assets_maintenance)
ALTER TABLE asset_changes 
DROP CONSTRAINT IF EXISTS asset_changes_asset_id_fkey;

-- Agregar índice para mejorar performance de búsquedas
CREATE INDEX IF NOT EXISTS idx_asset_changes_asset_id ON asset_changes(asset_id);

-- ============================================================================
-- PARTE 2: Políticas RLS para assets_it
-- ============================================================================

-- 2.1 SELECT - Usuarios ven activos de sus sedes asignadas
DROP POLICY IF EXISTS "assets_it_select" ON assets_it;
CREATE POLICY "assets_it_select" ON assets_it FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.role = 'admin' 
      OR profiles.role IN ('supervisor', 'agent_l1', 'agent_l2', 'requester')
      AND (
        assets_it.location_id IS NULL
        OR assets_it.location_id = profiles.location_id
        OR EXISTS (
          SELECT 1 FROM user_locations ul 
          WHERE ul.user_id = auth.uid() 
          AND ul.location_id = assets_it.location_id
        )
      )
    )
  )
);

-- 2.2 UPDATE - Admin y supervisores IT pueden actualizar
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

-- 2.3 INSERT - Admin y supervisores IT pueden crear
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

-- 2.4 DELETE - Solo admin
DROP POLICY IF EXISTS "assets_it_delete" ON assets_it;
CREATE POLICY "assets_it_delete" ON assets_it FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- ============================================================================
-- PARTE 3: Asegurar columna image_url existe
-- ============================================================================

ALTER TABLE assets_it ADD COLUMN IF NOT EXISTS image_url TEXT;

-- ============================================================================
-- PARTE 4: Verificación
-- ============================================================================

SELECT 'FIX COMPLETO APLICADO - assets_it ahora soporta actualizaciones' as resultado;

-- Listar políticas actuales
SELECT 
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'assets_it'
ORDER BY policyname;
