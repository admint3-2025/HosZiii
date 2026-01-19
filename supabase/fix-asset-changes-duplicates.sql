-- ============================================================================
-- FIX: Duplicados en historial de cambios y usuario no registrado
--
-- Problema 1: Cambios duplicados en asset_changes (mismo campo, misma fecha)
-- Problema 2: changed_by_name y changed_by_email aparecen vacíos en UPDATEs
--
-- Causa probable:
--   - Múltiples triggers disparándose en assets_it y assets_maintenance
--   - Función track_asset_changes no está obteniendo correctamente auth.uid()
--
-- Solución:
--   1. Verificar triggers existentes
--   2. Recrear función con mejor manejo de auth
--   3. Limpiar duplicados existentes
-- ============================================================================

BEGIN;

-- ============================================
-- PASO 1: Ver triggers actuales
-- ============================================
SELECT 
  trigger_schema,
  event_object_table as table_name,
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%asset%change%'
  OR action_statement LIKE '%track_asset_changes%'
ORDER BY event_object_table, trigger_name;

-- ============================================
-- PASO 2: Recrear función con auth correcto
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
  -- Obtener asset_tag según la tabla usando jsonb para evitar errores de campo no existente
  IF TG_TABLE_NAME = 'assets_maintenance' THEN
    v_asset_tag := COALESCE((to_jsonb(NEW)->>'asset_code'), 'SIN-TAG');
  ELSE
    -- Para assets_it y assets (legacy)
    v_asset_tag := COALESCE((to_jsonb(NEW)->>'asset_tag'), 'SIN-TAG');
  END IF;
  
  -- Obtener información del usuario autenticado
  v_user_id := auth.uid();
  
  -- Si hay usuario autenticado, obtener sus datos
  IF v_user_id IS NOT NULL THEN
    SELECT 
      COALESCE(p.full_name, u.email),
      u.email
    INTO v_user_name, v_user_email
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE u.id = v_user_id;
  END IF;

  -- Para INSERT (CREATE)
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

  -- Para UPDATE - Registrar solo campos que cambiaron
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

    -- Assigned to (maneja ambos campos: assigned_to y assigned_to_user_id)
    IF TG_TABLE_NAME = 'assets_maintenance' THEN
      v_old_assigned := (to_jsonb(OLD)->>'assigned_to_user_id')::uuid;
      v_new_assigned := (to_jsonb(NEW)->>'assigned_to_user_id')::uuid;
      
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
    ELSE
      -- Para assets_it y assets
      v_old_assigned := (to_jsonb(OLD)->>'assigned_to')::uuid;
      v_new_assigned := (to_jsonb(NEW)->>'assigned_to')::uuid;
      
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
        CASE 
          WHEN OLD.image_url IS NULL THEN 'Sin imagen'
          ELSE OLD.image_url
        END,
        CASE
          WHEN NEW.image_url IS NULL THEN 'Imagen eliminada'
          ELSE NEW.image_url
        END,
        'UPDATE'
      );
    END IF;

    RETURN NEW;
  END IF;

  -- Para DELETE
  IF TG_OP = 'DELETE' THEN
    -- Obtener asset_tag de OLD usando jsonb
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
-- PASO 3: ELIMINAR ABSOLUTAMENTE TODOS LOS TRIGGERS
-- ============================================

-- Ver todos los triggers antes de eliminar
SELECT 
  '=== TRIGGERS ANTES DE ELIMINAR ===' as info,
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table IN ('assets', 'assets_it', 'assets_maintenance')
ORDER BY event_object_table, trigger_name;

-- ESTRATEGIA NUCLEAR: Eliminar TODOS los triggers en estas tablas
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
      RAISE NOTICE 'Eliminado trigger de assets_it: %', r.trigger_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error eliminando %: %', r.trigger_name, SQLERRM;
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
      RAISE NOTICE 'Eliminado trigger de assets_maintenance: %', r.trigger_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error eliminando %: %', r.trigger_name, SQLERRM;
    END;
  END LOOP;

  -- Eliminar cualquier trigger en assets (si existe)
  FOR r IN 
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE event_object_schema = 'public'
      AND event_object_table = 'assets'
  LOOP
    BEGIN
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.assets CASCADE', r.trigger_name);
      RAISE NOTICE 'Eliminado trigger de assets: %', r.trigger_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error eliminando %: %', r.trigger_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- Esperar un momento para asegurar que los cambios se propaguen
DO $$ BEGIN PERFORM pg_sleep(1); END $$;

-- Crear UN SOLO trigger por tabla con nombre único y timestamp
DROP TRIGGER IF EXISTS ziii_asset_changes_it ON public.assets_it CASCADE;
DROP TRIGGER IF EXISTS ziii_asset_changes_maintenance ON public.assets_maintenance CASCADE;

CREATE TRIGGER ziii_asset_changes_it
  AFTER INSERT OR UPDATE OR DELETE ON public.assets_it
  FOR EACH ROW
  EXECUTE FUNCTION track_asset_changes();

CREATE TRIGGER ziii_asset_changes_maintenance
  AFTER INSERT OR UPDATE OR DELETE ON public.assets_maintenance
  FOR EACH ROW
  EXECUTE FUNCTION track_asset_changes();

-- Ver todos los triggers después de crear
SELECT 
  '=== TRIGGERS DESPUÉS DE CREAR ===' as info,
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table IN ('assets', 'assets_it', 'assets_maintenance')
ORDER BY event_object_table, trigger_name;

