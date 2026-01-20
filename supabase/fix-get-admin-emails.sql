-- =====================================================
-- FIX: get_admin_emails sin columna is_active
-- Problema: la función anterior filtraba por p.is_active, columna que no existe
-- Resultado: el RPC devolvía 0 admins y las alertas decían "0 administradores"
-- Solución: quitar el filtro inexistente y asegurar emails válidos
-- =====================================================

create or replace function get_admin_emails()
returns table (
  id uuid,
  full_name text,
  email text,
  role text
)
language plpgsql
security definer -- Necesario para acceder a auth.users
set search_path = public
as $$
begin
  return query
  select 
    p.id,
    coalesce(p.full_name, u.email) as full_name,
    u.email::text,
    p.role::text
  from profiles p
  inner join auth.users u on u.id = p.id
  where p.role in ('admin', 'corporate_admin')
    and u.email is not null
    and u.email != '';
end;
$$;

comment on function get_admin_emails() is 
'Devuelve admins y corporate_admin con email válido. Elimina dependencia de columna inexistente is_active.';

-- Verificación rápida (ejecutar en SQL Editor):
-- select * from get_admin_emails();
