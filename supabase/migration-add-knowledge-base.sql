-- Migración para Sistema de Base de Conocimientos
-- Recopilación automática de soluciones basadas en tickets resueltos

-- 1. Tabla principal de artículos de conocimiento
CREATE TABLE IF NOT EXISTS knowledge_base_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT,
  solution TEXT NOT NULL,
  
  -- Categorización (campos llave del ticket origen)
  category_level1 TEXT NOT NULL,
  category_level2 TEXT,
  category_level3 TEXT,
  
  -- Origen y trazabilidad
  source_ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Estado y aprobación
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'draft')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Métricas de relevancia
  views_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  times_used INTEGER DEFAULT 0,
  relevance_score DECIMAL(5,2) DEFAULT 0,
  
  -- Metadatos adicionales
  tags TEXT[],
  keywords TEXT,
  
  -- Soft delete
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
);

-- 2. Tabla de uso de artículos (tracking)
CREATE TABLE IF NOT EXISTS knowledge_base_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES knowledge_base_articles(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  used_by UUID NOT NULL REFERENCES auth.users(id),
  was_helpful BOOLEAN,
  feedback_comment TEXT,
  used_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de sugerencias automáticas rechazadas (para no volver a sugerir)
CREATE TABLE IF NOT EXISTS knowledge_base_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  suggested_at TIMESTAMPTZ DEFAULT NOW(),
  auto_generated BOOLEAN DEFAULT false,
  was_approved BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ
);

-- 4. Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_kb_articles_categories ON knowledge_base_articles(category_level1, category_level2, category_level3) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_kb_articles_status ON knowledge_base_articles(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_kb_articles_relevance ON knowledge_base_articles(relevance_score DESC) WHERE status = 'approved' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_kb_articles_keywords ON knowledge_base_articles USING gin(to_tsvector('spanish', keywords)) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_kb_usage_article ON knowledge_base_usage(article_id);
CREATE INDEX IF NOT EXISTS idx_kb_usage_ticket ON knowledge_base_usage(ticket_id);
CREATE INDEX IF NOT EXISTS idx_kb_suggestions_ticket ON knowledge_base_suggestions(ticket_id);

-- 5. Función para calcular score de relevancia
CREATE OR REPLACE FUNCTION calculate_article_relevance_score(article_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  helpful_weight DECIMAL := 3.0;
  usage_weight DECIMAL := 2.0;
  view_weight DECIMAL := 0.5;
  recency_weight DECIMAL := 1.0;
  
  helpful_score DECIMAL;
  usage_score DECIMAL;
  view_score DECIMAL;
  recency_score DECIMAL;
  total_score DECIMAL;
  
  article_record RECORD;
BEGIN
  SELECT 
    helpful_count,
    not_helpful_count,
    times_used,
    views_count,
    EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 as days_old
  INTO article_record
  FROM knowledge_base_articles
  WHERE id = article_id;
  
  -- Score por valoraciones positivas (ratio)
  IF (article_record.helpful_count + article_record.not_helpful_count) > 0 THEN
    helpful_score := (article_record.helpful_count::DECIMAL / 
                     (article_record.helpful_count + article_record.not_helpful_count)) * helpful_weight * 10;
  ELSE
    helpful_score := 5.0; -- Neutral si no hay valoraciones
  END IF;
  
  -- Score por uso efectivo
  usage_score := LEAST(article_record.times_used * usage_weight, 20.0);
  
  -- Score por visualizaciones
  view_score := LEAST(article_record.views_count * view_weight, 10.0);
  
  -- Score por recencia (decrece con el tiempo, pero nunca a 0)
  recency_score := GREATEST(10.0 - (article_record.days_old / 30), 2.0);
  
  total_score := helpful_score + usage_score + view_score + recency_score;
  
  RETURN ROUND(total_score, 2);
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger para actualizar relevance_score automáticamente
CREATE OR REPLACE FUNCTION update_article_relevance_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.relevance_score := calculate_article_relevance_score(NEW.id);
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_article_relevance ON knowledge_base_articles;
CREATE TRIGGER trg_update_article_relevance
  BEFORE UPDATE OF helpful_count, not_helpful_count, times_used, views_count
  ON knowledge_base_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_article_relevance_score();

-- 7. Función para detectar tickets candidatos a KB (llamada al cerrar ticket)
CREATE OR REPLACE FUNCTION detect_kb_candidate_from_ticket(ticket_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  ticket_data RECORD;
  comments_count INTEGER;
  has_resolution BOOLEAN;
  resolution_text TEXT;
BEGIN
  -- Obtener datos del ticket
  SELECT t.*, t.resolution
  INTO ticket_data
  FROM tickets t
  WHERE t.id = ticket_id_param;
  
  -- Contar comentarios del agente que resolvió
  SELECT COUNT(*)
  INTO comments_count
  FROM ticket_comments tc
  WHERE tc.ticket_id = ticket_id_param
    AND tc.user_id = ticket_data.closed_by
    AND LENGTH(tc.content) > 50; -- Comentarios significativos
  
  -- Verificar si hay resolución documentada
  has_resolution := ticket_data.resolution IS NOT NULL 
                    AND LENGTH(ticket_data.resolution) > 100;
  
  -- Criterios de elegibilidad:
  -- 1. Ticket cerrado
  -- 2. Al menos 2 comentarios del resolvedor
  -- 3. Resolución documentada
  -- 4. Categorías completas (nivel 1 y 2 al menos)
  IF ticket_data.status = 'closed' 
     AND comments_count >= 2
     AND has_resolution
     AND ticket_data.category_level1 IS NOT NULL
     AND ticket_data.category_level2 IS NOT NULL
  THEN
    -- Extraer texto de resolución (combinar resolution + últimos comentarios)
    SELECT string_agg(content, E'\n\n') 
    INTO resolution_text
    FROM (
      SELECT content
      FROM ticket_comments
      WHERE ticket_id = ticket_id_param
        AND user_id = ticket_data.closed_by
      ORDER BY created_at DESC
      LIMIT 3
    ) recent_comments;
    
    resolution_text := COALESCE(ticket_data.resolution, '') || E'\n\n' || COALESCE(resolution_text, '');
    
    -- Crear artículo en estado 'pending'
    INSERT INTO knowledge_base_articles (
      title,
      summary,
      solution,
      category_level1,
      category_level2,
      category_level3,
      source_ticket_id,
      created_by,
      status,
      keywords
    ) VALUES (
      ticket_data.title,
      LEFT(ticket_data.description, 200),
      resolution_text,
      ticket_data.category_level1,
      ticket_data.category_level2,
      ticket_data.category_level3,
      ticket_id_param,
      ticket_data.closed_by,
      'pending',
      ticket_data.title || ' ' || COALESCE(ticket_data.description, '')
    );
    
    -- Registrar que se creó la sugerencia
    INSERT INTO knowledge_base_suggestions (
      ticket_id,
      auto_generated,
      was_approved
    ) VALUES (
      ticket_id_param,
      true,
      false
    );
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- 8. RLS Policies
ALTER TABLE knowledge_base_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base_suggestions ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas existentes
DROP POLICY IF EXISTS "Usuarios pueden ver artículos aprobados" ON knowledge_base_articles;
DROP POLICY IF EXISTS "Admins y supervisores ven todos los artículos" ON knowledge_base_articles;
DROP POLICY IF EXISTS "Usuarios ven sus propios artículos" ON knowledge_base_articles;
DROP POLICY IF EXISTS "Agentes pueden crear artículos" ON knowledge_base_articles;
DROP POLICY IF EXISTS "Admins pueden actualizar artículos" ON knowledge_base_articles;
DROP POLICY IF EXISTS "Usuarios pueden registrar uso de artículos" ON knowledge_base_usage;
DROP POLICY IF EXISTS "Usuarios pueden ver uso de artículos" ON knowledge_base_usage;
DROP POLICY IF EXISTS "Usuarios ven sugerencias" ON knowledge_base_suggestions;
DROP POLICY IF EXISTS "Sistema crea sugerencias" ON knowledge_base_suggestions;

-- Todos pueden ver artículos aprobados
CREATE POLICY "Usuarios pueden ver artículos aprobados"
  ON knowledge_base_articles FOR SELECT
  TO authenticated
  USING (status = 'approved' AND deleted_at IS NULL);

-- Admins y supervisores ven todos
CREATE POLICY "Admins y supervisores ven todos los artículos"
  ON knowledge_base_articles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'supervisor')
    )
  );

