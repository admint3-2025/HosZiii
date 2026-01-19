-- ============================================================================
-- FIX: Permitir que usuarios ADMIN vean TODOS los activos sin restricciones
-- ============================================================================
-- Problema: Las políticas RLS actuales bloquean a usuarios admin que no tienen
-- asset_category configurado, impidiendo que vean activos al crear tickets.
-- 
-- Solución: Modificar las políticas SELECT para que admins vean TODO.
-- ============================================================================

-- ============================================================================
-- TABLA: assets (Activos de IT)
-- ============================================================================

-- Recrear política SELECT para assets
DROP POLICY IF EXISTS "assets_select" ON assets;
CREATE POLICY "assets_select" ON assets FOR SELECT
USING (
  -- Admin ve TODO sin restricciones
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
  OR
  -- Usuarios con categoría IT ven activos de IT
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.asset_category = 'IT'
  )
  OR
  -- Supervisores ven según sus permisos
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'supervisor'
  )
);

-- ============================================================================
-- TABLA: assets_maintenance (Activos de Mantenimiento)
-- ============================================================================

-- Recrear política SELECT para assets_maintenance
DROP POLICY IF EXISTS "assets_maintenance_select" ON assets_maintenance;
CREATE POLICY "assets_maintenance_select" ON assets_maintenance FOR SELECT
USING (
  -- Admin ve TODO sin restricciones
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
  OR
  -- Usuarios con categoría MAINTENANCE ven activos de mantenimiento
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.asset_category = 'MAINTENANCE'
  )
  OR
  -- Supervisores ven según sus permisos
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'supervisor'
  )
);

-- ============================================================================
-- Verificación
-- ============================================================================

-- Ver las políticas actuales de assets
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('assets', 'assets_maintenance')
  AND policyname LIKE '%select%'
ORDER BY tablename, policyname;

-- Verificar que admin puede ver activos
DO $$
DECLARE
  admin_count INTEGER;
BEGIN
  -- Esto debería ejecutarse como el usuario admin y retornar el conteo total
  SELECT COUNT(*) INTO admin_count FROM assets WHERE deleted_at IS NULL;
  RAISE NOTICE 'Assets visibles para admin: %', admin_count;
  
  SELECT COUNT(*) INTO admin_count FROM assets_maintenance WHERE deleted_at IS NULL;
  RAISE NOTICE 'Assets maintenance visibles para admin: %', admin_count;
END $$;
