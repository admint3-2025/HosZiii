-- ============================================
-- DIAGNÓSTICO COMPLETO: ¿Por qué el admin no ve datos?
-- ============================================

-- 1. Verificar usuario actual y su role
SELECT 
  'MI USUARIO' as info,
  auth.uid() as user_id,
  (SELECT email FROM auth.users WHERE id = auth.uid()) as email,
  (SELECT role FROM profiles WHERE id = auth.uid()) as role;

-- 2. Ver TODAS las políticas RLS activas en tickets
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN left(qual, 100)
    ELSE 'NULL'
  END as condition_preview
FROM pg_policies 
WHERE tablename = 'tickets'
ORDER BY policyname;

-- 3. Ver TODAS las políticas RLS activas en locations
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN left(qual, 100)
    ELSE 'NULL'
  END as condition_preview
FROM pg_policies 
WHERE tablename = 'locations'
ORDER BY policyname;

-- 4. Probar si la condición de admin funciona
SELECT 
  'TEST: ¿Soy admin según profiles?' as test,
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
  ) as resultado;

-- 5. Contar tickets SIN aplicar filtros (debe fallar si RLS bloquea)
SELECT 
  'Tickets que VEO con RLS activo' as descripcion,
  COUNT(*) as cantidad
FROM tickets;

-- 6. Contar locations SIN aplicar filtros
SELECT 
  'Locations que VEO con RLS activo' as descripcion,
  COUNT(*) as cantidad
FROM locations;

-- 7. Ver distribución de tickets por sede (lo que VEO actualmente)
SELECT 
  l.code as sede,
  COUNT(t.id) as tickets_visibles
FROM locations l
LEFT JOIN tickets t ON t.location_id = l.id
GROUP BY l.id, l.code
ORDER BY tickets_visibles DESC;

-- 8. Verificar si hay user_locations bloqueando
SELECT 
  'User locations asignadas' as info,
  COUNT(*) as cantidad
FROM user_locations
WHERE user_id = auth.uid();
