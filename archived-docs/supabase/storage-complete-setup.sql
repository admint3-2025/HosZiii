-- ============================================================================
-- CONFIGURACIÓN COMPLETA DE STORAGE PARA TICKET-ATTACHMENTS
-- ============================================================================
-- Este script configura el storage bucket y todas sus políticas RLS
-- Ejecutar en Supabase SQL Editor

-- PASO 1: Crear el bucket (si no existe)
-- NOTA: Algunos comandos pueden requerir ejecución manual desde el dashboard
-- Si este INSERT falla, ve a Storage > Create bucket > "ticket-attachments"

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ticket-attachments',
  'ticket-attachments',
  false,
  10485760, -- 10MB limit
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    'application/zip',
    'application/x-zip-compressed'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- PASO 2: Eliminar políticas existentes (si las hay)
DROP POLICY IF EXISTS "Users can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can update attachments" ON storage.objects;
DROP POLICY IF EXISTS "Staff can delete attachments" ON storage.objects;

-- PASO 3: Crear políticas de acceso

-- Política: Permitir carga de archivos a usuarios autenticados
CREATE POLICY "Users can upload attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ticket-attachments');

-- Política: Permitir lectura de archivos según permisos del ticket
CREATE POLICY "Users can view attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'ticket-attachments' AND
  EXISTS (
    SELECT 1
    FROM ticket_attachments ta
    JOIN tickets t ON t.id = ta.ticket_id
    LEFT JOIN profiles p ON p.id = auth.uid()
    WHERE ta.storage_path = storage.objects.name
    AND ta.deleted_at IS NULL
    AND t.deleted_at IS NULL
    AND (
      t.requester_id = auth.uid()
      OR t.assigned_agent_id = auth.uid()
      OR p.role IN ('agent_l1', 'agent_l2', 'supervisor', 'admin')
    )
  )
);

-- Política: Permitir actualización de archivos a usuarios autenticados
CREATE POLICY "Users can update attachments"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'ticket-attachments')
WITH CHECK (bucket_id = 'ticket-attachments');

-- Política: Permitir eliminación de archivos a staff y al uploader
CREATE POLICY "Staff can delete attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'ticket-attachments' AND
  EXISTS (
    SELECT 1
    FROM ticket_attachments ta
    LEFT JOIN profiles p ON p.id = auth.uid()
    WHERE ta.storage_path = storage.objects.name
    AND (
      ta.uploaded_by = auth.uid()
      OR p.role IN ('agent_l1', 'agent_l2', 'supervisor', 'admin')
    )
  )
);

-- Verificar que el bucket fue creado correctamente
SELECT id, name, public, file_size_limit, created_at 
FROM storage.buckets 
WHERE id = 'ticket-attachments';

-- Verificar políticas creadas
SELECT policyname, cmd, permissive 
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage';

-- ============================================================================
-- INSTRUCCIONES SI EL INSERT DEL BUCKET FALLA:
-- ============================================================================
-- 1. Ve a tu Supabase Dashboard (http://192.168.31.238:8000)
-- 2. Ve a Storage en el menú lateral
-- 3. Click en "Create bucket" o "New bucket"
-- 4. Nombre: ticket-attachments
-- 5. Public: OFF (desactivado - privado)
-- 6. File size limit: 10 MB
-- 7. Allowed MIME types: (lista de arriba, o dejar en blanco para permitir todos)
-- 8. Click en "Create bucket"
-- 9. Ejecuta solo las políticas (desde DROP POLICY en adelante)
-- ============================================================================
