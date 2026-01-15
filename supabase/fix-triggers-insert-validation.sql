-- ============================================================================
-- FIX FINAL: Los triggers de auditoría deben ejecutarse SOLO en UPDATE, no en INSERT
-- ============================================================================

-- PROBLEMA IDENTIFICADO:
-- Los triggers track_asset_changes, log_asset_assignment_change y validate_asset_location_change
-- están configurados para AFTER INSERT OR UPDATE, pero algunos tienen validaciones
-- que solo funcionan en UPDATE (cuando existe OLD)

-- ============================================================================
-- 1. Arreglar track_asset_changes - debe manejar INSERT sin comparar OLD
-- ============================================================================

CREATE OR REPLACE FUNCTION track_asset_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_name text;
  v_user_email text;
BEGIN
  -- Obtener información del usuario
  SELECT 
    COALESCE(p.full_name, u.email),
    u.email
  INTO v_user_name, v_user_email
  FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  WHERE u.id = auth.uid();

  -- Para INSERT (CREATE) - solo registrar creación
  IF TG_OP = 'INSERT' THEN
    INSERT INTO asset_changes (
      asset_id, asset_tag, changed_by, changed_by_name, changed_by_email,
      field_name, old_value, new_value, change_type
    ) VALUES (
      NEW.id, NEW.asset_tag, auth.uid(), v_user_name, v_user_email,
      'created', NULL, 'Activo creado', 'CREATE'
    );
    RETURN NEW;
  END IF;

  -- Para UPDATE - Registrar cada campo modificado
  IF TG_OP = 'UPDATE' THEN
    -- Status
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO asset_changes (
        asset_id, asset_tag, changed_by, changed_by_name, changed_by_email,
        field_name, old_value, new_value, change_type
      ) VALUES (
        NEW.id, NEW.asset_tag, auth.uid(), v_user_name, v_user_email,
        'status', OLD.status, NEW.status, 'UPDATE'
      );
    END IF;

    -- Ubicación/Sede
    IF OLD.location_id IS DISTINCT FROM NEW.location_id THEN
      INSERT INTO asset_changes (
        asset_id, asset_tag, changed_by, changed_by_name, changed_by_email,
        field_name, old_value, new_value, change_type
      ) VALUES (
        NEW.id, NEW.asset_tag, auth.uid(), v_user_name, v_user_email,
        'location_id',
        (SELECT code FROM locations WHERE id = OLD.location_id),
        (SELECT code FROM locations WHERE id = NEW.location_id),
        'UPDATE'
      );
    END IF;

    -- Responsable
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      INSERT INTO asset_changes (
        asset_id, asset_tag, changed_by, changed_by_name, changed_by_email,
        field_name, old_value, new_value, change_type
      ) VALUES (
        NEW.id, NEW.asset_tag, auth.uid(), v_user_name, v_user_email,
        'assigned_to',
        (SELECT full_name FROM profiles WHERE id = OLD.assigned_to),
        (SELECT full_name FROM profiles WHERE id = NEW.assigned_to),
        'UPDATE'
      );
    END IF;

    -- Marca
    IF OLD.brand IS DISTINCT FROM NEW.brand THEN
      INSERT INTO asset_changes (
        asset_id, asset_tag, changed_by, changed_by_name, changed_by_email,
        field_name, old_value, new_value, change_type
      ) VALUES (
        NEW.id, NEW.asset_tag, auth.uid(), v_user_name, v_user_email,
        'brand', OLD.brand, NEW.brand, 'UPDATE'
      );
    END IF;

    -- Modelo
    IF OLD.model IS DISTINCT FROM NEW.model THEN
      INSERT INTO asset_changes (
        asset_id, asset_tag, changed_by, changed_by_name, changed_by_email,
        field_name, old_value, new_value, change_type
      ) VALUES (
        NEW.id, NEW.asset_tag, auth.uid(), v_user_name, v_user_email,
        'model', OLD.model, NEW.model, 'UPDATE'
      );
    END IF;

    -- Número de serie
    IF OLD.serial_number IS DISTINCT FROM NEW.serial_number THEN
      INSERT INTO asset_changes (
        asset_id, asset_tag, changed_by, changed_by_name, changed_by_email,
        field_name, old_value, new_value, change_type
      ) VALUES (
        NEW.id, NEW.asset_tag, auth.uid(), v_user_name, v_user_email,
        'serial_number', OLD.serial_number, NEW.serial_number, 'UPDATE'
      );
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. Arreglar validate_asset_location_change - debe validar SOLO en UPDATE
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_asset_location_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reason text;
  v_from_location_name text;
  v_to_location_name text;
  v_user_name text;
  v_user_email text;
BEGIN
  -- EN INSERT: no validar (no hay OLD), permitir
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- EN UPDATE: solo validar si la ubicación cambió
  IF OLD.location_id IS NOT DISTINCT FROM NEW.location_id THEN
    RETURN NEW;
  END IF;
  
  -- Obtener la razón del cambio desde el contexto
  v_reason := current_setting('app.location_change_reason', true);
  
  -- VALIDACION ESTRICTA: Sin razón no se permite el cambio
  IF v_reason IS NULL OR char_length(trim(v_reason)) < 10 THEN
    RAISE EXCEPTION 'LOCATION_CHANGE_REQUIRES_REASON: El cambio de sede requiere una justificación de al menos 10 caracteres';
  END IF;
  
  -- Obtener nombres para el registro
  SELECT name INTO v_from_location_name
  FROM locations
  WHERE id = OLD.location_id;
  
  SELECT name INTO v_to_location_name
  FROM locations
  WHERE id = NEW.location_id;
  
  -- Obtener datos del usuario
  SELECT 
    COALESCE(profiles.full_name, auth.users.email),
    auth.users.email
  INTO v_user_name, v_user_email
  FROM auth.users
  LEFT JOIN profiles ON profiles.id = auth.users.id
  WHERE auth.users.id = auth.uid();
  
  -- Registrar el cambio en auditoría
  INSERT INTO asset_location_changes (
    asset_id,
    asset_tag,
    from_location_id,
    from_location_name,
    to_location_id,
    to_location_name,
    reason,
    changed_by,
    changed_by_name,
    changed_by_email
  ) VALUES (
    NEW.id,
    NEW.asset_tag,
    OLD.location_id,
    v_from_location_name,
    NEW.location_id,
    v_to_location_name,
    v_reason,
    auth.uid(),
    v_user_name,
    v_user_email
  );
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 3. RE-HABILITAR todos los triggers
-- ============================================================================

ALTER TABLE assets ENABLE TRIGGER ALL;

-- ============================================================================
-- FIN DEL FIX - Ahora intenta crear un activo
-- ============================================================================
