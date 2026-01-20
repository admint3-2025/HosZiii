-- =====================================================
-- FIX: Director debe ver lo mismo que Admin (en Corporativo)
--
-- Síntoma típico:
-- - Director entra al módulo Corporativo pero ve 0 sedes / 0 inspecciones.
--
-- Causa:
-- - Policies RLS que solo consideran role = 'admin' y no incluyen 'director'.
--
-- Ejecuta este SQL en Supabase (SQL Editor).
-- Requiere que el enum user_role ya tenga 'director' si aplica.
-- =====================================================

-- 1) LOCATIONS: permitir a admin/director ver todas las sedes
DROP POLICY IF EXISTS "Admins can view all locations" ON public.locations;
CREATE POLICY "Admins can view all locations"
  ON public.locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role::text IN ('admin','director')
    )
    OR id IN (SELECT location_id FROM public.user_locations WHERE user_id = auth.uid())
  );

-- 2) INSPECTIONS_RRHH: admin/director ven todo (SELECT)
DROP POLICY IF EXISTS "Users can view inspections from their locations" ON public.inspections_rrhh;
CREATE POLICY "Users can view inspections from their locations"
  ON public.inspections_rrhh FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role::text IN ('admin','director')
    )
    OR location_id IN (SELECT location_id FROM public.user_locations WHERE user_id = auth.uid())
  );

-- 3) AREAS: admin/director ven todo (SELECT)
DROP POLICY IF EXISTS "Users can view areas from accessible inspections" ON public.inspections_rrhh_areas;
CREATE POLICY "Users can view areas from accessible inspections"
  ON public.inspections_rrhh_areas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role::text IN ('admin','director')
    )
    OR inspection_id IN (
      SELECT id FROM public.inspections_rrhh
      WHERE location_id IN (SELECT location_id FROM public.user_locations WHERE user_id = auth.uid())
    )
  );

-- 4) ITEMS: admin/director ven todo (SELECT)
DROP POLICY IF EXISTS "Users can view items from accessible inspections" ON public.inspections_rrhh_items;
CREATE POLICY "Users can view items from accessible inspections"
  ON public.inspections_rrhh_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role::text IN ('admin','director')
    )
    OR inspection_id IN (
      SELECT id FROM public.inspections_rrhh
      WHERE location_id IN (SELECT location_id FROM public.user_locations WHERE user_id = auth.uid())
    )
  );

-- =====================================================
-- VERIFICACIÓN RÁPIDA (opcional)
-- Ejecuta logueado como Director en la app:
-- - /corporativo/inspecciones: debe listar sedes y estadísticas
-- - /corporativo/dashboard: debe cargar KPIs
-- =====================================================
