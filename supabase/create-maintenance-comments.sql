-- Tabla de comentarios para tickets de mantenimiento
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS maintenance_ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets_maintenance(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  body TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'internal')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_maintenance_comments_ticket ON maintenance_ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_comments_author ON maintenance_ticket_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_comments_created ON maintenance_ticket_comments(created_at);

-- RLS
ALTER TABLE maintenance_ticket_comments ENABLE ROW LEVEL SECURITY;

-- Política para SELECT: usuarios autenticados pueden ver comentarios de tickets de su sede
CREATE POLICY "maintenance_comments_select" ON maintenance_ticket_comments
  FOR SELECT TO authenticated
  USING (true);

-- Política para INSERT: usuarios autenticados pueden crear comentarios
CREATE POLICY "maintenance_comments_insert" ON maintenance_ticket_comments
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

-- Política para UPDATE: solo el autor puede editar su comentario
CREATE POLICY "maintenance_comments_update" ON maintenance_ticket_comments
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid());

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_maintenance_comment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS maintenance_comments_updated_at ON maintenance_ticket_comments;
CREATE TRIGGER maintenance_comments_updated_at
  BEFORE UPDATE ON maintenance_ticket_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_maintenance_comment_timestamp();

-- Agregar columnas faltantes a tickets_maintenance si no existen
ALTER TABLE tickets_maintenance ADD COLUMN IF NOT EXISTS resolution TEXT;
ALTER TABLE tickets_maintenance ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE tickets_maintenance ADD COLUMN IF NOT EXISTS closed_by UUID;
ALTER TABLE tickets_maintenance ADD COLUMN IF NOT EXISTS assigned_to UUID;
ALTER TABLE tickets_maintenance ADD COLUMN IF NOT EXISTS requester_id UUID;

-- Índice para requester
CREATE INDEX IF NOT EXISTS idx_tickets_maintenance_requester ON tickets_maintenance(requester_id);
CREATE INDEX IF NOT EXISTS idx_tickets_maintenance_assigned ON tickets_maintenance(assigned_to);
