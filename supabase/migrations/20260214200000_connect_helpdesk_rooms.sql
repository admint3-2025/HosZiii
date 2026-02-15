-- =====================================================
-- Migración: Conectar helpdesks (IT + Mantenimiento) con Housekeeping
-- Fecha: 2026-02-14
-- Descripción:
--   1. Agrega hk_room_id (FK → hk_rooms) a tickets y tickets_maintenance
--   2. Vista unificada hk_room_incidents para consumir desde el módulo HK
--   3. Trigger para auto-sincronizar hk_rooms.has_incident
--   4. Índices y políticas RLS necesarias
--
-- DISEÑO:
--   ▸ Ambas FK son NULLABLE → no rompe ningún flujo existente
--   ▸ El trigger recalcula has_incident contando tickets abiertos
--   ▸ La vista unifica ambos helpdesks con source = 'it' | 'maintenance'
-- =====================================================

-- ─── 1. Agregar columna hk_room_id a tickets (IT) ───
ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS hk_room_id UUID REFERENCES hk_rooms(id) ON DELETE SET NULL;

COMMENT ON COLUMN tickets.hk_room_id
IS 'Referencia opcional a una habitación HK. Permite vincular incidentes de IT con habitaciones.';

CREATE INDEX IF NOT EXISTS idx_tickets_hk_room_id
ON tickets(hk_room_id) WHERE hk_room_id IS NOT NULL;

-- ─── 2. Agregar columna hk_room_id a tickets_maintenance ───
ALTER TABLE tickets_maintenance
ADD COLUMN IF NOT EXISTS hk_room_id UUID REFERENCES hk_rooms(id) ON DELETE SET NULL;

COMMENT ON COLUMN tickets_maintenance.hk_room_id
IS 'Referencia opcional a una habitación HK. Permite vincular incidentes de mantenimiento con habitaciones.';

CREATE INDEX IF NOT EXISTS idx_tickets_maintenance_hk_room_id
ON tickets_maintenance(hk_room_id) WHERE hk_room_id IS NOT NULL;


-- ─── 3. Función: Recalcular has_incident en hk_rooms ───
-- Cuenta tickets abiertos (status NOT IN resolved/closed) de ambas tablas
-- para un room_id dado. Idempotente y segura.
CREATE OR REPLACE FUNCTION hk_sync_room_incident()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_room_id UUID;
  v_open_count INTEGER;
BEGIN
  -- Determinar qué room_id revisar (puede ser OLD o NEW según la operación)
  IF TG_OP = 'DELETE' THEN
    v_room_id := OLD.hk_room_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Si cambió el room_id, hay que recalcular ambos (viejo y nuevo)
    IF OLD.hk_room_id IS DISTINCT FROM NEW.hk_room_id THEN
      -- Recalcular el viejo room
      IF OLD.hk_room_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_open_count
        FROM (
          SELECT 1 FROM tickets
          WHERE hk_room_id = OLD.hk_room_id
            AND status NOT IN ('RESOLVED', 'CLOSED')
            AND deleted_at IS NULL
          UNION ALL
          SELECT 1 FROM tickets_maintenance
          WHERE hk_room_id = OLD.hk_room_id
            AND status NOT IN ('RESOLVED', 'CLOSED')
            AND deleted_at IS NULL
        ) sub;

        UPDATE hk_rooms
        SET has_incident = (v_open_count > 0),
            updated_at = now()
        WHERE id = OLD.hk_room_id;
      END IF;
    END IF;
    v_room_id := NEW.hk_room_id;
  ELSE
    -- INSERT
    v_room_id := NEW.hk_room_id;
  END IF;

  -- Si no hay room_id asociado, no hacer nada
  IF v_room_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Contar tickets abiertos para este room_id (de ambas tablas)
  SELECT COUNT(*) INTO v_open_count
  FROM (
    SELECT 1 FROM tickets
    WHERE hk_room_id = v_room_id
      AND status NOT IN ('RESOLVED', 'CLOSED')
      AND deleted_at IS NULL
    UNION ALL
    SELECT 1 FROM tickets_maintenance
    WHERE hk_room_id = v_room_id
      AND status NOT IN ('RESOLVED', 'CLOSED')
      AND deleted_at IS NULL
  ) sub;

  UPDATE hk_rooms
  SET has_incident = (v_open_count > 0),
      updated_at = now()
  WHERE id = v_room_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ─── 4. Triggers en ambas tablas ───

-- Trigger en tickets (IT)
DROP TRIGGER IF EXISTS trg_tickets_hk_incident ON tickets;
CREATE TRIGGER trg_tickets_hk_incident
AFTER INSERT OR UPDATE OF hk_room_id, status, deleted_at
    OR DELETE
ON tickets
FOR EACH ROW
EXECUTE FUNCTION hk_sync_room_incident();

-- Trigger en tickets_maintenance
DROP TRIGGER IF EXISTS trg_tickets_maintenance_hk_incident ON tickets_maintenance;
CREATE TRIGGER trg_tickets_maintenance_hk_incident
AFTER INSERT OR UPDATE OF hk_room_id, status, deleted_at
    OR DELETE
ON tickets_maintenance
FOR EACH ROW
EXECUTE FUNCTION hk_sync_room_incident();


-- ─── 5. Vista unificada: Incidencias de habitaciones ───
-- Combina tickets de IT y Mantenimiento vinculados a hk_rooms
CREATE OR REPLACE VIEW hk_room_incidents AS
SELECT
  t.id                AS ticket_id,
  'it'::TEXT          AS source,
  t.hk_room_id        AS room_id,
  t.ticket_number::TEXT AS ticket_number,
  t.title,
  t.description,
  t.status::TEXT,
  t.priority::TEXT,
  t.location_id,
  t.requester_id,
  t.assigned_agent_id  AS assigned_to,
  t.created_at,
  t.updated_at,
  t.closed_at,
  t.resolution
FROM tickets t
WHERE t.hk_room_id IS NOT NULL
  AND t.deleted_at IS NULL

UNION ALL

SELECT
  tm.id               AS ticket_id,
  'maintenance'::TEXT  AS source,
  tm.hk_room_id        AS room_id,
  tm.ticket_number     AS ticket_number,
  tm.title,
  tm.description,
  tm.status,
  tm.priority,
  tm.location_id,
  tm.requester_id,
  COALESCE(tm.assigned_agent_id, tm.assigned_to) AS assigned_to,
  tm.created_at,
  tm.updated_at,
  tm.closed_at,
  tm.resolution
FROM tickets_maintenance tm
WHERE tm.hk_room_id IS NOT NULL
  AND tm.deleted_at IS NULL;

COMMENT ON VIEW hk_room_incidents
IS 'Vista unificada de incidencias en habitaciones reportadas desde IT y Mantenimiento. Usada por el módulo de Ama de Llaves.';


-- ─── 6. Índice compuesto para consultas frecuentes ───
-- Consulta típica: "Dame todos los tickets abiertos para habitaciones de esta sede"
CREATE INDEX IF NOT EXISTS idx_tickets_hk_room_location
ON tickets(location_id, hk_room_id)
WHERE hk_room_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_maint_hk_room_location
ON tickets_maintenance(location_id, hk_room_id)
WHERE hk_room_id IS NOT NULL AND deleted_at IS NULL;
