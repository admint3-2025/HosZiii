-- =====================================================
-- BARRIDO RLS: Director = Admin (a nivel BD)
--
-- Objetivo:
-- - Actualizar policies RLS existentes para que donde se valide 'admin'
--   también se permita 'director'.
--
-- Caso típico que resuelve:
-- - Policies con checks como:
--     role = 'admin'
--     role::text = 'admin'
--     role IN ('admin', ...)
--
-- Nota importante:
-- - Este script NO crea nuevas policies desde cero: altera las existentes.
-- - Hace reemplazos de texto sobre la expresión de la policy. Es seguro para
--   los patrones comunes, pero si tienes policies con lógica muy distinta,
--   revisa el resultado con el query de verificación al final.
--
-- Requisito previo:
-- - Si profiles.role es enum, asegúrate de haber agregado el valor 'director':
--     ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'director';
-- =====================================================

DO $do$
DECLARE
  p RECORD;
  new_qual text;
  new_check text;
  changed_count int := 0;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (qual ILIKE '%admin%')
        OR (with_check ILIKE '%admin%')
      )
  LOOP
    new_qual := p.qual;
    new_check := p.with_check;

    -- =============================
    -- Patch USING (qual)
    -- =============================
    IF new_qual IS NOT NULL THEN
      -- Normalizar patrones rotos (por ejemplo: IN ('admin','director')::user_role)
      new_qual := regexp_replace(
        new_qual,
        'IN\s*\(\s*''admin''\s*,\s*''director''\s*\)\s*::\s*public\.user_role',
        'IN (''admin''::public.user_role, ''director''::public.user_role)',
        'gi'
      );
      new_qual := regexp_replace(
        new_qual,
        'IN\s*\(\s*''admin''\s*,\s*''director''\s*\)\s*::\s*user_role',
        'IN (''admin''::user_role, ''director''::user_role)',
        'gi'
      );
      new_qual := regexp_replace(
        new_qual,
        'role::text\s+IN\s*\(\s*''admin''\s*,\s*''director''\s*\)\s*::\s*public\.user_role',
        'role::text IN (''admin'',''director'')',
        'gi'
      );
      new_qual := regexp_replace(
        new_qual,
        'role::text\s+IN\s*\(\s*''admin''\s*,\s*''director''\s*\)\s*::\s*user_role',
        'role::text IN (''admin'',''director'')',
        'gi'
      );

      -- 1) role = 'admin' / role::text = 'admin' => role::text IN ('admin','director')
      -- Primero cubrir igualdad con cast a enum: role = 'admin'::user_role => role IN ('admin'::user_role,'director'::user_role)
      new_qual := regexp_replace(
        new_qual,
        'role\s*=\s*''admin''\s*::\s*public\.user_role',
        'role IN (''admin''::public.user_role, ''director''::public.user_role)',
        'gi'
      );
      new_qual := regexp_replace(
        new_qual,
        'role\s*=\s*''admin''\s*::\s*user_role',
        'role IN (''admin''::user_role, ''director''::user_role)',
        'gi'
      );

      -- Luego cubrir igualdad sin cast: usar ::text para que funcione con enum/text sin pelear con casts
      new_qual := regexp_replace(new_qual, 'role\s*=\s*''admin''', 'role::text IN (''admin'',''director'')', 'gi');
      new_qual := regexp_replace(new_qual, 'role::text\s*=\s*''admin''', 'role::text IN (''admin'',''director'')', 'gi');

      -- 2) role IN (...) con enum: insertar director como literal casteado (evita casts inválidos)
      IF new_qual ~* 'role\s+in\s*\(' AND new_qual ~* '''admin''\s*::\s*(public\.)?user_role' AND NOT (new_qual ~* '''director''\s*::\s*(public\.)?user_role') THEN
        new_qual := regexp_replace(
          new_qual,
          '''admin''\s*::\s*public\.user_role',
          '''admin''::public.user_role, ''director''::public.user_role',
          'gi'
        );
        new_qual := regexp_replace(
          new_qual,
          '''admin''\s*::\s*user_role',
          '''admin''::user_role, ''director''::user_role',
          'gi'
        );
      END IF;
    END IF;

    -- =============================
    -- Patch WITH CHECK
    -- =============================
    IF new_check IS NOT NULL THEN
      -- Normalizar patrones rotos (por ejemplo: IN ('admin','director')::user_role)
      new_check := regexp_replace(
        new_check,
        'IN\s*\(\s*''admin''\s*,\s*''director''\s*\)\s*::\s*public\.user_role',
        'IN (''admin''::public.user_role, ''director''::public.user_role)',
        'gi'
      );
      new_check := regexp_replace(
        new_check,
        'IN\s*\(\s*''admin''\s*,\s*''director''\s*\)\s*::\s*user_role',
        'IN (''admin''::user_role, ''director''::user_role)',
        'gi'
      );
      new_check := regexp_replace(
        new_check,
        'role::text\s+IN\s*\(\s*''admin''\s*,\s*''director''\s*\)\s*::\s*public\.user_role',
        'role::text IN (''admin'',''director'')',
        'gi'
      );
      new_check := regexp_replace(
        new_check,
        'role::text\s+IN\s*\(\s*''admin''\s*,\s*''director''\s*\)\s*::\s*user_role',
        'role::text IN (''admin'',''director'')',
        'gi'
      );

      new_check := regexp_replace(
        new_check,
        'role\s*=\s*''admin''\s*::\s*public\.user_role',
        'role IN (''admin''::public.user_role, ''director''::public.user_role)',
        'gi'
      );
      new_check := regexp_replace(
        new_check,
        'role\s*=\s*''admin''\s*::\s*user_role',
        'role IN (''admin''::user_role, ''director''::user_role)',
        'gi'
      );

      new_check := regexp_replace(new_check, 'role\s*=\s*''admin''', 'role::text IN (''admin'',''director'')', 'gi');
      new_check := regexp_replace(new_check, 'role::text\s*=\s*''admin''', 'role::text IN (''admin'',''director'')', 'gi');

      IF new_check ~* 'role\s+in\s*\(' AND new_check ~* '''admin''\s*::\s*(public\.)?user_role' AND NOT (new_check ~* '''director''\s*::\s*(public\.)?user_role') THEN
        new_check := regexp_replace(
          new_check,
          '''admin''\s*::\s*public\.user_role',
          '''admin''::public.user_role, ''director''::public.user_role',
          'gi'
        );
        new_check := regexp_replace(
          new_check,
          '''admin''\s*::\s*user_role',
          '''admin''::user_role, ''director''::user_role',
          'gi'
        );
      END IF;
    END IF;

    -- Si no cambió nada, saltar
    IF (coalesce(new_qual,'') = coalesce(p.qual,'')) AND (coalesce(new_check,'') = coalesce(p.with_check,'')) THEN
      CONTINUE;
    END IF;

    -- Alterar policy: USING
    IF p.qual IS NOT NULL AND coalesce(new_qual,'') <> coalesce(p.qual,'') THEN
      EXECUTE format('ALTER POLICY %I ON %I.%I USING (%s)', p.policyname, p.schemaname, p.tablename, new_qual);
    END IF;

    -- Alterar policy: WITH CHECK
    IF p.with_check IS NOT NULL AND coalesce(new_check,'') <> coalesce(p.with_check,'') THEN
      EXECUTE format('ALTER POLICY %I ON %I.%I WITH CHECK (%s)', p.policyname, p.schemaname, p.tablename, new_check);
    END IF;

    changed_count := changed_count + 1;
  END LOOP;

  RAISE NOTICE 'Barrido completo. Policies ajustadas: %', changed_count;
END $do$;

-- =====================================================
-- VERIFICACIÓN
--
-- Lista policies que mencionan admin pero NO director (posibles pendientes)
-- =====================================================

-- SELECT schemaname, tablename, policyname, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND (coalesce(qual,'') ILIKE '%admin%' OR coalesce(with_check,'') ILIKE '%admin%')
--   AND NOT (coalesce(qual,'') ILIKE '%director%' OR coalesce(with_check,'') ILIKE '%director%')
-- ORDER BY tablename, policyname;
