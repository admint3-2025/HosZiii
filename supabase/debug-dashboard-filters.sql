-- Debug: ¿Por qué el dashboard no muestra el ticket?

-- 1. Ver el ticket completo con todos sus detalles
SELECT 
  'Ticket completo' as info,
  id,
  ticket_number,
  title,
  status,
  service_area,
  requester_id,
  assigned_agent_id,
  location_id,
  created_at
FROM public.tickets
WHERE deleted_at IS NULL;

-- 2. Ver quién es el solicitante del ticket
SELECT 
  'Solicitante del ticket' as info,
  t.ticket_number,
  t.requester_id,
  p.full_name as requester_name,
  p.role as requester_role
FROM public.tickets t
LEFT JOIN public.profiles p ON p.id = t.requester_id
WHERE t.deleted_at IS NULL;

-- 3. Ver ubicación del ticket
SELECT 
  'Ubicación del ticket' as info,
  t.ticket_number,
  t.location_id,
  l.code as location_code,
  l.name as location_name
FROM public.tickets t
LEFT JOIN public.locations l ON l.id = t.location_id
WHERE t.deleted_at IS NULL;

-- 4. Ver ubicaciones asignadas a cada supervisor
SELECT 
  'Ubicaciones de supervisores' as info,
  p.full_name,
  p.role,
  p.location_id as profile_location,
  ul.location_id as assigned_location
FROM public.profiles p
LEFT JOIN public.user_locations ul ON ul.user_id = p.id
WHERE p.role IN ('admin', 'supervisor')
ORDER BY p.full_name;
