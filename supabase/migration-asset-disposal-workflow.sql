-- Migration: Flujo de autorización para baja de activos
-- Fecha: 2026-01-08
-- Descripción: Implementa ciclo de aprobación con notificaciones para dar de baja activos

-- 1. Crear enum para estados de solicitud
DO $$ BEGIN
  CREATE TYPE disposal_request_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Tabla de solicitudes de baja de activos
CREATE TABLE IF NOT EXISTS asset_disposal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  
  -- Solicitante
  requested_by uuid NOT NULL REFERENCES profiles(id),
  requested_at timestamptz NOT NULL DEFAULT now(),
  reason text NOT NULL,
  
  -- Estado
  status disposal_request_status NOT NULL DEFAULT 'pending',
  
  -- Aprobación/Rechazo
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  review_notes text,
  
  -- Metadatos
  asset_snapshot jsonb, -- Guarda estado del activo al momento de la solicitud
  notification_sent_at timestamptz,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_disposal_requests_asset ON asset_disposal_requests(asset_id);
CREATE INDEX IF NOT EXISTS idx_disposal_requests_status ON asset_disposal_requests(status);
CREATE INDEX IF NOT EXISTS idx_disposal_requests_requested_by ON asset_disposal_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_disposal_requests_pending ON asset_disposal_requests(status) WHERE status = 'pending';

-- 4. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_disposal_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_disposal_request_updated_at ON asset_disposal_requests;
CREATE TRIGGER trigger_disposal_request_updated_at
  BEFORE UPDATE ON asset_disposal_requests
  FOR EACH ROW EXECUTE FUNCTION update_disposal_request_updated_at();

-- 5. RLS Policies
ALTER TABLE asset_disposal_requests ENABLE ROW LEVEL SECURITY;

-- Admins y supervisores pueden ver todas las solicitudes
DROP POLICY IF EXISTS "disposal_requests_select_admin" ON asset_disposal_requests;
CREATE POLICY "disposal_requests_select_admin"
ON asset_disposal_requests FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.role = 'supervisor')
  )
);

-- Usuarios pueden ver sus propias solicitudes
DROP POLICY IF EXISTS "disposal_requests_select_own" ON asset_disposal_requests;
CREATE POLICY "disposal_requests_select_own"
ON asset_disposal_requests FOR SELECT
TO authenticated
USING (requested_by = auth.uid());

-- Usuarios con permiso pueden crear solicitudes
DROP POLICY IF EXISTS "disposal_requests_insert" ON asset_disposal_requests;
CREATE POLICY "disposal_requests_insert"
ON asset_disposal_requests FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.role IN ('admin', 'supervisor')
      OR profiles.can_manage_assets = true
    )
  )
);

