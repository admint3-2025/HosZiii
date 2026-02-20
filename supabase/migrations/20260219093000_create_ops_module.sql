-- ============================================================================
-- ZIII-Ops: Módulo Universal de Presupuestos, Agendamiento y Cumplimiento
-- Fecha: 2026-02-19
-- Objetivo: convertir planeación anual estática en operación transaccional diaria
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS ops;

-- ============================================================================
-- 1) MAESTROS / CATÁLOGOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS ops.responsables_proveedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('interno', 'externo')),
  departamento TEXT,
  email TEXT,
  telefono TEXT,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ops.entidades_objetivo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE,
  nombre TEXT NOT NULL,
  tipo_entidad TEXT NOT NULL,
  categoria TEXT NOT NULL,
  departamento TEXT NOT NULL,
  centro_costo TEXT,
  responsable_proveedor_id UUID REFERENCES ops.responsables_proveedores(id) ON DELETE SET NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ops.planes_maestros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_plan TEXT UNIQUE,
  nombre TEXT NOT NULL,
  descripcion TEXT,

  departamento_dueno TEXT NOT NULL,
  centro_costo TEXT,
  moneda CHAR(3) NOT NULL DEFAULT 'USD',

  entidad_objetivo_id UUID NOT NULL REFERENCES ops.entidades_objetivo(id) ON DELETE RESTRICT,
  responsable_proveedor_id UUID REFERENCES ops.responsables_proveedores(id) ON DELETE SET NULL,

  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,

  frecuencia_tipo TEXT NOT NULL CHECK (
    frecuencia_tipo IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom_days')
  ),
  frecuencia_intervalo INTEGER NOT NULL DEFAULT 1 CHECK (frecuencia_intervalo > 0),
  custom_interval_days INTEGER CHECK (custom_interval_days > 0),
  dia_semana SMALLINT CHECK (dia_semana BETWEEN 1 AND 7),
  dia_del_mes SMALLINT CHECK (dia_del_mes BETWEEN 1 AND 31),

  monto_total_planeado NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (monto_total_planeado >= 0),
  esfuerzo_total_planeado NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (esfuerzo_total_planeado >= 0),

  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'pausado', 'cerrado')),
  owner_user_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT planes_maestros_fecha_ck CHECK (fecha_fin >= fecha_inicio),
  CONSTRAINT planes_maestros_custom_days_ck CHECK (
    (frecuencia_tipo <> 'custom_days') OR (frecuencia_tipo = 'custom_days' AND custom_interval_days IS NOT NULL)
  )
);

-- ============================================================================
-- 2) CORE TRANSACCIONAL
-- ============================================================================

CREATE TABLE IF NOT EXISTS ops.agenda_operativa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_maestro_id UUID NOT NULL REFERENCES ops.planes_maestros(id) ON DELETE CASCADE,
  ocurrencia_nro INTEGER NOT NULL CHECK (ocurrencia_nro > 0),

  due_date DATE NOT NULL,
  monto_estimado NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (monto_estimado >= 0),
  esfuerzo_estimado NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (esfuerzo_estimado >= 0),

  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_proceso', 'completado', 'cancelado')),
  prioridad TEXT NOT NULL DEFAULT 'media' CHECK (prioridad IN ('baja', 'media', 'alta', 'critica')),

  notas TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT agenda_operativa_unique_due UNIQUE (plan_maestro_id, due_date),
  CONSTRAINT agenda_operativa_unique_nro UNIQUE (plan_maestro_id, ocurrencia_nro)
);

CREATE TABLE IF NOT EXISTS ops.ejecucion_operativa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agenda_operativa_id UUID NOT NULL REFERENCES ops.agenda_operativa(id) ON DELETE CASCADE,

  fecha_ejecucion_real DATE NOT NULL,
  monto_real NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (monto_real >= 0),
  esfuerzo_real NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (esfuerzo_real >= 0),

  evidencia_url TEXT,
  referencia_factura TEXT,
  notas TEXT,

  created_by UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3) ÍNDICES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_ops_planes_dueno ON ops.planes_maestros(departamento_dueno, centro_costo);
CREATE INDEX IF NOT EXISTS idx_ops_planes_estado ON ops.planes_maestros(estado);

CREATE INDEX IF NOT EXISTS idx_ops_agenda_due_date ON ops.agenda_operativa(due_date);
CREATE INDEX IF NOT EXISTS idx_ops_agenda_estado_due ON ops.agenda_operativa(estado, due_date);
CREATE INDEX IF NOT EXISTS idx_ops_agenda_plan ON ops.agenda_operativa(plan_maestro_id);

