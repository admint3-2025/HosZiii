-- ============================================================================
-- FIX: Funciones de Base de Conocimientos
-- Problema 1: detect_kb_candidate_from_ticket usaba columnas inexistentes
--             (category_level1 directamente en tickets, status en minúsculas,
--              user_id en ticket_comments, resolution min 100 chars muy alto)
-- Problema 2: relevance_score no se recalculaba automáticamente
-- Solución: Reescribir ambas funciones con el schema real
-- ============================================================================

-- ============================================================================
-- PARTE 1: FUNCIÓN calculate_article_relevance_score
-- Fórmula ponderada basada en: utilidad, uso, vistas y recencia
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_article_relevance_score(article_id_param UUID)
RETURNS DECIMAL AS $$
DECLARE
  rec RECORD;
  helpful_score    DECIMAL;
  usage_score      DECIMAL;
  view_score       DECIMAL;
  recency_score    DECIMAL;
  total_score      DECIMAL;
  total_votes      INTEGER;
BEGIN
  SELECT
    helpful_count,
    not_helpful_count,
    times_used,
    views_count,
    EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400.0 AS days_old
  INTO rec
  FROM knowledge_base_articles
  WHERE id = article_id_param;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  total_votes := rec.helpful_count + rec.not_helpful_count;

  -- Score por valoraciones (ratio de utilidad × 30 puntos máx)
  IF total_votes > 0 THEN
    helpful_score := (rec.helpful_count::DECIMAL / total_votes) * 30.0;
  ELSE
    helpful_score := 15.0; -- neutro si sin votos
  END IF;

  -- Score por uso efectivo (2 pts por uso, máx 20)
  usage_score := LEAST(rec.times_used * 2.0, 20.0);

  -- Score por visualizaciones (0.5 pts por vista, máx 10)
  view_score := LEAST(rec.views_count * 0.5, 10.0);

  -- Score por recencia (decrece 1 pt cada 30 días, mínimo 2)
  recency_score := GREATEST(10.0 - (rec.days_old / 30.0), 2.0);

  total_score := helpful_score + usage_score + view_score + recency_score;

  RETURN ROUND(total_score, 2);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PARTE 2: TRIGGER para recalcular relevance_score al actualizar métricas
-- ============================================================================
CREATE OR REPLACE FUNCTION update_article_relevance_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.relevance_score := calculate_article_relevance_score(NEW.id);
  NEW.updated_at     := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_article_relevance ON knowledge_base_articles;
CREATE TRIGGER trg_update_article_relevance
  BEFORE UPDATE OF helpful_count, not_helpful_count, times_used, views_count
  ON knowledge_base_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_article_relevance_score();

-- ============================================================================
-- PARTE 3: detect_kb_candidate_from_ticket (versión corregida)
-- Cambios vs versión original:
--   - status = 'CLOSED' (mayúsculas, como lo usa el sistema)
--   - Obtiene categorías (L1/L2/L3) vía JOIN a ticket_categories
--   - Usa author_id (no user_id) en ticket_comments
--   - Umbral de resolución bajado a 30 chars (más permisivo)
--   - No exige category_level2 obligatorio
--   - Evita duplicados: no crea artículo si ya existe para ese ticket
-- ============================================================================
CREATE OR REPLACE FUNCTION detect_kb_candidate_from_ticket(ticket_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  ticket_rec   RECORD;
  cat_l1       TEXT;
  cat_l2       TEXT;
  cat_l3       TEXT;
  resolution_solution TEXT;
BEGIN
  -- Obtener datos básicos del ticket
  SELECT
    t.id,
    t.title,
    t.description,
    t.resolution,
    t.status,
    t.closed_by,
    t.category_id
  INTO ticket_rec
  FROM tickets t
  WHERE t.id = ticket_id_param;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Verificar que está cerrado (el sistema usa 'CLOSED' en mayúsculas)
  IF ticket_rec.status <> 'CLOSED' THEN
    RETURN FALSE;
  END IF;

  -- Verificar resolución mínima
  IF ticket_rec.resolution IS NULL OR LENGTH(TRIM(ticket_rec.resolution)) < 30 THEN
    RETURN FALSE;
  END IF;

  -- Evitar duplicados
  IF EXISTS (
    SELECT 1 FROM knowledge_base_articles
    WHERE source_ticket_id = ticket_id_param
      AND deleted_at IS NULL
  ) THEN
    RETURN FALSE;
  END IF;

  -- Obtener jerarquía de categorías
  IF ticket_rec.category_id IS NOT NULL THEN
    SELECT
      COALESCE(l1.name, l2.name, leaf.name) AS level1,
      CASE WHEN l1.id IS NOT NULL THEN COALESCE(l2.name, leaf.name) ELSE NULL END AS level2,
      CASE WHEN l1.id IS NOT NULL AND l2.id IS NOT NULL THEN leaf.name ELSE NULL END AS level3
    INTO cat_l1, cat_l2, cat_l3
    FROM ticket_categories leaf
    LEFT JOIN ticket_categories l2 ON l2.id = leaf.parent_id
    LEFT JOIN ticket_categories l1 ON l1.id = l2.parent_id
    WHERE leaf.id = ticket_rec.category_id;
  END IF;

  -- Si no hay categoría L1, usar genérico
  cat_l1 := COALESCE(cat_l1, 'General');

  -- Construir texto de solución
  resolution_solution := TRIM(ticket_rec.resolution);

  -- Crear artículo pendiente de revisión
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
    ticket_rec.title,
    LEFT(COALESCE(ticket_rec.description, ''), 300),
    resolution_solution,
    cat_l1,
    cat_l2,
    cat_l3,
    ticket_id_param,
    ticket_rec.closed_by,
    'pending',
    TRIM(ticket_rec.title || ' ' || COALESCE(ticket_rec.description, '') || ' ' || resolution_solution)
  );

  -- Registrar sugerencia automática
  INSERT INTO knowledge_base_suggestions (
    ticket_id,
    auto_generated,
    was_approved
  ) VALUES (
    ticket_id_param,
    TRUE,
    FALSE
  ) ON CONFLICT DO NOTHING;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION detect_kb_candidate_from_ticket(UUID) IS
'Detecta si un ticket cerrado califica para crear artículo de KB automáticamente (versión corregida)';

COMMENT ON FUNCTION calculate_article_relevance_score(UUID) IS
'Calcula el score de relevancia de un artículo KB: utilidad(30) + uso(20) + vistas(10) + recencia(10)';

-- ============================================================================
-- PARTE 4: Recalcular scores de artículos existentes
-- ============================================================================
UPDATE knowledge_base_articles
SET relevance_score = calculate_article_relevance_score(id)
WHERE deleted_at IS NULL;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
-- SELECT routine_name FROM information_schema.routines
-- WHERE routine_name IN (
--   'calculate_article_relevance_score',
--   'update_article_relevance_score',
--   'detect_kb_candidate_from_ticket'
-- );
