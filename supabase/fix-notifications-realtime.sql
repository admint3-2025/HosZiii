-- =====================================================
-- FIX: Habilitar Realtime para notificaciones push
-- =====================================================
-- Este script habilita Realtime en la tabla notifications
-- para que las notificaciones push lleguen en tiempo real
-- =====================================================

-- 1. Habilitar publicación Realtime en la tabla notifications
-- (Esto es CRÍTICO para que funcionen las suscripciones)
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- 2. Verificar que las políticas RLS estén correctas
-- Recrear política de SELECT para asegurar que los usuarios puedan ver sus notificaciones
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- 3. Recrear política de UPDATE para marcar como leídas
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- 4. Recrear política de INSERT para el sistema
-- Esta permite que el service role inserte notificaciones
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- 5. Verificar que la tabla tenga RLS habilitado
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- Puedes ejecutar estas queries para verificar:

-- Ver publicaciones Realtime activas:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Ver políticas RLS de notifications:
-- SELECT * FROM pg_policies WHERE tablename = 'notifications';

-- =====================================================
-- TESTING
-- =====================================================
-- Para probar que funciona:
-- 1. Ejecuta este script en Supabase SQL Editor
-- 2. Abre el dashboard como admin
-- 3. Completa una inspección con items < 8/10
-- 4. Deberías ver la notificación aparecer en tiempo real (🔔)
-- =====================================================
