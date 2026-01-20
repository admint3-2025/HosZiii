-- =====================================================
-- DIAGNÓSTICO RLS: listar todas las policies activas
-- =====================================================

-- 1) Verificar que locations TIENE RLS habilitado
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN ('locations', 'inspections_rrhh', 'inspections_rrhh_areas', 'inspections_rrhh_items');

-- 2) Listar TODAS las policies en locations
SELECT policyname, permissive, roles, qual, with_check FROM pg_policies WHERE tablename = 'locations' ORDER BY policyname;

-- 3) Listar TODAS las policies en inspections_rrhh
SELECT policyname, permissive, roles, qual, with_check FROM pg_policies WHERE tablename = 'inspections_rrhh' ORDER BY policyname;

-- 4) Listar TODAS las policies en inspections_rrhh_areas
SELECT policyname, permissive, roles, qual, with_check FROM pg_policies WHERE tablename = 'inspections_rrhh_areas' ORDER BY policyname;

-- 5) Listar TODAS las policies en inspections_rrhh_items
SELECT policyname, permissive, roles, qual, with_check FROM pg_policies WHERE tablename = 'inspections_rrhh_items' ORDER BY policyname;

-- 6) Verificar que el usuario director EXISTE en profiles
SELECT id, role, role::text FROM public.profiles WHERE role::text = 'director' LIMIT 1;

-- 7) Verificar user_locations para director
SELECT * FROM public.user_locations WHERE user_id IN (SELECT id FROM public.profiles WHERE role::text = 'director') LIMIT 5;

-- 8) Test simple: ¿puede director ver locations?
SELECT id, code, name, is_active FROM public.locations LIMIT 5;

-- 9) ¿Y inspections_rrhh?
SELECT * FROM public.inspections_rrhh LIMIT 5;
