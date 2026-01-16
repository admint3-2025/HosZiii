-- Script de verificación de notificaciones en tiempo real
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar que la tabla está en la publicación Realtime
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' AND tablename = 'notifications';
-- Debe retornar una fila con: public | notifications

-- 2. Verificar las políticas RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'notifications';
-- Debe mostrar las 3 políticas: view own, update own, system insert

-- 3. Ver notificaciones de prueba (ejecuta con tu usuario)
SELECT 
  id, 
  type, 
  title, 
  message, 
  ticket_number,
  is_read, 
  created_at,
  user_id = auth.uid() as is_mine
FROM notifications 
WHERE user_id = auth.uid()
ORDER BY created_at DESC 
LIMIT 10;

-- 4. Probar inserción de notificación de prueba (como admin)
-- DESCOMENTA SOLO SI ERES ADMIN Y QUIERES PROBAR:
/*
INSERT INTO notifications (user_id, type, title, message, ticket_number)
VALUES (
  auth.uid(), 
  'TICKET_CREATED', 
  'Prueba Realtime', 
  'Esta es una notificación de prueba para verificar Realtime',
  999
);
*/

-- 5. Verificar que Realtime esté habilitado globalmente
SELECT * FROM pg_publication WHERE pubname = 'supabase_realtime';
