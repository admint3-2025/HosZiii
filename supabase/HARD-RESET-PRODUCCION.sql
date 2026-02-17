-- ============================================================================
-- ⚠️  HARD RESET DE PRODUCCIÓN - SISTEMA ZIII HoS
-- ============================================================================
-- Fecha: 2026-02-17
-- 
-- CONSERVA:
--   ✅ Usuario admin actual (role = 'admin')
--   ✅ Ubicaciones / sedes (locations)
--   ✅ Catálogos de sistema (categories, asset_types, asset_type_categories,
--      brands, departments, job_positions, asset_operating_systems, asset_processors)
--   ✅ Estructura completa de BD (tablas, RLS, triggers, funciones)
--   ✅ Políticas (policies, policy_categories)
--   ✅ Knowledge base (knowledge_base_articles, knowledge_base_usage)
--
-- ELIMINA:
--   ❌ Todos los usuarios NO admin (profiles + auth.users)
--   ❌ Tickets IT + comentarios + adjuntos + historial de estado
--   ❌ Tickets Mantenimiento + comentarios + adjuntos
--   ❌ Activos IT + Mantenimiento + cambios + solicitudes de baja
--   ❌ Inspecciones GSH + RRHH (todas las tablas relacionadas)
--   ❌ Habitaciones HK (hk_rooms, hk_staff, hk_inventory, etc.)
--   ❌ Academia (cursos, módulos, progreso, quizzes, etc.)
--   ❌ Notificaciones
--   ❌ Auditoría (audit_log, login_audits)
--   ❌ Telegram links
--   ❌ Archivos en storage (todos los buckets)
--   ❌ user_locations (asignaciones multi-sede de usuarios eliminados)
--   ❌ Policy acknowledgments (aceptaciones de políticas)
--
-- ⚠️  EJECUTAR SOLO EN SUPABASE SQL EDITOR COMO SUPERUSUARIO
-- ⚠️  HACER BACKUP ANTES DE EJECUTAR
-- ============================================================================

-- ─────────────────────────────────────────────
-- PASO 0: Desactivar RLS y triggers temporalmente
-- ─────────────────────────────────────────────
SET session_replication_role = replica;

-- ─────────────────────────────────────────────
-- PASO 1: Identificar al admin que se conserva
-- ─────────────────────────────────────────────
DO $$
DECLARE
  admin_count int;
BEGIN
  SELECT COUNT(*) INTO admin_count FROM profiles WHERE role = 'admin';
  RAISE NOTICE '🔑 Admins encontrados: %. Estos se conservarán.', admin_count;
  
  IF admin_count = 0 THEN
    RAISE EXCEPTION '❌ No se encontró ningún usuario admin. Abortando.';
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- PASO 2: TICKETS IT - Eliminar todo
-- ─────────────────────────────────────────────

-- 2a. Adjuntos de tickets IT
DELETE FROM ticket_attachments;

-- 2b. Comentarios de tickets IT
DELETE FROM ticket_comments;

-- 2c. Historial de estado de tickets IT
DELETE FROM ticket_status_history;

-- 2d. Tickets IT (tabla principal)
DELETE FROM tickets;

-- ─────────────────────────────────────────────
-- PASO 3: TICKETS MANTENIMIENTO - Eliminar todo
-- ─────────────────────────────────────────────

-- 3a. Adjuntos de tickets mantenimiento
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ticket_attachments_maintenance' AND table_schema = 'public') THEN
    DELETE FROM ticket_attachments_maintenance;
  END IF;
END $$;

-- 3b. Comentarios de tickets mantenimiento
DELETE FROM maintenance_ticket_comments;

-- 3c. Tickets mantenimiento
DELETE FROM tickets_maintenance;

-- ─────────────────────────────────────────────
-- PASO 4: ACTIVOS - Eliminar todo
-- ─────────────────────────────────────────────

-- 4a. Historial de cambios de activos
DELETE FROM asset_changes;

-- 4b. Solicitudes de baja
DELETE FROM asset_disposal_requests;

-- 4c. Reporte de cambios de ubicación (es una VIEW, no se puede borrar datos)

-- 4d. Activos IT
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assets_it' AND table_schema = 'public') THEN
    DELETE FROM assets_it;
  END IF;
END $$;

-- 4e. Activos Mantenimiento
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assets_maintenance' AND table_schema = 'public') THEN
    DELETE FROM assets_maintenance;
  END IF;
END $$;

-- 4f. Tabla legacy de activos
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assets' AND table_schema = 'public') THEN
    DELETE FROM assets;
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- PASO 5: INSPECCIONES GSH - Eliminar todo
-- ─────────────────────────────────────────────

