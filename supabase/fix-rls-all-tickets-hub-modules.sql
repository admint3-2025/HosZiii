-- =====================================================
-- FIX COMPLETO: Sincronizar TODAS las RLS con hub_visible_modules
-- =====================================================
-- Fecha: 2026-02-08
-- Problema: Políticas RLS hardcodeadas con asset_category, ignoran hub_visible_modules
-- Tablas afectadas: tickets, tickets_it, tickets_maintenance
-- =====================================================

-- ==========================================
-- PARTE 1: TICKETS PRINCIPAL (tabla legacy/unificada)
-- ==========================================

-- Eliminar políticas SELECT antiguas de tickets
DROP POLICY IF EXISTS "tickets_select_requester" ON public.tickets;
DROP POLICY IF EXISTS "tickets_select_agents" ON public.tickets;
DROP POLICY IF EXISTS "tickets_select_supervisor_admin" ON public.tickets;
DROP POLICY IF EXISTS "tickets_select" ON public.tickets;
DROP POLICY IF EXISTS "tickets_select_with_hub" ON public.tickets;
DROP POLICY IF EXISTS "tickets_select_with_hub_modules" ON public.tickets;

-- Crear política unificada para tickets (tabla legacy)
CREATE POLICY "tickets_select_with_hub_modules"
ON public.tickets
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND (
      -- Admin ve todo
      p.role = 'admin'
      OR
      -- Usuario es solicitante
      tickets.requester_id = auth.uid()
      OR
      -- Usuario es asignado
      tickets.assigned_agent_id = auth.uid()
      OR
      -- Tiene permiso operativo y ticket en ubicación accesible
      (
        p.role IN ('supervisor', 'agent_l1', 'agent_l2', 'corporate_admin')
        AND (
          -- Ubicación del ticket coincide
          tickets.location_id = p.location_id
          OR
          tickets.location_id IN (
            SELECT location_id FROM public.user_locations WHERE user_id = auth.uid()
          )
          OR
          -- Corporate admin sin ubicación ve todo
          (p.role = 'corporate_admin' AND p.location_id IS NULL)
        )
      )
    )
  )
);

-- ==========================================
-- PARTE 2: TICKETS_IT
-- ==========================================

-- Eliminar políticas SELECT antiguas de tickets_it
DROP POLICY IF EXISTS "tickets_it_select" ON public.tickets_it;
DROP POLICY IF EXISTS "tickets_it_select_policy" ON public.tickets_it;
DROP POLICY IF EXISTS "tickets_it_select_with_hub_modules" ON public.tickets_it;

-- Crear política para tickets_it considerando hub_visible_modules
CREATE POLICY "tickets_it_select_with_hub_modules"
ON public.tickets_it
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND (
      -- Admin ve todo
      p.role = 'admin'
      OR
      -- Usuario es solicitante
      tickets_it.requester_id = auth.uid()
      OR
      -- Usuario es asignado
      tickets_it.assigned_agent_id = auth.uid()
      OR
      -- Tiene permiso IT (asset_category O hub_visible_modules)
      (
        p.role IN ('supervisor', 'agent_l1', 'agent_l2', 'corporate_admin')
        AND (
          p.asset_category = 'IT' 
          OR (p.hub_visible_modules->>'it-helpdesk')::boolean = true
        )
        AND (
          tickets_it.location_id = p.location_id
          OR tickets_it.location_id IN (
            SELECT location_id FROM public.user_locations WHERE user_id = auth.uid()
          )
          OR (p.role = 'corporate_admin' AND p.location_id IS NULL)
        )
      )
    )
  )
);

-- ==========================================
-- PARTE 3: TICKETS_MAINTENANCE
-- ==========================================

-- Eliminar políticas SELECT antiguas de tickets_maintenance (incluye la nueva)
DROP POLICY IF EXISTS "tickets_maintenance_select" ON public.tickets_maintenance;
DROP POLICY IF EXISTS "tickets_maintenance_select_policy" ON public.tickets_maintenance;
DROP POLICY IF EXISTS "tickets_maintenance_select_basic" ON public.tickets_maintenance;
DROP POLICY IF EXISTS "tickets_maintenance_select_with_hub_modules" ON public.tickets_maintenance;

-- Crear política para tickets_maintenance considerando hub_visible_modules
CREATE POLICY "tickets_maintenance_select_with_hub_modules"
ON public.tickets_maintenance
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND (
      -- Admin ve todo
      p.role = 'admin'
      OR
      -- Usuario es solicitante
      tickets_maintenance.requester_id = auth.uid()
      OR
      -- Usuario es asignado
      tickets_maintenance.assigned_to = auth.uid()
      OR
      -- Tiene permiso MANTENIMIENTO (asset_category O hub_visible_modules)
      (
        p.role IN ('supervisor', 'agent_l1', 'agent_l2', 'corporate_admin')
        AND (
          p.asset_category = 'MAINTENANCE' 
          OR (p.hub_visible_modules->>'mantenimiento')::boolean = true
        )
        AND (
          tickets_maintenance.location_id = p.location_id
          OR tickets_maintenance.location_id IN (
            SELECT location_id FROM public.user_locations WHERE user_id = auth.uid()
          )
          OR (p.role = 'corporate_admin' AND p.location_id IS NULL)
        )
      )
    )
  )
);

