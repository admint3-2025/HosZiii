-- ============================================================================
-- LIMPIAR ASIGNACIONES INCORRECTAS DE SEDES
-- ============================================================================
-- Elimina asignaciones de sedes que NO corresponden a cada usuario
-- ============================================================================

BEGIN;

-- 1. Ver las asignaciones actuales antes de limpiar
SELECT 
  'ANTES DE LIMPIAR' as estado,
  u.email,
  p.full_name,
  l.code as sede,
  l.name as sede_nombre
FROM user_locations ul
JOIN profiles p ON p.id = ul.user_id
JOIN auth.users u ON u.id = p.id
JOIN locations l ON l.id = ul.location_id
ORDER BY u.email, l.code;

-- 2. LIMPIAR: Eliminar asignaciones incorrectas
-- Solo mantener las sedes correctas para cada usuario

-- edelatorre298@gmail.com - Solo debe estar en EMTY
DELETE FROM user_locations
WHERE user_id = (
  SELECT p.id FROM profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE u.email = 'edelatorre298@gmail.com'
)
AND location_id NOT IN (
  SELECT id FROM locations WHERE code = 'EMTY'
);

-- proyectos@integrational3.com.mx - Solo debe estar en EGDLS
DELETE FROM user_locations
WHERE user_id = (
  SELECT p.id FROM profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE u.email = 'proyectos@integrational3.com.mx'
)
AND location_id NOT IN (
  SELECT id FROM locations WHERE code = 'EGDLS'
);

-- 3. Ver las asignaciones después de limpiar
SELECT 
  'DESPUES DE LIMPIAR' as estado,
  u.email,
  p.full_name,
  l.code as sede,
  l.name as sede_nombre
FROM user_locations ul
JOIN profiles p ON p.id = ul.user_id
JOIN auth.users u ON u.id = p.id
JOIN locations l ON l.id = ul.location_id
ORDER BY u.email, l.code;

COMMIT;

-- ============================================================================
-- RESULTADO ESPERADO
-- ============================================================================
-- edelatorre298@gmail.com debe aparecer solo con EMTY
-- ============================================================================
