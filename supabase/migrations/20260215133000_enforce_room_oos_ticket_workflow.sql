-- =====================================================
-- MIGRACIÓN: Enforce workflow de habitaciones fuera de servicio
-- Fecha: 2026-02-15
-- Objetivo:
--  - Evitar que se marque/desmarque 'mantenimiento'/'bloqueada' sin proceso
--  - Conectar estatus HK con tickets_maintenance (helpdesk mantenimiento)
--
-- Reglas (default, seguras):
--  1) Para poner una habitación en 'mantenimiento' o 'bloqueada' debe existir
--     al menos 1 ticket de mantenimiento ABIERTO (status != RESOLVED/CLOSED)
--     vinculado a la habitación (tickets_maintenance.hk_room_id).
--  2) No se permite salir de 'mantenimiento'/'bloqueada' mientras exista un
--     ticket de mantenimiento ABIERTO.
--  3) Admin o supervisor corporativo pueden sobre-escribir (override).
--  4) Trigger: si hay ticket mantenimiento ABIERTO y la habitación no está
--     bloqueada/mantenimiento, se fuerza a 'mantenimiento'. Al cerrar el último
--     ticket, si estaba en 'mantenimiento', pasa a 'inspeccion' (no auto-desbloquea).
-- =====================================================

-- Helper: ticket de mantenimiento abierto por habitación
CREATE OR REPLACE FUNCTION hk_has_open_maintenance_ticket(p_room_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM tickets_maintenance tm
    WHERE tm.hk_room_id = p_room_id
      AND tm.deleted_at IS NULL
      AND tm.status NOT IN ('RESOLVED', 'CLOSED')
  );
$$;

-- Helper: existe cualquier ticket de mantenimiento vinculado (abierto o cerrado)
CREATE OR REPLACE FUNCTION hk_has_any_maintenance_ticket(p_room_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM tickets_maintenance tm
    WHERE tm.hk_room_id = p_room_id
      AND tm.deleted_at IS NULL
  );
$$;


-- RPC: Cambio de estado con guardrails de workflow
-- Nota: se agrega p_changed_by porque la API usa service_role para ejecutar,
-- y auth.uid() sería NULL sin pasar contexto del usuario.
DROP FUNCTION IF EXISTS hk_change_room_status(UUID, hk_room_status, TEXT);

