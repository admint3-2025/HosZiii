-- ============================================================================
-- MIGRATION: Separación Completa de IT y Mantenimiento
-- Descripción: Crear tablas completamente independientes para IT y Mantenimiento
-- Fecha: 2026-01-17
-- SIMPLIFICADO: Solo crea tablas nuevas, sin migrations de datos antigua
-- ============================================================================

-- ============================================================================
-- PARTE 1: CREAR TABLAS DE ASSETS SEPARADAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS assets_it (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  category text NOT NULL,
  brand text,
  model text,
  serial_number text,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'DISPOSED')),
  location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  assigned_to_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  purchase_date date,
  warranty_expiry date,
  cost decimal(12,2),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS assets_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  category text NOT NULL,
  brand text,
  model text,
  serial_number text,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'DISPOSED')),
  location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  assigned_to_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  purchase_date date,
  warranty_expiry date,
  cost decimal(12,2),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_assets_it_code ON assets_it(asset_code);
CREATE INDEX IF NOT EXISTS idx_assets_it_status ON assets_it(status);
CREATE INDEX IF NOT EXISTS idx_assets_it_category ON assets_it(category);
CREATE INDEX IF NOT EXISTS idx_assets_it_location ON assets_it(location_id);
CREATE INDEX IF NOT EXISTS idx_assets_it_assigned ON assets_it(assigned_to_user_id);

CREATE INDEX IF NOT EXISTS idx_assets_maintenance_code ON assets_maintenance(asset_code);
CREATE INDEX IF NOT EXISTS idx_assets_maintenance_status ON assets_maintenance(status);
CREATE INDEX IF NOT EXISTS idx_assets_maintenance_category ON assets_maintenance(category);
CREATE INDEX IF NOT EXISTS idx_assets_maintenance_location ON assets_maintenance(location_id);
CREATE INDEX IF NOT EXISTS idx_assets_maintenance_assigned ON assets_maintenance(assigned_to_user_id);

-- ============================================================================
-- PARTE 2: CREAR TABLAS DE TICKETS SEPARADAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS tickets_it (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'ASSIGNED', 'IN_PROGRESS', 'NEEDS_INFO', 'WAITING_THIRD_PARTY', 'RESOLVED', 'CLOSED', 'REOPENED')),
  priority text NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  support_level integer DEFAULT 1,
  requester_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_agent_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tickets_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'ASSIGNED', 'IN_PROGRESS', 'NEEDS_INFO', 'WAITING_THIRD_PARTY', 'RESOLVED', 'CLOSED', 'REOPENED')),
  priority text NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  support_level integer DEFAULT 1,
  requester_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_agent_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tickets_it_status ON tickets_it(status);
CREATE INDEX IF NOT EXISTS idx_tickets_it_priority ON tickets_it(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_it_requester ON tickets_it(requester_id);
CREATE INDEX IF NOT EXISTS idx_tickets_it_agent ON tickets_it(assigned_agent_id);

CREATE INDEX IF NOT EXISTS idx_tickets_maintenance_status ON tickets_maintenance(status);
CREATE INDEX IF NOT EXISTS idx_tickets_maintenance_priority ON tickets_maintenance(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_maintenance_requester ON tickets_maintenance(requester_id);
CREATE INDEX IF NOT EXISTS idx_tickets_maintenance_agent ON tickets_maintenance(assigned_agent_id);

-- ============================================================================
-- PARTE 3: CREAR TABLAS DE COMMENTS SEPARADAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS ticket_comments_it (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets_it(id) ON DELETE CASCADE,
  comment_text text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS ticket_comments_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets_maintenance(id) ON DELETE CASCADE,
  comment_text text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_ticket_comments_it_ticket ON ticket_comments_it(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_maintenance_ticket ON ticket_comments_maintenance(ticket_id);

-- ============================================================================
-- PARTE 4: CREAR TABLAS DE ATTACHMENTS SEPARADAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS ticket_attachments_it (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets_it(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES ticket_comments_it(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  mime_type text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ticket_attachments_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets_maintenance(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES ticket_comments_maintenance(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  mime_type text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_attachments_it_ticket ON ticket_attachments_it(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_maintenance_ticket ON ticket_attachments_maintenance(ticket_id);

-- ============================================================================
-- PARTE 5: HABILITAR RLS (Row Level Security)
-- ============================================================================

ALTER TABLE tickets_it ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets_it ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_attachments_it ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_attachments_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments_it ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments_maintenance ENABLE ROW LEVEL SECURITY;

-- RLS Policy: tickets_it
CREATE POLICY "tickets_it_select" ON tickets_it FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.asset_category = 'IT')
  )
);

-- RLS Policy: tickets_maintenance
CREATE POLICY "tickets_maintenance_select" ON tickets_maintenance FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.asset_category = 'MAINTENANCE')
  )
);

-- RLS Policy: assets_it
CREATE POLICY "assets_it_select" ON assets_it FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.asset_category = 'IT')
  )
);

-- RLS Policy: assets_maintenance
CREATE POLICY "assets_maintenance_select" ON assets_maintenance FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.asset_category = 'MAINTENANCE')
  )
);

-- RLS Policy: comments IT
CREATE POLICY "ticket_comments_it_select" ON ticket_comments_it FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.asset_category = 'IT')
  )
);

-- RLS Policy: comments Maintenance
CREATE POLICY "ticket_comments_maintenance_select" ON ticket_comments_maintenance FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.asset_category = 'MAINTENANCE')
  )
);

-- RLS Policy: attachments IT
CREATE POLICY "ticket_attachments_it_select" ON ticket_attachments_it FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.asset_category = 'IT')
  )
);

-- RLS Policy: attachments Maintenance
CREATE POLICY "ticket_attachments_maintenance_select" ON ticket_attachments_maintenance FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.asset_category = 'MAINTENANCE')
  )
);

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================
-- 
-- Tablas creadas: 8 tablas nuevas separadas por módulo
-- RLS habilitado: Seguridad enforced a nivel de base de datos
-- Próximos pasos: Actualizar queries en Next.js para usar nuevas tablas
