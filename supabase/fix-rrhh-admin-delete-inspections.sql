-- FIX: Permitir a ADMIN eliminar inspecciones RRHH
--
-- Sin esta política, un DELETE en inspections_rrhh falla por RLS.
-- Nota: la eliminación en cascada a inspections_rrhh_areas / inspections_rrhh_items requiere
-- que esas tablas también permitan DELETE para admin (ya cubierto si existe una policy FOR ALL con admin).

DROP POLICY IF EXISTS "Admins can delete inspections" ON public.inspections_rrhh;

CREATE POLICY "Admins can delete inspections"
  ON public.inspections_rrhh FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role::text IN ('admin', 'director')
    )
  );