CREATE INDEX IF NOT EXISTS idx_ops_ejecucion_agenda ON ops.ejecucion_operativa(agenda_operativa_id);
CREATE INDEX IF NOT EXISTS idx_ops_ejecucion_fecha ON ops.ejecucion_operativa(fecha_ejecucion_real);

-- ============================================================================
-- 4) RLS
-- ============================================================================

ALTER TABLE ops.responsables_proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.entidades_objetivo ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.planes_maestros ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.agenda_operativa ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.ejecucion_operativa ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Lectura autenticada
  DROP POLICY IF EXISTS "ops_read_responsables" ON ops.responsables_proveedores;
  CREATE POLICY "ops_read_responsables" ON ops.responsables_proveedores
    FOR SELECT USING (auth.role() = 'authenticated');

  DROP POLICY IF EXISTS "ops_read_entidades" ON ops.entidades_objetivo;
  CREATE POLICY "ops_read_entidades" ON ops.entidades_objetivo
    FOR SELECT USING (auth.role() = 'authenticated');

  DROP POLICY IF EXISTS "ops_read_planes" ON ops.planes_maestros;
  CREATE POLICY "ops_read_planes" ON ops.planes_maestros
    FOR SELECT USING (auth.role() = 'authenticated');

  DROP POLICY IF EXISTS "ops_read_agenda" ON ops.agenda_operativa;
  CREATE POLICY "ops_read_agenda" ON ops.agenda_operativa
    FOR SELECT USING (auth.role() = 'authenticated');

  DROP POLICY IF EXISTS "ops_read_ejecucion" ON ops.ejecucion_operativa;
  CREATE POLICY "ops_read_ejecucion" ON ops.ejecucion_operativa
    FOR SELECT USING (auth.role() = 'authenticated');

  -- Escritura restringida (admin o supervisor corporativo)
  DROP POLICY IF EXISTS "ops_write_planes_privileged" ON ops.planes_maestros;
  CREATE POLICY "ops_write_planes_privileged" ON ops.planes_maestros
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND (p.role = 'admin' OR (p.role = 'supervisor' AND COALESCE(p.is_corporate, FALSE) = TRUE))
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND (p.role = 'admin' OR (p.role = 'supervisor' AND COALESCE(p.is_corporate, FALSE) = TRUE))
      )
    );

  DROP POLICY IF EXISTS "ops_write_agenda_privileged" ON ops.agenda_operativa;
  CREATE POLICY "ops_write_agenda_privileged" ON ops.agenda_operativa
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND (p.role = 'admin' OR (p.role = 'supervisor' AND COALESCE(p.is_corporate, FALSE) = TRUE))
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND (p.role = 'admin' OR (p.role = 'supervisor' AND COALESCE(p.is_corporate, FALSE) = TRUE))
      )
    );

  DROP POLICY IF EXISTS "ops_write_ejecucion_privileged" ON ops.ejecucion_operativa;
  CREATE POLICY "ops_write_ejecucion_privileged" ON ops.ejecucion_operativa
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND (p.role = 'admin' OR (p.role = 'supervisor' AND COALESCE(p.is_corporate, FALSE) = TRUE))
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND (p.role = 'admin' OR (p.role = 'supervisor' AND COALESCE(p.is_corporate, FALSE) = TRUE))
      )
    );

  DROP POLICY IF EXISTS "ops_write_entidades_privileged" ON ops.entidades_objetivo;
  CREATE POLICY "ops_write_entidades_privileged" ON ops.entidades_objetivo
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND (p.role = 'admin' OR (p.role = 'supervisor' AND COALESCE(p.is_corporate, FALSE) = TRUE))
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND (p.role = 'admin' OR (p.role = 'supervisor' AND COALESCE(p.is_corporate, FALSE) = TRUE))
      )
    );

  DROP POLICY IF EXISTS "ops_write_responsables_privileged" ON ops.responsables_proveedores;
  CREATE POLICY "ops_write_responsables_privileged" ON ops.responsables_proveedores
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND (p.role = 'admin' OR (p.role = 'supervisor' AND COALESCE(p.is_corporate, FALSE) = TRUE))
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND (p.role = 'admin' OR (p.role = 'supervisor' AND COALESCE(p.is_corporate, FALSE) = TRUE))
      )
    );
END $$;

-- ============================================================================
-- 5) HELPERS DE RECURRENCIA
-- ============================================================================