-- 5a. Evidencias de items GSH
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inspections_gsh_item_evidences' AND table_schema = 'public') THEN
    DELETE FROM inspections_gsh_item_evidences;
  END IF;
END $$;

-- 5b. Items GSH
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inspections_gsh_items' AND table_schema = 'public') THEN
    DELETE FROM inspections_gsh_items;
  END IF;
END $$;

-- 5c. Áreas GSH
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inspections_gsh_areas' AND table_schema = 'public') THEN
    DELETE FROM inspections_gsh_areas;
  END IF;
END $$;

-- 5d. Inspecciones GSH principales
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inspections_gsh' AND table_schema = 'public') THEN
    DELETE FROM inspections_gsh;
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- PASO 6: INSPECCIONES RRHH - Eliminar todo
-- ─────────────────────────────────────────────

-- 6a. Evidencias de items RRHH
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inspections_rrhh_item_evidences' AND table_schema = 'public') THEN
    DELETE FROM inspections_rrhh_item_evidences;
  END IF;
END $$;

-- 6b. Items RRHH
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inspections_rrhh_items' AND table_schema = 'public') THEN
    DELETE FROM inspections_rrhh_items;
  END IF;
END $$;

-- 6c. Áreas RRHH
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inspections_rrhh_areas' AND table_schema = 'public') THEN
    DELETE FROM inspections_rrhh_areas;
  END IF;
END $$;

-- 6d. Inspecciones RRHH principales
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inspections_rrhh' AND table_schema = 'public') THEN
    DELETE FROM inspections_rrhh;
  END IF;
END $$;

-- 6e. Log de eliminación de inspecciones RRHH
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inspections_rrhh_deletion_log' AND table_schema = 'public') THEN
    DELETE FROM inspections_rrhh_deletion_log;
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- PASO 7: HOUSEKEEPING - Eliminar habitaciones y datos
-- ─────────────────────────────────────────────

-- 7a. Incidentes de habitación (hk_room_incidents es una VIEW, no tabla)

-- 7b. Asignaciones de habitación
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hk_room_assignments' AND table_schema = 'public') THEN
    DELETE FROM hk_room_assignments;
  END IF;
END $$;

-- 7c. Inventario HK
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hk_inventory_items' AND table_schema = 'public') THEN
    DELETE FROM hk_inventory_items;
  END IF;
END $$;

-- 7d. Personal HK
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hk_staff' AND table_schema = 'public') THEN
    DELETE FROM hk_staff;
  END IF;
END $$;

-- 7e. Habitaciones (se eliminarán porque los números están errados)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hk_rooms' AND table_schema = 'public') THEN
    DELETE FROM hk_rooms;
  END IF;
END $$;

-- 7f. Estadísticas de incidentes por ubicación (location_incident_stats es una VIEW, no tabla)

-- ─────────────────────────────────────────────
-- PASO 8: ACADEMIA - Eliminar todo
-- ─────────────────────────────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'academy_certificates' AND table_schema = 'public') THEN
    DELETE FROM academy_certificates;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'academy_quiz_attempts' AND table_schema = 'public') THEN
    DELETE FROM academy_quiz_attempts;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'academy_progress' AND table_schema = 'public') THEN
    DELETE FROM academy_progress;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'academy_enrollments' AND table_schema = 'public') THEN
    DELETE FROM academy_enrollments;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'academy_quiz_questions' AND table_schema = 'public') THEN
    DELETE FROM academy_quiz_questions;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'academy_quizzes' AND table_schema = 'public') THEN
    DELETE FROM academy_quizzes;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'academy_content' AND table_schema = 'public') THEN
    DELETE FROM academy_content;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'academy_modules' AND table_schema = 'public') THEN
    DELETE FROM academy_modules;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'academy_courses' AND table_schema = 'public') THEN
    DELETE FROM academy_courses;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'academy_areas' AND table_schema = 'public') THEN
    DELETE FROM academy_areas;
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- PASO 9: NOTIFICACIONES - Eliminar todas
-- ─────────────────────────────────────────────
DELETE FROM notifications;

-- ─────────────────────────────────────────────
-- PASO 10: AUDITORÍA - Eliminar todo
-- ─────────────────────────────────────────────
DELETE FROM audit_log;
DELETE FROM login_audits;

-- ─────────────────────────────────────────────
-- PASO 11: POLÍTICAS - Eliminar aceptaciones (no las políticas)
-- ─────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'policy_acknowledgments' AND table_schema = 'public') THEN
    DELETE FROM policy_acknowledgments;
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- PASO 12: TELEGRAM LINKS - Eliminar todos
-- ─────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_telegram_chat_ids' AND table_schema = 'public') THEN
    DELETE FROM user_telegram_chat_ids;
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- PASO 13: KNOWLEDGE BASE USAGE - Limpiar uso
-- ─────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'knowledge_base_usage' AND table_schema = 'public') THEN
    DELETE FROM knowledge_base_usage;
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- PASO 14: USER LOCATIONS - Eliminar asignaciones de usuarios no admin
-- ─────────────────────────────────────────────
DELETE FROM user_locations
WHERE user_id NOT IN (SELECT id FROM profiles WHERE role = 'admin');

