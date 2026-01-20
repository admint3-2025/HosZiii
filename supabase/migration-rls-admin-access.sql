-- =====================================================
-- MIGRACIÓN: Agregar acceso completo para admin en RLS
-- =====================================================

-- 1. ELIMINAR TODAS LAS POLÍTICAS EXISTENTES
DROP POLICY IF EXISTS "Users can view inspections from their locations" ON inspections_rrhh;
DROP POLICY IF EXISTS "Users can create inspections in their locations" ON inspections_rrhh;
DROP POLICY IF EXISTS "Users can update their own draft inspections" ON inspections_rrhh;
DROP POLICY IF EXISTS "Supervisors can update any inspection in their locations" ON inspections_rrhh;
DROP POLICY IF EXISTS "Users can view areas from accessible inspections" ON inspections_rrhh_areas;
DROP POLICY IF EXISTS "Users can manage areas in their inspections" ON inspections_rrhh_areas;
DROP POLICY IF EXISTS "Users can view items from accessible inspections" ON inspections_rrhh_items;
DROP POLICY IF EXISTS "Users can manage items in their inspections" ON inspections_rrhh_items;

-- 2. CREAR POLÍTICAS NUEVAS CON SOPORTE ADMIN

-- Políticas para inspections_rrhh
CREATE POLICY "Users can view inspections from their locations"
  ON inspections_rrhh FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text IN ('admin','director'))
    OR location_id IN (SELECT location_id FROM user_locations WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create inspections in their locations"
  ON inspections_rrhh FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text IN ('admin','director'))
    OR location_id IN (SELECT location_id FROM user_locations WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their own draft inspections"
  ON inspections_rrhh FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text IN ('admin','director'))
    OR (inspector_user_id = auth.uid() AND status = 'draft' AND location_id IN (SELECT location_id FROM user_locations WHERE user_id = auth.uid()))
    OR (location_id IN (SELECT location_id FROM user_locations WHERE user_id = auth.uid()) AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'supervisor'))
  );

-- Políticas para inspections_rrhh_areas
CREATE POLICY "Users can view areas from accessible inspections"
  ON inspections_rrhh_areas FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text IN ('admin','director'))
    OR inspection_id IN (SELECT id FROM inspections_rrhh WHERE location_id IN (SELECT location_id FROM user_locations WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can manage areas in their inspections"
  ON inspections_rrhh_areas FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text IN ('admin','director'))
    OR inspection_id IN (SELECT id FROM inspections_rrhh WHERE inspector_user_id = auth.uid() AND location_id IN (SELECT location_id FROM user_locations WHERE user_id = auth.uid()))
  );

-- Políticas para inspections_rrhh_items
CREATE POLICY "Users can view items from accessible inspections"
  ON inspections_rrhh_items FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text IN ('admin','director'))
    OR inspection_id IN (SELECT id FROM inspections_rrhh WHERE location_id IN (SELECT location_id FROM user_locations WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can manage items in their inspections"
  ON inspections_rrhh_items FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text IN ('admin','director'))
    OR inspection_id IN (SELECT id FROM inspections_rrhh WHERE inspector_user_id = auth.uid() AND location_id IN (SELECT location_id FROM user_locations WHERE user_id = auth.uid()))
  );
