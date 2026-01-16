-- Script para corregir la obtención de usuarios notificables por sede
-- Ejecutar en el editor SQL de Supabase o incluir en tu pipeline de migraciones

-- La función prioriza la sede principal del perfil (profiles.location_id)
-- y, solo si no existe, usa las sedes adicionales de user_locations.
-- Admin siempre se muestra como "Todas".

create or replace function public.get_notifiable_users_with_locations()
returns table (
  user_id uuid,
  full_name text,
  email text,
  role text,
  location_codes text
)
language plpgsql
security definer
stable
as $$
begin
  return query
  select
    p.id as user_id,
    p.full_name,
    u.email::text as email,
    p.role::text as role,
    case
      when p.role = 'admin' then 'Todas'
      else coalesce(
        lp.code, -- sede principal del perfil
        nullif(string_agg(distinct ll.code, ', '), ''), -- sedes extra (clusters)
        'Sin sede'
      )
    end::text as location_codes
  from profiles p
  join auth.users u on u.id = p.id
  left join locations lp on lp.id = p.location_id           -- sede principal (UI que muestras en la lista)
  left join user_locations ul on ul.user_id = p.id
  left join locations ll on ll.id = ul.location_id          -- sedes adicionales (multisede)
  where p.role in ('admin', 'supervisor')
  group by p.id, p.full_name, u.email, p.role, lp.code
  order by p.role, p.full_name;
end;
$$;

-- Consulta de verificación rápida (opcional):
-- select * from public.get_notifiable_users_with_locations() order by role, full_name;
