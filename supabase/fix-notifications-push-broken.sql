-- ============================================================================
-- FIX CRÍTICO: Reparar notificaciones push (in-app) que dejaron de funcionar
-- Fecha: 2026-02-17
-- ============================================================================
-- PROBLEMA:
-- Al eliminar los triggers de la tabla tickets (drop-duplicate-ticket-notification-triggers.sql),
-- las notificaciones push pasaron a depender 100% del código de la app (Next.js).
-- PERO el código inserta valores tipo "20260217-0001" (texto con guiones) en la columna
-- `ticket_number` que es BIGINT → PostgREST devuelve error 400 silenciosamente.
-- Resultado: NINGUNA notificación push se crea desde la app.
--
-- SOLUCIÓN:
-- 1. Cambiar ticket_number de bigint a text (para aceptar códigos formateados)
-- 2. Cambiar type de enum a text (para aceptar cualquier tipo sin migrar el enum)
-- 3. Agregar columna link (usada por multi-channel.ts, no existía)
-- 4. Agregar política DELETE de RLS (los usuarios no pueden borrar sus notificaciones)
-- ============================================================================

-- =============================================
-- 1. Cambiar ticket_number de bigint a text
-- =============================================
-- ESTA ES LA CAUSA PRINCIPAL de que no funcionen los push notifications.
-- El código inserta "20260217-0001" (string) en un campo bigint → falla silenciosamente.
ALTER TABLE notifications
  ALTER COLUMN ticket_number TYPE text USING ticket_number::text;

-- =============================================
-- 2. Cambiar type de enum a text
-- =============================================
-- El enum notification_type tiene valores limitados. Cambiar a text evita
-- problemas cuando se agregan nuevos tipos de notificación.
ALTER TABLE notifications
  ALTER COLUMN type TYPE text USING type::text;

-- (Opcional) Eliminar el enum si ya no se usa en ningún otro lugar
-- DROP TYPE IF EXISTS notification_type;

-- =============================================
-- 3. Agregar columna link (si no existe)
-- =============================================
-- multi-channel.ts inserta un campo "link" para redirigir al hacer clic.
-- Si la columna no existe, el insert falla silenciosamente.
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS link text;

-- =============================================
-- 4. Agregar política DELETE de RLS
-- =============================================
-- NotificationBell.tsx usa .delete() para:
--   - markAsRead (elimina la notificación individual)
--   - dismissAll (elimina todas las visibles)
--   - background cleanup (elimina is_read=true)
-- Sin esta política, todas esas operaciones fallan silenciosamente.
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- 5. Asegurar que RLS esté habilitado
-- =============================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 6. Asegurar que las demás políticas existen
-- =============================================
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- =============================================
-- 7. Asegurar que Realtime está habilitado
-- =============================================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- VERIFICACIÓN (ejecutar después del fix):
-- ============================================================================

-- Ver la estructura actual de la tabla:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'notifications'
-- ORDER BY ordinal_position;

-- Ver políticas RLS (debe incluir DELETE):
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'notifications';

-- Ver Realtime:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications';

-- Probar insert manual (debe funcionar con ticket_number tipo texto):
-- INSERT INTO notifications (user_id, type, title, message, ticket_number, is_read)
-- VALUES ('TU_USER_ID_AQUI', 'TICKET_CREATED', 'Test', 'Test message', '20260217-0001', false);

-- ============================================================================
-- DESPUÉS DE EJECUTAR:
-- Las notificaciones push volverán a funcionar porque:
--   ✓ ticket_number ahora acepta texto ("20260217-0001", "MANT-170226-0001")
--   ✓ type ahora acepta cualquier string (no solo valores del enum)
--   ✓ link ahora existe como columna
--   ✓ Los usuarios pueden borrar sus propias notificaciones (DELETE policy)
-- ============================================================================
