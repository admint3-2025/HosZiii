-- ============================================================================
-- DIAGNÓSTICO: Por qué no aparecen activos en el formulario de tickets
--
-- Ejecutar con SERVICE ROLE (SQL Editor o scripts/apply-supabase-sql.mjs)
-- ============================================================================

-- 1) Conteos base (sin depender del cliente)
SELECT 'assets_it (total)' AS what, COUNT(*) AS total FROM public.assets_it;
SELECT 'assets_it (deleted_at is null)' AS what, COUNT(*) AS total FROM public.assets_it WHERE deleted_at IS NULL;

SELECT 'assets_maintenance (total)' AS what, COUNT(*) AS total FROM public.assets_maintenance;
SELECT 'assets_maintenance (deleted_at is null)' AS what, COUNT(*) AS total FROM public.assets_maintenance WHERE deleted_at IS NULL;

-- (Legacy) si existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='assets'
  ) THEN
    RAISE NOTICE 'assets table exists';
  ELSE
    RAISE NOTICE 'assets table does NOT exist';
  END IF;
END$$;

-- 2) Distribución rápida por status y location_id (para detectar status inesperados o location_id NULL)
SELECT status, COUNT(*) FROM public.assets_it WHERE deleted_at IS NULL GROUP BY status ORDER BY COUNT(*) DESC;
SELECT (location_id IS NULL) AS location_is_null, COUNT(*) FROM public.assets_it WHERE deleted_at IS NULL GROUP BY (location_id IS NULL);

-- 3) Ver políticas RLS activas (si el conteo existe pero el usuario ve 0, es RLS)
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename IN ('assets_it', 'assets_maintenance', 'assets')
ORDER BY tablename, policyname;

-- 4) Ver si RLS está habilitado
SELECT relname AS table_name, relrowsecurity AS rls_enabled
FROM pg_class
WHERE relname IN ('assets_it', 'assets_maintenance', 'assets');
