-- ============================================================================
-- Buscar políticas RLS de INSERT en assets
-- ============================================================================

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
WHERE tablename = 'assets' 
  AND cmd = 'INSERT'
ORDER BY policyname;
