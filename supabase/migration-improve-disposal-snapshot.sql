-- Migration: Mejorar snapshot de activos en solicitudes de baja
-- Fecha: 2026-01-08
-- Descripción: Agrega campos para guardar historial completo del activo

-- Agregar columnas para historial de tickets y cambios
ALTER TABLE asset_disposal_requests 
ADD COLUMN IF NOT EXISTS tickets_snapshot jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS changes_snapshot jsonb DEFAULT '[]'::jsonb;

-- Comentarios descriptivos
COMMENT ON COLUMN asset_disposal_requests.asset_snapshot IS 'Copia completa del activo al momento de la solicitud';
COMMENT ON COLUMN asset_disposal_requests.tickets_snapshot IS 'Historial de tickets/incidencias del activo';
COMMENT ON COLUMN asset_disposal_requests.changes_snapshot IS 'Historial de cambios del activo';

-- Actualizar la función create_disposal_request para capturar más datos
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
  v_tickets_snapshot jsonb;
  v_changes_snapshot jsonb;
  v_location_name text;
  v_assigned_user_name text;
BEGIN
  -- Verificar que el activo existe y no tiene solicitud pendiente
  IF NOT EXISTS (SELECT 1 FROM assets WHERE id = p_asset_id AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Activo no encontrado';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM asset_disposal_requests 
    WHERE asset_id = p_asset_id AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Ya existe una solicitud pendiente para este activo';
  END IF;
  
  -- Obtener nombre de ubicación
  SELECT l.name INTO v_location_name
  FROM assets a
  LEFT JOIN locations l ON a.location_id = l.id
  WHERE a.id = p_asset_id;
  
  -- Obtener nombre del usuario asignado
  SELECT p.full_name INTO v_assigned_user_name
  FROM assets a
  LEFT JOIN profiles p ON a.assigned_to = p.id
  WHERE a.id = p_asset_id;
  
  -- Capturar snapshot completo del activo
  SELECT jsonb_build_object(
    'id', a.id,
    'asset_tag', a.asset_tag,
    'asset_type', a.asset_type,
    'brand', a.brand,
    'model', a.model,
    'serial_number', a.serial_number,
    'status', a.status,
    'location', a.location,
    'location_id', a.location_id,
    'location_name', v_location_name,
    'department', a.department,
    'assigned_to', a.assigned_to,
    'assigned_user_name', v_assigned_user_name,
    'purchase_date', a.purchase_date,
    'warranty_end_date', a.warranty_end_date,
    'processor', a.processor,
    'ram_gb', a.ram_gb,
    'storage_gb', a.storage_gb,
    'os', a.os,
    'notes', a.notes,
    'image_url', a.image_url,
    'created_at', a.created_at,
    'updated_at', a.updated_at,
    'snapshot_taken_at', now()
  )
  INTO v_asset_snapshot
  FROM assets a
  WHERE a.id = p_asset_id;
  
  -- Capturar historial de tickets
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'ticket_number', t.ticket_number,
      'title', t.title,
      'description', t.description,
      'status', t.status,
      'priority', t.priority,
      'created_at', t.created_at,
      'closed_at', t.closed_at,
      'resolution', t.resolution
    ) ORDER BY t.created_at DESC
  ), '[]'::jsonb)
  INTO v_tickets_snapshot
  FROM tickets t
  WHERE t.asset_id = p_asset_id AND t.deleted_at IS NULL;
  
  -- Capturar historial de cambios
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', c.id,
      'field_name', c.field_name,
      'old_value', c.old_value,
      'new_value', c.new_value,
      'changed_at', c.changed_at,
      'changed_by', c.changed_by,
      'changed_by_name', c.changed_by_name
    ) ORDER BY c.changed_at DESC
  ), '[]'::jsonb)
  INTO v_changes_snapshot
  FROM asset_changes c
  WHERE c.asset_id = p_asset_id;
  
  -- Crear la solicitud
  INSERT INTO asset_disposal_requests (
    asset_id,
    requested_by,
    reason,
    asset_snapshot,
    tickets_snapshot,
    changes_snapshot
  )
  VALUES (
    p_asset_id,
    auth.uid(),
    p_reason,
    v_asset_snapshot,
    v_tickets_snapshot,
    v_changes_snapshot
  )
  RETURNING id INTO v_request_id;
  
  RETURN v_request_id;
END;
$$;
