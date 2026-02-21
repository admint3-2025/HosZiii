-- ============================================================================
-- Ops: GRANTs de escritura para las tablas del esquema ops
-- Las RLS policies ya controlan quién puede escribir (admin / supervisor corporativo)
-- Pero PostgREST necesita los GRANTs de rol base para permitir las operaciones
-- ============================================================================

GRANT ALL ON ALL TABLES IN SCHEMA ops TO authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ops TO authenticated, service_role;

-- Asegurar que futuros objetos también tengan permisos
ALTER DEFAULT PRIVILEGES IN SCHEMA ops
  GRANT ALL ON TABLES TO authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA ops
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated, service_role;
