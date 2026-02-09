-- =====================================================
-- MÓDULO: POLÍTICAS
-- =====================================================
-- Tablas para gestionar estándares y políticas de empresa.
-- Administrado desde /corporativo/politicas/admin
-- Visible para usuarios con hub_visible_modules['politicas'] = true
-- =====================================================

-- 1. CATEGORÍAS DE POLÍTICAS
CREATE TABLE IF NOT EXISTS policy_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT DEFAULT '📋',
  color TEXT DEFAULT '#6366f1',
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. POLÍTICAS / DOCUMENTOS
CREATE TABLE IF NOT EXISTS policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES policy_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT NOT NULL, -- Contenido completo (Markdown o HTML)
  version TEXT DEFAULT '1.0',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  is_mandatory BOOLEAN DEFAULT false, -- Lectura obligatoria
  effective_date DATE, -- Fecha de vigencia
  review_date DATE, -- Fecha de revisión
  attachment_url TEXT, -- URL de documento adjunto (PDF, etc.)
  attachment_name TEXT,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. REGISTRO DE LECTURAS (acknowledgments)
-- Registra cuándo un usuario leyó/aceptó una política
CREATE TABLE IF NOT EXISTS policy_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ DEFAULT now(),
  version_read TEXT, -- Versión de la política que leyó
  UNIQUE(policy_id, user_id)
);

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_policies_category ON policies(category_id);
CREATE INDEX IF NOT EXISTS idx_policies_status ON policies(status);
CREATE INDEX IF NOT EXISTS idx_policy_ack_user ON policy_acknowledgments(user_id);
CREATE INDEX IF NOT EXISTS idx_policy_ack_policy ON policy_acknowledgments(policy_id);

-- RLS
ALTER TABLE policy_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_acknowledgments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: categorías visibles para todos los autenticados
CREATE POLICY "policy_categories_select" ON policy_categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "policy_categories_insert" ON policy_categories
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'corporate_admin'))
  );

CREATE POLICY "policy_categories_update" ON policy_categories
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'corporate_admin'))
  );

CREATE POLICY "policy_categories_delete" ON policy_categories
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'corporate_admin'))
  );

-- Políticas RLS: documentos publicados visibles para todos, drafts solo admin
CREATE POLICY "policies_select" ON policies
  FOR SELECT TO authenticated
  USING (
    status = 'published'
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'corporate_admin'))
  );

CREATE POLICY "policies_insert" ON policies
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'corporate_admin'))
  );

CREATE POLICY "policies_update" ON policies
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'corporate_admin'))
  );

CREATE POLICY "policies_delete" ON policies
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'corporate_admin'))
  );

-- Políticas RLS: acknowledgments
CREATE POLICY "policy_ack_select" ON policy_acknowledgments
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'corporate_admin'))
  );

CREATE POLICY "policy_ack_insert" ON policy_acknowledgments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- DATOS INICIALES: Categorías de ejemplo
-- =====================================================
INSERT INTO policy_categories (name, slug, description, icon, color, sort_order) VALUES
  ('Código de Ética', 'codigo-etica', 'Normas de conducta y valores organizacionales', '⚖️', '#8b5cf6', 1),
  ('Seguridad e Higiene', 'seguridad-higiene', 'Protocolos de seguridad, salud ocupacional e higiene', '🛡️', '#ef4444', 2),
  ('Recursos Humanos', 'recursos-humanos', 'Políticas de personal, beneficios y procedimientos', '👥', '#3b82f6', 3),
  ('Operaciones', 'operaciones', 'Estándares operativos y procedimientos de servicio', '⚙️', '#f59e0b', 4),
  ('Tecnología', 'tecnologia', 'Uso de sistemas, seguridad informática y datos', '💻', '#06b6d4', 5),
  ('Calidad', 'calidad', 'Estándares de calidad y mejora continua', '✨', '#10b981', 6)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- AGREGAR 'politicas' AL DEFAULT de hub_visible_modules
-- para nuevos usuarios
-- =====================================================
-- NOTA: No modificar usuarios existentes. El módulo aparecerá
-- cuando se active manualmente desde gestión de usuarios.