CREATE OR REPLACE FUNCTION ops.fn_next_due_date(
  p_current_date DATE,
  p_freq_type TEXT,
  p_freq_interval INTEGER,
  p_custom_days INTEGER,
  p_day_of_week SMALLINT,
  p_day_of_month SMALLINT
) RETURNS DATE
LANGUAGE plpgsql
AS $$
DECLARE
  v_next DATE;
  v_month_start DATE;
  v_month_end DATE;
  v_target_day INTEGER;
  v_days_to_add INTEGER;
BEGIN
  IF p_freq_type = 'daily' THEN
    RETURN p_current_date + (p_freq_interval || ' day')::interval;
  ELSIF p_freq_type = 'weekly' THEN
    v_next := p_current_date + (p_freq_interval || ' week')::interval;
    IF p_day_of_week IS NULL THEN
      RETURN v_next;
    END IF;

    v_days_to_add := ((p_day_of_week - EXTRACT(ISODOW FROM v_next)::INTEGER) + 7) % 7;
    RETURN (v_next + (v_days_to_add || ' day')::interval)::DATE;

  ELSIF p_freq_type = 'monthly' THEN
    v_month_start := DATE_TRUNC('month', p_current_date + (p_freq_interval || ' month')::interval)::DATE;
    v_month_end := (DATE_TRUNC('month', v_month_start) + INTERVAL '1 month - 1 day')::DATE;
    v_target_day := COALESCE(p_day_of_month, EXTRACT(DAY FROM p_current_date)::INTEGER);
    v_target_day := LEAST(v_target_day, EXTRACT(DAY FROM v_month_end)::INTEGER);
    RETURN (v_month_start + (v_target_day - 1) * INTERVAL '1 day')::DATE;

  ELSIF p_freq_type = 'quarterly' THEN
    v_month_start := DATE_TRUNC('month', p_current_date + ((p_freq_interval * 3) || ' month')::interval)::DATE;
    v_month_end := (DATE_TRUNC('month', v_month_start) + INTERVAL '1 month - 1 day')::DATE;
    v_target_day := COALESCE(p_day_of_month, EXTRACT(DAY FROM p_current_date)::INTEGER);
    v_target_day := LEAST(v_target_day, EXTRACT(DAY FROM v_month_end)::INTEGER);
    RETURN (v_month_start + (v_target_day - 1) * INTERVAL '1 day')::DATE;

  ELSIF p_freq_type = 'yearly' THEN
    RETURN (p_current_date + (p_freq_interval || ' year')::interval)::DATE;

  ELSIF p_freq_type = 'custom_days' THEN
    RETURN p_current_date + (COALESCE(p_custom_days, p_freq_interval) || ' day')::interval;
  END IF;

  RAISE EXCEPTION 'frecuencia_tipo no soportada: %', p_freq_type;
END;
$$;

-- ============================================================================
-- 6) SERVICIO SEMBRADOR (RPC)
-- ============================================================================

