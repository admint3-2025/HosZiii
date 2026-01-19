-- ============================================================================
-- FIX: RLS SELECT para que usuarios vean activos de su(s) sede(s)
--
-- Síntoma en frontend:
--   [TicketCreateForm] ❌ NO SE ENCONTRARON ACTIVOS
--
-- Causa típica:
--   La policy SELECT de assets_it / assets_maintenance es demasiado restrictiva
--   (ej. solo admin o asset_category), por lo que requesters no ven activos.
--
-- Ejecutar con SERVICE ROLE.
-- ============================================================================

BEGIN;

-- Asegurar RLS habilitado
ALTER TABLE public.assets_it ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets_maintenance ENABLE ROW LEVEL SECURITY;

-- Reemplazar policies SELECT
DROP POLICY IF EXISTS "assets_it_select" ON public.assets_it;
CREATE POLICY "assets_it_select" ON public.assets_it
FOR SELECT TO authenticated
USING (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND (
      -- Admins ven todo
      p.role IN ('admin', 'corporate_admin')
      OR
      -- Usuarios ven activos de sus sedes
      (
        p.role IN ('supervisor', 'agent_l1', 'agent_l2', 'requester')
        AND (
          assets_it.location_id IS NULL
          OR assets_it.location_id = p.location_id
          OR EXISTS (
            SELECT 1
            FROM public.user_locations ul
            WHERE ul.user_id = auth.uid()
              AND ul.location_id = assets_it.location_id
          )
        )
      )
    )
  )
);

DROP POLICY IF EXISTS "assets_maintenance_select" ON public.assets_maintenance;
DROP POLICY IF EXISTS "assets_maintenance_unified_select" ON public.assets_maintenance;
CREATE POLICY "assets_maintenance_select" ON public.assets_maintenance
FOR SELECT TO authenticated
USING (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND (
      p.role IN ('admin', 'corporate_admin')
      OR (
        p.role IN ('supervisor', 'agent_l1', 'agent_l2', 'requester')
        AND (
          assets_maintenance.location_id IS NULL
          OR assets_maintenance.location_id = p.location_id
          OR EXISTS (
            SELECT 1
            FROM public.user_locations ul
            WHERE ul.user_id = auth.uid()
              AND ul.location_id = assets_maintenance.location_id
          )
        )
      )
    )
  )
);

-- Recargar schema cache de PostgREST
NOTIFY pgrst, 'reload schema';

COMMIT;
