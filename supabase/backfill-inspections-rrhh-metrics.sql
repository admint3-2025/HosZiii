-- Recalcula métricas de inspecciones RRHH existentes a partir de áreas + ítems.
-- Útil si en la bandeja aparecen inspecciones “Completadas” con Avance 0% y Prom. en blanco.

WITH area_item AS (
  SELECT
    a.inspection_id,
    a.id AS area_id,
    COUNT(i.*) AS total_items_area,
    COUNT(*) FILTER (WHERE i.cumplimiento_valor = 'Cumple') AS items_cumple_area,
    COUNT(*) FILTER (WHERE i.cumplimiento_valor = 'No Cumple') AS items_no_cumple_area,
    COUNT(*) FILTER (WHERE i.cumplimiento_valor = 'N/A') AS items_na_area,
    COUNT(*) FILTER (WHERE i.cumplimiento_valor IS NULL OR i.cumplimiento_valor = '') AS items_pending_area,
    COALESCE(AVG(i.calif_valor) FILTER (WHERE i.cumplimiento_valor = 'Cumple'), 0) AS area_score
  FROM inspections_rrhh_areas a
  LEFT JOIN inspections_rrhh_items i
    ON i.area_id = a.id
  GROUP BY a.inspection_id, a.id
),
inspection_agg AS (
  SELECT
    inspection_id,
    COUNT(*) AS total_areas,
    COALESCE(SUM(total_items_area), 0) AS total_items,
    COALESCE(SUM(items_cumple_area), 0) AS items_cumple,
    COALESCE(SUM(items_no_cumple_area), 0) AS items_no_cumple,
    COALESCE(SUM(items_na_area), 0) AS items_na,
    COALESCE(SUM(items_pending_area), 0) AS items_pending,
    CASE
      WHEN COALESCE(SUM(total_items_area), 0) > 0 THEN
        ROUND(
          ((COALESCE(SUM(items_cumple_area), 0)
            + COALESCE(SUM(items_no_cumple_area), 0)
            + COALESCE(SUM(items_na_area), 0))::numeric
          / NULLIF(SUM(total_items_area), 0)) * 100
        )::int
      ELSE 0
    END AS coverage_percentage,
    CASE
      WHEN (COALESCE(SUM(items_cumple_area), 0) + COALESCE(SUM(items_no_cumple_area), 0)) > 0 THEN
        ROUND(
          (COALESCE(SUM(items_cumple_area), 0)::numeric
          / NULLIF((COALESCE(SUM(items_cumple_area), 0) + COALESCE(SUM(items_no_cumple_area), 0)), 0)) * 100
        )::int
      ELSE 0
    END AS compliance_percentage,
    ROUND(AVG(area_score)::numeric, 2) AS average_score
  FROM area_item
  GROUP BY inspection_id
)
UPDATE inspections_rrhh i
SET
  total_areas = a.total_areas,
  total_items = a.total_items,
  items_cumple = a.items_cumple,
  items_no_cumple = a.items_no_cumple,
  items_na = a.items_na,
  items_pending = a.items_pending,
  coverage_percentage = a.coverage_percentage,
  compliance_percentage = a.compliance_percentage,
  average_score = a.average_score,
  updated_at = NOW()
FROM inspection_agg a
WHERE i.id = a.inspection_id
  AND (
    i.total_items IS NULL
    OR i.coverage_percentage IS NULL
    OR i.average_score IS NULL
    OR (i.status = 'completed' AND (i.coverage_percentage = 0 OR i.average_score IS NULL))
  );
