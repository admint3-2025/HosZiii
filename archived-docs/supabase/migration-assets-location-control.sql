-- =====================================================
-- Migracion: Control de activos por sede
-- Descripcion: Asignar activos a sedes y control de acceso por ubicacion
-- Fecha: 2026-01-02
-- =====================================================

-- 1. Agregar location_id a assets
alter table assets 
add column if not exists location_id uuid references locations(id) on delete restrict;

comment on column assets.location_id is 'Sede a la que pertenece el activo';

-- Indice para filtrado por sede
create index if not exists idx_assets_location on assets(location_id);

-- 2. Crear tabla de asignacion usuarios-sedes (muchos a muchos)
-- Permite que tecnicos y supervisores atiendan multiples sedes
create table if not exists user_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  
  -- Constraint: un usuario no puede estar asignado a la misma sede mas de una vez
  unique(user_id, location_id)
);

comment on table user_locations is 'Asignacion de usuarios a multiples sedes (tecnicos, supervisores)';

-- Indices
create index if not exists idx_user_locations_user on user_locations(user_id);
create index if not exists idx_user_locations_location on user_locations(location_id);

-- 3. Funcion para verificar si un usuario puede acceder a una sede
create or replace function can_access_location(user_id uuid, check_location_id uuid)
returns boolean
language plpgsql
security definer
stable
as $$
declare
  v_role text;
  v_has_access boolean;
begin
  -- Obtener el rol del usuario
  select role into v_role
  from profiles
  where id = user_id;
  
  -- Admin puede ver todo
  if v_role = 'admin' then
    return true;
  end if;
  
  -- Verificar si el usuario esta asignado a esa sede
  select exists(
    select 1 from user_locations
    where user_locations.user_id = can_access_location.user_id
      and user_locations.location_id = check_location_id
  ) into v_has_access;
  
  return v_has_access;
end;
$$;

-- 4. Funcion para obtener las sedes accesibles por el usuario actual
create or replace function get_accessible_locations()
returns setof uuid
language plpgsql
security definer
stable
as $$
declare
  v_role text;
begin
  -- Obtener el rol del usuario actual
  select role into v_role
  from profiles
  where id = auth.uid();
  
  -- Admin ve todas las sedes
  if v_role = 'admin' then
    return query select id from locations where is_active = true;
  end if;
  
  -- Otros usuarios ven solo sus sedes asignadas
  return query 
    select location_id 
    from user_locations 
    where user_id = auth.uid();
end;
$$;

-- 5. RLS Policies para assets (basadas en sede)
alter table assets enable row level security;

-- Policy: Admin puede ver todos los activos
drop policy if exists "Admin puede ver todos los activos" on assets;
create policy "Admin puede ver todos los activos"
on assets for select
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

-- Policy: Tecnicos y supervisores ven activos de sus sedes asignadas
drop policy if exists "Tecnicos ven activos de sus sedes" on assets;
create policy "Tecnicos ven activos de sus sedes"
on assets for select
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and profiles.role in ('agent_l1', 'agent_l2', 'supervisor')
  )
  and (
    location_id in (select get_accessible_locations())
    or location_id is null -- activos sin sede asignada
  )
);

-- Policy: Admin puede crear/modificar todos los activos
drop policy if exists "Admin puede gestionar activos" on assets;
create policy "Admin puede gestionar activos"
on assets for all
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

-- Policy: Supervisores pueden crear/modificar activos de sus sedes
drop policy if exists "Supervisores gestionan activos de sus sedes" on assets;
create policy "Supervisores gestionan activos de sus sedes"
on assets for all
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and profiles.role = 'supervisor'
  )
  and location_id in (select get_accessible_locations())
);

-- 6. RLS Policies para user_locations (solo admin puede gestionar)
alter table user_locations enable row level security;

drop policy if exists "Admin gestiona asignaciones de sedes" on user_locations;
create policy "Admin gestiona asignaciones de sedes"
on user_locations for all
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

drop policy if exists "Usuarios ven sus propias asignaciones" on user_locations;
create policy "Usuarios ven sus propias asignaciones"
on user_locations for select
using (user_id = auth.uid());

-- 7. RLS Policies para locations (todos pueden leer, solo admin puede modificar)
alter table locations enable row level security;

drop policy if exists "Todos pueden leer locations activas" on locations;
create policy "Todos pueden leer locations activas"
on locations for select
using (is_active = true);

drop policy if exists "Admin gestiona locations" on locations;
create policy "Admin gestiona locations"
on locations for all
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

-- 8. Trigger para asignar sede al activo automaticamente
create or replace function set_asset_location()
returns trigger
language plpgsql
security definer
as $$
declare
  v_location_id uuid;
begin
  -- Si ya tiene location_id, no hacer nada
  if new.location_id is not null then
    return new;
  end if;
  
  -- Si esta asignado a un usuario, usar la sede de ese usuario
  if new.assigned_to is not null then
    select location_id into v_location_id
    from profiles
    where id = new.assigned_to;
    
    if v_location_id is not null then
      new.location_id = v_location_id;
    end if;
  end if;
  
  return new;
end;
$$;

drop trigger if exists trg_assets_set_location on assets;
create trigger trg_assets_set_location
before insert on assets
for each row
execute function set_asset_location();

-- 9. Insertar sedes de ejemplo (opcional)
/*
insert into locations (name, code, city, state, address) values
  ('Oficina Principal', 'HQ', 'Monterrey', 'Nuevo Leon', 'Av. Constitucion 100'),
  ('Sucursal Norte', 'NORTE', 'Monterrey', 'Nuevo Leon', 'Av. Gonzalitos 200'),
  ('Sucursal Sur', 'SUR', 'San Pedro', 'Nuevo Leon', 'Av. Vasconcelos 300')
on conflict (code) do nothing;
*/

-- 10. Nota: Para asignar tecnicos a sedes, ejecutar:
/*
-- Ejemplo: Asignar tecnico a una sede
insert into user_locations (user_id, location_id, created_by)
values (
  'uuid-del-tecnico',
  (select id from locations where code = 'HQ'),
  auth.uid()
);

-- Ejemplo: Asignar tecnico a multiples sedes
insert into user_locations (user_id, location_id, created_by)
select 
  'uuid-del-tecnico',
  id,
  auth.uid()
from locations
where code in ('HQ', 'NORTE', 'SUR');
*/
