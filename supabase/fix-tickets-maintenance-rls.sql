-- Fix RLS para tickets_maintenance: permitir INSERT

-- Ver políticas actuales
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
WHERE tablename = 'tickets_maintenance'
ORDER BY policyname;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "tickets_maintenance_insert_policy" ON public.tickets_maintenance;
DROP POLICY IF EXISTS "tickets_maintenance_select_policy" ON public.tickets_maintenance;
DROP POLICY IF EXISTS "tickets_maintenance_update_policy" ON public.tickets_maintenance;
DROP POLICY IF EXISTS "tickets_maintenance_delete_policy" ON public.tickets_maintenance;

-- POLICY 1: INSERT - Cualquier usuario autenticado puede crear tickets
CREATE POLICY "tickets_maintenance_insert_policy"
ON public.tickets_maintenance
FOR INSERT
TO authenticated
WITH CHECK (true);

-- POLICY 2: SELECT - Ver tickets según rol y ubicación
CREATE POLICY "tickets_maintenance_select_policy"
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
  -- Supervisor/Agente de MANTENIMIENTO ven todos los tickets de su área y ubicaciones asignadas
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('supervisor', 'agent_l1', 'agent_l2')
    AND profiles.asset_category = 'MAINTENANCE'
    AND (
      -- Ubicación del perfil
      tickets_maintenance.location_id = profiles.location_id
      OR
      -- Ubicaciones asignadas en user_locations
      tickets_maintenance.location_id IN (
        SELECT location_id FROM public.user_locations
        WHERE user_id = auth.uid()
      )
    )
  )
  OR
  -- Usuario ve sus propios tickets
  tickets_maintenance.requester_id = auth.uid()
  OR
  -- Agente asignado ve el ticket
  tickets_maintenance.assigned_agent_id = auth.uid()
);

-- POLICY 3: UPDATE - Admin, supervisor/agente de MAINTENANCE, o usuario que creó el ticket
CREATE POLICY "tickets_maintenance_update_policy"
ON public.tickets_maintenance
FOR UPDATE
TO authenticated
USING (
  -- Admin puede actualizar todo
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
  OR
  -- Supervisor/Agente de MANTENIMIENTO pueden actualizar tickets de su área
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('supervisor', 'agent_l1', 'agent_l2')
    AND profiles.asset_category = 'MAINTENANCE'
    AND (
      tickets_maintenance.location_id = profiles.location_id
      OR
      tickets_maintenance.location_id IN (
        SELECT location_id FROM public.user_locations
        WHERE user_id = auth.uid()
      )
    )
  )
  OR
  -- Solicitante puede actualizar su propio ticket (solo si no está cerrado)
  (tickets_maintenance.requester_id = auth.uid() AND tickets_maintenance.status != 'CLOSED')
  OR
  -- Agente asignado puede actualizar
  tickets_maintenance.assigned_agent_id = auth.uid()
)
WITH CHECK (
  -- Las mismas condiciones para WITH CHECK
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('supervisor', 'agent_l1', 'agent_l2')
    AND profiles.asset_category = 'MAINTENANCE'
    AND (
      tickets_maintenance.location_id = profiles.location_id
      OR
      tickets_maintenance.location_id IN (
        SELECT location_id FROM public.user_locations
        WHERE user_id = auth.uid()
      )
    )
  )
  OR
  (tickets_maintenance.requester_id = auth.uid() AND tickets_maintenance.status != 'CLOSED')
  OR
  tickets_maintenance.assigned_agent_id = auth.uid()
);

-- POLICY 4: DELETE - Solo admin
CREATE POLICY "tickets_maintenance_delete_policy"
ON public.tickets_maintenance
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Verificar políticas creadas
SELECT 
  '=== POLÍTICAS TICKETS_MAINTENANCE ===' as info,
  policyname,
  cmd as operacion,
  roles
FROM pg_policies
WHERE tablename = 'tickets_maintenance'
ORDER BY cmd, policyname;
