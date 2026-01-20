-- =====================================================
-- DEBUG: Verificar estado de notificaciones
-- =====================================================

-- 1. Ver las últimas 10 notificaciones insertadas
SELECT 
  id,
  user_id,
  type,
  title,
  message,
  is_read,
  created_at
FROM notifications
ORDER BY created_at DESC
LIMIT 10;

-- 2. Ver notificaciones de tipo inspection_critical
SELECT 
  n.id,
  n.user_id,
  p.full_name,
  u.email,
  p.role,
  n.type,
  n.title,
  n.message,
  n.is_read,
  n.created_at
FROM notifications n
LEFT JOIN profiles p ON n.user_id = p.id
LEFT JOIN auth.users u ON n.user_id = u.id
WHERE n.type = 'inspection_critical'
ORDER BY n.created_at DESC
LIMIT 10;

-- 3. Verificar si Realtime está habilitado en notifications
SELECT schemaname, tablename, pubname
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' AND tablename = 'notifications';

-- 4. Ver políticas RLS de notifications
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'notifications'
ORDER BY policyname;

-- 5. Verificar que el enum tiene inspection_critical
SELECT enumlabel 
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'notification_type'
ORDER BY e.enumsortorder;
