-- ============================================================================
-- FUNCIÓN RPC PARA ACTUALIZAR ACTIVOS CON USUARIO REGISTRADO
-- Esta función reemplaza el UPDATE directo y asegura que el usuario se registre
-- ============================================================================

CREATE OR REPLACE FUNCTION update_asset_with_user(
  p_asset_id UUID,
  p_asset_code TEXT,
  p_name TEXT,
  p_category TEXT,
  p_status TEXT,
  p_serial_number TEXT,
  p_model TEXT,
  p_brand TEXT,
  p_department TEXT,
  p_location_id UUID,
  p_assigned_to_user_id UUID,
  p_purchase_date DATE,
  p_warranty_expiry DATE,
  p_notes TEXT,
  p_processor TEXT,
  p_ram_gb INTEGER,
  p_storage_gb INTEGER,
  p_os TEXT,
  p_image_url TEXT,
  p_dynamic_specs JSONB,
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_old_asset RECORD;
  v_result JSON;
BEGIN
  -- Obtener el registro anterior para comparar cambios
  SELECT * INTO v_old_asset FROM assets_it WHERE id = p_asset_id;
  
  IF v_old_asset IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Asset not found');
  END IF;

  -- Actualizar el activo
  UPDATE assets_it SET
    asset_code = COALESCE(p_asset_code, asset_code),
    name = COALESCE(p_name, name),
    category = COALESCE(p_category, category),
    status = COALESCE(p_status, status),
    serial_number = COALESCE(p_serial_number, serial_number),
    model = COALESCE(p_model, model),
    brand = COALESCE(p_brand, brand),
    department = COALESCE(p_department, department),
    location_id = p_location_id,
    assigned_to_user_id = p_assigned_to_user_id,
    purchase_date = p_purchase_date,
    warranty_expiry = p_warranty_expiry,
    notes = COALESCE(p_notes, notes),
    processor = COALESCE(p_processor, processor),
    ram_gb = p_ram_gb,
    storage_gb = p_storage_gb,
    os = COALESCE(p_os, os),
    image_url = p_image_url,
    dynamic_specs = COALESCE(p_dynamic_specs, dynamic_specs),
    updated_at = NOW(),
    updated_by = p_user_id
  WHERE id = p_asset_id;

  -- Registrar cambios en la tabla asset_changes
  -- Cambio de ubicación
  IF v_old_asset.location_id IS DISTINCT FROM p_location_id THEN
    INSERT INTO asset_changes (asset_id, asset_tag, field_name, change_type, old_value, new_value, changed_by, changed_at)
    VALUES (p_asset_id, p_asset_code, 'location_id', 'UPDATE', 
            COALESCE(v_old_asset.location_id::text, 'Sin sede'),
            COALESCE(p_location_id::text, 'Sin sede'),
            p_user_id, NOW());
  END IF;

  -- Cambio de estado
  IF v_old_asset.status IS DISTINCT FROM p_status THEN
    INSERT INTO asset_changes (asset_id, asset_tag, field_name, change_type, old_value, new_value, changed_by, changed_at)
    VALUES (p_asset_id, p_asset_code, 'status', 'UPDATE', v_old_asset.status, p_status, p_user_id, NOW());
  END IF;

  -- Cambio de asignación
  IF v_old_asset.assigned_to_user_id IS DISTINCT FROM p_assigned_to_user_id THEN
    INSERT INTO asset_changes (asset_id, asset_tag, field_name, change_type, old_value, new_value, changed_by, changed_at)
    VALUES (p_asset_id, p_asset_code, 'assigned_to', 'UPDATE',
            COALESCE(v_old_asset.assigned_to_user_id::text, 'Sin asignar'),
            COALESCE(p_assigned_to_user_id::text, 'Sin asignar'),
            p_user_id, NOW());
  END IF;

  -- Cambio de departamento
  IF v_old_asset.department IS DISTINCT FROM p_department THEN
    INSERT INTO asset_changes (asset_id, asset_tag, field_name, change_type, old_value, new_value, changed_by, changed_at)
    VALUES (p_asset_id, p_asset_code, 'department', 'UPDATE',
            COALESCE(v_old_asset.department, 'Sin departamento'),
            COALESCE(p_department, 'Sin departamento'),
            p_user_id, NOW());
  END IF;

  -- Cambio de procesador
  IF v_old_asset.processor IS DISTINCT FROM p_processor THEN
    INSERT INTO asset_changes (asset_id, asset_tag, field_name, change_type, old_value, new_value, changed_by, changed_at)
    VALUES (p_asset_id, p_asset_code, 'processor', 'UPDATE',
            COALESCE(v_old_asset.processor, 'No especificado'),
            COALESCE(p_processor, 'No especificado'),
            p_user_id, NOW());
  END IF;

  -- Cambio de RAM
  IF v_old_asset.ram_gb IS DISTINCT FROM p_ram_gb THEN
    INSERT INTO asset_changes (asset_id, asset_tag, field_name, change_type, old_value, new_value, changed_by, changed_at)
    VALUES (p_asset_id, p_asset_code, 'ram_gb', 'UPDATE',
            COALESCE(v_old_asset.ram_gb::text || ' GB', 'No especificado'),
            COALESCE(p_ram_gb::text || ' GB', 'No especificado'),
            p_user_id, NOW());
  END IF;

  -- Cambio de almacenamiento
  IF v_old_asset.storage_gb IS DISTINCT FROM p_storage_gb THEN
    INSERT INTO asset_changes (asset_id, asset_tag, field_name, change_type, old_value, new_value, changed_by, changed_at)
    VALUES (p_asset_id, p_asset_code, 'storage_gb', 'UPDATE',
            COALESCE(v_old_asset.storage_gb::text || ' GB', 'No especificado'),
            COALESCE(p_storage_gb::text || ' GB', 'No especificado'),
            p_user_id, NOW());
  END IF;

  -- Cambio de OS
  IF v_old_asset.os IS DISTINCT FROM p_os THEN
    INSERT INTO asset_changes (asset_id, asset_tag, field_name, change_type, old_value, new_value, changed_by, changed_at)
    VALUES (p_asset_id, p_asset_code, 'os', 'UPDATE',
            COALESCE(v_old_asset.os, 'No especificado'),
            COALESCE(p_os, 'No especificado'),
            p_user_id, NOW());
  END IF;

  -- Cambio de imagen
  IF v_old_asset.image_url IS DISTINCT FROM p_image_url THEN
    INSERT INTO asset_changes (asset_id, asset_tag, field_name, change_type, old_value, new_value, changed_by, changed_at)
    VALUES (p_asset_id, p_asset_code, 'image_url', 'UPDATE',
            CASE WHEN v_old_asset.image_url IS NULL THEN 'Sin imagen' ELSE 'Con imagen' END,
            CASE WHEN p_image_url IS NULL THEN 'Imagen eliminada' ELSE 'Imagen actualizada' END,
            p_user_id, NOW());
  END IF;

  -- Cambio de especificaciones dinámicas
  IF v_old_asset.dynamic_specs IS DISTINCT FROM p_dynamic_specs THEN
    INSERT INTO asset_changes (asset_id, asset_tag, field_name, change_type, old_value, new_value, changed_by, changed_at)
    VALUES (p_asset_id, p_asset_code, 'dynamic_specs', 'UPDATE',
            v_old_asset.dynamic_specs::text,
            p_dynamic_specs::text,
            p_user_id, NOW());
  END IF;

  RETURN json_build_object('success', true, 'message', 'Asset updated successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Función similar para assets_maintenance
-- ============================================================================

CREATE OR REPLACE FUNCTION update_maintenance_asset_with_user(
  p_asset_id UUID,
  p_asset_code TEXT,
  p_name TEXT,
  p_category TEXT,
  p_status TEXT,
  p_location_id UUID,
  p_assigned_to_user_id UUID,
  p_notes TEXT,
  p_image_url TEXT,
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_old_asset RECORD;
BEGIN
  -- Obtener el registro anterior
  SELECT * INTO v_old_asset FROM assets_maintenance WHERE id = p_asset_id;
  
  IF v_old_asset IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Asset not found');
  END IF;

  -- Actualizar el activo
  UPDATE assets_maintenance SET
    asset_code = COALESCE(p_asset_code, asset_code),
    name = COALESCE(p_name, name),
    category = COALESCE(p_category, category),
    status = COALESCE(p_status, status),
    location_id = p_location_id,
    assigned_to_user_id = p_assigned_to_user_id,
    notes = COALESCE(p_notes, notes),
    image_url = p_image_url,
    updated_at = NOW(),
    updated_by = p_user_id
  WHERE id = p_asset_id;

  -- Registrar cambios
  IF v_old_asset.location_id IS DISTINCT FROM p_location_id THEN
    INSERT INTO asset_changes (asset_id, asset_tag, field_name, change_type, old_value, new_value, changed_by, changed_at)
    VALUES (p_asset_id, p_asset_code, 'location_id', 'UPDATE',
            COALESCE(v_old_asset.location_id::text, 'Sin sede'),
            COALESCE(p_location_id::text, 'Sin sede'),
            p_user_id, NOW());
  END IF;

  IF v_old_asset.status IS DISTINCT FROM p_status THEN
    INSERT INTO asset_changes (asset_id, asset_tag, field_name, change_type, old_value, new_value, changed_by, changed_at)
    VALUES (p_asset_id, p_asset_code, 'status', 'UPDATE', v_old_asset.status, p_status, p_user_id, NOW());
  END IF;

  IF v_old_asset.assigned_to_user_id IS DISTINCT FROM p_assigned_to_user_id THEN
    INSERT INTO asset_changes (asset_id, asset_tag, field_name, change_type, old_value, new_value, changed_by, changed_at)
    VALUES (p_asset_id, p_asset_code, 'assigned_to', 'UPDATE',
            COALESCE(v_old_asset.assigned_to_user_id::text, 'Sin asignar'),
            COALESCE(p_assigned_to_user_id::text, 'Sin asignar'),
            p_user_id, NOW());
  END IF;

  RETURN json_build_object('success', true, 'message', 'Asset updated successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
SELECT 'Funciones RPC creadas correctamente' as resultado;

-- Verificar que las funciones existan
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE 'update_%_with_user'
ORDER BY routine_name;
