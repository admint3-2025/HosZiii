-- Migración para sistema de archivos adjuntos
-- Ejecutar en Supabase SQL Editor

-- Tabla para trackear archivos adjuntos de tickets
CREATE TABLE IF NOT EXISTS ticket_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES ticket_comments(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL, -- tamaño en bytes
  file_type TEXT NOT NULL, -- MIME type
  storage_path TEXT NOT NULL, -- ruta en Supabase Storage
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL,
  
  CONSTRAINT valid_file_size CHECK (file_size > 0 AND file_size <= 10485760) -- máx 10MB
);

-- Índices para mejorar performance
CREATE INDEX idx_ticket_attachments_ticket_id ON ticket_attachments(ticket_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_ticket_attachments_uploaded_by ON ticket_attachments(uploaded_by);
CREATE INDEX idx_ticket_attachments_created_at ON ticket_attachments(created_at DESC);

-- RLS: Habilitar Row Level Security
ALTER TABLE ticket_attachments ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden ver adjuntos de sus tickets o si son staff
CREATE POLICY "Users can view attachments"
ON ticket_attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tickets t
    LEFT JOIN profiles p ON p.id = auth.uid()
    WHERE t.id = ticket_attachments.ticket_id
    AND t.deleted_at IS NULL
    AND ticket_attachments.deleted_at IS NULL
    AND (
      t.requester_id = auth.uid()
      OR t.assigned_agent_id = auth.uid()
      OR p.role IN ('agent_l1', 'agent_l2', 'supervisor', 'admin')
    )
  )
);

-- Política: Los usuarios pueden subir adjuntos a sus tickets o si son staff
CREATE POLICY "Users can upload attachments"
ON ticket_attachments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tickets t
    LEFT JOIN profiles p ON p.id = auth.uid()
    WHERE t.id = ticket_attachments.ticket_id
    AND t.deleted_at IS NULL
    AND (
      t.requester_id = auth.uid()
      OR t.assigned_agent_id = auth.uid()
      OR p.role IN ('agent_l1', 'agent_l2', 'supervisor', 'admin')
    )
  )
);

-- Política: Solo staff puede eliminar adjuntos (soft delete)
CREATE POLICY "Staff can delete attachments"
ON ticket_attachments FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('agent_l1', 'agent_l2', 'supervisor', 'admin')
  )
);

-- Trigger para auditoría al eliminar archivos
CREATE OR REPLACE FUNCTION audit_attachment_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    INSERT INTO audit_log (action, entity_type, entity_id, actor_id, metadata)
    VALUES (
      'SOFT_DELETE',
      'attachment',
      NEW.id,
      auth.uid(),
      jsonb_build_object(
        'ticket_id', NEW.ticket_id,
        'file_name', NEW.file_name,
        'file_size', NEW.file_size
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_audit_attachment_deletion
AFTER UPDATE ON ticket_attachments
FOR EACH ROW
EXECUTE FUNCTION audit_attachment_deletion();

-- Comentarios para documentación
COMMENT ON TABLE ticket_attachments IS 'Archivos adjuntos de tickets (imágenes, documentos, etc.)';
COMMENT ON COLUMN ticket_attachments.storage_path IS 'Ruta completa en Supabase Storage bucket';
COMMENT ON COLUMN ticket_attachments.file_size IS 'Tamaño del archivo en bytes (máx 10MB)';
