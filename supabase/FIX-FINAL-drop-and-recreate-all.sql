-- ============================================================================
-- FIX DEFINITIVO: DROP y recrear todas las funciones desde cero
-- ============================================================================

-- 1. ELIMINAR todas las funciones y triggers problemáticos
DROP TRIGGER IF EXISTS trg_assets_set_location ON assets;
DROP FUNCTION IF EXISTS set_asset_location() CASCADE;

DROP TRIGGER IF EXISTS trg_log_asset_assignment_change ON assets;
DROP FUNCTION IF EXISTS log_asset_assignment_change() CASCADE;

DROP TRIGGER IF EXISTS trg_validate_asset_location_change ON assets;
DROP FUNCTION IF EXISTS validate_asset_location_change() CASCADE;

DROP TRIGGER IF EXISTS asset_changes_trigger ON assets;
DROP FUNCTION IF EXISTS track_asset_changes() CASCADE;

SELECT '✓ Funciones y triggers eliminados' as status;

-- ============================================================================
-- 2. RECREAR set_asset_location con NEW en MAYÚSCULAS
-- ============================================================================

CREATE FUNCTION set_asset_location()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_location_id uuid;
BEGIN
  IF NEW.location_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
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

CREATE TRIGGER trg_assets_set_location
BEFORE INSERT ON assets
FOR EACH ROW
EXECUTE FUNCTION set_asset_location();

SELECT '✓ set_asset_location recreado' as status;

-- ============================================================================
-- 3. RECREAR log_asset_assignment_change
-- ============================================================================

CREATE FUNCTION log_asset_assignment_change()
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
  IF OLD.assigned_to IS NOT DISTINCT FROM NEW.assigned_to THEN
    RETURN NEW;
  END IF;
  
  SELECT 
    COALESCE(p.full_name, u.email),
    u.email
  INTO v_user_name, v_user_email
  FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  WHERE u.id = auth.uid();
  
  IF NEW.assigned_to IS NOT NULL THEN
    SELECT 
      COALESCE(p.full_name, u.email),
      u.email
    INTO v_assigned_to_name, v_assigned_to_email
    FROM auth.users u
    LEFT JOIN profiles p ON p.id = u.id
    WHERE u.id = NEW.assigned_to;
  END IF;
  
  INSERT INTO asset_assignment_changes (
    asset_id, asset_tag, assigned_to,
    assigned_to_name, assigned_to_email,
    changed_by, changed_by_name, changed_by_email
  ) VALUES (
    NEW.id, NEW.asset_tag, NEW.assigned_to,
    v_assigned_to_name, v_assigned_to_email,
    auth.uid(), v_user_name, v_user_email
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_asset_assignment_change
BEFORE UPDATE OF assigned_to ON assets
FOR EACH ROW
EXECUTE FUNCTION log_asset_assignment_change();

SELECT '✓ log_asset_assignment_change recreado' as status;

-- ============================================================================
-- 4. RECREAR validate_asset_location_change
-- ============================================================================

CREATE FUNCTION validate_asset_location_change()
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
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  IF OLD.location_id IS NOT DISTINCT FROM NEW.location_id THEN
    RETURN NEW;
  END IF;
  
  v_reason := current_setting('app.location_change_reason', true);
  
  IF v_reason IS NULL OR char_length(trim(v_reason)) < 10 THEN
    RAISE EXCEPTION 'LOCATION_CHANGE_REQUIRES_REASON';
  END IF;
  
  SELECT name INTO v_from_location_name FROM locations WHERE id = OLD.location_id;
  SELECT name INTO v_to_location_name FROM locations WHERE id = NEW.location_id;
  
  SELECT 
    COALESCE(profiles.full_name, auth.users.email),
    auth.users.email
  INTO v_user_name, v_user_email
  FROM auth.users
  LEFT JOIN profiles ON profiles.id = auth.users.id
  WHERE auth.users.id = auth.uid();
  
  INSERT INTO asset_location_changes (
    asset_id, asset_tag,
    from_location_id, from_location_name,
    to_location_id, to_location_name,
    reason, changed_by, changed_by_name, changed_by_email
  ) VALUES (
    NEW.id, NEW.asset_tag,
    OLD.location_id, v_from_location_name,
    NEW.location_id, v_to_location_name,
    v_reason, auth.uid(), v_user_name, v_user_email
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_asset_location_change
BEFORE UPDATE OF location_id ON assets
FOR EACH ROW
EXECUTE FUNCTION validate_asset_location_change();

SELECT '✓ validate_asset_location_change recreado' as status;

-- ============================================================================
-- 5. RECREAR track_asset_changes
-- ============================================================================

CREATE FUNCTION track_asset_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_name text;
  v_user_email text;
BEGIN
  SELECT 
    COALESCE(p.full_name, u.email), u.email
  INTO v_user_name, v_user_email
  FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  WHERE u.id = auth.uid();

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

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO asset_changes (asset_id, asset_tag, changed_by, changed_by_name, changed_by_email, field_name, old_value, new_value, change_type)
      VALUES (NEW.id, NEW.asset_tag, auth.uid(), v_user_name, v_user_email, 'status', OLD.status, NEW.status, 'UPDATE');
    END IF;

    IF OLD.location_id IS DISTINCT FROM NEW.location_id THEN
      INSERT INTO asset_changes (asset_id, asset_tag, changed_by, changed_by_name, changed_by_email, field_name, old_value, new_value, change_type)
      VALUES (NEW.id, NEW.asset_tag, auth.uid(), v_user_name, v_user_email, 'location_id',
        (SELECT code FROM locations WHERE id = OLD.location_id),
        (SELECT code FROM locations WHERE id = NEW.location_id), 'UPDATE');
    END IF;

    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      INSERT INTO asset_changes (asset_id, asset_tag, changed_by, changed_by_name, changed_by_email, field_name, old_value, new_value, change_type)
      VALUES (NEW.id, NEW.asset_tag, auth.uid(), v_user_name, v_user_email, 'assigned_to',
        (SELECT full_name FROM profiles WHERE id = OLD.assigned_to),
        (SELECT full_name FROM profiles WHERE id = NEW.assigned_to), 'UPDATE');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER asset_changes_trigger
AFTER INSERT OR UPDATE ON assets
FOR EACH ROW
EXECUTE FUNCTION track_asset_changes();

SELECT '✓ track_asset_changes recreado' as status;

-- ============================================================================
-- 6. HABILITAR TODOS LOS TRIGGERS (incluidos los que no tocamos)
-- ============================================================================

ALTER TABLE assets ENABLE TRIGGER ALL;

SELECT '
============================================================================
✓ TODAS LAS FUNCIONES RECREADAS DESDE CERO CON NEW EN MAYÚSCULAS
✓ TODOS LOS TRIGGERS HABILITADOS
============================================================================
Prueba crear un activo AHORA
' as final_status;
