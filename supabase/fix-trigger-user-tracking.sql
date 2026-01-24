-- ============================================================================
-- TRIGGER MEJORADO: Obtener usuario que hace los cambios
-- ============================================================================

-- Función para registrar cambios en assets_it CON USUARIO CORRECTO
CREATE OR REPLACE FUNCTION track_asset_it_changes()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id uuid;
  v_user_id_text text;
BEGIN
  -- Intentar obtener el ID del usuario actual de varias formas
  -- 1. Desde auth.uid() (contexto de sesión normal)
  current_user_id := auth.uid();
  
  -- 2. Si no hay auth.uid(), usar updated_by si existe en el NEW record
  IF current_user_id IS NULL AND NEW.updated_by IS NOT NULL THEN
    current_user_id := NEW.updated_by;
  END IF;
  
  -- 3. Si aún es NULL, usar created_by del registro
  IF current_user_id IS NULL THEN
    current_user_id := NEW.created_by;
  END IF;
  
  -- 4. Validar que tenemos un user_id válido
  IF current_user_id IS NULL THEN
    -- Si no hay user_id, salimos sin registrar
    RETURN NEW;
  END IF;

  -- Registrar cambio de ubicación
  IF OLD.location_id IS DISTINCT FROM NEW.location_id THEN
    INSERT INTO asset_changes (
      asset_id, asset_tag, field_name, change_type,
      old_value, new_value, changed_by, changed_at
    ) VALUES (
      NEW.id, NEW.asset_code, 'location_id', 'UPDATE',
      COALESCE(OLD.location_id::text, 'Sin sede'),
      COALESCE(NEW.location_id::text, 'Sin sede'),
      current_user_id, NOW()
    );
  END IF;

  -- Registrar cambio de estado
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO asset_changes (
      asset_id, asset_tag, field_name, change_type,
      old_value, new_value, changed_by, changed_at
    ) VALUES (
      NEW.id, NEW.asset_code, 'status', 'UPDATE',
      OLD.status, NEW.status,
      current_user_id, NOW()
    );
  END IF;

  -- Registrar cambio de asignación
  IF OLD.assigned_to_user_id IS DISTINCT FROM NEW.assigned_to_user_id THEN
    INSERT INTO asset_changes (
      asset_id, asset_tag, field_name, change_type,
      old_value, new_value, changed_by, changed_at
    ) VALUES (
      NEW.id, NEW.asset_code, 'assigned_to', 'UPDATE',
      COALESCE(OLD.assigned_to_user_id::text, 'Sin asignar'),
      COALESCE(NEW.assigned_to_user_id::text, 'Sin asignar'),
      current_user_id, NOW()
    );
  END IF;

  -- Registrar cambio de departamento
  IF OLD.department IS DISTINCT FROM NEW.department THEN
    INSERT INTO asset_changes (
      asset_id, asset_tag, field_name, change_type,
      old_value, new_value, changed_by, changed_at
    ) VALUES (
      NEW.id, NEW.asset_code, 'department', 'UPDATE',
      COALESCE(OLD.department, 'Sin departamento'),
      COALESCE(NEW.department, 'Sin departamento'),
      current_user_id, NOW()
    );
  END IF;

  -- Registrar cambio de procesador
  IF OLD.processor IS DISTINCT FROM NEW.processor THEN
    INSERT INTO asset_changes (
      asset_id, asset_tag, field_name, change_type,
      old_value, new_value, changed_by, changed_at
    ) VALUES (
      NEW.id, NEW.asset_code, 'processor', 'UPDATE',
      COALESCE(OLD.processor, 'No especificado'),
      COALESCE(NEW.processor, 'No especificado'),
      current_user_id, NOW()
    );
  END IF;

  -- Registrar cambio de RAM
  IF OLD.ram_gb IS DISTINCT FROM NEW.ram_gb THEN
    INSERT INTO asset_changes (
      asset_id, asset_tag, field_name, change_type,
      old_value, new_value, changed_by, changed_at
    ) VALUES (
      NEW.id, NEW.asset_code, 'ram_gb', 'UPDATE',
      COALESCE(OLD.ram_gb::text || ' GB', 'No especificado'),
      COALESCE(NEW.ram_gb::text || ' GB', 'No especificado'),
      current_user_id, NOW()
    );
  END IF;

  -- Registrar cambio de almacenamiento
  IF OLD.storage_gb IS DISTINCT FROM NEW.storage_gb THEN
    INSERT INTO asset_changes (
      asset_id, asset_tag, field_name, change_type,
      old_value, new_value, changed_by, changed_at
    ) VALUES (
      NEW.id, NEW.asset_code, 'storage_gb', 'UPDATE',
      COALESCE(OLD.storage_gb::text || ' GB', 'No especificado'),
      COALESCE(NEW.storage_gb::text || ' GB', 'No especificado'),
      current_user_id, NOW()
    );
  END IF;

  -- Registrar cambio de OS
  IF OLD.os IS DISTINCT FROM NEW.os THEN
    INSERT INTO asset_changes (
      asset_id, asset_tag, field_name, change_type,
      old_value, new_value, changed_by, changed_at
    ) VALUES (
      NEW.id, NEW.asset_code, 'os', 'UPDATE',
      COALESCE(OLD.os, 'No especificado'),
      COALESCE(NEW.os, 'No especificado'),
      current_user_id, NOW()
    );
  END IF;

  -- Registrar cambio de imagen
  IF OLD.image_url IS DISTINCT FROM NEW.image_url THEN
    INSERT INTO asset_changes (
      asset_id, asset_tag, field_name, change_type,
      old_value, new_value, changed_by, changed_at
    ) VALUES (
      NEW.id, NEW.asset_code, 'image_url', 'UPDATE',
      CASE WHEN OLD.image_url IS NULL THEN 'Sin imagen' ELSE 'Con imagen' END,
      CASE WHEN NEW.image_url IS NULL THEN 'Imagen eliminada' ELSE 'Imagen actualizada' END,
      current_user_id, NOW()
    );
  END IF;

  -- Registrar cambio de especificaciones dinámicas
  IF OLD.dynamic_specs IS DISTINCT FROM NEW.dynamic_specs THEN
    INSERT INTO asset_changes (
      asset_id, asset_tag, field_name, change_type,
      old_value, new_value, changed_by, changed_at
    ) VALUES (
      NEW.id, NEW.asset_code, 'dynamic_specs', 'UPDATE',
      OLD.dynamic_specs::text,
      NEW.dynamic_specs::text,
      current_user_id, NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrear trigger
DROP TRIGGER IF EXISTS track_asset_it_changes_trigger ON assets_it;
CREATE TRIGGER track_asset_it_changes_trigger
  AFTER UPDATE ON assets_it
  FOR EACH ROW
  EXECUTE FUNCTION track_asset_it_changes();

-- ============================================================================
-- Función similar para assets_maintenance
-- ============================================================================

CREATE OR REPLACE FUNCTION track_asset_maintenance_changes()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Intentar obtener el ID del usuario actual de varias formas
  -- 1. Desde auth.uid() (contexto de sesión normal)
  current_user_id := auth.uid();
  
  -- 2. Si no hay auth.uid(), usar updated_by si existe en el NEW record
  IF current_user_id IS NULL AND NEW.updated_by IS NOT NULL THEN
    current_user_id := NEW.updated_by;
  END IF;
  
  -- 3. Si aún es NULL, usar created_by del registro
  IF current_user_id IS NULL THEN
    current_user_id := NEW.created_by;
  END IF;
  
  -- 4. Validar que tenemos un user_id válido
  IF current_user_id IS NULL THEN
    -- Si no hay user_id, salimos sin registrar
    RETURN NEW;
  END IF;

  -- Registrar cambio de ubicación
  IF OLD.location_id IS DISTINCT FROM NEW.location_id THEN
    INSERT INTO asset_changes (
      asset_id, asset_tag, field_name, change_type,
      old_value, new_value, changed_by, changed_at
    ) VALUES (
      NEW.id, NEW.asset_code, 'location_id', 'UPDATE',
      COALESCE(OLD.location_id::text, 'Sin sede'),
      COALESCE(NEW.location_id::text, 'Sin sede'),
      current_user_id, NOW()
    );
  END IF;

  -- Registrar cambio de estado
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO asset_changes (
      asset_id, asset_tag, field_name, change_type,
      old_value, new_value, changed_by, changed_at
    ) VALUES (
      NEW.id, NEW.asset_code, 'status', 'UPDATE',
      OLD.status, NEW.status,
      current_user_id, NOW()
    );
  END IF;

  -- Registrar cambio de asignación
  IF OLD.assigned_to_user_id IS DISTINCT FROM NEW.assigned_to_user_id THEN
    INSERT INTO asset_changes (
      asset_id, asset_tag, field_name, change_type,
      old_value, new_value, changed_by, changed_at
    ) VALUES (
      NEW.id, NEW.asset_code, 'assigned_to', 'UPDATE',
      COALESCE(OLD.assigned_to_user_id::text, 'Sin asignar'),
      COALESCE(NEW.assigned_to_user_id::text, 'Sin asignar'),
      current_user_id, NOW()
    );
  END IF;

  -- Registrar cambio de departamento
  IF OLD.department IS DISTINCT FROM NEW.department THEN
    INSERT INTO asset_changes (
      asset_id, asset_tag, field_name, change_type,
      old_value, new_value, changed_by, changed_at
    ) VALUES (
      NEW.id, NEW.asset_code, 'department', 'UPDATE',
      COALESCE(OLD.department, 'Sin departamento'),
      COALESCE(NEW.department, 'Sin departamento'),
      current_user_id, NOW()
    );
  END IF;

  -- Registrar cambio de imagen
  IF OLD.image_url IS DISTINCT FROM NEW.image_url THEN
    INSERT INTO asset_changes (
      asset_id, asset_tag, field_name, change_type,
      old_value, new_value, changed_by, changed_at
    ) VALUES (
      NEW.id, NEW.asset_code, 'image_url', 'UPDATE',
      CASE WHEN OLD.image_url IS NULL THEN 'Sin imagen' ELSE 'Con imagen' END,
      CASE WHEN NEW.image_url IS NULL THEN 'Imagen eliminada' ELSE 'Imagen actualizada' END,
      current_user_id, NOW()
    );
  END IF;

  -- Registrar cambio de especificaciones dinámicas
  IF OLD.dynamic_specs IS DISTINCT FROM NEW.dynamic_specs THEN
    INSERT INTO asset_changes (
      asset_id, asset_tag, field_name, change_type,
      old_value, new_value, changed_by, changed_at
    ) VALUES (
      NEW.id, NEW.asset_code, 'dynamic_specs', 'UPDATE',
      OLD.dynamic_specs::text,
      NEW.dynamic_specs::text,
      current_user_id, NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrear trigger
DROP TRIGGER IF EXISTS track_asset_maintenance_changes_trigger ON assets_maintenance;
CREATE TRIGGER track_asset_maintenance_changes_trigger
  AFTER UPDATE ON assets_maintenance
  FOR EACH ROW
  EXECUTE FUNCTION track_asset_maintenance_changes();

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
SELECT 'Triggers mejorados creados correctamente' as resultado;
SELECT COUNT(*) as cambios_registrados FROM asset_changes WHERE changed_by IS NOT NULL LIMIT 5;
