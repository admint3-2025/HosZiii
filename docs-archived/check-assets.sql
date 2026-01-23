-- Verificar si hay activos de mantenimiento
SELECT 'ACTIVOS EN assets_maintenance:' as info;
SELECT COUNT(*) as total FROM assets_maintenance;

-- Ver algunos ejemplos
SELECT id, asset_code, category, location_id, status, deleted_at 
FROM assets_maintenance 
LIMIT 5;

-- Verificar que usuarios en qué location_id están
SELECT 'USUARIOS Y SUS LOCATIONS:' as info;
SELECT u.id, u.email, p.role, p.location_id 
FROM auth.users u 
LEFT JOIN profiles p ON u.id = p.id 
LIMIT 5;
