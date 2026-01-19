-- RESET COMPLETO de RLS para tickets_maintenance

-- 1. Deshabilitar RLS temporalmente
ALTER TABLE public.tickets_maintenance DISABLE ROW LEVEL SECURITY;

-- 2. Eliminar TODAS las políticas existentes
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'tickets_maintenance'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.tickets_maintenance', r.policyname);
    RAISE NOTICE 'Eliminada política: %', r.policyname;
  END LOOP;
END $$;

-- 3. Habilitar RLS
ALTER TABLE public.tickets_maintenance ENABLE ROW LEVEL SECURITY;

-- 4. Crear política de INSERT ULTRA PERMISIVA
CREATE POLICY "tickets_maintenance_insert_allow_all"
ON public.tickets_maintenance
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 5. Crear política de SELECT básica
CREATE POLICY "tickets_maintenance_select_basic"
ON public.tickets_maintenance
FOR SELECT
TO authenticated
USING (
  -- Admin ve todo
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
  OR
  -- Usuario ve sus propios tickets
  tickets_maintenance.requester_id = auth.uid()
  OR
  -- Supervisor/Agente de MANTENIMIENTO
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('supervisor', 'agent_l1', 'agent_l2')
    AND (profiles.asset_category = 'MAINTENANCE' OR profiles.asset_category IS NULL)
  )
);

-- 6. Crear política de UPDATE básica
CREATE POLICY "tickets_maintenance_update_basic"
ON public.tickets_maintenance
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.role = 'admin'
      OR tickets_maintenance.requester_id = auth.uid()
      OR (profiles.role IN ('supervisor', 'agent_l1', 'agent_l2') AND (profiles.asset_category = 'MAINTENANCE' OR profiles.asset_category IS NULL))
    )
  )
)
WITH CHECK (true);

-- 7. Verificar estado final
SELECT '=== RLS HABILITADO ===' as info;
SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity THEN 'HABILITADO ✓'
    ELSE 'DESHABILITADO ✗'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'tickets_maintenance';

SELECT '=== POLÍTICAS ACTIVAS ===' as info;
SELECT 
  policyname,
  cmd,
  permissive,
  CASE 
    WHEN with_check = 'true' THEN 'Permite todo ✓'
    ELSE 'Tiene restricciones'
  END as insert_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'tickets_maintenance'
ORDER BY cmd, policyname;
