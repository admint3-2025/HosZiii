-- =====================================================
-- Migración: Notificaciones de Inspecciones Críticas
-- Descripción: Agregar soporte para notificaciones push
-- de inspecciones con ítems críticos
-- =====================================================

-- 1. Agregar nuevo tipo de notificación al enum
do $$ 
begin
  if not exists (
    select 1 from pg_enum e
    join pg_type t on e.enumtypid = t.oid
    where t.typname = 'notification_type'
    and e.enumlabel = 'inspection_critical'
  ) then
    alter type notification_type add value 'inspection_critical';
  end if;
end $$;

-- 2. Crear función RPC para obtener emails de administradores
-- Esta función hace JOIN entre profiles y auth.users para obtener los emails
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
    p.full_name,
    u.email::text,
    p.role
  from profiles p
  inner join auth.users u on u.id = p.id
  where p.role in ('admin', 'corporate_admin')
    and p.is_active = true
    and u.email is not null
    and u.email != '';
end;
$$;

-- 3. Comentar la función para documentación
comment on function get_admin_emails() is 
'Obtiene información de todos los administradores activos incluyendo sus emails. 
Requiere privilegios SECURITY DEFINER para acceder a auth.users.';

-- 4. Verificar que la función funciona
-- select * from get_admin_emails();
