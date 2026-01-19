-- ============================================================================
-- RESET TOTAL: Eliminar TODO y empezar de cero
-- ============================================================================

BEGIN;

-- ============================================
-- 1. ELIMINAR TODOS LOS REGISTROS DE CAMBIOS
-- ============================================
TRUNCATE TABLE public.asset_changes;

-- ============================================
-- 2. ELIMINAR TODOS LOS TRIGGERS
-- ============================================
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Eliminar cualquier trigger en assets_it
  FOR r IN 
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE event_object_schema = 'public'
      AND event_object_table = 'assets_it'
  LOOP
    BEGIN
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.assets_it CASCADE', r.trigger_name);
      RAISE NOTICE 'Eliminado: %', r.trigger_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error: %', SQLERRM;
    END;
  END LOOP;

  -- Eliminar cualquier trigger en assets_maintenance
  FOR r IN 
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE event_object_schema = 'public'
      AND event_object_table = 'assets_maintenance'
  LOOP
    BEGIN
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.assets_maintenance CASCADE', r.trigger_name);
      RAISE NOTICE 'Eliminado: %', r.trigger_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error: %', SQLERRM;
    END;
  END LOOP;

  -- Eliminar cualquier trigger en assets
  FOR r IN 
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE event_object_schema = 'public'
      AND event_object_table = 'assets'
  LOOP
    BEGIN
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.assets CASCADE', r.trigger_name);
      RAISE NOTICE 'Eliminado: %', r.trigger_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error: %', SQLERRM;
    END;
  END LOOP;
END $$;

-- ============================================
-- 3. RECREAR FUNCIÓN LIMPIA
-- ============================================
CREATE OR REPLACE FUNCTION track_asset_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_name text;
  v_user_email text;
  v_asset_tag text;
  v_old_assigned uuid;
  v_new_assigned uuid;
