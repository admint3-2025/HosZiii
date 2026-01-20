-- FIX: Permitir que corporate_admin pueda CREAR/GUARDAR inspecciones RRHH (borrador)
-- y sus áreas/items sin depender de user_locations.
--
-- Síntoma: "new row violates row-level security policy" en inspections_rrhh_areas
-- cuando un corporate_admin intenta crear/guardar una inspección.

-- =====================================================
-- INSPECTIONS_RRHH (UPDATE)
-- =====================================================

DROP POLICY IF EXISTS "Users can update their own draft inspections" ON public.inspections_rrhh;

CREATE POLICY "Users can update their own draft inspections"
  ON public.inspections_rrhh FOR UPDATE
  USING (
    -- Admin puede actualizar todo
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role::text IN ('admin', 'director')
    )
    OR
    -- Corporate admin puede actualizar sus borradores (respetando departamento)
    (
      inspector_user_id = auth.uid()
      AND status = 'draft'
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'corporate_admin'
      )
      AND public.user_can_access_department(auth.uid(), department)
    )
    OR
    -- Usuarios normales pueden actualizar sus borradores en sus ubicaciones
    (
      inspector_user_id = auth.uid()
      AND status = 'draft'
      AND location_id IN (
        SELECT location_id FROM public.user_locations WHERE user_id = auth.uid()
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'corporate_admin')
      )
    )
    OR
    -- Supervisores pueden actualizar en sus ubicaciones
    (
      location_id IN (
        SELECT location_id FROM public.user_locations WHERE user_id = auth.uid()
      )
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'supervisor'
      )
    )
  );

-- =====================================================
-- INSPECTIONS_RRHH_AREAS (SELECT + WRITE)
-- =====================================================

DROP POLICY IF EXISTS "Users can view areas from accessible inspections" ON public.inspections_rrhh_areas;
DROP POLICY IF EXISTS "Users can manage areas in their inspections" ON public.inspections_rrhh_areas;

CREATE POLICY "Users can view areas from accessible inspections"
  ON public.inspections_rrhh_areas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role::text IN ('admin', 'director')
    )
    OR
    inspection_id IN (SELECT id FROM public.inspections_rrhh)
  );

-- Permite insertar/actualizar/borrar áreas SOLO si la inspección es del usuario y está en borrador.
CREATE POLICY "Users can manage areas in their inspections"
  ON public.inspections_rrhh_areas FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role::text IN ('admin', 'director')
    )
    OR
    inspection_id IN (
      SELECT id FROM public.inspections_rrhh
      WHERE inspector_user_id = auth.uid()
      AND status = 'draft'
    )
  );

-- =====================================================
-- INSPECTIONS_RRHH_ITEMS (SELECT + WRITE)
-- =====================================================

DROP POLICY IF EXISTS "Users can view items from accessible inspections" ON public.inspections_rrhh_items;
DROP POLICY IF EXISTS "Users can manage items in their inspections" ON public.inspections_rrhh_items;

CREATE POLICY "Users can view items from accessible inspections"
  ON public.inspections_rrhh_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role::text IN ('admin', 'director')
    )
    OR
    inspection_id IN (SELECT id FROM public.inspections_rrhh)
  );

-- Permite insertar/actualizar/borrar items SOLO si la inspección es del usuario y está en borrador.
CREATE POLICY "Users can manage items in their inspections"
  ON public.inspections_rrhh_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role::text IN ('admin', 'director')
    )
    OR
    inspection_id IN (
      SELECT id FROM public.inspections_rrhh
      WHERE inspector_user_id = auth.uid()
      AND status = 'draft'
    )
  );
