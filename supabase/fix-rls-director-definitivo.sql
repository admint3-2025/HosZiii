-- =====================================================
-- FIX DEFINITIVO: Director = Admin en RLS
-- Limpia policies duplicadas y crea unas claras
-- =====================================================

-- =====================================================
-- LOCATIONS: Limpiar y crear policy simple
-- =====================================================
DROP POLICY IF EXISTS "Admin can view all locations" ON public.locations;
DROP POLICY IF EXISTS "Admin gestiona locations" ON public.locations;
DROP POLICY IF EXISTS "Admins can view all locations" ON public.locations;
DROP POLICY IF EXISTS "Auditors can view all locations" ON public.locations;
DROP POLICY IF EXISTS "Supervisors and technicians see their assigned locations" ON public.locations;
DROP POLICY IF EXISTS "Todos pueden leer locations activas" ON public.locations;
DROP POLICY IF EXISTS "director_admin_view_locations" ON public.locations;

-- Policy única: admin/director ven TODO, otros ven sus asignadas
CREATE POLICY "locations_select_policy"
  ON public.locations FOR SELECT
  USING (
    (SELECT role::text FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'director')
    OR id IN (SELECT location_id FROM public.user_locations WHERE user_id = auth.uid())
    OR is_active = true
  );

-- =====================================================
-- INSPECTIONS_RRHH: Limpiar y crear policies simples
-- =====================================================
DROP POLICY IF EXISTS "Admins can delete inspections" ON public.inspections_rrhh;
DROP POLICY IF EXISTS "Users can create inspections in their departments" ON public.inspections_rrhh;
DROP POLICY IF EXISTS "Users can create inspections in their locations" ON public.inspections_rrhh;
DROP POLICY IF EXISTS "Users can update their own draft inspections" ON public.inspections_rrhh;
DROP POLICY IF EXISTS "Users can view inspections from their departments" ON public.inspections_rrhh;
DROP POLICY IF EXISTS "Users can view inspections from their locations" ON public.inspections_rrhh;
DROP POLICY IF EXISTS "director_admin_view_inspections_rrhh" ON public.inspections_rrhh;

-- SELECT: admin/director/corporate_admin ven TODO, otros ven las de sus locations
CREATE POLICY "inspections_rrhh_select_policy"
  ON public.inspections_rrhh FOR SELECT
  USING (
    (SELECT role::text FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'director', 'corporate_admin')
    OR location_id IN (SELECT location_id FROM public.user_locations WHERE user_id = auth.uid())
  );

-- INSERT: admin/director/corporate_admin pueden crear en cualquier lado
CREATE POLICY "inspections_rrhh_insert_policy"
  ON public.inspections_rrhh FOR INSERT
  WITH CHECK (
    (SELECT role::text FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'director', 'corporate_admin')
    OR location_id IN (SELECT location_id FROM public.user_locations WHERE user_id = auth.uid())
  );

-- UPDATE: admin/director pueden actualizar cualquiera, otros solo sus drafts
CREATE POLICY "inspections_rrhh_update_policy"
  ON public.inspections_rrhh FOR UPDATE
  USING (
    (SELECT role::text FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'director', 'corporate_admin')
    OR (inspector_user_id = auth.uid() AND status = 'draft')
  );

-- DELETE: solo admin/director
CREATE POLICY "inspections_rrhh_delete_policy"
  ON public.inspections_rrhh FOR DELETE
  USING (
    (SELECT role::text FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'director')
  );

-- =====================================================
-- INSPECTIONS_RRHH_AREAS: Limpiar y crear policy simple
-- =====================================================
DROP POLICY IF EXISTS "Users can view areas from accessible inspections" ON public.inspections_rrhh_areas;
DROP POLICY IF EXISTS "Users can manage areas in their inspections" ON public.inspections_rrhh_areas;

CREATE POLICY "inspections_rrhh_areas_select_policy"
  ON public.inspections_rrhh_areas FOR SELECT
  USING (
    (SELECT role::text FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'director', 'corporate_admin')
    OR inspection_id IN (
      SELECT id FROM public.inspections_rrhh
      WHERE location_id IN (SELECT location_id FROM public.user_locations WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "inspections_rrhh_areas_insert_policy"
  ON public.inspections_rrhh_areas FOR INSERT
  WITH CHECK (
    (SELECT role::text FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'director', 'corporate_admin')
    OR inspection_id IN (
      SELECT id FROM public.inspections_rrhh
      WHERE location_id IN (SELECT location_id FROM public.user_locations WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "inspections_rrhh_areas_update_policy"
  ON public.inspections_rrhh_areas FOR UPDATE
  USING (
    (SELECT role::text FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'director', 'corporate_admin')
    OR inspection_id IN (
      SELECT id FROM public.inspections_rrhh
      WHERE inspector_user_id = auth.uid() AND status = 'draft'
    )
  );

CREATE POLICY "inspections_rrhh_areas_delete_policy"
  ON public.inspections_rrhh_areas FOR DELETE
  USING (
    (SELECT role::text FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'director')
  );

-- =====================================================
-- INSPECTIONS_RRHH_ITEMS: Limpiar y crear policy simple
-- =====================================================
DROP POLICY IF EXISTS "Users can view items from accessible inspections" ON public.inspections_rrhh_items;
DROP POLICY IF EXISTS "Users can manage items in their inspections" ON public.inspections_rrhh_items;

CREATE POLICY "inspections_rrhh_items_select_policy"
  ON public.inspections_rrhh_items FOR SELECT
  USING (
    (SELECT role::text FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'director', 'corporate_admin')
    OR inspection_id IN (
      SELECT id FROM public.inspections_rrhh
      WHERE location_id IN (SELECT location_id FROM public.user_locations WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "inspections_rrhh_items_insert_policy"
  ON public.inspections_rrhh_items FOR INSERT
  WITH CHECK (
    (SELECT role::text FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'director', 'corporate_admin')
    OR inspection_id IN (
      SELECT id FROM public.inspections_rrhh
      WHERE location_id IN (SELECT location_id FROM public.user_locations WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "inspections_rrhh_items_update_policy"
  ON public.inspections_rrhh_items FOR UPDATE
  USING (
    (SELECT role::text FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'director', 'corporate_admin')
    OR inspection_id IN (
      SELECT id FROM public.inspections_rrhh
      WHERE inspector_user_id = auth.uid() AND status = 'draft'
    )
  );

CREATE POLICY "inspections_rrhh_items_delete_policy"
  ON public.inspections_rrhh_items FOR DELETE
  USING (
    (SELECT role::text FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'director')
  );

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
SELECT 'Policies creadas correctamente. Recarga la app.' AS resultado;
