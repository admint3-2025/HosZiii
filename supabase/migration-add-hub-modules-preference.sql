-- Agregar columna para preferencias de módulos visibles en el Hub
-- Disponible para TODOS los usuarios, no solo administradores

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS hub_visible_modules JSONB DEFAULT '{"it-helpdesk": true, "mantenimiento": true, "corporativo": true, "academia": true, "administracion": true}'::jsonb;

-- Índice para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_profiles_hub_visible_modules ON public.profiles USING gin (hub_visible_modules);

-- Comentario
COMMENT ON COLUMN public.profiles.hub_visible_modules IS 'Módulos visibles en el Hub para el usuario. Control visual únicamente, no afecta permisos reales de acceso.';
