-- ============================================================================
-- SCRIPT: Asegurar bucket de storage y políticas para adjuntos de mantenimiento
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- PARTE 0: Crear tabla de comentarios de mantenimiento si no existe
-- ============================================================================

-- Eliminar tabla si existe para recrearla con columnas correctas
DROP TABLE IF EXISTS maintenance_ticket_comments CASCADE;

CREATE TABLE maintenance_ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets_maintenance(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id),
  body TEXT NOT NULL,
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'internal')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_maintenance_ticket_comments_ticket_id 
  ON maintenance_ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_ticket_comments_author_id 
  ON maintenance_ticket_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_ticket_comments_created_at 
  ON maintenance_ticket_comments(created_at DESC);

-- Habilitar RLS
ALTER TABLE maintenance_ticket_comments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para comentarios
DROP POLICY IF EXISTS "maintenance_ticket_comments_select" ON maintenance_ticket_comments;
DROP POLICY IF EXISTS "maintenance_ticket_comments_insert" ON maintenance_ticket_comments;
DROP POLICY IF EXISTS "maintenance_ticket_comments_update" ON maintenance_ticket_comments;
DROP POLICY IF EXISTS "maintenance_ticket_comments_delete" ON maintenance_ticket_comments;

-- SELECT: Usuarios autenticados pueden ver comentarios
CREATE POLICY "maintenance_ticket_comments_select" ON maintenance_ticket_comments
FOR SELECT USING (auth.role() = 'authenticated');

-- INSERT: Usuarios autenticados pueden crear comentarios
CREATE POLICY "maintenance_ticket_comments_insert" ON maintenance_ticket_comments
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- UPDATE: Solo el autor puede editar su comentario
CREATE POLICY "maintenance_ticket_comments_update" ON maintenance_ticket_comments
FOR UPDATE USING (author_id = auth.uid());

-- DELETE: Solo admins y el autor pueden eliminar
CREATE POLICY "maintenance_ticket_comments_delete" ON maintenance_ticket_comments
FOR DELETE USING (
  author_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'supervisor')
  )
);

-- ============================================================================
-- PARTE 1: Crear bucket de storage si no existe
-- ============================================================================

-- Insertar bucket si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'maintenance-attachments',
  'maintenance-attachments', 
  false,  -- No público (requiere auth)
  10485760,  -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PARTE 2: Políticas de storage para el bucket
-- ============================================================================

-- Limpiar políticas existentes
DROP POLICY IF EXISTS "maintenance_attachments_select" ON storage.objects;
DROP POLICY IF EXISTS "maintenance_attachments_insert" ON storage.objects;
DROP POLICY IF EXISTS "maintenance_attachments_delete" ON storage.objects;

-- Política SELECT: Cualquier usuario autenticado puede ver adjuntos de mantenimiento
CREATE POLICY "maintenance_attachments_select" ON storage.objects
FOR SELECT USING (
  bucket_id = 'maintenance-attachments'
  AND auth.role() = 'authenticated'
);

-- Política INSERT: Cualquier usuario autenticado puede subir adjuntos
CREATE POLICY "maintenance_attachments_insert" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'maintenance-attachments'
  AND auth.role() = 'authenticated'
);

-- Política DELETE: Solo técnicos, supervisores y admins pueden eliminar
CREATE POLICY "maintenance_attachments_delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'maintenance-attachments'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.role IN ('admin', 'supervisor', 'agent_l1', 'agent_l2')
      OR profiles.asset_category ILIKE '%MANTENIMIENTO%'
    )
  )
);

-- ============================================================================
-- PARTE 3: Asegurar RLS en tabla de adjuntos de mantenimiento
-- ============================================================================

ALTER TABLE ticket_attachments_maintenance ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas existentes
DROP POLICY IF EXISTS "ticket_attachments_maintenance_select" ON ticket_attachments_maintenance;
DROP POLICY IF EXISTS "ticket_attachments_maintenance_insert" ON ticket_attachments_maintenance;
DROP POLICY IF EXISTS "ticket_attachments_maintenance_delete" ON ticket_attachments_maintenance;

-- Política SELECT: Usuarios autenticados pueden ver adjuntos
CREATE POLICY "ticket_attachments_maintenance_select" ON ticket_attachments_maintenance
FOR SELECT USING (auth.role() = 'authenticated');

-- Política INSERT: Usuarios autenticados pueden crear adjuntos
CREATE POLICY "ticket_attachments_maintenance_insert" ON ticket_attachments_maintenance
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política DELETE: Solo técnicos, supervisores y admins pueden eliminar
CREATE POLICY "ticket_attachments_maintenance_delete" ON ticket_attachments_maintenance
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.role IN ('admin', 'supervisor', 'agent_l1', 'agent_l2')
      OR profiles.asset_category ILIKE '%MANTENIMIENTO%'
    )
  )
);

-- ============================================================================
-- PARTE 4: Agregar columna comment_id a ticket_attachments_maintenance
-- ============================================================================

-- Agregar columna para vincular adjuntos con comentarios
ALTER TABLE ticket_attachments_maintenance 
  ADD COLUMN IF NOT EXISTS comment_id UUID REFERENCES maintenance_ticket_comments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ticket_attachments_maintenance_comment_id 
  ON ticket_attachments_maintenance(comment_id);

-- ============================================================================
-- Verificación
-- ============================================================================
SELECT 
  'Bucket: ' || id || ' (público: ' || public::text || ')' as info
FROM storage.buckets 
WHERE id = 'maintenance-attachments';

SELECT 
  'Política Storage: ' || policyname as info
FROM pg_policies 
WHERE tablename = 'objects' AND policyname LIKE 'maintenance_attachments%';

SELECT 
  'Política Tabla: ' || policyname as info
FROM pg_policies 
WHERE tablename = 'ticket_attachments_maintenance';
