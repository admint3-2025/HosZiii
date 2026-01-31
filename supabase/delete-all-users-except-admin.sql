-- =====================================================
-- SCRIPT SEGURO: Borrar todos los usuarios excepto admin
-- Email del admin que se preserva: ziiihelpdesk@gmail.com
-- =====================================================

-- PASO 1: Verificar que el usuario admin existe
DO $$
DECLARE
  v_admin_id UUID;
  v_admin_email TEXT;
BEGIN
  SELECT id, email INTO v_admin_id, v_admin_email
  FROM auth.users
  WHERE email = 'ziiihelpdesk@gmail.com'
  LIMIT 1;
  
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'ERROR: No se encontró el usuario admin ziiihelpdesk@gmail.com. Operación cancelada.';
  END IF;
  
  RAISE NOTICE '✓ Admin encontrado: % (ID: %)', v_admin_email, v_admin_id;
END $$;

-- PASO 2: Contar usuarios que serán eliminados
DO $$
DECLARE
  v_admin_id UUID;
  v_count_to_delete INTEGER;
  v_count_total INTEGER;
BEGIN
  SELECT id INTO v_admin_id
  FROM auth.users
  WHERE email = 'ziiihelpdesk@gmail.com'
  LIMIT 1;
  
  SELECT COUNT(*) INTO v_count_total FROM auth.users;
  SELECT COUNT(*) INTO v_count_to_delete FROM auth.users WHERE id != v_admin_id;
  
  RAISE NOTICE '📊 Estadísticas:';
  RAISE NOTICE '  - Total de usuarios: %', v_count_total;
  RAISE NOTICE '  - Usuarios a eliminar: %', v_count_to_delete;
  RAISE NOTICE '  - Usuarios a preservar: 1 (admin)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Esta operación es IRREVERSIBLE. Los datos eliminados no pueden recuperarse.';
END $$;

-- PASO 3: Limpiar datos en cascada (sin tocar al admin)
DO $$
DECLARE
  v_admin_id UUID;
  v_table_exists BOOLEAN;