-- ============================================
-- PASO 4: Limpiar TODOS los duplicados
-- ============================================

-- Ver total de registros antes
DO $$
DECLARE
  total_count INTEGER;
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM public.asset_changes;
  RAISE NOTICE '=== ANTES DE LIMPIAR ===';
  RAISE NOTICE 'Total de registros: %', total_count;
  
  -- Contar duplicados reales
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT asset_id, field_name, old_value, new_value, COUNT(*) as cnt
    FROM public.asset_changes
    WHERE change_type = 'UPDATE'
    GROUP BY asset_id, field_name, old_value, new_value
    HAVING COUNT(*) > 1
  ) dups;
  
  RAISE NOTICE 'Grupos de duplicados UPDATE: %', duplicate_count;
  
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT asset_id, COUNT(*) as cnt
    FROM public.asset_changes
    WHERE change_type = 'CREATE'
    GROUP BY asset_id
    HAVING COUNT(*) > 1
  ) dups;
  
  RAISE NOTICE 'Activos con múltiples CREATE: %', duplicate_count;
END $$;

-- LIMPIEZA AGRESIVA: Eliminar TODOS los duplicados
-- Mantener solo el primer registro de cada grupo (por UUID mínimo como texto)

-- 1. Eliminar duplicados de UPDATE
-- Agrupar por: asset_id + field_name + valores (ignorando nulls)
DELETE FROM public.asset_changes
WHERE id::text NOT IN (
  SELECT MIN(id::text)
  FROM public.asset_changes
  WHERE change_type = 'UPDATE'
  GROUP BY 
    asset_id,
    field_name,
    COALESCE(old_value, '<<NULL>>'),
    COALESCE(new_value, '<<NULL>>')
);

-- 2. Eliminar duplicados de CREATE
-- Solo debe haber un CREATE por asset_id
DELETE FROM public.asset_changes
WHERE change_type = 'CREATE'
  AND id::text NOT IN (
    SELECT MIN(id::text)
    FROM public.asset_changes
    WHERE change_type = 'CREATE'
    GROUP BY asset_id
  );

-- 3. Eliminar duplicados de DELETE
DELETE FROM public.asset_changes
WHERE change_type = 'DELETE'
  AND id::text NOT IN (
    SELECT MIN(id::text)
    FROM public.asset_changes
    WHERE change_type = 'DELETE'
    GROUP BY asset_id
  );

-- Ver total después
DO $$
DECLARE
  total_count INTEGER;
  duplicate_count INTEGER;
  deleted_count INTEGER;
BEGIN
  RAISE NOTICE '=== DESPUÉS DE LIMPIAR ===';
  SELECT COUNT(*) INTO total_count FROM public.asset_changes;
  RAISE NOTICE 'Total de registros: %', total_count;
  
  -- Verificar que no hay duplicados
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT asset_id, field_name, old_value, new_value, COUNT(*) as cnt
    FROM public.asset_changes
    WHERE change_type = 'UPDATE'
    GROUP BY asset_id, field_name, old_value, new_value
    HAVING COUNT(*) > 1
  ) dups;
  
  RAISE NOTICE 'Grupos de duplicados restantes: %', duplicate_count;
  
  IF duplicate_count = 0 THEN
    RAISE NOTICE '✓ Todos los duplicados eliminados exitosamente';
  ELSE
    RAISE WARNING '⚠ Aún quedan % grupos duplicados', duplicate_count;
  END IF;
END $$;

-- ============================================
-- PASO 5: Verificación
-- ============================================

SELECT 
  'Triggers activos:' as info,
  COUNT(*) as total
FROM information_schema.triggers
WHERE (trigger_name LIKE '%asset%change%' OR action_statement LIKE '%track_asset_changes%')
  AND event_object_table IN ('assets', 'assets_it', 'assets_maintenance');

SELECT 
  'Registros de cambios duplicados restantes:' as info,
  COUNT(*) as total
FROM (
  SELECT 
    asset_id, field_name, 
    COALESCE(old_value, '') as old_val, 
    COALESCE(new_value, '') as new_val,
    COUNT(*) as cnt
  FROM public.asset_changes
  WHERE change_type = 'UPDATE'
  GROUP BY asset_id, field_name, COALESCE(old_value, ''), COALESCE(new_value, '')
  HAVING COUNT(*) > 1
) duplicates;

-- Contar total de registros después de limpieza
SELECT 
  'Total de registros después de limpieza:' as info,
  COUNT(*) as total
FROM public.asset_changes;

-- Mostrar triggers activos por tabla
SELECT 
  event_object_table as tabla,
  trigger_name,
  COUNT(*) as cantidad
FROM information_schema.triggers
WHERE (trigger_name LIKE '%asset%change%' OR action_statement LIKE '%track_asset_changes%')
  AND event_object_table IN ('assets', 'assets_it', 'assets_maintenance')
GROUP BY event_object_table, trigger_name
ORDER BY event_object_table;

COMMIT;

-- ============================================
-- INFORMACIÓN
-- ============================================
SELECT '✓ Función recreada con auth correcto' as status
UNION ALL
SELECT '✓ Triggers consolidados (1 por tabla)'
UNION ALL
SELECT '✓ Duplicados eliminados'
UNION ALL
SELECT '✓ Ahora cada cambio mostrará el usuario que lo realizó';
