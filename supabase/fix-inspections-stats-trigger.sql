-- ============================================================================
-- RECREAR TRIGGERS PARA RECÁLCULO AUTOMÁTICO DE STATS
-- ============================================================================

-- 1. Verificar y recrear la función de cálculo de estadísticas
CREATE OR REPLACE FUNCTION calculate_inspection_rrhh_stats(p_inspection_id UUID)
RETURNS void AS $$
DECLARE
  v_total_items INT;
  v_cumple_items INT;
  v_no_cumple_items INT;
  v_na_items INT;
  v_pending_items INT;
  v_avg_score DECIMAL(5,2);
BEGIN
  -- Contar items por estado de cumplimiento
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE cumplimiento_valor = 'Cumple'),
    COUNT(*) FILTER (WHERE cumplimiento_valor = 'No Cumple'),
    COUNT(*) FILTER (WHERE cumplimiento_valor = 'N/A'),
    COUNT(*) FILTER (WHERE cumplimiento_valor = '' OR cumplimiento_valor IS NULL)
  INTO v_total_items, v_cumple_items, v_no_cumple_items, v_na_items, v_pending_items
  FROM inspections_rrhh_items
  WHERE inspection_id = p_inspection_id;

  -- Calcular promedio de calificaciones (solo items que cumplen)
  SELECT AVG(calif_valor)::DECIMAL(5,2)
  INTO v_avg_score
  FROM inspections_rrhh_items
  WHERE inspection_id = p_inspection_id
    AND cumplimiento_valor = 'Cumple'
    AND calif_valor > 0;

  -- Actualizar la inspección
  UPDATE inspections_rrhh
  SET 
    total_items = v_total_items,
    items_cumple = v_cumple_items,
    items_no_cumple = v_no_cumple_items,
    items_na = v_na_items,
    items_pending = v_pending_items,
    average_score = COALESCE(v_avg_score, 0),
    coverage_percentage = CASE WHEN v_total_items > 0 
      THEN ((v_cumple_items + v_no_cumple_items + v_na_items)::DECIMAL / v_total_items * 100)::DECIMAL(5,2)
      ELSE 0 END,
    compliance_percentage = CASE WHEN (v_cumple_items + v_no_cumple_items) > 0
      THEN (v_cumple_items::DECIMAL / (v_cumple_items + v_no_cumple_items) * 100)::DECIMAL(5,2)
      ELSE 0 END,
    updated_at = NOW()
  WHERE id = p_inspection_id;
  
  RAISE NOTICE 'Stats actualizadas para inspección %: total=%, cumple=%, avg=%', 
    p_inspection_id, v_total_items, v_cumple_items, v_avg_score;
END;
$$ LANGUAGE plpgsql;

-- 2. Recrear el trigger
DROP TRIGGER IF EXISTS trigger_rrhh_items_stats ON inspections_rrhh_items;

CREATE TRIGGER trigger_rrhh_items_stats
  AFTER INSERT OR UPDATE OR DELETE ON inspections_rrhh_items
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_inspection_stats();

-- 3. Forzar recálculo de todas las inspecciones existentes
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM inspections_rrhh LOOP
    PERFORM calculate_inspection_rrhh_stats(r.id);
  END LOOP;
END $$;

-- 4. Verificar resultado
SELECT 
  id,
  inspector_name,
  status,
  total_items,
  items_cumple,
  items_no_cumple,
  items_pending,
  coverage_percentage,
  compliance_percentage,
  average_score
FROM inspections_rrhh;
