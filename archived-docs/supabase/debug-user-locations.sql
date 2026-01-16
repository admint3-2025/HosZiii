-- Script de debug para verificar sedes asignadas al usuario
-- Email: edelatorre298@gmail.com

-- 1. Verificar el usuario y su sede en profiles
SELECT 
  'PERFIL' as tipo,
  p.id,
  u.email,
  p.full_name,
  p.role,
  p.location_id,
  (SELECT name FROM locations WHERE id = p.location_id) as location_name
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'edelatorre298@gmail.com';

-- 2. Verificar sedes asignadas en user_locations
SELECT 
  'USER_LOCATIONS' as tipo,
  ul.user_id,
  ul.location_id,
  l.name as location_name,
  l.code as location_code,
  l.is_active
FROM user_locations ul
JOIN locations l ON l.id = ul.location_id
WHERE ul.user_id = (
  SELECT p.id FROM profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE u.email = 'edelatorre298@gmail.com'
);

-- 3. Verificar qué ve la vista location_incident_stats (SIN RLS)
-- Nota: Esto mostrará TODAS las sedes porque se ejecuta como admin
SELECT 
  'TODAS LAS ESTADISTICAS (sin RLS)' as tipo,
  location_id,
  location_name,
  location_code,
  total_tickets
FROM location_incident_stats
ORDER BY location_name;

-- 4. Verificar las políticas RLS actuales en locations
SELECT 
  'POLITICAS RLS - LOCATIONS' as info,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'locations'
  AND cmd = 'SELECT'
ORDER BY policyname;

-- 5. Verificar las políticas RLS actuales en assets
SELECT 
  'POLITICAS RLS - ASSETS' as info,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'assets'
  AND cmd = 'SELECT'
ORDER BY policyname;
