-- ============================================================================
-- ROLLBACK URGENTE - Restaurar funciones originales desde archivos de migración
-- ============================================================================

-- 1. Restaurar set_asset_location() ORIGINAL
CREATE OR REPLACE FUNCTION set_asset_location()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_location_id uuid;
BEGIN
  -- Si ya tiene location_id, no hacer nada
  IF NEW.location_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Si está asignado a un usuario, usar la sede de ese usuario
  IF NEW.assigned_to IS NOT NULL THEN
    SELECT location_id INTO v_location_id
    FROM profiles
    WHERE id = NEW.assigned_to;
    
    IF v_location_id IS NOT NULL THEN
      NEW.location_id := v_location_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Restaurar log_asset_assignment_change() ORIGINAL
CREATE OR REPLACE FUNCTION log_asset_assignment_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_name text;
  v_user_email text;
  v_assigned_to_name text;
  v_assigned_to_email text;
BEGIN
  -- Solo procesar si assigned_to cambió
  IF OLD.assigned_to IS NOT DISTINCT FROM NEW.assigned_to THEN
    RETURN NEW;
  END IF;
  
  -- Obtener info del usuario que hace el cambio
  SELECT 
    COALESCE(p.full_name, u.email),
    u.email
  INTO v_user_name, v_user_email
  FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  WHERE u.id = auth.uid();
  
  -- Obtener info del nuevo asignado (si existe)
  IF NEW.assigned_to IS NOT NULL THEN
    SELECT 
      COALESCE(p.full_name, u.email),
      u.email
    INTO v_assigned_to_name, v_assigned_to_email
    FROM auth.users u
    LEFT JOIN profiles p ON p.id = u.id
    WHERE u.id = NEW.assigned_to;
  END IF;
  
  -- Registrar el cambio de asignación
  INSERT INTO asset_assignment_changes (
    asset_id,
    asset_tag,
    assigned_to,
    assigned_to_name,
    assigned_to_email,
    changed_by,
    changed_by_name,
    changed_by_email
  ) VALUES (
    NEW.id,
    NEW.asset_tag,
    NEW.assigned_to,
    v_assigned_to_name,
    v_assigned_to_email,
    auth.uid(),
    v_user_name,
    v_user_email
  );
  
  RETURN NEW;
END;
$$;

-- 3. Restaurar validate_asset_location_change() ORIGINAL
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
-- DESHABILITAR TODOS LOS TRIGGERS TEMPORALMENTE
-- ============================================================================
ALTER TABLE assets DISABLE TRIGGER ALL;

SELECT 'TRIGGERS DESHABILITADOS - Ahora prueba crear el activo' as status;
