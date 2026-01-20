-- =====================================================
-- MIGRACIÓN: Rol "director" + configuración de módulos visibles en Hub
--
-- Objetivo:
-- - Agregar el rol "director" (mismo alcance que admin a nivel app).
-- - Persistir qué módulos ve en /hub mediante profiles.hub_modules.
--
-- Nota:
-- - El campo role en profiles es texto, no enum, así que no requiere alter type.
-- - Esta migración NO modifica todas las policies RLS existentes. Si quieres
--   que "director" tenga exactamente el mismo acceso que "admin" en BD,
--   actualiza policies para aceptar role IN ('admin','director').
-- =====================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hub_modules jsonb NOT NULL
  DEFAULT jsonb_build_object(
    'it-helpdesk', true,
    'mantenimiento', true,
    'corporativo', true,
    'administracion', true
  );

COMMENT ON COLUMN public.profiles.hub_modules IS
  'Módulos visibles en el Hub. Se usa principalmente para rol director.';
