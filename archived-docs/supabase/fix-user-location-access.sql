-- Script para verificar y asignar ubicaciones a usuarios que no tienen acceso a reportes
-- Este problema ocurre cuando un usuario no tiene location_id en profiles ni registros en user_locations

-- 1. Verificar usuarios sin ubicación asignada
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.location_id,
  COUNT(ul.location_id) as user_locations_count
FROM profiles p
LEFT JOIN user_locations ul ON ul.user_id = p.id
WHERE p.role IN ('requester', 'agent_l1', 'agent_l2', 'supervisor')
GROUP BY p.id, p.email, p.full_name, p.role, p.location_id
HAVING p.location_id IS NULL AND COUNT(ul.location_id) = 0;

-- 2. Para usuarios sin ubicación, asignarles la primera ubicación activa disponible
-- (esto es temporal, luego el admin debe asignar la ubicación correcta)
DO $$
DECLARE
  default_location_id UUID;
  user_record RECORD;
BEGIN
  -- Obtener la primera ubicación activa
  SELECT id INTO default_location_id 
  FROM locations 
  WHERE is_active = true 
  ORDER BY created_at 
  LIMIT 1;

  -- Si no hay ubicaciones activas, salir
  IF default_location_id IS NULL THEN
    RAISE NOTICE 'No hay ubicaciones activas en el sistema. Por favor, cree al menos una ubicación.';
    RETURN;
  END IF;

  -- Asignar la ubicación predeterminada a usuarios sin ubicación
  FOR user_record IN 
    SELECT 
      p.id,
      p.email,
      p.full_name,
      p.role
    FROM profiles p
    LEFT JOIN user_locations ul ON ul.user_id = p.id
    WHERE p.role IN ('requester', 'agent_l1', 'agent_l2', 'supervisor')
    GROUP BY p.id, p.email, p.full_name, p.role, p.location_id
    HAVING p.location_id IS NULL AND COUNT(ul.location_id) = 0
  LOOP
    -- Actualizar location_id en profiles
    UPDATE profiles 
    SET location_id = default_location_id,
        updated_at = NOW()
    WHERE id = user_record.id;

    RAISE NOTICE 'Usuario % (%) asignado a ubicación predeterminada', user_record.full_name, user_record.email;
  END LOOP;

  RAISE NOTICE 'Proceso completado. Ubicación predeterminada: %', default_location_id;
END $$;

-- 3. Verificar el resultado
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.location_id,
  l.name as location_name,
  l.code as location_code,
  COUNT(ul.location_id) as additional_locations
FROM profiles p
LEFT JOIN locations l ON l.id = p.location_id
LEFT JOIN user_locations ul ON ul.user_id = p.id
WHERE p.role IN ('requester', 'agent_l1', 'agent_l2', 'supervisor')
GROUP BY p.id, p.email, p.full_name, p.role, p.location_id, l.name, l.code
ORDER BY p.role, p.full_name;