BEGIN
  -- Obtener asset_tag
  IF TG_TABLE_NAME = 'assets_maintenance' THEN
    v_asset_tag := COALESCE((to_jsonb(NEW)->>'asset_code'), 'SIN-TAG');
  ELSE
    v_asset_tag := COALESCE((to_jsonb(NEW)->>'asset_tag'), 'SIN-TAG');
  END IF;
  
  -- Obtener usuario
  v_user_id := auth.uid();
  
  IF v_user_id IS NOT NULL THEN
    SELECT 
      COALESCE(p.full_name, u.email),
      u.email
    INTO v_user_name, v_user_email
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE u.id = v_user_id;
  END IF;

  -- INSERT
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.asset_changes (
      asset_id, asset_tag, changed_by, changed_by_name, changed_by_email,
      field_name, old_value, new_value, change_type
    ) VALUES (
      NEW.id, v_asset_tag, v_user_id, v_user_name, v_user_email,
      'created', NULL, 'Activo creado', 'CREATE'
    );
    RETURN NEW;
  END IF;

  -- UPDATE
  IF TG_OP = 'UPDATE' THEN
    -- Status
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.asset_changes (
        asset_id, asset_tag, changed_by, changed_by_name, changed_by_email,
        field_name, old_value, new_value, change_type
      ) VALUES (
        NEW.id, v_asset_tag, v_user_id, v_user_name, v_user_email,
        'status', OLD.status, NEW.status, 'UPDATE'
      );
    END IF;

    -- Location
    IF OLD.location_id IS DISTINCT FROM NEW.location_id THEN
      INSERT INTO public.asset_changes (
        asset_id, asset_tag, changed_by, changed_by_name, changed_by_email,
        field_name, old_value, new_value, change_type
      ) VALUES (
        NEW.id, v_asset_tag, v_user_id, v_user_name, v_user_email,
        'location_id', 
        COALESCE(OLD.location_id::text, 'EMPTY'), 
        COALESCE(NEW.location_id::text, 'EMPTY'), 
        'UPDATE'
      );
    END IF;

    -- Assigned to
    IF TG_TABLE_NAME = 'assets_maintenance' THEN
      v_old_assigned := (to_jsonb(OLD)->>'assigned_to_user_id')::uuid;
      v_new_assigned := (to_jsonb(NEW)->>'assigned_to_user_id')::uuid;
    ELSE
      v_old_assigned := (to_jsonb(OLD)->>'assigned_to')::uuid;
      v_new_assigned := (to_jsonb(NEW)->>'assigned_to')::uuid;
    END IF;
    
    IF v_old_assigned IS DISTINCT FROM v_new_assigned THEN
      INSERT INTO public.asset_changes (
        asset_id, asset_tag, changed_by, changed_by_name, changed_by_email,
        field_name, old_value, new_value, change_type
      ) VALUES (
        NEW.id, v_asset_tag, v_user_id, v_user_name, v_user_email,
        'assigned_to',
        COALESCE(v_old_assigned::text, 'EMPTY'),
        COALESCE(v_new_assigned::text, 'EMPTY'),
        'UPDATE'
      );
    END IF;

    -- Brand
    IF OLD.brand IS DISTINCT FROM NEW.brand THEN
      INSERT INTO public.asset_changes (
        asset_id, asset_tag, changed_by, changed_by_name, changed_by_email,
        field_name, old_value, new_value, change_type
      ) VALUES (
        NEW.id, v_asset_tag, v_user_id, v_user_name, v_user_email,
        'brand', OLD.brand, NEW.brand, 'UPDATE'
      );
    END IF;

    -- Model
    IF OLD.model IS DISTINCT FROM NEW.model THEN
      INSERT INTO public.asset_changes (
        asset_id, asset_tag, changed_by, changed_by_name, changed_by_email,
        field_name, old_value, new_value, change_type
      ) VALUES (
        NEW.id, v_asset_tag, v_user_id, v_user_name, v_user_email,
        'model', OLD.model, NEW.model, 'UPDATE'
      );
    END IF;

    -- Serial Number
    IF OLD.serial_number IS DISTINCT FROM NEW.serial_number THEN
      INSERT INTO public.asset_changes (
        asset_id, asset_tag, changed_by, changed_by_name, changed_by_email,
        field_name, old_value, new_value, change_type
      ) VALUES (
        NEW.id, v_asset_tag, v_user_id, v_user_name, v_user_email,
        'serial_number', OLD.serial_number, NEW.serial_number, 'UPDATE'
      );
    END IF;

    -- Image URL
    IF OLD.image_url IS DISTINCT FROM NEW.image_url THEN
      INSERT INTO public.asset_changes (
        asset_id, asset_tag, changed_by, changed_by_name, changed_by_email,
        field_name, old_value, new_value, change_type
      ) VALUES (
        NEW.id, v_asset_tag, v_user_id, v_user_name, v_user_email,
        'image_url',
        CASE WHEN OLD.image_url IS NULL THEN 'Sin imagen' ELSE OLD.image_url END,
        CASE WHEN NEW.image_url IS NULL THEN 'Imagen eliminada' ELSE NEW.image_url END,
        'UPDATE'
      );
    END IF;

    RETURN NEW;
  END IF;

  -- DELETE
  IF TG_OP = 'DELETE' THEN
    IF TG_TABLE_NAME = 'assets_maintenance' THEN
      v_asset_tag := COALESCE((to_jsonb(OLD)->>'asset_code'), 'SIN-TAG');
    ELSE
      v_asset_tag := COALESCE((to_jsonb(OLD)->>'asset_tag'), 'SIN-TAG');
    END IF;
    
    INSERT INTO public.asset_changes (
      asset_id, asset_tag, changed_by, changed_by_name, changed_by_email,
      field_name, old_value, new_value, change_type
    ) VALUES (
      OLD.id, v_asset_tag, v_user_id, v_user_name, v_user_email,
      'deleted', NULL, 'Activo eliminado', 'DELETE'
    );
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================
-- 4. CREAR SOLO 2 TRIGGERS (UNO POR TABLA)
-- ============================================
CREATE TRIGGER ziii_asset_changes_it
  AFTER INSERT OR UPDATE OR DELETE ON public.assets_it
  FOR EACH ROW
  EXECUTE FUNCTION track_asset_changes();

CREATE TRIGGER ziii_asset_changes_maintenance
  AFTER INSERT OR UPDATE OR DELETE ON public.assets_maintenance
  FOR EACH ROW
  EXECUTE FUNCTION track_asset_changes();

-- ============================================
-- 5. VERIFICACIÓN
-- ============================================
SELECT 
  'Registros en asset_changes:' as info,
  COUNT(*) as total
FROM public.asset_changes;

SELECT 
  'Triggers activos:' as info,
  event_object_table as tabla,
  trigger_name
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table IN ('assets', 'assets_it', 'assets_maintenance')
ORDER BY event_object_table;

COMMIT;

-- ============================================
SELECT '✅ RESET COMPLETO' as status
UNION ALL
SELECT '✅ Todos los registros eliminados'
UNION ALL
SELECT '✅ Todos los triggers eliminados'
UNION ALL
SELECT '✅ Solo 2 triggers nuevos creados'
UNION ALL
SELECT '✅ Historial empieza desde CERO';
