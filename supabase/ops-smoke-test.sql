-- ============================================================================
-- ZIII-Ops Smoke Test
-- Ejecutar DESPUÉS de: supabase/migrations/20260219093000_create_ops_module.sql
-- ============================================================================

-- 1) Crear responsable/proveedor
INSERT INTO ops.responsables_proveedores (codigo, nombre, tipo, departamento, email)
VALUES ('PROV-LIC-001', 'Proveedor Licencias Global', 'externo', 'TI', 'ops-ti@ziii.local')
ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre
RETURNING id;

-- 2) Crear entidad objetivo
INSERT INTO ops.entidades_objetivo (
  codigo,
  nombre,
  tipo_entidad,
  categoria,
  departamento,
  centro_costo
)
VALUES (
  'LIC-O365-ANUAL',
  'Licencias Microsoft 365',
  'LICENCIA_SOFTWARE',
  'Suscripciones',
  'TI',
  'CC-TI-001'
)
ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre
RETURNING id;

-- 3) Crear plan maestro mensual
WITH entidad AS (
  SELECT id FROM ops.entidades_objetivo WHERE codigo = 'LIC-O365-ANUAL' LIMIT 1
), responsable AS (
  SELECT id FROM ops.responsables_proveedores WHERE codigo = 'PROV-LIC-001' LIMIT 1
)
INSERT INTO ops.planes_maestros (
  codigo_plan,
  nombre,
  descripcion,
  departamento_dueno,
  centro_costo,
  moneda,
  entidad_objetivo_id,
  responsable_proveedor_id,
  fecha_inicio,
  fecha_fin,
  frecuencia_tipo,
  frecuencia_intervalo,
  dia_del_mes,
  monto_total_planeado,
  esfuerzo_total_planeado,
  estado
)
SELECT
  'PLAN-TI-LIC-2026',
  'Pago mensual de licencias TI',
  'Plan anual de licencias SaaS',
  'TI',
  'CC-TI-001',
  'USD',
  entidad.id,
  responsable.id,
  DATE '2026-01-01',
  DATE '2026-12-31',
  'monthly',
  1,
  15,
  120000,
  120,
  'activo'
FROM entidad, responsable
ON CONFLICT (codigo_plan) DO UPDATE
SET nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion
RETURNING id;

-- 4) Sembrar agenda
SELECT ops.fn_seed_plan_agenda(
  (SELECT id FROM ops.planes_maestros WHERE codigo_plan = 'PLAN-TI-LIC-2026' LIMIT 1),
  TRUE
) AS seed_result;

-- 5) Simular ejecuciones parciales
INSERT INTO ops.ejecucion_operativa (
  agenda_operativa_id,
  fecha_ejecucion_real,
  monto_real,
  esfuerzo_real,
  evidencia_url,
  referencia_factura,
  notas
)
SELECT
  a.id,
  a.due_date,
  9000,
  9,
  'https://example.com/facturas/TI-LIC-001.pdf',
  'FAC-TI-001',
  'Pago parcial de prueba'
FROM ops.agenda_operativa a
JOIN ops.planes_maestros p ON p.id = a.plan_maestro_id
WHERE p.codigo_plan = 'PLAN-TI-LIC-2026'
ORDER BY a.due_date
LIMIT 2;

-- 6) Ver calendario operativo
SELECT *
FROM ops.vw_operativa_calendario
WHERE departamento_dueno = 'TI'
ORDER BY due_date ASC
LIMIT 50;

-- 7) Ver compliance risk matrix (aging > 0)
SELECT *
FROM ops.vw_compliance_risk_matrix
WHERE departamento = 'TI'
ORDER BY aging_days DESC
LIMIT 50;

-- 8) Ver control financiero real vs planeado
SELECT *
FROM ops.vw_financiera_control
WHERE departamento_dueno = 'TI'
ORDER BY variacion_abs DESC;