CREATE OR REPLACE FUNCTION ops.fn_seed_plan_agenda(
  p_plan_id UUID,
  p_replace_existing BOOLEAN DEFAULT FALSE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ops, public
AS $$
DECLARE
  v_plan ops.planes_maestros%ROWTYPE;
  v_date DATE;
  v_count INTEGER := 0;
  v_iter INTEGER := 0;
  v_monto_unit NUMERIC(14,2);
  v_esfuerzo_unit NUMERIC(14,2);
BEGIN
  SELECT * INTO v_plan
  FROM ops.planes_maestros
  WHERE id = p_plan_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan maestro no encontrado: %', p_plan_id;
  END IF;

  IF v_plan.estado <> 'activo' THEN
    RAISE EXCEPTION 'El plan debe estar activo para sembrar agenda. Estado actual: %', v_plan.estado;
  END IF;

  IF p_replace_existing THEN
    DELETE FROM ops.agenda_operativa WHERE plan_maestro_id = p_plan_id;
  ELSE
    IF EXISTS (SELECT 1 FROM ops.agenda_operativa WHERE plan_maestro_id = p_plan_id) THEN
      RETURN jsonb_build_object(
        'ok', true,
        'created', 0,
        'skipped', true,
        'message', 'El plan ya tiene agenda sembrada. Usa p_replace_existing=true para regenerar.'
      );
    END IF;
  END IF;

  -- Conteo de ocurrencias
  v_date := v_plan.fecha_inicio;
  WHILE v_date <= v_plan.fecha_fin LOOP
    v_count := v_count + 1;
    v_date := ops.fn_next_due_date(
      v_date,
      v_plan.frecuencia_tipo,
      v_plan.frecuencia_intervalo,
      v_plan.custom_interval_days,
      v_plan.dia_semana,
      v_plan.dia_del_mes
    );
  END LOOP;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'No se pudieron generar ocurrencias para el plan %', p_plan_id;
  END IF;

  v_monto_unit := ROUND(COALESCE(v_plan.monto_total_planeado, 0) / v_count, 2);
  v_esfuerzo_unit := ROUND(COALESCE(v_plan.esfuerzo_total_planeado, 0) / v_count, 2);

  -- Inserción de agenda
  v_date := v_plan.fecha_inicio;
  v_iter := 0;

  WHILE v_date <= v_plan.fecha_fin LOOP
    v_iter := v_iter + 1;

    INSERT INTO ops.agenda_operativa (
      plan_maestro_id,
      ocurrencia_nro,
      due_date,
      monto_estimado,
      esfuerzo_estimado,
      estado,
      prioridad
    ) VALUES (
      p_plan_id,
      v_iter,
      v_date,
      v_monto_unit,
      v_esfuerzo_unit,
      'pendiente',
      'media'
    )
    ON CONFLICT (plan_maestro_id, due_date) DO NOTHING;

    v_date := ops.fn_next_due_date(
      v_date,
      v_plan.frecuencia_tipo,
      v_plan.frecuencia_intervalo,
      v_plan.custom_interval_days,
      v_plan.dia_semana,
      v_plan.dia_del_mes
    );
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'created', v_iter,
    'plan_id', p_plan_id,
    'frecuencia_tipo', v_plan.frecuencia_tipo,
    'date_start', v_plan.fecha_inicio,
    'date_end', v_plan.fecha_fin
  );
END;
$$;

GRANT EXECUTE ON FUNCTION ops.fn_seed_plan_agenda(UUID, BOOLEAN) TO authenticated;

-- ============================================================================
-- 7) SERVICIO AGING & COMPLIANCE (RPC)
-- ============================================================================

CREATE OR REPLACE FUNCTION ops.fn_aging_compliance(
  p_as_of_date DATE DEFAULT CURRENT_DATE,
  p_departamento TEXT DEFAULT NULL,
  p_centro_costo TEXT DEFAULT NULL
)
RETURNS TABLE (
  agenda_id UUID,
  plan_id UUID,
  plan_nombre TEXT,
  departamento TEXT,
  centro_costo TEXT,
  entidad_objetivo TEXT,
  due_date DATE,
  estado TEXT,
  aging_days INTEGER,
  alert_flag TEXT,
  alert_label TEXT,
  impacto_financiero NUMERIC(14,2),
  monto_estimado NUMERIC(14,2),
  monto_real_acumulado NUMERIC(14,2),
  compliance_breached BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ops, public
AS $$
WITH ejecucion_agg AS (
  SELECT
    e.agenda_operativa_id,
    COALESCE(SUM(e.monto_real), 0)::NUMERIC(14,2) AS monto_real_acumulado
  FROM ops.ejecucion_operativa e
  GROUP BY e.agenda_operativa_id
), base AS (
  SELECT
    a.id AS agenda_id,
    p.id AS plan_id,
    p.nombre AS plan_nombre,
    p.departamento_dueno AS departamento,
    p.centro_costo,
    eo.nombre AS entidad_objetivo,
    a.due_date,
    a.estado,
    GREATEST((p_as_of_date - a.due_date), 0)::INTEGER AS aging_days,
    a.monto_estimado,
    COALESCE(x.monto_real_acumulado, 0)::NUMERIC(14,2) AS monto_real_acumulado,
    GREATEST(a.monto_estimado - COALESCE(x.monto_real_acumulado, 0), 0)::NUMERIC(14,2) AS impacto_financiero
  FROM ops.agenda_operativa a
  JOIN ops.planes_maestros p ON p.id = a.plan_maestro_id
  JOIN ops.entidades_objetivo eo ON eo.id = p.entidad_objetivo_id
  LEFT JOIN ejecucion_agg x ON x.agenda_operativa_id = a.id
  WHERE a.estado <> 'completado'
    AND (p_departamento IS NULL OR p.departamento_dueno = p_departamento)
    AND (p_centro_costo IS NULL OR p.centro_costo = p_centro_costo)
)
SELECT
  b.agenda_id,
  b.plan_id,
  b.plan_nombre,
  b.departamento,
  b.centro_costo,
  b.entidad_objetivo,
  b.due_date,
  b.estado,
  b.aging_days,
  CASE
    WHEN b.aging_days >= 30 THEN 'RED'
    WHEN b.aging_days BETWEEN 1 AND 29 THEN 'YELLOW'
    ELSE 'GREEN'
  END AS alert_flag,
  CASE
    WHEN b.aging_days >= 30 THEN 'CRITICAL_BREACH'
    WHEN b.aging_days BETWEEN 1 AND 29 THEN 'WARNING_OPERATIVO'
    ELSE 'ON_TRACK'
  END AS alert_label,
  b.impacto_financiero,
  b.monto_estimado,
  b.monto_real_acumulado,
  (b.aging_days >= 30) AS compliance_breached
FROM base b
ORDER BY
  CASE
    WHEN b.aging_days >= 30 THEN 3
    WHEN b.aging_days BETWEEN 1 AND 29 THEN 2
    ELSE 1
  END DESC,
  b.aging_days DESC,
  b.impacto_financiero DESC;
$$;

GRANT EXECUTE ON FUNCTION ops.fn_aging_compliance(DATE, TEXT, TEXT) TO authenticated;

-- ============================================================================
-- 8) VISTAS CROSS-DEPARTMENT
-- ============================================================================