-- ─────────────────────────────────────────────
-- PASO 15: ELIMINAR USUARIOS NO ADMIN
-- ─────────────────────────────────────────────

-- 15a. Eliminar perfiles no admin
DELETE FROM profiles WHERE role != 'admin';

-- 15b. Eliminar usuarios de auth.users que ya no tienen perfil
DELETE FROM auth.users 
WHERE id NOT IN (SELECT id FROM profiles);

-- ─────────────────────────────────────────────
-- PASO 16: STORAGE - Limpiar todos los buckets
-- ─────────────────────────────────────────────
DELETE FROM storage.objects WHERE bucket_id = 'ticket-attachments';
DELETE FROM storage.objects WHERE bucket_id = 'maintenance-attachments';
DELETE FROM storage.objects WHERE bucket_id = 'asset-images';
DELETE FROM storage.objects WHERE bucket_id = 'maintenance-asset-images';
DELETE FROM storage.objects WHERE bucket_id = 'inspection-evidences';

-- ─────────────────────────────────────────────
-- PASO 17: REINICIAR SECUENCIAS
-- ─────────────────────────────────────────────
DO $$
DECLARE
  seq_name text;
BEGIN
  -- Buscar y reiniciar todas las secuencias de ticket_number
  FOR seq_name IN 
    SELECT sequencename FROM pg_sequences 
    WHERE sequencename LIKE '%ticket%' 
       OR sequencename LIKE '%maintenance%seq%'
  LOOP
    EXECUTE format('ALTER SEQUENCE %I RESTART WITH 1', seq_name);
    RAISE NOTICE '🔄 Secuencia reiniciada: %', seq_name;
  END LOOP;
  
  -- Reiniciar secuencia de ticket_number en tickets si es serial/identity
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tickets' AND column_name = 'ticket_number' 
    AND column_default LIKE 'nextval%'
  ) THEN
    PERFORM setval(pg_get_serial_sequence('tickets', 'ticket_number'), 1, false);
    RAISE NOTICE '🔄 Secuencia tickets.ticket_number reiniciada';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tickets_maintenance' AND column_name = 'ticket_number' 
    AND column_default LIKE 'nextval%'
  ) THEN
    PERFORM setval(pg_get_serial_sequence('tickets_maintenance', 'ticket_number'), 1, false);
    RAISE NOTICE '🔄 Secuencia tickets_maintenance.ticket_number reiniciada';
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- PASO 18: Reactivar RLS y triggers
-- ─────────────────────────────────────────────
SET session_replication_role = DEFAULT;

-- ─────────────────────────────────────────────
-- PASO 19: VERIFICACIÓN FINAL
-- ─────────────────────────────────────────────
SELECT '════════════════════════════════════════' as "═══ VERIFICACIÓN HARD RESET ═══";

SELECT 'CONSERVADO' as estado, 'Admins' as tabla, COUNT(*) as registros FROM profiles WHERE role = 'admin'
UNION ALL SELECT 'CONSERVADO', 'Ubicaciones/Sedes', COUNT(*) FROM locations
UNION ALL SELECT 'LIMPIO', 'Tickets IT', COUNT(*) FROM tickets
UNION ALL SELECT 'LIMPIO', 'Tickets Mantenimiento', COUNT(*) FROM tickets_maintenance
UNION ALL SELECT 'LIMPIO', 'Comentarios IT', COUNT(*) FROM ticket_comments
UNION ALL SELECT 'LIMPIO', 'Comentarios Mant.', COUNT(*) FROM maintenance_ticket_comments
UNION ALL SELECT 'LIMPIO', 'Notificaciones', COUNT(*) FROM notifications
UNION ALL SELECT 'LIMPIO', 'Auditoría', COUNT(*) FROM audit_log
UNION ALL SELECT 'LIMPIO', 'Login Audits', COUNT(*) FROM login_audits
UNION ALL SELECT 'LIMPIO', 'Perfiles NO admin', (SELECT COUNT(*) FROM profiles WHERE role != 'admin')
ORDER BY estado DESC, tabla;

-- Mostrar admin(es) conservado(s)
SELECT '🔑 ADMIN CONSERVADO' as info, p.id, p.full_name, u.email
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.role = 'admin';

SELECT '════════════════════════════════════════' as "═══ HARD RESET COMPLETADO ═══";
