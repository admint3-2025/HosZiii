-- Arreglar tickets de mantenimiento con requester_id NULL

-- 1. Ver tickets con requester_id NULL
SELECT 
  '=== TICKETS CON REQUESTER_ID NULL ===' as info,
  id,
  ticket_number,
  status,
  created_at,
  created_by
FROM tickets_maintenance
WHERE requester_id IS NULL
ORDER BY created_at DESC;

-- 2. Actualizar tickets para usar created_by como requester_id
-- (Si el ticket fue creado por alguien, ese alguien es el solicitante)
UPDATE tickets_maintenance
SET requester_id = created_by
WHERE requester_id IS NULL 
  AND created_by IS NOT NULL;

-- 3. Verificar resultado
SELECT 
  '=== RESULTADO ===' as info,
  COUNT(*) FILTER (WHERE requester_id IS NULL) as aun_null,
  COUNT(*) FILTER (WHERE requester_id IS NOT NULL) as con_requester,
  COUNT(*) as total
FROM tickets_maintenance;

-- 4. Si quedan tickets con NULL (creados sin created_by), asignarlos al primer admin
DO $$
DECLARE
  admin_id uuid;
BEGIN
  -- Obtener el primer admin
  SELECT id INTO admin_id
  FROM profiles
  WHERE role = 'admin'
  LIMIT 1;
  
  -- Actualizar tickets huérfanos
  IF admin_id IS NOT NULL THEN
    UPDATE tickets_maintenance
    SET requester_id = admin_id
    WHERE requester_id IS NULL;
    
    RAISE NOTICE 'Tickets huérfanos asignados al admin: %', admin_id;
  END IF;
END $$;

-- 5. Verificación final
SELECT 
  '=== VERIFICACIÓN FINAL ===' as info,
  COUNT(*) FILTER (WHERE requester_id IS NULL) as null_count,
  COUNT(*) as total,
  CASE 
    WHEN COUNT(*) FILTER (WHERE requester_id IS NULL) = 0 
    THEN '✅ TODOS LOS TICKETS TIENEN REQUESTER'
    ELSE '⚠️ AÚN HAY TICKETS SIN REQUESTER'
  END as status
FROM tickets_maintenance;
