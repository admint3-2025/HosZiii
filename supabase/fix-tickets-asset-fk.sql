-- ============================================================================
-- FIX: tickets.asset_id FK rompe con assets_it/assets_maintenance
--
-- Síntoma:
--   insert or update on table "tickets" violates foreign key constraint "tickets_asset_id_fkey"
--
-- Causa:
--   El frontend está enviando asset_id de assets_it, pero tickets.asset_id todavía
--   tiene un FK apuntando a assets (legacy) o a una tabla distinta.
--
-- Solución segura (mínima): eliminar el FK para permitir asset_id de distintas tablas.
-- Luego el código busca el activo en assets_it o assets según exista.
-- ============================================================================

BEGIN;

ALTER TABLE public.tickets
  DROP CONSTRAINT IF EXISTS tickets_asset_id_fkey;

-- (Opcional) Index para consultas por asset_id
CREATE INDEX IF NOT EXISTS idx_tickets_asset_id
  ON public.tickets(asset_id);

NOTIFY pgrst, 'reload schema';

COMMIT;