-- Creadores pueden ver sus propios artículos
CREATE POLICY "Usuarios ven sus propios artículos"
  ON knowledge_base_articles FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

-- Agentes pueden crear artículos
CREATE POLICY "Agentes pueden crear artículos"
  ON knowledge_base_articles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'supervisor', 'agent_l1', 'agent_l2')
    )
  );

-- Admins pueden actualizar artículos
CREATE POLICY "Admins pueden actualizar artículos"
  ON knowledge_base_articles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'supervisor')
    )
  );

-- Todos pueden registrar uso
CREATE POLICY "Usuarios pueden registrar uso de artículos"
  ON knowledge_base_usage FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = used_by);

-- Todos pueden ver uso
CREATE POLICY "Usuarios pueden ver uso de artículos"
  ON knowledge_base_usage FOR SELECT
  TO authenticated
  USING (true);

-- Policies para sugerencias
CREATE POLICY "Usuarios ven sugerencias"
  ON knowledge_base_suggestions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Sistema crea sugerencias"
  ON knowledge_base_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 9. Comentarios
COMMENT ON TABLE knowledge_base_articles IS 'Artículos de base de conocimientos generados automáticamente desde tickets resueltos';
COMMENT ON TABLE knowledge_base_usage IS 'Tracking de uso y efectividad de artículos de KB';
COMMENT ON TABLE knowledge_base_suggestions IS 'Registro de sugerencias automáticas de creación de artículos';
COMMENT ON FUNCTION detect_kb_candidate_from_ticket IS 'Detecta si un ticket cerrado califica para crear artículo de KB automáticamente';
