-- Verificar técnicos de mantenimiento
SELECT 
  id,
  full_name,
  role,
  asset_category,
  location_id,
  locations.name as location_name
FROM profiles
LEFT JOIN locations ON profiles.location_id = locations.id
WHERE role IN ('agent_l1', 'agent_l2', 'supervisor')
ORDER BY asset_category, role, full_name;
