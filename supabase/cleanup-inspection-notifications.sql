-- =====================================================
-- LIMPIEZA: Eliminar notificaciones de inspecciones críticas 
-- para usuarios que NO son admin o corporate_admin
-- =====================================================
-- Fecha: 2026-02-08
-- Motivo: Las notificaciones de inspecciones críticas solo deben
--         llegar a roles admin y corporate_admin, no a agent_l1,
--         supervisor u otros roles.
-- =====================================================

-- PASO 1: Diagnosticar - Ver TODOS los tipos de notificaciones que existen
SELECT DISTINCT type, count(*) as total
FROM notifications
GROUP BY type
ORDER BY type;

-- PASO 2: Ver notificaciones de inspección para TODOS los usuarios (con sus roles)
SELECT 
  n.id,
  n.type,
  n.title,
  p.full_name,
  u.email,
  p.role,
  n.created_at
FROM notifications n
INNER JOIN profiles p ON p.id = n.user_id
INNER JOIN auth.users u ON u.id = n.user_id
WHERE n.type = 'inspection_critical'
ORDER BY n.created_at DESC;

-- PASO 3: Contar notificaciones de inspección por rol
SELECT 
  p.role,
  COUNT(*) as notification_count
FROM notifications n
INNER JOIN profiles p ON p.id = n.user_id
WHERE n.type = 'inspection_critical'
  AND p.role NOT IN ('admin', 'corporate_admin')
GROUP BY p.role
ORDER BY notification_count DESC;

-- PASO 4: ELIMINAR notificaciones de inspecciones para roles NO corporativos
DELETE FROM notifications
WHERE type = 'inspection_critical'
  AND user_id IN (
    SELECT id 
    FROM profiles 
    WHERE role NOT IN ('admin', 'corporate_admin')
  );

-- PASO 5: Verificar que solo quedan notificaciones para admin y corporate_admin
SELECT 
  p.role,
  COUNT(*) as remaining_notifications
FROM notifications n
INNER JOIN profiles p ON p.id = n.user_id
WHERE n.type = 'inspection_critical'
GROUP BY p.role
ORDER BY p.role;