CREATE OR REPLACE VIEW ops.vw_operativa_calendario AS
SELECT
  a.id AS agenda_id,
  a.plan_maestro_id,
  p.nombre AS plan_nombre,
  p.departamento_dueno,
  p.centro_costo,
  eo.nombre AS entidad_objetivo,
  eo.categoria AS entidad_categoria,
  a.ocurrencia_nro,
  a.due_date,
  a.estado,
  a.prioridad,
  a.monto_estimado,
  a.esfuerzo_estimado,
  GREATEST((CURRENT_DATE - a.due_date), 0)::INTEGER AS aging_days,
  CASE
    WHEN a.estado = 'completado' THEN 'GREEN'
    WHEN CURRENT_DATE - a.due_date >= 30 THEN 'RED'
    WHEN CURRENT_DATE - a.due_date >= 1 THEN 'YELLOW'
    ELSE 'GREEN'
  END AS semaforo
FROM ops.agenda_operativa a
JOIN ops.planes_maestros p ON p.id = a.plan_maestro_id
JOIN ops.entidades_objetivo eo ON eo.id = p.entidad_objetivo_id;

CREATE OR REPLACE VIEW ops.vw_compliance_risk_matrix AS
SELECT *
FROM ops.fn_aging_compliance(CURRENT_DATE, NULL, NULL)
WHERE aging_days > 0;

CREATE OR REPLACE VIEW ops.vw_financiera_control AS
WITH ejecucion_por_plan AS (
  SELECT
    a.plan_maestro_id,
    COALESCE(SUM(e.monto_real), 0)::NUMERIC(14,2) AS monto_real_total,
    COALESCE(SUM(e.esfuerzo_real), 0)::NUMERIC(14,2) AS esfuerzo_real_total
  FROM ops.agenda_operativa a
  LEFT JOIN ops.ejecucion_operativa e ON e.agenda_operativa_id = a.id
  GROUP BY a.plan_maestro_id
)
SELECT
  p.id AS plan_id,
  p.nombre AS plan_nombre,
  p.departamento_dueno,
  p.centro_costo,
  p.moneda,
  p.monto_total_planeado,
  COALESCE(x.monto_real_total, 0)::NUMERIC(14,2) AS monto_real_total,
  (COALESCE(x.monto_real_total, 0) - p.monto_total_planeado)::NUMERIC(14,2) AS variacion_abs,
  CASE
    WHEN p.monto_total_planeado = 0 THEN 0
    ELSE ROUND(((COALESCE(x.monto_real_total, 0) - p.monto_total_planeado) / p.monto_total_planeado) * 100, 2)
  END::NUMERIC(10,2) AS variacion_pct,
  p.esfuerzo_total_planeado,
  COALESCE(x.esfuerzo_real_total, 0)::NUMERIC(14,2) AS esfuerzo_real_total
FROM ops.planes_maestros p
LEFT JOIN ejecucion_por_plan x ON x.plan_maestro_id = p.id;

-- ============================================================================
-- 9) PERMISOS DE LECTURA SOBRE VISTAS
-- ============================================================================

GRANT SELECT ON ops.vw_operativa_calendario TO authenticated;
GRANT SELECT ON ops.vw_compliance_risk_matrix TO authenticated;
GRANT SELECT ON ops.vw_financiera_control TO authenticated;

-- ============================================================================
-- FIN
-- ============================================================================
