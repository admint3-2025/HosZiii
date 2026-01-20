-- Tabla de auditoría: eliminación de inspecciones RRHH
-- Requiere acuse (mínimo 20 caracteres) antes de permitir registro.

CREATE TABLE IF NOT EXISTS public.inspections_rrhh_deletion_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid,
  deleted_by uuid NOT NULL REFERENCES auth.users(id),
  deleted_by_role text,
  acuse text NOT NULL,
  snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT inspections_rrhh_deletion_log_acuse_min_len
    CHECK (char_length(trim(acuse)) >= 20)
);

CREATE INDEX IF NOT EXISTS idx_rrhh_deletion_log_inspection_id
  ON public.inspections_rrhh_deletion_log(inspection_id);

CREATE INDEX IF NOT EXISTS idx_rrhh_deletion_log_created_at
  ON public.inspections_rrhh_deletion_log(created_at DESC);

ALTER TABLE public.inspections_rrhh_deletion_log ENABLE ROW LEVEL SECURITY;

-- INSERT: solo admin (puedes ampliar a corporate_admin si lo necesitas)
DROP POLICY IF EXISTS "rrhh_deletion_log_insert_admin" ON public.inspections_rrhh_deletion_log;
CREATE POLICY "rrhh_deletion_log_insert_admin"
  ON public.inspections_rrhh_deletion_log
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role::text IN ('admin', 'director')
    )
    AND deleted_by = auth.uid()
  );

DROP POLICY IF EXISTS "rrhh_deletion_log_select_admin" ON public.inspections_rrhh_deletion_log;
CREATE POLICY "rrhh_deletion_log_select_admin"
  ON public.inspections_rrhh_deletion_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
       WHERE id = auth.uid()
       AND role::text IN ('admin', 'director')
    )
  );
