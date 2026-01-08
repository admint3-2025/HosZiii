-- Migration: Mejorar snapshot de baja de activos con información completa
-- Fecha: 2026-01-08
-- Descripción: Captura toda la información del activo incluyendo historial

-- Agregar columnas para historial
ALTER TABLE asset_disposal_requests 
  ADD COLUMN IF NOT EXISTS tickets_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS changes_snapshot jsonb;

-- Actualizar función para capturar snapshot completo
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
  v_existing_pending uuid;
BEGIN
  -- Verificar que no haya solicitud pendiente para este activo
  SELECT id INTO v_existing_pending
  FROM asset_disposal_requests
  WHERE asset_id = p_asset_id AND status = 'pending';
  
  IF v_existing_pending IS NOT NULL THEN
    RAISE EXCEPTION 'Ya existe una solicitud de baja pendiente para este activo';
  END IF;
  
  -- Capturar snapshot COMPLETO del activo
  SELECT jsonb_build_object(
    'asset_tag', a.asset_tag,
    'asset_type', a.asset_type,
    'status', a.status,
    'serial_number', a.serial_number,
    'brand', a.brand,
    'model', a.model,
    'location', a.location,
    'location_id', a.location_id,
    'location_name', l.name,
    'location_code', l.code,
    'assigned_to_id', a.assigned_to,
    'assigned_to_name', p.full_name,
    'department', a.department,
    'image_url', a.image_url,
    'notes', a.notes,
    'purchase_date', a.purchase_date,
    'warranty_expires', a.warranty_expires,
    'created_at', a.created_at,
    'updated_at', a.updated_at
  )
  INTO v_asset_snapshot
  FROM assets a
  LEFT JOIN locations l ON l.id = a.location_id
  LEFT JOIN profiles p ON p.id = a.assigned_to
  WHERE a.id = p_asset_id;
  
  IF v_asset_snapshot IS NULL THEN
    RAISE EXCEPTION 'Activo no encontrado';
  END IF;
  
  -- Capturar historial de tickets relacionados
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
      'requester_name', pr.full_name,
      'assigned_name', pa.full_name
    ) ORDER BY t.created_at DESC
  ), '[]'::jsonb)
  INTO v_tickets_snapshot
  FROM tickets t
  LEFT JOIN profiles pr ON pr.id = t.requester_id
  LEFT JOIN profiles pa ON pa.id = t.assigned_to
  WHERE t.asset_id = p_asset_id
    AND t.deleted_at IS NULL;
  
  -- Capturar historial de cambios del activo
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', ac.id,
      'field_name', ac.field_name,
      'old_value', ac.old_value,
      'new_value', ac.new_value,
      'changed_at', ac.changed_at,
      'changed_by_name', ac.changed_by_name
    ) ORDER BY ac.changed_at DESC
  ), '[]'::jsonb)
  INTO v_changes_snapshot
  FROM asset_changes ac
  WHERE ac.asset_id = p_asset_id;
  
  -- Crear solicitud con snapshot completo
  INSERT INTO asset_disposal_requests (
    asset_id,
    requested_by,
    reason,
    asset_snapshot,
    tickets_snapshot,
    changes_snapshot
  ) VALUES (
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
