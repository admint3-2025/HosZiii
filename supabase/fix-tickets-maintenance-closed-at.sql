-- ============================================================================
-- FIX: tickets_maintenance.closed_at faltante / PostgREST schema cache
--
-- Error típico:
--   Could not find the 'closed_at' column of 'tickets_maintenance' in the schema cache
--
-- Ejecuta este SQL en Supabase (SQL Editor) o vía tu script apply-supabase-sql.
-- ============================================================================

BEGIN;

ALTER TABLE public.tickets_maintenance
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

ALTER TABLE public.tickets_maintenance
  ADD COLUMN IF NOT EXISTS closed_by uuid;

ALTER TABLE public.tickets_maintenance
  ADD COLUMN IF NOT EXISTS resolution text;

ALTER TABLE public.tickets_maintenance
  ADD COLUMN IF NOT EXISTS assigned_to uuid;

COMMENT ON COLUMN public.tickets_maintenance.closed_at IS
  'Fecha y hora en que el ticket de mantenimiento fue cerrado';

COMMENT ON COLUMN public.tickets_maintenance.closed_by IS
  'Usuario (auth.users) que cerró el ticket de mantenimiento';

COMMENT ON COLUMN public.tickets_maintenance.resolution IS
  'Texto de resolución / cierre del ticket de mantenimiento';

COMMENT ON COLUMN public.tickets_maintenance.assigned_to IS
  'Usuario (auth.users) asignado para atender el ticket de mantenimiento';

-- (Opcional) Índice para consultas por fecha de cierre
CREATE INDEX IF NOT EXISTS idx_tickets_maintenance_closed_at
  ON public.tickets_maintenance (closed_at);

CREATE INDEX IF NOT EXISTS idx_tickets_maintenance_assigned_to
  ON public.tickets_maintenance (assigned_to);

-- Pedir a PostgREST/Supabase que recargue el schema cache
-- (Si no aplica en tu instalación, es inocuo.)
NOTIFY pgrst, 'reload schema';

COMMIT;