BEGIN
  SELECT id INTO v_admin_id
  FROM auth.users
  WHERE email = 'ziiihelpdesk@gmail.com'
  LIMIT 1;

  RAISE NOTICE '🔄 Eliminando datos en cascada...';

  -- 1. Eliminar inspecciones RRHH del usuario
  SELECT EXISTS(
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'inspections_rrhh'
  ) INTO v_table_exists;
  
  IF v_table_exists THEN
    DELETE FROM inspections_rrhh
    WHERE inspector_user_id != v_admin_id;
    RAISE NOTICE '  ✓ Inspecciones RRHH eliminadas';
  ELSE
    RAISE NOTICE '  ⊘ Tabla inspections_rrhh no existe (saltando)';
  END IF;

  -- 2. Eliminar inspecciones GSH del usuario
  SELECT EXISTS(
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'inspections_gsh'
  ) INTO v_table_exists;
  
  IF v_table_exists THEN
    DELETE FROM inspections_gsh
    WHERE inspector_user_id != v_admin_id;
    RAISE NOTICE '  ✓ Inspecciones GSH eliminadas';
  ELSE
    RAISE NOTICE '  ⊘ Tabla inspections_gsh no existe (saltando)';
  END IF;

  -- 3. Eliminar inspecciones de otros módulos (si existen)
  SELECT EXISTS(
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'inspections_ama'
  ) INTO v_table_exists;
  IF v_table_exists THEN
    EXECUTE 'DELETE FROM inspections_ama WHERE inspector_user_id != $1' USING v_admin_id;
    RAISE NOTICE '  ✓ Inspecciones AMA eliminadas';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'inspections_cocina'
  ) INTO v_table_exists;
  IF v_table_exists THEN
    EXECUTE 'DELETE FROM inspections_cocina WHERE inspector_user_id != $1' USING v_admin_id;
    RAISE NOTICE '  ✓ Inspecciones Cocina eliminadas';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'inspections_housekeeping'
  ) INTO v_table_exists;
  IF v_table_exists THEN
    EXECUTE 'DELETE FROM inspections_housekeeping WHERE inspector_user_id != $1' USING v_admin_id;
    RAISE NOTICE '  ✓ Inspecciones Housekeeping eliminadas';
  END IF;

  -- 4. Eliminar tickets del usuario
  DELETE FROM tickets
  WHERE requester_id != v_admin_id;
  RAISE NOTICE '  ✓ Tickets eliminados';

  -- 5. LIMPIAR TODA LA AUDITORÍA (empezar de cero)
  DELETE FROM asset_location_changes;
  RAISE NOTICE '  ✓ Asset location changes TODOS eliminados (reinicio)';

  DELETE FROM asset_assignment_changes;
  RAISE NOTICE '  ✓ Asset assignment changes TODOS eliminados (reinicio)';

  -- Verificar y limpiar todas las tablas de auditoría
  SELECT EXISTS(
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'audit_log'
  ) INTO v_table_exists;
  IF v_table_exists THEN
    DELETE FROM audit_log;
    RAISE NOTICE '  ✓ Audit log TODOS eliminados (reinicio)';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'asset_history'
  ) INTO v_table_exists;
  IF v_table_exists THEN
    DELETE FROM asset_history;
    RAISE NOTICE '  ✓ Asset history TODOS eliminados (reinicio)';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'asset_changes'
  ) INTO v_table_exists;
  IF v_table_exists THEN
    DELETE FROM asset_changes;
    RAISE NOTICE '  ✓ Asset changes TODOS eliminados (reinicio)';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'asset_audit'
  ) INTO v_table_exists;
  IF v_table_exists THEN
    DELETE FROM asset_audit;
    RAISE NOTICE '  ✓ Asset audit TODOS eliminados (reinicio)';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'asset_logs'
  ) INTO v_table_exists;
  IF v_table_exists THEN
    DELETE FROM asset_logs;
    RAISE NOTICE '  ✓ Asset logs TODOS eliminados (reinicio)';
  END IF;

  -- Limpiar logs de eliminación de inspecciones
  SELECT EXISTS(
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'inspections_rrhh_deletion_log'
  ) INTO v_table_exists;
  IF v_table_exists THEN
    DELETE FROM inspections_rrhh_deletion_log;
    RAISE NOTICE '  ✓ Inspections RRHH deletion log TODOS eliminados (reinicio)';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'inspections_gsh_deletion_log'
  ) INTO v_table_exists;
  IF v_table_exists THEN
    DELETE FROM inspections_gsh_deletion_log;
    RAISE NOTICE '  ✓ Inspections GSH deletion log TODOS eliminados (reinicio)';
  END IF;

  -- 6. LIMPIAR HISTORIAL DE SESIONES (empezar de cero)
  SELECT EXISTS(
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'session_log'
  ) INTO v_table_exists;
  IF v_table_exists THEN
    DELETE FROM session_log;
    RAISE NOTICE '  ✓ Session log TODOS eliminados (reinicio)';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'login_history'
  ) INTO v_table_exists;
  IF v_table_exists THEN
    DELETE FROM login_history;
    RAISE NOTICE '  ✓ Login history TODOS eliminados (reinicio)';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'user_sessions'
  ) INTO v_table_exists;
  IF v_table_exists THEN
    DELETE FROM user_sessions;
    RAISE NOTICE '  ✓ User sessions TODOS eliminados (reinicio)';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'activity_log'
  ) INTO v_table_exists;
  IF v_table_exists THEN
    DELETE FROM activity_log;
    RAISE NOTICE '  ✓ Activity log TODOS eliminados (reinicio)';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'event_log'
  ) INTO v_table_exists;
  IF v_table_exists THEN
    DELETE FROM event_log;
    RAISE NOTICE '  ✓ Event log TODOS eliminados (reinicio)';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'user_activity'
  ) INTO v_table_exists;
  IF v_table_exists THEN
    DELETE FROM user_activity;
    RAISE NOTICE '  ✓ User activity TODOS eliminados (reinicio)';
  END IF;

  -- 7. Eliminar maintenance_orders (órdenes de mantenimiento)
  DELETE FROM maintenance_orders
  WHERE requester_id != v_admin_id;
  RAISE NOTICE '  ✓ Maintenance orders eliminados';

  -- 7. Eliminar maintenance_orders (órdenes de mantenimiento)
  DELETE FROM maintenance_orders
  WHERE requester_id != v_admin_id;
  RAISE NOTICE '  ✓ Maintenance orders eliminados';

  -- 8. Eliminar user_locations
  DELETE FROM user_locations
  WHERE user_id != v_admin_id;
  RAISE NOTICE '  ✓ User locations eliminados';

  -- 9. Actualizar profiles del admin (por si acaso)
  UPDATE profiles
  SET role = 'admin'
  WHERE id = v_admin_id;
  RAISE NOTICE '  ✓ Profile del admin actualizado';

  -- 10. Eliminar perfiles de otros usuarios
  DELETE FROM profiles
  WHERE id != v_admin_id;
  RAISE NOTICE '  ✓ Perfiles eliminados';

  -- 11. ELIMINAR USUARIOS DE AUTH (excepto admin)
  DELETE FROM auth.users
  WHERE id != v_admin_id;
  RAISE NOTICE '  ✓ Usuarios eliminados de auth.users';

  RAISE NOTICE '';
  RAISE NOTICE '✅ Limpieza completada';
END $$;

-- PASO 4: Verificar resultado
DO $$
DECLARE
  v_count_users INTEGER;
  v_count_profiles INTEGER;
  v_admin_exists BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO v_count_users FROM auth.users;
  SELECT COUNT(*) INTO v_count_profiles FROM profiles;
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'ziiihelpdesk@gmail.com') INTO v_admin_exists;

  RAISE NOTICE '📋 VERIFICACIÓN FINAL:';
  RAISE NOTICE '  - Total de usuarios en auth.users: %', v_count_users;
  RAISE NOTICE '  - Total de perfiles: %', v_count_profiles;
  RAISE NOTICE '  - Admin ziiihelpdesk@gmail.com existe: %', CASE WHEN v_admin_exists THEN 'SÍ' ELSE 'NO' END;

  IF v_count_users = 1 AND v_admin_exists THEN
    RAISE NOTICE '';
    RAISE NOTICE '✅ ✅ ✅ OPERACIÓN EXITOSA ✅ ✅ ✅';
    RAISE NOTICE 'Solo queda el usuario admin en la base de datos.';
  ELSE
    RAISE WARNING '';
    RAISE WARNING '⚠️ VERIFICACIÓN FALLIDA';
    RAISE WARNING 'Se esperaba 1 usuario pero hay %', v_count_users;
  END IF;
END $$;

-- PASO 5: Resumen de logs
SELECT 
  'Eliminar todos excepto admin' as acción,
  NOW() as timestamp,
  'Script seguro con verificaciones' as tipo;
