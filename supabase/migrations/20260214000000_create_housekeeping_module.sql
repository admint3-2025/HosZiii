-- ============================================================
-- MIGRACIÓN: Módulo de Housekeeping (Ama de Llaves)
-- Fecha: 2026-02-14
-- Descripción: Tablas para habitaciones, personal HK, asignaciones,
--              inventario de amenidades y registro de productividad.
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. ENUM: Estado de habitación
-- ─────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE hk_room_status AS ENUM (
    'limpia',
    'sucia',
    'en_limpieza',
    'mantenimiento',
    'inspeccion',
    'bloqueada'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────
-- 2. ENUM: Tipo de habitación
-- ─────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE hk_room_type AS ENUM (
    'standard',
    'doble',
    'suite',
    'accesible',
    'conectada'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────
-- 3. ENUM: Estado del personal de HK
-- ─────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE hk_staff_status AS ENUM (
    'activo',
    'descanso',
    'inactivo'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────
-- 4. ENUM: Categoría de inventario
-- ─────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE hk_inventory_category AS ENUM (
    'amenidad',
    'blancos',
    'limpieza'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ═══════════════════════════════════════════════
-- TABLA: hk_rooms  (Habitaciones)
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS hk_rooms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,

  number      TEXT NOT NULL,                -- Ej: "101", "305"
  floor       SMALLINT NOT NULL DEFAULT 1,
  room_type   hk_room_type NOT NULL DEFAULT 'standard',
  status      hk_room_status NOT NULL DEFAULT 'sucia',

  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- Personal HK asignado actualmente
  last_cleaned_at   TIMESTAMPTZ,
  last_inspected_at TIMESTAMPTZ,

  has_incident BOOLEAN NOT NULL DEFAULT false,
  notes        TEXT,

  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Una habitación es única por sede + número
  UNIQUE (location_id, number)
);

-- Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_hk_rooms_location   ON hk_rooms(location_id);
CREATE INDEX IF NOT EXISTS idx_hk_rooms_status     ON hk_rooms(status);
CREATE INDEX IF NOT EXISTS idx_hk_rooms_assigned   ON hk_rooms(assigned_to);
CREATE INDEX IF NOT EXISTS idx_hk_rooms_floor      ON hk_rooms(location_id, floor);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION hk_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_hk_rooms_updated_at ON hk_rooms;
CREATE TRIGGER trg_hk_rooms_updated_at
  BEFORE UPDATE ON hk_rooms
  FOR EACH ROW EXECUTE FUNCTION hk_set_updated_at();


-- ═══════════════════════════════════════════════
-- TABLA: hk_staff  (Personal de Housekeeping)
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS hk_staff (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,

  status      hk_staff_status NOT NULL DEFAULT 'activo',
  shift       TEXT,                        -- Ej: 'matutino', 'vespertino', 'nocturno'

  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (profile_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_hk_staff_location ON hk_staff(location_id);
CREATE INDEX IF NOT EXISTS idx_hk_staff_profile  ON hk_staff(profile_id);

DROP TRIGGER IF EXISTS trg_hk_staff_updated_at ON hk_staff;
CREATE TRIGGER trg_hk_staff_updated_at
  BEFORE UPDATE ON hk_staff
  FOR EACH ROW EXECUTE FUNCTION hk_set_updated_at();


-- ═══════════════════════════════════════════════
-- TABLA: hk_room_assignments  (Asignaciones de limpieza)
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS hk_room_assignments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     UUID NOT NULL REFERENCES hk_rooms(id) ON DELETE CASCADE,
  staff_id    UUID NOT NULL REFERENCES hk_staff(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,

  assigned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at    TIMESTAMPTZ,               -- Cuando inició limpieza
  completed_at  TIMESTAMPTZ,               -- Cuando terminó

  status        TEXT NOT NULL DEFAULT 'pendiente'
                CHECK (status IN ('pendiente', 'en_progreso', 'completada', 'cancelada')),

  duration_minutes INTEGER,                -- Calculado al completar
  notes         TEXT,

  -- Fecha lógica para agrupación diaria
  assignment_date DATE NOT NULL DEFAULT CURRENT_DATE,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hk_assignments_room     ON hk_room_assignments(room_id);
CREATE INDEX IF NOT EXISTS idx_hk_assignments_staff    ON hk_room_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_hk_assignments_date     ON hk_room_assignments(assignment_date);
CREATE INDEX IF NOT EXISTS idx_hk_assignments_location ON hk_room_assignments(location_id);


-- ═══════════════════════════════════════════════
-- TABLA: hk_room_status_log  (Historial de cambios de estado)
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS hk_room_status_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id       UUID NOT NULL REFERENCES hk_rooms(id) ON DELETE CASCADE,
  previous_status hk_room_status,
  new_status    hk_room_status NOT NULL,
  changed_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hk_status_log_room ON hk_room_status_log(room_id);
CREATE INDEX IF NOT EXISTS idx_hk_status_log_date ON hk_room_status_log(created_at);


-- ═══════════════════════════════════════════════
-- TABLA: hk_inventory_items  (Catálogo de artículos)
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS hk_inventory_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,

  name        TEXT NOT NULL,
  category    hk_inventory_category NOT NULL DEFAULT 'amenidad',
  unit        TEXT NOT NULL DEFAULT 'pzas',  -- pzas, litros, juegos, kg

  stock       INTEGER NOT NULL DEFAULT 0,
  min_stock   INTEGER NOT NULL DEFAULT 0,

  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (location_id, name)
);

CREATE INDEX IF NOT EXISTS idx_hk_inventory_location ON hk_inventory_items(location_id);
CREATE INDEX IF NOT EXISTS idx_hk_inventory_category ON hk_inventory_items(category);

DROP TRIGGER IF EXISTS trg_hk_inventory_updated_at ON hk_inventory_items;
CREATE TRIGGER trg_hk_inventory_updated_at
  BEFORE UPDATE ON hk_inventory_items
  FOR EACH ROW EXECUTE FUNCTION hk_set_updated_at();


-- ═══════════════════════════════════════════════
-- TABLA: hk_inventory_movements  (Movimientos de inventario)
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS hk_inventory_movements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     UUID NOT NULL REFERENCES hk_inventory_items(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,

  movement_type TEXT NOT NULL CHECK (movement_type IN ('entrada', 'salida', 'ajuste')),
  quantity      INTEGER NOT NULL,          -- Positivo para entrada, negativo para salida
  previous_stock INTEGER NOT NULL,
  new_stock     INTEGER NOT NULL,

  reason      TEXT,                        -- Ej: "Reposición de amenidades piso 3"
  performed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hk_movements_item     ON hk_inventory_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_hk_movements_location ON hk_inventory_movements(location_id);
CREATE INDEX IF NOT EXISTS idx_hk_movements_date     ON hk_inventory_movements(created_at);


-- ═══════════════════════════════════════════════
-- RLS (Row Level Security)
-- ═══════════════════════════════════════════════

-- hk_rooms
ALTER TABLE hk_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hk_rooms_select" ON hk_rooms FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor', 'corporate_admin'))
);

CREATE POLICY "hk_rooms_insert" ON hk_rooms FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor', 'corporate_admin'))
);

CREATE POLICY "hk_rooms_update" ON hk_rooms FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor', 'corporate_admin'))
);

CREATE POLICY "hk_rooms_delete" ON hk_rooms FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);


-- hk_staff
ALTER TABLE hk_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hk_staff_select" ON hk_staff FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor', 'corporate_admin'))
);

CREATE POLICY "hk_staff_all" ON hk_staff FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
);


