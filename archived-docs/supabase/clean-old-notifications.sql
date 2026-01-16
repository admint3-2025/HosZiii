-- Script para limpiar notificaciones antiguas y duplicadas
-- Ejecutar este script en Supabase SQL Editor

-- 1. Eliminar notificaciones muy antiguas (más de 30 días sin leer)
DELETE FROM notifications
WHERE is_read = false 
  AND created_at < NOW() - INTERVAL '30 days';

-- 2. Eliminar notificaciones leídas antiguas (más de 7 días)
DELETE FROM notifications
WHERE is_read = true 
  AND created_at < NOW() - INTERVAL '7 days';

-- 3. Marcar como leídas las notificaciones de prueba (opcional)
-- Descomenta si quieres limpiar las de prueba actuales:
-- UPDATE notifications SET is_read = true WHERE created_at < NOW();

-- 4. Ver estadísticas finales
SELECT 
  'Total notificaciones' as tipo,
  COUNT(*) as cantidad,
  COUNT(CASE WHEN is_read = false THEN 1 END) as no_leidas,
  COUNT(CASE WHEN is_read = true THEN 1 END) as leidas
FROM notifications;

-- 5. Ver notificaciones por usuario
SELECT 
  p.full_name,
  p.id as user_id,
  COUNT(*) as total_notificaciones,
  COUNT(CASE WHEN n.is_read = false THEN 1 END) as no_leidas
FROM notifications n
LEFT JOIN profiles p ON p.id = n.user_id
GROUP BY p.full_name, p.id
ORDER BY no_leidas DESC;
