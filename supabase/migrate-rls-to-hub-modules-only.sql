-- =====================================================
-- MIGRACIÓN: Sincronizar RLS policies con hub_visible_modules
-- Fecha: 2026-02-15
-- Propósito: Remover dependencias de is_it_supervisor/is_maintenance_supervisor en RLS
-- =====================================================

-- ==========================================
-- PARTE 1: TICKETS (tabla legacy - IT)
-- ==========================================

DROP POLICY IF EXISTS "tickets_select_with_hub_modules" ON public.tickets;

CREATE POLICY "tickets_select_with_hub_modules"
ON public.tickets
FOR SELECT
TO authenticated
USING (
  -- Admin ve todo
  auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
  OR
  -- Usuario es solicitante
  tickets.requester_id = auth.uid()
  OR
  -- Usuario es asignado
  tickets.assigned_agent_id = auth.uid()
  OR
  -- Staff IT operativo (con acceso a módulo IT)
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND (p.hub_visible_modules->>'it-helpdesk')::text IN ('user', 'supervisor')
    AND (
      p.is_corporate = true
      OR (
        p.role IN ('supervisor', 'agent_l1', 'agent_l2')
        AND (
          tickets.location_id = p.location_id
          OR tickets.location_id IN (
            SELECT location_id FROM public.user_locations WHERE user_id = auth.uid()
          )
        )
      )
    )
  )
);

-- ==========================================
-- PARTE 2: TICKETS_MAINTENANCE
-- ==========================================

DROP POLICY IF EXISTS "tickets_maintenance_select_hub" ON public.tickets_maintenance;

CREATE POLICY "tickets_maintenance_select_hub"
ON public.tickets_maintenance
FOR SELECT
TO authenticated
USING (
  -- Admin ve todo
  auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
  OR
  -- Usuario es solicitante
  tickets_maintenance.requester_id = auth.uid()
  OR
  -- Usuario es asignado
  tickets_maintenance.assigned_agent_id = auth.uid()
  OR
  -- Staff Mantenimiento (con acceso a módulo mantenimiento)
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND (p.hub_visible_modules->>'mantenimiento')::text IN ('user', 'supervisor')
    AND (
      p.is_corporate = true
      OR (
        p.role IN ('supervisor', 'agent_l1', 'agent_l2')
        AND (
          tickets_maintenance.location_id = p.location_id
          OR tickets_maintenance.location_id IN (
            SELECT location_id FROM public.user_locations WHERE user_id = auth.uid()
          )
        )
      )
    )
  )
);

-- ==========================================
-- NOTA IMPORTANTE
-- ==========================================
-- Los campos is_it_supervisor y is_maintenance_supervisor aún existen en profiles
-- pero ya NO son usados por:
-- - Aplicación (removido en Phase 2-3)
-- - RLS policies (actualizado aquí)
--
-- Se pueden eliminar en una migración posterior si no hay rollback
-- Considera mantenerlos por 1-2 semanas para poder rollbackear si es necesario
