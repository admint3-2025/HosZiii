-- Verificar tickets de mantenimiento y su visibilidad para técnicos

-- 1. Total de tickets de mantenimiento
SELECT 
  'TOTAL TICKETS' as info,
  COUNT(*) as cantidad
FROM tickets_maintenance;

-- 2. Tickets por ubicación
SELECT 
  'TICKETS POR UBICACIÓN' as info,
  l.code,
  l.name,
  COUNT(t.id) as tickets
FROM locations l
LEFT JOIN tickets_maintenance t ON t.location_id = l.id
GROUP BY l.id, l.code, l.name
ORDER BY l.code;

-- 3. Tickets que debería ver cada técnico de mantenimiento
-- (tickets en su ubicación donde NO es el solicitante)
SELECT 
  'TICKETS QUE DEBERÍA VER CADA TÉCNICO' as info,
  p.full_name as tecnico,
  p.role,
  l.code as ubicacion,
  COUNT(t.id) as tickets_visibles
FROM profiles p
LEFT JOIN locations l ON p.location_id = l.id
LEFT JOIN tickets_maintenance t ON t.location_id = p.location_id 
  AND t.requester_id != p.id
WHERE p.asset_category = 'MAINTENANCE'
  AND p.role IN ('agent_l1', 'agent_l2', 'supervisor')
GROUP BY p.id, p.full_name, p.role, l.code
ORDER BY l.code, p.role, p.full_name;

-- 4. Detalles de tickets de mantenimiento
SELECT 
  'DETALLES DE TICKETS' as info,
  t.ticket_number,
  t.status,
  t.priority,
  l.code as ubicacion,
  requester.full_name as solicitante,
  assigned.full_name as asignado_a
FROM tickets_maintenance t
LEFT JOIN locations l ON t.location_id = l.id
LEFT JOIN profiles requester ON t.requester_id = requester.id
LEFT JOIN profiles assigned ON t.assigned_to = assigned.id
ORDER BY t.created_at DESC
LIMIT 20;
