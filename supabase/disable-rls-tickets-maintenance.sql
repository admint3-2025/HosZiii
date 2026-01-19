-- SOLUCIÓN INMEDIATA: Deshabilitar RLS en tickets_maintenance

-- Deshabilitar RLS completamente
ALTER TABLE public.tickets_maintenance DISABLE ROW LEVEL SECURITY;

-- Verificar
SELECT 
  '=== ESTADO FINAL ===' as info,
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '❌ AÚN HABILITADO' 
    ELSE '✅ DESHABILITADO' 
  END as status
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'tickets_maintenance';

-- Mostrar políticas existentes (deberían seguir ahí pero inactivas)
SELECT 
  '=== POLÍTICAS (INACTIVAS) ===' as info,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'tickets_maintenance';

SELECT '✅ RLS DESHABILITADO - Los usuarios ahora pueden crear tickets de mantenimiento' as resultado;
