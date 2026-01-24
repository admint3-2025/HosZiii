-- =====================================================
-- BUCKET PARA DOCUMENTOS DE BAJA DE ACTIVOS
-- =====================================================
-- Crear bucket público para PDFs de solicitudes de baja
-- Estructura: disposal-documents/{folio}/{filename}.pdf
-- =====================================================

-- Crear bucket si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'disposal-documents',
  'disposal-documents',
  true,  -- Bucket público para que los QR funcionen sin autenticación
  10485760,  -- 10 MB límite por archivo
  ARRAY['application/pdf']  -- Solo PDFs
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf'];

-- =====================================================
-- POLÍTICAS DE ACCESO
-- =====================================================

-- Eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "Cualquiera puede ver PDFs de bajas" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios autenticados pueden subir PDFs de bajas" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar sus PDFs de bajas" ON storage.objects;
DROP POLICY IF EXISTS "Solo administradores pueden eliminar PDFs de bajas" ON storage.objects;

-- 1. Lectura pública (para QR codes)
CREATE POLICY "Cualquiera puede ver PDFs de bajas"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'disposal-documents');

-- 2. Usuarios autenticados pueden subir
CREATE POLICY "Usuarios autenticados pueden subir PDFs de bajas"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'disposal-documents' 
  AND (storage.foldername(name))[1] = 'disposals'
);

-- 3. Usuarios autenticados pueden actualizar (para regenerar PDF con QR)
CREATE POLICY "Usuarios autenticados pueden actualizar sus PDFs de bajas"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'disposal-documents'
  AND (storage.foldername(name))[1] = 'disposals'
);

-- 4. Solo administradores pueden eliminar
CREATE POLICY "Solo administradores pueden eliminar PDFs de bajas"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'disposal-documents'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'director')
  )
);

-- =====================================================
-- ÍNDICE PARA BÚSQUEDA EFICIENTE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_storage_objects_disposal_documents 
ON storage.objects (bucket_id, name) 
WHERE bucket_id = 'disposal-documents';

-- =====================================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- =====================================================

COMMENT ON TABLE storage.buckets IS 'Buckets de almacenamiento de Supabase Storage';
COMMENT ON COLUMN storage.buckets.allowed_mime_types IS 'Tipos MIME permitidos en el bucket (NULL = todos permitidos)';

-- Verificación
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM storage.buckets 
    WHERE id = 'disposal-documents'
  ) THEN
    RAISE NOTICE '✓ Bucket "disposal-documents" creado correctamente';
    RAISE NOTICE '  - Acceso público: SÍ';
    RAISE NOTICE '  - Límite de tamaño: 10 MB';
    RAISE NOTICE '  - Tipos permitidos: application/pdf';
    RAISE NOTICE '  - Estructura: disposal-documents/disposals/{folio}/{filename}.pdf';
  ELSE
    RAISE EXCEPTION '✗ Error al crear bucket "disposal-documents"';
  END IF;
END $$;