-- Solo admins pueden aprobar/rechazar
DROP POLICY IF EXISTS "disposal_requests_update" ON asset_disposal_requests;
CREATE POLICY "disposal_requests_update"
ON asset_disposal_requests FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- 6. Función para crear solicitud de baja con snapshot del activo
CREATE OR REPLACE FUNCTION create_disposal_request(
  p_asset_id uuid,
  p_reason text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request_id uuid;
  v_asset_snapshot jsonb;
  v_existing_pending uuid;
BEGIN
  -- Verificar que no haya solicitud pendiente para este activo
  SELECT id INTO v_existing_pending
  FROM asset_disposal_requests
  WHERE asset_id = p_asset_id AND status = 'pending';
  
  IF v_existing_pending IS NOT NULL THEN
    RAISE EXCEPTION 'Ya existe una solicitud de baja pendiente para este activo';
  END IF;
  
  -- Capturar snapshot del activo
  SELECT jsonb_build_object(
    'asset_tag', a.asset_tag,
    'asset_type', a.asset_type,
    'status', a.status,
    'serial_number', a.serial_number,
    'brand', a.brand,
    'model', a.model,
    'location', a.location,
    'location_name', l.name,
    'assigned_to_id', a.assigned_to,
    'assigned_to_name', p.full_name,
    'department', a.department,
    'image_url', a.image_url
  )
  INTO v_asset_snapshot
  FROM assets a
  LEFT JOIN locations l ON l.id = a.location_id
  LEFT JOIN profiles p ON p.id = a.assigned_to
  WHERE a.id = p_asset_id;
  
  IF v_asset_snapshot IS NULL THEN
    RAISE EXCEPTION 'Activo no encontrado';
  END IF;
  
  -- Crear solicitud
  INSERT INTO asset_disposal_requests (
    asset_id,
    requested_by,
    reason,
    asset_snapshot
  ) VALUES (
    p_asset_id,
    auth.uid(),
    p_reason,
    v_asset_snapshot
  )
  RETURNING id INTO v_request_id;
  
  -- Registrar en audit_log
  INSERT INTO audit_log (
    entity_type,
    entity_id,
    action,
    actor_id,
    metadata
  ) VALUES (
    'asset_disposal_request',
    v_request_id,
    'CREATE',
    auth.uid(),
    jsonb_build_object(
      'asset_id', p_asset_id,
      'asset_tag', v_asset_snapshot->>'asset_tag',
      'reason', p_reason
    )
  );
  
  RETURN v_request_id;
END;
$$;

-- 7. Función para aprobar solicitud de baja
CREATE OR REPLACE FUNCTION approve_disposal_request(
  p_request_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request RECORD;
BEGIN
  -- Obtener solicitud
  SELECT * INTO v_request
  FROM asset_disposal_requests
  WHERE id = p_request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitud no encontrada';
  END IF;
  
  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'Esta solicitud ya fue procesada';
  END IF;
  
  -- Verificar que el usuario es admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Solo administradores pueden aprobar solicitudes de baja';
  END IF;
  
  -- Actualizar solicitud
  UPDATE asset_disposal_requests SET
    status = 'approved',
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    review_notes = p_notes
  WHERE id = p_request_id;
  
  -- Dar de baja el activo
  UPDATE assets SET
    deleted_at = now(),
    deleted_by = auth.uid()
  WHERE id = v_request.asset_id;
  
  -- Registrar en audit_log
  INSERT INTO audit_log (
    entity_type,
    entity_id,
    action,
    actor_id,
    metadata
  ) VALUES (
    'asset_disposal_request',
    p_request_id,
    'APPROVE',
    auth.uid(),
    jsonb_build_object(
      'asset_id', v_request.asset_id,
      'notes', p_notes
    )
  );
  
  -- Registrar baja en asset_changes
  INSERT INTO asset_changes (
    asset_id,
    asset_tag,
    changed_by,
    changed_by_name,
    changed_by_email,
    field_name,
    old_value,
    new_value,
    change_type
  )
  SELECT
    v_request.asset_id,
    v_request.asset_snapshot->>'asset_tag',
    auth.uid(),
    p.full_name,
    u.email,
    'disposal_approved',
    'Activo',
    'Baja aprobada: ' || COALESCE(p_notes, v_request.reason),
    'DELETE'
  FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  WHERE u.id = auth.uid();
END;
$$;

-- 8. Función para rechazar solicitud de baja
CREATE OR REPLACE FUNCTION reject_disposal_request(
  p_request_id uuid,
  p_notes text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request RECORD;
BEGIN
  -- Obtener solicitud
  SELECT * INTO v_request
  FROM asset_disposal_requests
  WHERE id = p_request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitud no encontrada';
  END IF;
  
  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'Esta solicitud ya fue procesada';
  END IF;
  
  -- Verificar que el usuario es admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Solo administradores pueden rechazar solicitudes de baja';
  END IF;
  
  -- Actualizar solicitud
  UPDATE asset_disposal_requests SET
    status = 'rejected',
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    review_notes = p_notes
  WHERE id = p_request_id;
  
  -- Registrar en audit_log
  INSERT INTO audit_log (
    entity_type,
    entity_id,
    action,
    actor_id,
    metadata
  ) VALUES (
    'asset_disposal_request',
    p_request_id,
    'REJECT',
    auth.uid(),
    jsonb_build_object(
      'asset_id', v_request.asset_id,
      'notes', p_notes
    )
  );
  
  -- Registrar en asset_changes
  INSERT INTO asset_changes (
    asset_id,
    asset_tag,
    changed_by,
    changed_by_name,
    changed_by_email,
    field_name,
    old_value,
    new_value,
    change_type
  )
  SELECT
    v_request.asset_id,
    v_request.asset_snapshot->>'asset_tag',
    auth.uid(),
    p.full_name,
    u.email,
    'disposal_rejected',
    'Solicitud de baja',
    'Rechazada: ' || p_notes,
    'UPDATE'
  FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  WHERE u.id = auth.uid();
END;
$$;

-- 9. Vista para solicitudes pendientes con información completa
CREATE OR REPLACE VIEW v_pending_disposal_requests AS
SELECT 
  dr.id,
  dr.asset_id,
  dr.asset_snapshot->>'asset_tag' AS asset_tag,
  dr.asset_snapshot->>'asset_type' AS asset_type,
  dr.asset_snapshot->>'brand' AS brand,
  dr.asset_snapshot->>'model' AS model,
  dr.asset_snapshot->>'serial_number' AS serial_number,
  dr.asset_snapshot->>'location_name' AS location_name,
  dr.asset_snapshot->>'assigned_to_name' AS assigned_to_name,
  dr.asset_snapshot->>'image_url' AS image_url,
  dr.reason,
  dr.status,
  dr.requested_at,
  dr.requested_by,
  req.full_name AS requester_name,
  req_user.email AS requester_email,
  dr.reviewed_by,
  rev.full_name AS reviewer_name,
  dr.reviewed_at,
  dr.review_notes
FROM asset_disposal_requests dr
JOIN profiles req ON req.id = dr.requested_by
LEFT JOIN auth.users req_user ON req_user.id = dr.requested_by
LEFT JOIN profiles rev ON rev.id = dr.reviewed_by
ORDER BY dr.requested_at DESC;

-- 10. Comentarios
COMMENT ON TABLE asset_disposal_requests IS 'Solicitudes de baja de activos con flujo de aprobación';
COMMENT ON FUNCTION create_disposal_request(uuid, text) IS 'Crea una solicitud de baja de activo con snapshot y auditoría';
COMMENT ON FUNCTION approve_disposal_request(uuid, text) IS 'Aprueba una solicitud de baja y ejecuta la baja del activo';
COMMENT ON FUNCTION reject_disposal_request(uuid, text) IS 'Rechaza una solicitud de baja con motivo';
