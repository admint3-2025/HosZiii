-- ============================================================================
-- FIX: Función create_disposal_request para assets_it y assets_maintenance
-- ============================================================================
-- Problema: La función buscaba en tabla "assets" que no existe
-- Solución: Buscar en assets_it y assets_maintenance
-- ============================================================================

-- PASO 1: Eliminar FK constraint obsoleta que apunta a tabla "assets" inexistente
ALTER TABLE asset_disposal_requests 
DROP CONSTRAINT IF EXISTS asset_disposal_requests_asset_id_fkey;

-- La validación de que el activo existe se hace en la función create_disposal_request

-- ============================================================================

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
  v_is_it_asset boolean;
BEGIN
  -- Verificar si es activo IT o Mantenimiento
  v_is_it_asset := EXISTS (SELECT 1 FROM assets_it WHERE id = p_asset_id AND deleted_at IS NULL);
  
  IF NOT v_is_it_asset THEN
    -- Verificar si es activo de Mantenimiento
    IF NOT EXISTS (SELECT 1 FROM assets_maintenance WHERE id = p_asset_id AND deleted_at IS NULL) THEN
      RAISE EXCEPTION 'Activo no encontrado';
    END IF;
  END IF;
  
  -- Verificar que no haya solicitud pendiente
  IF EXISTS (
    SELECT 1 FROM asset_disposal_requests 
    WHERE asset_id = p_asset_id AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Ya existe una solicitud pendiente para este activo';
  END IF;
  
  -- Obtener datos según el tipo de activo
  IF v_is_it_asset THEN
    -- Activo IT
    SELECT l.name, p.full_name INTO v_location_name, v_assigned_user_name
    FROM assets_it a
    LEFT JOIN locations l ON a.location_id = l.id
    LEFT JOIN profiles p ON a.assigned_to_user_id = p.id
    WHERE a.id = p_asset_id;
    
    -- Capturar snapshot completo del activo IT
    SELECT jsonb_build_object(
      'id', a.id,
      'asset_category', 'IT',
      'asset_tag', a.asset_code,
      'asset_type', a.category,
      'brand', a.brand,
      'model', a.model,
      'serial_number', a.serial_number,
      'status', a.status,
      'location_id', a.location_id,
      'location_name', v_location_name,
      'department', a.department,
      'assigned_to', a.assigned_to_user_id,
      'assigned_user_name', v_assigned_user_name,
      'purchase_date', a.purchase_date,
      'warranty_end_date', a.warranty_expiry,
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
    FROM assets_it a
    WHERE a.id = p_asset_id;
    
    -- Capturar historial de tickets IT
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
    
  ELSE
    -- Activo Mantenimiento
    SELECT l.name, p.full_name INTO v_location_name, v_assigned_user_name
    FROM assets_maintenance a
    LEFT JOIN locations l ON a.location_id = l.id
    LEFT JOIN profiles p ON a.assigned_to_user_id = p.id
    WHERE a.id = p_asset_id;
    
    -- Capturar snapshot completo del activo Mantenimiento
    SELECT jsonb_build_object(
      'id', a.id,
      'asset_category', 'MAINTENANCE',
      'asset_tag', a.asset_code,
      'asset_type', a.category,
      'brand', a.brand,
      'model', a.model,
      'serial_number', a.serial_number,
      'status', a.status,
      'location_id', a.location_id,
      'location_name', v_location_name,
      'department', a.department,
      'assigned_to', a.assigned_to_user_id,
      'assigned_user_name', v_assigned_user_name,
      'purchase_date', a.purchase_date,
      'warranty_end_date', a.warranty_expiry,
      'notes', a.notes,
      'image_url', a.image_url,
      'created_at', a.created_at,
      'updated_at', a.updated_at,
      'snapshot_taken_at', now()
    )
    INTO v_asset_snapshot
    FROM assets_maintenance a
    WHERE a.id = p_asset_id;
    
    -- Capturar historial de tickets Mantenimiento
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
    FROM tickets_maintenance t
    WHERE t.asset_id = p_asset_id AND t.deleted_at IS NULL;
  END IF;
  
  -- Capturar historial de cambios (común para ambos)
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

COMMENT ON FUNCTION create_disposal_request(uuid, text) IS 
'Crea una solicitud de baja de activo (IT o Mantenimiento) con snapshot completo y auditoría';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
-- Para probar que la función existe:
-- SELECT routine_name, routine_type 
-- FROM information_schema.routines 
-- WHERE routine_name = 'create_disposal_request';
