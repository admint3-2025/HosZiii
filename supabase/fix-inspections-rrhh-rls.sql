-- ============================================================================
-- FIX RLS POLICIES FOR INSPECTIONS RRHH
-- Permite a usuarios autenticados actualizar items de inspecciones
-- ============================================================================

-- 1. Eliminar políticas existentes que pueden estar bloqueando
DROP POLICY IF EXISTS "Users can manage items in their inspections" ON inspections_rrhh_items;
DROP POLICY IF EXISTS "Users can view items from accessible inspections" ON inspections_rrhh_items;

-- 2. Crear política más permisiva para SELECT en items
CREATE POLICY "Users can view inspection items"
  ON inspections_rrhh_items FOR SELECT
  TO authenticated
  USING (
    -- Admin puede ver todo
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
    OR
    -- Usuarios autenticados pueden ver items de inspecciones de sus ubicaciones
    inspection_id IN (
      SELECT id FROM inspections_rrhh 
      WHERE location_id IN (
        SELECT location_id FROM user_locations WHERE user_id = auth.uid()
      )
    )
  );

-- 3. Crear política más permisiva para INSERT en items
CREATE POLICY "Users can insert inspection items"
  ON inspections_rrhh_items FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Admin puede insertar en cualquier inspección
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
    OR
    -- Usuarios pueden insertar en inspecciones de sus ubicaciones
    inspection_id IN (
      SELECT id FROM inspections_rrhh 
      WHERE location_id IN (
        SELECT location_id FROM user_locations WHERE user_id = auth.uid()
      )
    )
  );

-- 4. Crear política más permisiva para UPDATE en items (EL PROBLEMA PRINCIPAL)
CREATE POLICY "Users can update inspection items"
  ON inspections_rrhh_items FOR UPDATE
  TO authenticated
  USING (
    -- Admin puede actualizar todo
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
    OR
    -- Usuarios pueden actualizar items de inspecciones de sus ubicaciones
    inspection_id IN (
      SELECT id FROM inspections_rrhh 
      WHERE location_id IN (
        SELECT location_id FROM user_locations WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    -- Admin puede actualizar todo
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
    OR
    -- Usuarios pueden actualizar items de inspecciones de sus ubicaciones
    inspection_id IN (
      SELECT id FROM inspections_rrhh 
      WHERE location_id IN (
        SELECT location_id FROM user_locations WHERE user_id = auth.uid()
      )
    )
  );

-- 5. Crear política para DELETE en items
CREATE POLICY "Users can delete inspection items"
  ON inspections_rrhh_items FOR DELETE
  TO authenticated
  USING (
    -- Admin puede eliminar todo
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
    OR
    -- Usuarios pueden eliminar items de sus inspecciones (draft)
    inspection_id IN (
      SELECT id FROM inspections_rrhh 
      WHERE inspector_user_id = auth.uid()
      AND status = 'draft'
    )
  );

-- 6. Verificar que RLS está habilitado
ALTER TABLE inspections_rrhh_items ENABLE ROW LEVEL SECURITY;

-- 7. Verificar políticas creadas
SELECT 
  policyname,
  tablename,
  cmd
FROM pg_policies 
WHERE tablename = 'inspections_rrhh_items';

-- 8. Test: verificar si el usuario actual puede actualizar items
-- (Reemplazar el UUID con uno real de inspections_rrhh_items)
-- SELECT * FROM inspections_rrhh_items LIMIT 1;
