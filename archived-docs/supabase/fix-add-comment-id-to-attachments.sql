-- Agregar columna comment_id a ticket_attachments
-- Ejecutar en Supabase SQL Editor

ALTER TABLE ticket_attachments 
ADD COLUMN IF NOT EXISTS comment_id UUID REFERENCES ticket_comments(id) ON DELETE CASCADE;

-- Crear índice para mejorar performance
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_comment_id 
ON ticket_attachments(comment_id) 
WHERE deleted_at IS NULL;
