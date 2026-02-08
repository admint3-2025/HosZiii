-- =====================================================
-- DIAGNÓSTICO: Técnico de mantenimiento no ve sus tickets
-- =====================================================
-- Fecha: 2026-02-08
-- Problema: Un técnico de propiedad específica no puede ver
--           los tickets creados ni asignados a él
-- =====================================================

-- INSTRUCCIÓN: Reemplazar 'UUID_DEL_TECNICO' con el ID del usuario afectado
-- Para obtener el UUID: SELECT id, full_name, email FROM profiles WHERE full_name ILIKE '%nombre%';

-- PASO 1: Ver información del técnico
SELECT 
  p.id,
  p.full_name,
  u.email,
  p.role,
  p.asset_category,
  p.location_id as profile_location_id,
  l.code as profile_location_code,
  l.name as profile_location_name,
  p.is_maintenance_supervisor
FROM profiles p
INNER JOIN auth.users u ON u.id = p.id
LEFT JOIN locations l ON l.id = p.location_id
WHERE p.id = 'UUID_DEL_TECNICO';

-- PASO 2: Ver ubicaciones asignadas en user_locations
SELECT 
  ul.location_id,
  l.code,
  l.name,
  l.is_active
FROM user_locations ul
LEFT JOIN locations l ON l.id = ul.location_id
WHERE ul.user_id = 'UUID_DEL_TECNICO'
ORDER BY l.code;

-- PASO 3: Ver TODOS los location_ids que el sistema usará para filtrar
-- (Combina profiles.location_id + user_locations)
SELECT DISTINCT location_id, l.code, l.name
FROM (
  -- Desde profiles.location_id
  SELECT location_id FROM profiles WHERE id = 'UUID_DEL_TECNICO' AND location_id IS NOT NULL
  UNION
  -- Desde user_locations
  SELECT location_id FROM user_locations WHERE user_id = 'UUID_DEL_TECNICO'
) combined
LEFT JOIN locations l ON l.id = combined.location_id
ORDER BY l.code;

-- PASO 4: Ver tickets de mantenimiento en las sedes del técnico
-- (Tickets que DEBERÍA poder ver según ubicaciones)
WITH tech_locations AS (
  SELECT DISTINCT location_id
  FROM (
    SELECT location_id FROM profiles WHERE id = 'UUID_DEL_TECNICO' AND location_id IS NOT NULL
    UNION
    SELECT location_id FROM user_locations WHERE user_id = 'UUID_DEL_TECNICO'
  ) combined
)
SELECT 
  tm.id,
  tm.ticket_number,
  tm.title,
  tm.status,
  tm.priority,
  tm.created_at,
  tm.requester_id,
  tm.assigned_to,
  tm.location_id,
  l.code as location_code,
  l.name as location_name,
  requester.full_name as requester_name,
  assigned.full_name as assigned_to_name
FROM tickets_maintenance tm
INNER JOIN tech_locations tl ON tl.location_id = tm.location_id
LEFT JOIN locations l ON l.id = tm.location_id
LEFT JOIN profiles requester ON requester.id = tm.requester_id
LEFT JOIN profiles assigned ON assigned.id = tm.assigned_to
WHERE tm.deleted_at IS NULL
ORDER BY tm.created_at DESC
LIMIT 20;

-- PASO 5: Ver tickets donde el técnico es ASIGNADO (assigned_to)
SELECT 
  tm.id,
  tm.ticket_number,
  tm.title,
  tm.status,
  tm.priority,
  tm.created_at,
  tm.location_id,
  l.code as location_code,
  l.name as location_name,
  requester.full_name as requester_name
FROM tickets_maintenance tm
LEFT JOIN locations l ON l.id = tm.location_id
LEFT JOIN profiles requester ON requester.id = tm.requester_id
WHERE tm.assigned_to = 'UUID_DEL_TECNICO'
  AND tm.deleted_at IS NULL
ORDER BY tm.created_at DESC;

-- PASO 6: Ver tickets donde el técnico es REQUESTER (requester_id)
SELECT 
  tm.id,
  tm.ticket_number,
  tm.title,
  tm.status,
  tm.priority,
  tm.created_at,
  tm.location_id,
  l.code as location_code,
  l.name as location_name,
  assigned.full_name as assigned_to_name
FROM tickets_maintenance tm
LEFT JOIN locations l ON l.id = tm.location_id
LEFT JOIN profiles assigned ON assigned.id = tm.assigned_to
WHERE tm.requester_id = 'UUID_DEL_TECNICO'
  AND tm.deleted_at IS NULL
ORDER BY tm.created_at DESC;

-- PASO 7: Contar tickets por sede en tickets_maintenance
SELECT 
  l.code,
  l.name,
  l.is_active,
  COUNT(tm.id) as total_tickets
FROM locations l
LEFT JOIN tickets_maintenance tm ON tm.location_id = l.id AND tm.deleted_at IS NULL
GROUP BY l.id, l.code, l.name, l.is_active
ORDER BY total_tickets DESC;

-- =====================================================
-- SOLUCIONES POSIBLES:
-- =====================================================

-- SOLUCIÓN A: Asignar el técnico a una sede en profiles.location_id
-- UPDATE profiles 
-- SET location_id = 'UUID_DE_LA_SEDE'
-- WHERE id = 'UUID_DEL_TECNICO';

-- SOLUCIÓN B: Agregar sede(s) al técnico en user_locations
-- INSERT INTO user_locations (user_id, location_id)
-- VALUES ('UUID_DEL_TECNICO', 'UUID_DE_LA_SEDE')
-- ON CONFLICT (user_id, location_id) DO NOTHING;

-- SOLUCIÓN C: Verificar que asset_category sea 'MAINTENANCE'
-- UPDATE profiles 
-- SET asset_category = 'MAINTENANCE'
-- WHERE id = 'UUID_DEL_TECNICO';

-- SOLUCIÓN D: Actualizar política RLS para incluir filtro de ubicación
-- (Más complejo, requiere analizar impacto en todo el sistema)
