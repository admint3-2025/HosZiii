-- =====================================================
-- MIGRACIÓN: Agregar 'director' al enum de roles (si aplica)
--
-- Problema que resuelve:
--   ERROR: 22P02 invalid input value for enum user_role: "director"
--
-- Nota:
-- - Ejecuta este SQL ANTES de policies/updates que comparen role = 'director'
--   si tu columna public.profiles.role es un enum.
-- - Si tu tipo enum no se llama public.user_role, ajusta el nombre.
-- =====================================================

-- Verifica el tipo real de la columna role:
-- SELECT data_type, udt_name
-- FROM information_schema.columns
-- WHERE table_schema='public' AND table_name='profiles' AND column_name='role';

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'director';
