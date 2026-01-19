-- Diagnóstico profundo de RLS en tickets_maintenance

-- 1. Verificar si RLS está realmente habilitado
SELECT 
  '=== ESTADO DE RLS ===' as info,
  tablename,
  rowsecurity as rls_enabled,
  CASE WHEN rowsecurity THEN 'HABILITADO ✓' ELSE 'DESHABILITADO ✗' END as status
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'tickets_maintenance';

-- 2. Ver TODAS las políticas con su configuración completa
SELECT 
  '=== TODAS LAS POLÍTICAS ===' as info,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'tickets_maintenance'
ORDER BY cmd, policyname;

-- 3. Verificar si hay GRANTS/REVOKES que estén bloqueando
SELECT 
  '=== PERMISOS DE TABLA ===' as info,
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = 'tickets_maintenance'
ORDER BY grantee, privilege_type;

-- 4. Verificar constraints que puedan estar fallando
SELECT 
  '=== CONSTRAINTS ===' as info,
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.tickets_maintenance'::regclass
ORDER BY contype, conname;

-- 5. Si RLS está causando problemas, DESHABILITARLO COMPLETAMENTE
-- (Descomenta si quieres deshabilitarlo como última opción)
-- ALTER TABLE public.tickets_maintenance DISABLE ROW LEVEL SECURITY;
-- SELECT '⚠️ RLS DESHABILITADO COMPLETAMENTE' as warning;
