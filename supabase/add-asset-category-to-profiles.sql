-- Migración: Agregar campo asset_category a profiles para filtrar tickets por área
-- Ejecutar en Supabase SQL Editor
-- Fecha: 2026-01-15

-- Agregar columna asset_category si no existe
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'profiles' 
    and column_name = 'asset_category'
  ) then
    alter table public.profiles add column asset_category text;
    comment on column public.profiles.asset_category is 'Categoría de activos/área de servicio: IT o MAINTENANCE. NULL = ve todo (admin)';
  end if;
end $$;

-- Crear índice para búsquedas rápidas
create index if not exists idx_profiles_asset_category on public.profiles(asset_category);

-- Actualizar perfiles de ejemplo basándose en el departamento (opcional, ajustar según necesidad)
-- Descomentar y ajustar según los departamentos de tu organización:

-- UPDATE public.profiles 
-- SET asset_category = 'MAINTENANCE' 
-- WHERE lower(department) like '%mantenim%' 
--    OR lower(department) like '%hvac%'
--    OR lower(department) like '%infraestructura%'
--    OR lower(department) like '%plomer%'
--    OR lower(department) like '%electric%';

-- UPDATE public.profiles 
-- SET asset_category = 'IT' 
-- WHERE lower(department) like '%sistema%' 
--    OR lower(department) like '%tecnolog%'
--    OR lower(department) like '%soporte%'
--    OR lower(department) like '%informatica%';

-- Verificar la columna
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' 
  and table_name = 'profiles' 
  and column_name = 'asset_category';
