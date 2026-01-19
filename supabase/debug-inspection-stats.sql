-- ============================================================================
-- VERIFICAR Y FORZAR RECÁLCULO DE ESTADÍSTICAS
-- ============================================================================

-- 1. Ver estado actual de la inspección
SELECT 
  id,
  inspector_name,
  status,
  total_items,
  items_cumple,
  items_no_cumple,
  items_na,
  items_pending,
  coverage_percentage,
  compliance_percentage,
  average_score
FROM inspections_rrhh
WHERE id = '95a5083a-6f6e-42fa-b838-da4a7a75df8d';

-- 2. Ver items de esa inspección (cuenta real)
SELECT 
  cumplimiento_valor,
  COUNT(*) as cantidad,
  AVG(CASE WHEN cumplimiento_valor = 'Cumple' AND calif_valor > 0 THEN calif_valor ELSE NULL END) as avg_calif
FROM inspections_rrhh_items
WHERE inspection_id = '95a5083a-6f6e-42fa-b838-da4a7a75df8d'
GROUP BY cumplimiento_valor;

-- 3. Forzar recálculo
SELECT calculate_inspection_rrhh_stats('95a5083a-6f6e-42fa-b838-da4a7a75df8d');

-- 4. Ver estado actualizado
SELECT 
  id,
  inspector_name,
  status,
  total_items,
  items_cumple,
  items_no_cumple,
  items_na,
  items_pending,
  coverage_percentage,
  compliance_percentage,
  average_score
FROM inspections_rrhh
WHERE id = '95a5083a-6f6e-42fa-b838-da4a7a75df8d';
