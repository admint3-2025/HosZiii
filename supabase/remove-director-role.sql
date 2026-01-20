-- =====================================================
-- LIMPIAR RLS: Quitar referencias a 'director' y simplificar
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- =====================================================
-- LOCATIONS
-- =====================================================
DROP POLICY IF EXISTS "locations_select_policy" ON public.locations;
CREATE POLICY "locations_select_policy"
  ON public.locations FOR SELECT
  USING (
    (SELECT role::text FROM public.profiles WHERE id = auth.uid()) = 'admin'
    OR id IN (SELECT location_id FROM public.user_locations WHERE user_id = auth.uid())
    OR is_active = true
  );

-- =====================================================
-- INSPECTIONS_RRHH
-- =====================================================
DROP POLICY IF EXISTS "inspections_rrhh_select_policy" ON public.inspections_rrhh;
DROP POLICY IF EXISTS "inspections_rrhh_insert_policy" ON public.inspections_rrhh;
DROP POLICY IF EXISTS "inspections_rrhh_update_policy" ON public.inspections_rrhh;
DROP POLICY IF EXISTS "inspections_rrhh_delete_policy" ON public.inspections_rrhh;

CREATE POLICY "inspections_rrhh_select_policy"
  ON public.inspections_rrhh FOR SELECT
  USING (
    (SELECT role::text FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'corporate_admin')
    OR location_id IN (SELECT location_id FROM public.user_locations WHERE user_id = auth.uid())
  );

CREATE POLICY "inspections_rrhh_insert_policy"
  ON public.inspections_rrhh FOR INSERT
  WITH CHECK (
    (SELECT role::text FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'corporate_admin')
    OR location_id IN (SELECT location_id FROM public.user_locations WHERE user_id = auth.uid())
  );

CREATE POLICY "inspections_rrhh_update_policy"
  ON public.inspections_rrhh FOR UPDATE
  USING (
    (SELECT role::text FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'corporate_admin')
    OR (inspector_user_id = auth.uid() AND status = 'draft')
  );

CREATE POLICY "inspections_rrhh_delete_policy"
  ON public.inspections_rrhh FOR DELETE
  USING (
    (SELECT role::text FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- =====================================================
-- INSPECTIONS_RRHH_AREAS
-- =====================================================
DROP POLICY IF EXISTS "inspections_rrhh_areas_select_policy" ON public.inspections_rrhh_areas;
DROP POLICY IF EXISTS "inspections_rrhh_areas_insert_policy" ON public.inspections_rrhh_areas;
DROP POLICY IF EXISTS "inspections_rrhh_areas_update_policy" ON public.inspections_rrhh_areas;
DROP POLICY IF EXISTS "inspections_rrhh_areas_delete_policy" ON public.inspections_rrhh_areas;

CREATE POLICY "inspections_rrhh_areas_select_policy"
  ON public.inspections_rrhh_areas FOR SELECT
  USING (
    (SELECT role::text FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'corporate_admin')
    OR inspection_id IN (
      SELECT id FROM public.inspections_rrhh
      WHERE location_id IN (SELECT location_id FROM public.user_locations WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "inspections_rrhh_areas_insert_policy"
  ON public.inspections_rrhh_areas FOR INSERT
  WITH CHECK (
    (SELECT role::text FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'corporate_admin')
    OR inspection_id IN (
      SELECT id FROM public.inspections_rrhh
      WHERE location_id IN (SELECT location_id FROM public.user_locations WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "inspections_rrhh_areas_update_policy"
  ON public.inspections_rrhh_areas FOR UPDATE
  USING (
    (SELECT role::text FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'corporate_admin')
    OR inspection_id IN (
      SELECT id FROM public.inspections_rrhh
      WHERE inspector_user_id = auth.uid() AND status = 'draft'
    )
  );

CREATE POLICY "inspections_rrhh_areas_delete_policy"
  ON public.inspections_rrhh_areas FOR DELETE
  USING (
    (SELECT role::text FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- =====================================================
-- INSPECTIONS_RRHH_ITEMS
-- =====================================================
DROP POLICY IF EXISTS "inspections_rrhh_items_select_policy" ON public.inspections_rrhh_items;
DROP POLICY IF EXISTS "inspections_rrhh_items_insert_policy" ON public.inspections_rrhh_items;
DROP POLICY IF EXISTS "inspections_rrhh_items_update_policy" ON public.inspections_rrhh_items;
DROP POLICY IF EXISTS "inspections_rrhh_items_delete_policy" ON public.inspections_rrhh_items;

CREATE POLICY "inspections_rrhh_items_select_policy"
  ON public.inspections_rrhh_items FOR SELECT
  USING (
    (SELECT role::text FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'corporate_admin')
    OR inspection_id IN (
      SELECT id FROM public.inspections_rrhh
      WHERE location_id IN (SELECT location_id FROM public.user_locations WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "inspections_rrhh_items_insert_policy"
  ON public.inspections_rrhh_items FOR INSERT
  WITH CHECK (
    (SELECT role::text FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'corporate_admin')
    OR inspection_id IN (
      SELECT id FROM public.inspections_rrhh
      WHERE location_id IN (SELECT location_id FROM public.user_locations WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "inspections_rrhh_items_update_policy"
  ON public.inspections_rrhh_items FOR UPDATE
  USING (
    (SELECT role::text FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'corporate_admin')
    OR inspection_id IN (
      SELECT id FROM public.inspections_rrhh
      WHERE inspector_user_id = auth.uid() AND status = 'draft'
    )
  );

CREATE POLICY "inspections_rrhh_items_delete_policy"
  ON public.inspections_rrhh_items FOR DELETE
  USING (
    (SELECT role::text FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- =====================================================
-- ACTUALIZAR usuario director a admin (si existe)
-- =====================================================
UPDATE public.profiles SET role = 'admin' WHERE role::text = 'director';

SELECT 'Listo. Rol Director eliminado. El usuario Director ahora es Admin.' AS resultado;
