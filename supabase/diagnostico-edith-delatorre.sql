-- =====================================================
-- DIAGNÓSTICO: Edith De la Torre - edelatorre298@gmail.com
-- No puede ver tickets de mantenimiento en su bandeja
-- =====================================================
-- Fecha: 2026-02-08
-- =====================================================

-- PASO 1: Obtener información del técnico
SELECT 
  p.id as user_id,
  p.full_name,
  u.email,
  p.role,
  p.asset_category,
  p.location_id as profile_location_id,
  l.code as profile_location_code,
  l.name as profile_location_name,
  p.is_maintenance_supervisor,
  u.banned_until
FROM profiles p
INNER JOIN auth.users u ON u.id = p.id
LEFT JOIN locations l ON l.id = p.location_id
WHERE u.email = 'edelatorre298@gmail.com';

-- PASO 2: Ver ubicaciones asignadas en user_locations
SELECT 
  ul.user_id,
  ul.location_id,
  l.code,
  l.name,
  l.is_active
FROM user_locations ul
LEFT JOIN locations l ON l.id = ul.location_id
WHERE ul.user_id = (SELECT id FROM profiles WHERE id IN (SELECT id FROM auth.users WHERE email = 'edelatorre298@gmail.com'))
ORDER BY l.code;

-- PASO 3: Ver TODOS los location_ids combinados (profiles + user_locations)
SELECT DISTINCT location_id, l.code, l.name, l.is_active
FROM (
  -- Desde profiles.location_id
  SELECT p.location_id 
  FROM profiles p
  INNER JOIN auth.users u ON u.id = p.id
  WHERE u.email = 'edelatorre298@gmail.com' 
    AND p.location_id IS NOT NULL
  
  UNION
  
  -- Desde user_locations
  SELECT ul.location_id
  FROM user_locations ul
  INNER JOIN auth.users u ON u.id = ul.user_id
  WHERE u.email = 'edelatorre298@gmail.com'
) combined
LEFT JOIN locations l ON l.id = combined.location_id
ORDER BY l.code;

-- PASO 4: Ver tickets de mantenimiento que DEBERÍA poder ver
-- (Tickets en las sedes del técnico)
WITH tech_locations AS (
  SELECT DISTINCT location_id
  FROM (
    SELECT p.location_id 
    FROM profiles p
    INNER JOIN auth.users u ON u.id = p.id
    WHERE u.email = 'edelatorre298@gmail.com' 
      AND p.location_id IS NOT NULL
    
    UNION
    
    SELECT ul.location_id
    FROM user_locations ul
    INNER JOIN auth.users u ON u.id = ul.user_id
    WHERE u.email = 'edelatorre298@gmail.com'
  ) combined
),
tech_user AS (
  SELECT p.id
  FROM profiles p
  INNER JOIN auth.users u ON u.id = p.id
  WHERE u.email = 'edelatorre298@gmail.com'
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
  assigned.full_name as assigned_to_name,
  CASE 
    WHEN tm.requester_id = (SELECT id FROM tech_user) THEN 'ES_SOLICITANTE'
    WHEN tm.assigned_to = (SELECT id FROM tech_user) THEN 'ASIGNADO_A_MI'
    WHEN tm.requester_id IS NULL THEN 'SIN_SOLICITANTE'
    ELSE 'OTRO'
  END as relacion_conmigo
FROM tickets_maintenance tm
INNER JOIN tech_locations tl ON tl.location_id = tm.location_id
LEFT JOIN locations l ON l.id = tm.location_id
LEFT JOIN profiles requester ON requester.id = tm.requester_id
LEFT JOIN profiles assigned ON assigned.id = tm.assigned_to
WHERE tm.deleted_at IS NULL
ORDER BY tm.created_at DESC
LIMIT 30;

-- PASO 5: Ver tickets donde Edith es ASIGNADA (assigned_to)
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
WHERE tm.assigned_to = (SELECT id FROM profiles WHERE id IN (SELECT id FROM auth.users WHERE email = 'edelatorre298@gmail.com'))
  AND tm.deleted_at IS NULL
ORDER BY tm.created_at DESC;

-- PASO 6: Ver tickets donde Edith es SOLICITANTE (requester_id)
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
WHERE tm.requester_id = (SELECT id FROM profiles WHERE id IN (SELECT id FROM auth.users WHERE email = 'edelatorre298@gmail.com'))
  AND tm.deleted_at IS NULL
ORDER BY tm.created_at DESC;

-- PASO 7: Contar tickets de mantenimiento por sede
SELECT 
  l.code,
  l.name,
  l.is_active,
  COUNT(tm.id) as total_tickets,
  COUNT(CASE WHEN tm.status = 'NEW' THEN 1 END) as nuevos,
  COUNT(CASE WHEN tm.status = 'ASSIGNED' THEN 1 END) as asignados,
  COUNT(CASE WHEN tm.status = 'IN_PROGRESS' THEN 1 END) as en_progreso
FROM locations l
LEFT JOIN tickets_maintenance tm ON tm.location_id = l.id AND tm.deleted_at IS NULL
GROUP BY l.id, l.code, l.name, l.is_active
HAVING COUNT(tm.id) > 0
ORDER BY total_tickets DESC;

-- PASO 8: Ver todas las sedes activas disponibles
SELECT 
  id,
  code,
  name,
  is_active
FROM locations
WHERE is_active = true
ORDER BY code;

-- =====================================================
-- SOLUCIONES (ejecutar DESPUÉS de revisar resultados):
-- =====================================================

-- SOLUCIÓN A: Si PASO 2 y 3 están vacíos → Asignar sede en profiles
-- UPDATE profiles 
-- SET location_id = (SELECT id FROM locations WHERE code = 'CODIGO_DE_SEDE' LIMIT 1)
-- WHERE id IN (SELECT id FROM auth.users WHERE email = 'edelatorre298@gmail.com');

-- SOLUCIÓN B: Si PASO 2 y 3 están vacíos → Agregar sede(s) en user_locations
-- INSERT INTO user_locations (user_id, location_id)
-- VALUES (
--   (SELECT id FROM auth.users WHERE email = 'edelatorre298@gmail.com'),
--   (SELECT id FROM locations WHERE code = 'CODIGO_DE_SEDE' LIMIT 1)
-- )
-- ON CONFLICT (user_id, location_id) DO NOTHING;

-- SOLUCIÓN C: Si asset_category NO es MAINTENANCE
-- UPDATE profiles 
-- SET asset_category = 'MAINTENANCE'
-- WHERE id IN (SELECT id FROM auth.users WHERE email = 'edelatorre298@gmail.com');

-- SOLUCIÓN D: Ver todas las sedes para elegir cuál asignar
-- SELECT code, name, id FROM locations WHERE is_active = true ORDER BY code;
