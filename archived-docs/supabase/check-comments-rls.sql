-- Verificar políticas RLS de ticket_comments para inserción
-- Ejecutar esto en el SQL Editor de Supabase

-- 1. Ver las políticas actuales
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'ticket_comments'
ORDER BY cmd, policyname;

-- 2. Verificar si RLS está habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'ticket_comments';

-- 3. Test de inserción como agente L1
-- Reemplaza {USER_ID} con el ID de John Osorio y {TICKET_ID} con el ID del ticket de prueba
-- SELECT 
--   auth.uid() AS current_user_id,
--   EXISTS (
--     SELECT 1 FROM profiles 
--     WHERE id = auth.uid() AND role = 'agent_l1'
--   ) AS is_agent_l1;

-- INSERT INTO ticket_comments (ticket_id, author_id, content, is_internal)
-- VALUES ('{TICKET_ID}', '{USER_ID}', 'Test comment', false)
-- RETURNING *;
