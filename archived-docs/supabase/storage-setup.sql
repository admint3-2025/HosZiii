-- Configuración del Storage Bucket para archivos adjuntos
-- Ejecutar en Supabase SQL Editor DESPUÉS de crear el bucket manualmente

-- PASO 1: Ir a Storage en Supabase Dashboard y crear un bucket llamado "ticket-attachments"
-- Configuración: public=false (privado)

-- PASO 2: Ejecutar este script para configurar las políticas de acceso

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

-- Política: Permitir actualización de archivos a usuarios autenticados (para metadata)
CREATE POLICY "Users can update attachments"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'ticket-attachments')
WITH CHECK (bucket_id = 'ticket-attachments');

-- Política: Permitir eliminación de archivos solo a staff
CREATE POLICY "Staff can delete attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'ticket-attachments' AND
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('agent_l1', 'agent_l2', 'supervisor', 'admin')
  )
);

-- INSTRUCCIONES DE CONFIGURACIÓN MANUAL:
-- 
-- 1. Ve a Supabase Dashboard → Storage
-- 2. Crea un nuevo bucket llamado: ticket-attachments
-- 3. Configuración:
--    - Public: NO (privado)
--    - File size limit: 10485760 (10MB)
--    - Allowed MIME types: image/*, application/pdf, application/msword, 
--      application/vnd.openxmlformats-officedocument.*, text/plain
-- 4. Ejecuta este script SQL en el SQL Editor
-- 5. Verifica que las políticas se hayan creado en Storage → Policies