-- hk_room_assignments
ALTER TABLE hk_room_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hk_assignments_select" ON hk_room_assignments FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor', 'corporate_admin'))
);

CREATE POLICY "hk_assignments_all" ON hk_room_assignments FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
);


-- hk_room_status_log
ALTER TABLE hk_room_status_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hk_status_log_select" ON hk_room_status_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor', 'corporate_admin'))
);

CREATE POLICY "hk_status_log_insert" ON hk_room_status_log FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor', 'corporate_admin'))
);


-- hk_inventory_items
ALTER TABLE hk_inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hk_inventory_select" ON hk_inventory_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor', 'corporate_admin'))
);

CREATE POLICY "hk_inventory_all" ON hk_inventory_items FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
);


-- hk_inventory_movements
ALTER TABLE hk_inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hk_movements_select" ON hk_inventory_movements FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor', 'corporate_admin'))
);

CREATE POLICY "hk_movements_insert" ON hk_inventory_movements FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor', 'corporate_admin'))
);


-- ═══════════════════════════════════════════════
-- FUNCIÓN RPC: Asignación inteligente
-- Distribuye habitaciones sucias equitativamente
-- entre el personal activo de una sede.
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION hk_smart_assign(p_location_id UUID)
RETURNS TABLE (
  room_id UUID,
  room_number TEXT,
  staff_id UUID,
  staff_name TEXT
) AS $$
DECLARE
  v_staff RECORD;
  v_room RECORD;
  v_staff_ids UUID[];
  v_staff_count INT;
  v_idx INT := 0;
