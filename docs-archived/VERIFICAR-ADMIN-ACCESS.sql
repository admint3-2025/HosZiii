-- ============================================
-- VERIFICACIÓN COMPLETA: Estado de políticas RLS
-- Ejecuta esto en Supabase SQL Editor para ver el problema
-- ============================================

-- 1. Ver todas las políticas actuales de tickets
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'tickets'
ORDER BY policyname;

-- 2. Verificar función is_admin()
SELECT is_admin() as soy_admin;

-- 3. Ver perfil actual
SELECT 
  p.id, 
  u.email,
  p.role, 
  p.location_id, 
  p.asset_category, 
  p.department
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.id = auth.uid();

-- 4. Contar tickets que DEBERÍA ver el admin
SELECT 
  'Total tickets (incluyendo deleted)' as tipo,
  COUNT(*) as cantidad
FROM tickets
UNION ALL
SELECT 
  'Tickets activos (deleted_at IS NULL)' as tipo,
  COUNT(*) as cantidad
FROM tickets
WHERE deleted_at IS NULL
UNION ALL
SELECT 
  'Tickets cerrados' as tipo,
  COUNT(*) as cantidad
FROM tickets
WHERE status = 'CLOSED' AND deleted_at IS NULL;

-- 5. Ver distribución por service_area
SELECT 
  COALESCE(service_area, 'NULL/Legacy') as area,
  COUNT(*) as tickets,
  COUNT(*) FILTER (WHERE status = 'CLOSED') as cerrados,
  COUNT(*) FILTER (WHERE status != 'CLOSED') as abiertos
FROM tickets
WHERE deleted_at IS NULL
GROUP BY service_area
ORDER BY tickets DESC;

-- 6. Ver distribución por sede
SELECT 
  l.code,
  l.name,
  COUNT(t.id) as tickets
FROM locations l
LEFT JOIN tickets t ON t.location_id = l.id AND t.deleted_at IS NULL
GROUP BY l.id, l.code, l.name
ORDER BY tickets DESC;
