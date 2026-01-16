-- =====================================================
-- Migración: Funcionalidad Multisede
-- Descripción: Agregar soporte para múltiples ubicaciones/sedes
-- Fecha: 2025-12-30
-- =====================================================

-- 1. Crear tabla de ubicaciones/sedes
create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text not null unique,
  address text,
  city text,
  state text,
  country text default 'México',
  phone text,
  email text,
  manager_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table locations is 'Tabla de ubicaciones/sedes para segmentación multisede';
comment on column locations.code is 'Código corto único de la sede (ej: MTY, CDMX, GDL)';
comment on column locations.is_active is 'Si la sede está activa para recibir tickets';

-- Índices para locations
create index if not exists idx_locations_code on locations(code);
create index if not exists idx_locations_is_active on locations(is_active);

-- 2. Agregar campo location_id a profiles
alter table profiles 
add column if not exists location_id uuid references locations(id) on delete restrict;

comment on column profiles.location_id is 'Sede a la que pertenece el usuario';

-- Índice para filtrado por sede
create index if not exists idx_profiles_location on profiles(location_id);

-- 3. Agregar campo location_id a tickets
alter table tickets 
add column if not exists location_id uuid references locations(id) on delete restrict;

comment on column tickets.location_id is 'Sede donde se originó el ticket';

-- Índice para filtrado por sede
create index if not exists idx_tickets_location on tickets(location_id);

-- 4. Agregar trigger para auto-asignar location al crear ticket
create or replace function set_ticket_location()
returns trigger
language plpgsql
security definer
as $$
declare
  v_location_id uuid;
begin
  -- Obtener la sede del solicitante
  select location_id into v_location_id
  from profiles
  where id = new.requester_id;
  
  -- Si el solicitante tiene sede, asignarla al ticket
  if v_location_id is not null then
    new.location_id = v_location_id;
  end if;
  
  return new;
end;
$$;

drop trigger if exists trg_tickets_set_location on tickets;
create trigger trg_tickets_set_location
before insert on tickets
for each row
execute function set_ticket_location();

-- 5. Función auxiliar para verificar si el usuario puede ver todas las sedes (admin)
create or replace function is_admin_user(user_id uuid)
returns boolean
language plpgsql
security definer
stable
as $$
declare
  v_role text;
begin
  select role into v_role
  from profiles
  where id = user_id;
  
  return v_role = 'admin';
end;
$$;

-- 6. Función auxiliar para obtener la sede del usuario actual
create or replace function get_user_location()
returns uuid
language plpgsql
security definer
stable
as $$
declare
  v_location_id uuid;
begin
  select location_id into v_location_id
  from profiles
  where id = auth.uid();
  
  return v_location_id;
end;
$$;

-- 7. Insertar sedes de ejemplo (comentadas - descomentar según necesidad)
/*
insert into locations (name, code, city, state) values
  ('Sede Central Monterrey', 'MTY', 'Monterrey', 'Nuevo León'),
  ('Sucursal Ciudad de México', 'CDMX', 'Ciudad de México', 'CDMX'),
  ('Sucursal Guadalajara', 'GDL', 'Guadalajara', 'Jalisco'),
  ('Sucursal Tijuana', 'TIJ', 'Tijuana', 'Baja California'),
  ('Sucursal Cancún', 'CUN', 'Cancún', 'Quintana Roo')
on conflict (code) do nothing;
*/

-- 8. Actualizar trigger de auditoría para incluir location_id
create or replace function audit_ticket_soft_delete() 
returns trigger as $$
begin
  if (old.deleted_at is null and new.deleted_at is not null) then
    insert into audit_log(entity_type, entity_id, action, actor_id, metadata)
    values (
      'ticket',
      new.id,
      'SOFT_DELETE',
      new.deleted_by,
      jsonb_build_object(
        'ticket_number', new.ticket_number,
        'reason', new.deleted_reason,
        'previous_status', old.status,
        'previous_support_level', old.support_level,
        'location_id', old.location_id
      )
    );
  end if;
  return new;
end;
$$ language plpgsql;

-- 9. Nota importante sobre migración de datos existentes
comment on column tickets.location_id is 
  'Sede donde se originó el ticket. NOTA: Tickets existentes sin location_id deben asignarse manualmente.';

-- =====================================================
-- Fin de migración
-- =====================================================

-- Script de ejemplo para asignar sede default a tickets/usuarios existentes:
/*
-- Crear una sede "Por Defecto" si no existe
insert into locations (name, code, city) 
values ('Sede Principal', 'MAIN', 'Sin especificar')
on conflict (code) do nothing;

-- Asignar sede default a perfiles sin sede
update profiles 
set location_id = (select id from locations where code = 'MAIN')
where location_id is null;

-- Asignar sede del solicitante a tickets existentes
update tickets t
set location_id = p.location_id
from profiles p
where t.requester_id = p.id
  and t.location_id is null
  and p.location_id is not null;
*/