CREATE OR REPLACE FUNCTION hk_change_room_status(
  p_room_id UUID,
  p_new_status hk_room_status,
  p_changed_by UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_old_status hk_room_status;
  v_has_open_maint BOOLEAN;
  v_is_override BOOLEAN := FALSE;
BEGIN
  IF p_changed_by IS NULL THEN
    RAISE EXCEPTION 'changed_by requerido';
  END IF;

  SELECT status INTO v_old_status
  FROM hk_rooms
  WHERE id = p_room_id;

  IF v_old_status IS NULL THEN
    RAISE EXCEPTION 'Habitación no encontrada';
  END IF;

  -- Override: admin o supervisor corporativo
  SELECT (
    p.role = 'admin'
    OR (p.role = 'supervisor' AND COALESCE(p.is_corporate, FALSE) = TRUE)
  )
  INTO v_is_override
  FROM profiles p
  WHERE p.id = p_changed_by;

  v_has_open_maint := hk_has_open_maintenance_ticket(p_room_id);

  -- Regla 1:
  -- - Entrar a 'mantenimiento' requiere ticket de mantenimiento ABIERTO.
  -- - Entrar a 'bloqueada' está permitido sin ticket (Ama de Llaves puede detectar y bloquear primero).
  IF p_new_status = 'mantenimiento' THEN
    IF NOT v_has_open_maint AND NOT COALESCE(v_is_override, FALSE) THEN
      RAISE EXCEPTION 'No puedes marcar como mantenimiento sin un ticket de mantenimiento abierto vinculado a la habitación';
    END IF;
  END IF;

  -- Regla 2: no salir de OOS con ticket abierto
  IF v_old_status IN ('mantenimiento', 'bloqueada') AND p_new_status NOT IN ('mantenimiento', 'bloqueada') THEN
    IF v_has_open_maint AND NOT COALESCE(v_is_override, FALSE) THEN
      RAISE EXCEPTION 'No puedes cambiar el estado mientras exista un ticket de mantenimiento abierto para esta habitación';
    END IF;
  END IF;

  -- Regla 3: si se bloqueó SIN ticket, para desbloquear debe existir al menos 1 ticket vinculado.
  -- Esto fuerza el flujo procesal: bloqueo -> ticket -> atención/cierre -> inspección/estado real.
  IF v_old_status = 'bloqueada' AND p_new_status NOT IN ('mantenimiento', 'bloqueada') THEN
    IF NOT hk_has_any_maintenance_ticket(p_room_id) AND NOT COALESCE(v_is_override, FALSE) THEN
      RAISE EXCEPTION 'No puedes desbloquear una habitación sin antes crear un ticket de mantenimiento vinculado';
    END IF;
  END IF;

  UPDATE hk_rooms
  SET status = p_new_status,
      last_cleaned_at = CASE WHEN p_new_status = 'limpia' THEN now() ELSE last_cleaned_at END,
      last_inspected_at = CASE WHEN p_new_status = 'inspeccion' THEN now() ELSE last_inspected_at END,
      assigned_to = CASE WHEN p_new_status IN ('limpia', 'bloqueada', 'sucia') THEN NULL ELSE assigned_to END
  WHERE id = p_room_id;

  INSERT INTO hk_room_status_log (room_id, previous_status, new_status, changed_by, notes)
  VALUES (p_room_id, v_old_status, p_new_status, p_changed_by, p_notes);

  IF p_new_status = 'limpia' THEN
    UPDATE hk_room_assignments
    SET status = 'completada',
        completed_at = now(),
        duration_minutes = EXTRACT(EPOCH FROM (now() - started_at)) / 60
    WHERE room_id = p_room_id
      AND status IN ('pendiente', 'en_progreso')
      AND assignment_date = CURRENT_DATE;
  END IF;

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

-- Wrapper retrocompatible (para llamadas antiguas con auth.uid())
CREATE OR REPLACE FUNCTION hk_change_room_status(
  p_room_id UUID,
  p_new_status hk_room_status,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  PERFORM hk_change_room_status(p_room_id, p_new_status, auth.uid(), p_notes);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Trigger: sincronizar estatus HK desde tickets_maintenance
CREATE OR REPLACE FUNCTION hk_sync_room_oos_from_maintenance_ticket()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_room_id UUID;
  v_old_room_id UUID;
  v_open_count INTEGER;
  v_current_status hk_room_status;
BEGIN
  -- Detectar room_id afectado
  IF TG_OP = 'DELETE' THEN
    v_room_id := OLD.hk_room_id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_room_id := NEW.hk_room_id;
    v_old_room_id := OLD.hk_room_id;

    -- Si cambió room_id, recalcular el anterior también
    IF v_old_room_id IS DISTINCT FROM v_room_id AND v_old_room_id IS NOT NULL THEN
      SELECT COUNT(*) INTO v_open_count
      FROM tickets_maintenance tm
      WHERE tm.hk_room_id = v_old_room_id
        AND tm.deleted_at IS NULL
        AND tm.status NOT IN ('RESOLVED', 'CLOSED');

      IF v_open_count = 0 THEN
        SELECT status INTO v_current_status FROM hk_rooms WHERE id = v_old_room_id;
        IF v_current_status = 'mantenimiento' THEN
          UPDATE hk_rooms
          SET status = 'inspeccion',
              updated_at = now()
          WHERE id = v_old_room_id;
        END IF;
      END IF;
    END IF;
  ELSE
    v_room_id := NEW.hk_room_id;
  END IF;

  IF v_room_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COUNT(*) INTO v_open_count
  FROM tickets_maintenance tm
  WHERE tm.hk_room_id = v_room_id
    AND tm.deleted_at IS NULL
    AND tm.status NOT IN ('RESOLVED', 'CLOSED');

  SELECT status INTO v_current_status
  FROM hk_rooms
  WHERE id = v_room_id;

  IF v_open_count > 0 THEN
    -- Forzar a mantenimiento si no está ya en OOS
    IF v_current_status NOT IN ('mantenimiento', 'bloqueada') THEN
      UPDATE hk_rooms
      SET status = 'mantenimiento',
          updated_at = now()
      WHERE id = v_room_id;
    END IF;
  ELSE
    -- Al cerrar el último ticket, si estaba en mantenimiento, pasa a inspección
    IF v_current_status = 'mantenimiento' THEN
      UPDATE hk_rooms
      SET status = 'inspeccion',
          updated_at = now()
      WHERE id = v_room_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_tickets_maintenance_hk_oos ON tickets_maintenance;
CREATE TRIGGER trg_tickets_maintenance_hk_oos
AFTER INSERT OR UPDATE OF hk_room_id, status, deleted_at
    OR DELETE
ON tickets_maintenance
FOR EACH ROW
EXECUTE FUNCTION hk_sync_room_oos_from_maintenance_ticket();
