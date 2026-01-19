-- ============================================================================
-- FIX: Permitir que usuarios vean tickets_maintenance (evita 404 por notFound)
--
-- Síntoma:
--   GET /mantenimiento/tickets/<id> -> 404
--
-- Causa típica:
--   RLS SELECT en tickets_maintenance es demasiado restrictiva.
--
-- Ejecutar con SERVICE ROLE.
-- ============================================================================

BEGIN;

ALTER TABLE public.tickets_maintenance ENABLE ROW LEVEL SECURITY;

-- Quitar policies comunes que pueden existir
DROP POLICY IF EXISTS "tickets_maintenance_select" ON public.tickets_maintenance;
DROP POLICY IF EXISTS "Users can view maintenance tickets" ON public.tickets_maintenance;
DROP POLICY IF EXISTS "tickets_maintenance_unified_select" ON public.tickets_maintenance;

-- Permitir ver:
-- - Admin/corporate_admin: todo
-- - Requester: sus propios tickets
-- - Supervisor/agentes: tickets de sus sedes (profiles.location_id + user_locations)
CREATE POLICY "tickets_maintenance_select" ON public.tickets_maintenance
FOR SELECT TO authenticated
USING (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
    AND (
      p.role IN ('admin', 'corporate_admin')
      OR requester_id = auth.uid()
      OR (
        p.role IN ('supervisor', 'agent_l1', 'agent_l2')
        AND (
          tickets_maintenance.location_id IS NULL
          OR tickets_maintenance.location_id = p.location_id
          OR EXISTS (
            SELECT 1
            FROM public.user_locations ul
            WHERE ul.user_id = auth.uid()
              AND ul.location_id = tickets_maintenance.location_id
          )
        )
      )
    )
  )
);

NOTIFY pgrst, 'reload schema';

COMMIT;
