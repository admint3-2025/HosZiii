-- =====================================================
-- EVIDENCIAS FOTOGRÁFICAS PARA INSPECCIONES (RRHH + GSH)
-- Requisito: hasta 2 imágenes por ítem evaluado
-- Bucket privado + URLs firmadas para mostrar/embebir en PDF.
-- =====================================================

-- =====================================================
-- 1) Bucket de evidencias
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'inspection-evidences',
  'inspection-evidences',
  false,
  5242880,
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO UPDATE
SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif'];

-- =====================================================
-- 2) Tablas de evidencias
-- =====================================================

CREATE TABLE IF NOT EXISTS public.inspections_rrhh_item_evidences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL,
  item_id UUID NOT NULL,
  slot SMALLINT NOT NULL CHECK (slot IN (1, 2)),
  storage_path TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(item_id, slot),
  UNIQUE(storage_path)
);

CREATE TABLE IF NOT EXISTS public.inspections_gsh_item_evidences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL,
  item_id UUID NOT NULL,
  slot SMALLINT NOT NULL CHECK (slot IN (1, 2)),
  storage_path TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(item_id, slot),
  UNIQUE(storage_path)
);

-- Agregar FKs solo si las tablas base existen (evita fallo en entornos incompletos)
DO $$
BEGIN
  IF to_regclass('public.inspections_rrhh') IS NOT NULL THEN
    ALTER TABLE public.inspections_rrhh_item_evidences
      ADD CONSTRAINT inspections_rrhh_item_evidences_inspection_fk
      FOREIGN KEY (inspection_id) REFERENCES public.inspections_rrhh(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  IF to_regclass('public.inspections_rrhh_items') IS NOT NULL THEN
    ALTER TABLE public.inspections_rrhh_item_evidences
      ADD CONSTRAINT inspections_rrhh_item_evidences_item_fk
      FOREIGN KEY (item_id) REFERENCES public.inspections_rrhh_items(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  IF to_regclass('public.inspections_gsh') IS NOT NULL THEN
    ALTER TABLE public.inspections_gsh_item_evidences
      ADD CONSTRAINT inspections_gsh_item_evidences_inspection_fk
      FOREIGN KEY (inspection_id) REFERENCES public.inspections_gsh(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  IF to_regclass('public.inspections_gsh_items') IS NOT NULL THEN
    ALTER TABLE public.inspections_gsh_item_evidences
      ADD CONSTRAINT inspections_gsh_item_evidences_item_fk
      FOREIGN KEY (item_id) REFERENCES public.inspections_gsh_items(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_rrhh_item_evidences_inspection ON public.inspections_rrhh_item_evidences(inspection_id);
CREATE INDEX IF NOT EXISTS idx_rrhh_item_evidences_item ON public.inspections_rrhh_item_evidences(item_id);
CREATE INDEX IF NOT EXISTS idx_gsh_item_evidences_inspection ON public.inspections_gsh_item_evidences(inspection_id);
CREATE INDEX IF NOT EXISTS idx_gsh_item_evidences_item ON public.inspections_gsh_item_evidences(item_id);

-- =====================================================
-- 3) RLS para tablas de evidencias
-- - Heredamos acceso desde la tabla de inspección (si el usuario puede ver la inspección, puede ver evidencias).
-- - Inserción / eliminación: si puede ver la inspección (en general el inspector/roles permitidos).
-- =====================================================

ALTER TABLE public.inspections_rrhh_item_evidences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections_gsh_item_evidences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rrhh_item_evidences_select" ON public.inspections_rrhh_item_evidences;
CREATE POLICY "rrhh_item_evidences_select"
  ON public.inspections_rrhh_item_evidences
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.inspections_rrhh i WHERE i.id = inspection_id));

DROP POLICY IF EXISTS "rrhh_item_evidences_insert" ON public.inspections_rrhh_item_evidences;
CREATE POLICY "rrhh_item_evidences_insert"
  ON public.inspections_rrhh_item_evidences
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.inspections_rrhh i WHERE i.id = inspection_id));

DROP POLICY IF EXISTS "rrhh_item_evidences_delete" ON public.inspections_rrhh_item_evidences;
CREATE POLICY "rrhh_item_evidences_delete"
  ON public.inspections_rrhh_item_evidences
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.inspections_rrhh i WHERE i.id = inspection_id));

DROP POLICY IF EXISTS "gsh_item_evidences_select" ON public.inspections_gsh_item_evidences;
CREATE POLICY "gsh_item_evidences_select"
  ON public.inspections_gsh_item_evidences
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.inspections_gsh i WHERE i.id = inspection_id));

DROP POLICY IF EXISTS "gsh_item_evidences_insert" ON public.inspections_gsh_item_evidences;
CREATE POLICY "gsh_item_evidences_insert"
  ON public.inspections_gsh_item_evidences
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.inspections_gsh i WHERE i.id = inspection_id));

DROP POLICY IF EXISTS "gsh_item_evidences_delete" ON public.inspections_gsh_item_evidences;
CREATE POLICY "gsh_item_evidences_delete"
  ON public.inspections_gsh_item_evidences
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.inspections_gsh i WHERE i.id = inspection_id));

-- =====================================================
-- 4) Storage policies (bucket privado, lectura/uso por usuarios autenticados con acceso via tablas)
-- - SELECT: permitido si el objeto está registrado en alguna tabla de evidencias y el usuario puede ver esa inspección.
-- - INSERT/UPDATE/DELETE: permitido si el objeto está bajo el prefijo "inspections/" dentro del bucket.
-- =====================================================

DROP POLICY IF EXISTS "inspection_evidences_select" ON storage.objects;
CREATE POLICY "inspection_evidences_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'inspection-evidences'
    AND (
      EXISTS (
        SELECT 1
        FROM public.inspections_rrhh_item_evidences e
        WHERE e.storage_path = name
      )
      OR EXISTS (
        SELECT 1
        FROM public.inspections_gsh_item_evidences e
        WHERE e.storage_path = name
      )
    )
  );

DROP POLICY IF EXISTS "inspection_evidences_insert" ON storage.objects;
CREATE POLICY "inspection_evidences_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'inspection-evidences'
    AND (storage.foldername(name))[1] = 'inspections'
  );

DROP POLICY IF EXISTS "inspection_evidences_update" ON storage.objects;
CREATE POLICY "inspection_evidences_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'inspection-evidences'
    AND (storage.foldername(name))[1] = 'inspections'
  );

DROP POLICY IF EXISTS "inspection_evidences_delete" ON storage.objects;
CREATE POLICY "inspection_evidences_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'inspection-evidences'
    AND (storage.foldername(name))[1] = 'inspections'
  );