BEGIN
  -- Obtener personal activo de la sede
  SELECT array_agg(hs.id ORDER BY (
    SELECT count(*) FROM hk_room_assignments ra 
    WHERE ra.staff_id = hs.id 
      AND ra.assignment_date = CURRENT_DATE 
      AND ra.status IN ('pendiente', 'en_progreso')
  ) ASC, hs.id)
  INTO v_staff_ids
  FROM hk_staff hs
  WHERE hs.location_id = p_location_id
    AND hs.status = 'activo'
    AND hs.is_active = true;

  v_staff_count := coalesce(array_length(v_staff_ids, 1), 0);

  IF v_staff_count = 0 THEN
    RETURN;  -- No hay personal activo
  END IF;

  -- Recorrer habitaciones sucias y asignar round-robin
  FOR v_room IN
    SELECT r.id, r.number
    FROM hk_rooms r
    WHERE r.location_id = p_location_id
      AND r.status = 'sucia'
      AND r.is_active = true
    ORDER BY r.floor, r.number
  LOOP
    -- Insertar asignación
    INSERT INTO hk_room_assignments (room_id, staff_id, location_id, status, assignment_date)
    VALUES (v_room.id, v_staff_ids[v_idx + 1], p_location_id, 'pendiente', CURRENT_DATE);

    -- Actualizar estado de la habitación
    UPDATE hk_rooms
    SET status = 'en_limpieza',
        assigned_to = (SELECT profile_id FROM hk_staff WHERE id = v_staff_ids[v_idx + 1])
    WHERE id = v_room.id;

    -- Registrar cambio en log
    INSERT INTO hk_room_status_log (room_id, previous_status, new_status, changed_by, notes)
    VALUES (v_room.id, 'sucia', 'en_limpieza', auth.uid(), 'Asignación automática');

    -- Devolver resultado
    room_id := v_room.id;
    room_number := v_room.number;
    staff_id := v_staff_ids[v_idx + 1];
    staff_name := (SELECT p.full_name FROM hk_staff hs JOIN profiles p ON p.id = hs.profile_id WHERE hs.id = v_staff_ids[v_idx + 1]);
    RETURN NEXT;

    -- Avanzar round-robin
    v_idx := (v_idx + 1) % v_staff_count;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════════════════════
-- FUNCIÓN RPC: Cambiar estado de habitación
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION hk_change_room_status(
  p_room_id UUID,
  p_new_status hk_room_status,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_old_status hk_room_status;
BEGIN
  SELECT status INTO v_old_status FROM hk_rooms WHERE id = p_room_id;

  UPDATE hk_rooms
  SET status = p_new_status,
      last_cleaned_at = CASE WHEN p_new_status = 'limpia' THEN now() ELSE last_cleaned_at END,
      last_inspected_at = CASE WHEN p_new_status = 'inspeccion' THEN now() ELSE last_inspected_at END,
      assigned_to = CASE WHEN p_new_status IN ('limpia', 'bloqueada', 'sucia') THEN NULL ELSE assigned_to END
  WHERE id = p_room_id;

  -- Log del cambio
  INSERT INTO hk_room_status_log (room_id, previous_status, new_status, changed_by, notes)
  VALUES (p_room_id, v_old_status, p_new_status, auth.uid(), p_notes);

  -- Si se marca como limpia, completar la asignación activa
  IF p_new_status = 'limpia' THEN
    UPDATE hk_room_assignments
    SET status = 'completada',
        completed_at = now(),
        duration_minutes = EXTRACT(EPOCH FROM (now() - started_at)) / 60
    WHERE room_id = p_room_id
      AND status IN ('pendiente', 'en_progreso')
      AND assignment_date = CURRENT_DATE;
  END IF;

  -- Si pasa a 'en_limpieza', marcar la asignación como en progreso
  IF p_new_status = 'en_limpieza' THEN
    UPDATE hk_room_assignments
    SET status = 'en_progreso',
        started_at = COALESCE(started_at, now())
    WHERE room_id = p_room_id
      AND status = 'pendiente'
      AND assignment_date = CURRENT_DATE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════════════════════
-- VISTA: Productividad diaria por persona
-- ═══════════════════════════════════════════════
CREATE OR REPLACE VIEW hk_daily_productivity AS
SELECT
  ra.assignment_date,
  ra.location_id,
  hs.profile_id,
  p.full_name AS staff_name,
  COUNT(*) FILTER (WHERE ra.status = 'completada') AS rooms_cleaned,
  COUNT(*) AS rooms_assigned,
  ROUND(AVG(ra.duration_minutes) FILTER (WHERE ra.status = 'completada'), 1) AS avg_minutes,
  ROUND(
    (COUNT(*) FILTER (WHERE ra.status = 'completada')::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 1
  ) AS efficiency_pct
FROM hk_room_assignments ra
JOIN hk_staff hs ON hs.id = ra.staff_id
JOIN profiles p ON p.id = hs.profile_id
GROUP BY ra.assignment_date, ra.location_id, hs.profile_id, p.full_name;


-- ═══════════════════════════════════════════════
-- VISTA: Resumen de inventario con alerta
-- ═══════════════════════════════════════════════
CREATE OR REPLACE VIEW hk_inventory_summary AS
SELECT
  i.*,
  CASE
    WHEN i.stock <= 0 THEN 'agotado'
    WHEN i.stock <= i.min_stock THEN 'bajo'
    WHEN i.stock <= i.min_stock * 1.5 THEN 'normal'
    ELSE 'ok'
  END AS stock_level
FROM hk_inventory_items i
WHERE i.is_active = true;