-- ==========================================
-- VERIFICACIÓN
-- ==========================================

-- Ver todas las políticas SELECT aplicadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE tablename IN ('tickets', 'tickets_it', 'tickets_maintenance')
  AND cmd = 'SELECT'
ORDER BY tablename, policyname;

-- Verificar acceso de Edith De la Torre
SELECT 
  p.full_name,
  u.email,
  p.role,
  p.asset_category,
  (p.hub_visible_modules->>'it-helpdesk')::boolean as tiene_it_hub,
  (p.hub_visible_modules->>'mantenimiento')::boolean as tiene_mantenimiento_hub,
  p.location_id,
  l.code as location_code,
  (SELECT COUNT(*) FROM tickets_maintenance tm 
   WHERE tm.location_id = p.location_id AND tm.deleted_at IS NULL) as tickets_mant_en_sede,
  (SELECT COUNT(*) FROM tickets_it ti 
   WHERE ti.location_id = p.location_id AND ti.deleted_at IS NULL) as tickets_it_en_sede
FROM profiles p
INNER JOIN auth.users u ON u.id = p.id
LEFT JOIN locations l ON l.id = p.location_id
WHERE u.email = 'edelatorre298@gmail.com';

-- Resumen de usuarios con permisos por hub_visible_modules
SELECT 
  p.asset_category,
  p.role,
  COUNT(*) as total,
  COUNT(CASE WHEN (p.hub_visible_modules->>'it-helpdesk')::boolean = true THEN 1 END) as con_it_hub,
  COUNT(CASE WHEN (p.hub_visible_modules->>'mantenimiento')::boolean = true THEN 1 END) as con_mant_hub
FROM profiles p
WHERE p.role IN ('agent_l1', 'agent_l2', 'supervisor')
GROUP BY p.asset_category, p.role
ORDER BY p.asset_category, p.role;

-- ==========================================
-- PARTE 4: ASSETS_IT Y ASSETS_MAINTENANCE
-- ==========================================

-- Eliminar políticas SELECT antiguas de assets_it
DROP POLICY IF EXISTS "assets_it_select" ON public.assets_it;
DROP POLICY IF EXISTS "assets_it_select_policy" ON public.assets_it;
DROP POLICY IF EXISTS "assets_it_select_with_hub_modules" ON public.assets_it;

-- Crear política para assets_it considerando hub_visible_modules
CREATE POLICY "assets_it_select_with_hub_modules"
ON public.assets_it
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND (
      -- Admin ve todo
      p.role = 'admin'
      OR
      -- Tiene permiso IT (asset_category O hub_visible_modules)
      (
        p.role IN ('supervisor', 'agent_l1', 'agent_l2', 'corporate_admin')
        AND (
          p.asset_category = 'IT' 
          OR (p.hub_visible_modules->>'it-helpdesk')::boolean = true
        )
        AND (
          assets_it.location_id = p.location_id
          OR assets_it.location_id IN (
            SELECT location_id FROM public.user_locations WHERE user_id = auth.uid()
          )
          OR (p.role = 'corporate_admin' AND p.location_id IS NULL)
        )
      )
    )
  )
);

-- Eliminar políticas SELECT antiguas de assets_maintenance
DROP POLICY IF EXISTS "assets_maintenance_select" ON public.assets_maintenance;
DROP POLICY IF EXISTS "assets_maintenance_select_policy" ON public.assets_maintenance;
DROP POLICY IF EXISTS "assets_maintenance_select_with_hub_modules" ON public.assets_maintenance;

-- Crear política para assets_maintenance considerando hub_visible_modules
CREATE POLICY "assets_maintenance_select_with_hub_modules"
ON public.assets_maintenance
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND (
      -- Admin ve todo
      p.role = 'admin'
      OR
      -- Tiene permiso MANTENIMIENTO (asset_category O hub_visible_modules)
      (
        p.role IN ('supervisor', 'agent_l1', 'agent_l2', 'corporate_admin')
        AND (
          p.asset_category = 'MAINTENANCE' 
          OR (p.hub_visible_modules->>'mantenimiento')::boolean = true
        )
        AND (
          assets_maintenance.location_id = p.location_id
          OR assets_maintenance.location_id IN (
            SELECT location_id FROM public.user_locations WHERE user_id = auth.uid()
          )
          OR (p.role = 'corporate_admin' AND p.location_id IS NULL)
        )
      )
    )
  )
);

-- ==========================================
-- VERIFICACIÓN FINAL
-- ==========================================

-- Ver TODAS las políticas SELECT aplicadas (tickets + assets)
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE tablename IN ('tickets', 'tickets_it', 'tickets_maintenance', 'assets_it', 'assets_maintenance')
  AND cmd = 'SELECT'
ORDER BY tablename, policyname;
