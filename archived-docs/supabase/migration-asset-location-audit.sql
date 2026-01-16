-- =====================================================
-- Migracion: Auditoria de cambios de sede de activos
-- Descripcion: Registro obligatorio y notificaciones para cambios de ubicacion
-- Fecha: 2026-01-02
-- =====================================================

-- 0. Funcion auxiliar para ejecutar SQL dinamico (si no existe)
create or replace function exec_sql(sql text)
returns void
language plpgsql
security definer
as $$
begin
  execute sql;
end;
$$;

-- 0.1 Funcion para actualizar activo con justificacion de cambio de sede
create or replace function update_asset_with_location_reason(
  p_asset_id uuid,
  p_asset_tag text,
  p_asset_type text,
  p_status text,
  p_serial_number text,
  p_model text,
  p_brand text,
  p_department text,
  p_purchase_date date,
  p_warranty_end_date date,
  p_location text,
  p_location_id uuid,
  p_notes text,
  p_location_change_reason text default null
)
returns void
language plpgsql
security definer
as $$
begin
  -- Si se proporciona una razón, establecerla en el contexto
  if p_location_change_reason is not null and p_location_change_reason <> '' then
    perform set_config('app.location_change_reason', p_location_change_reason, false);
  end if;
  
  -- Actualizar el activo (el trigger validará si cambió location_id)
  update assets set
    asset_tag = p_asset_tag,
    asset_type = p_asset_type::asset_type,
    status = p_status::asset_status,
    serial_number = p_serial_number,
    model = p_model,
    brand = p_brand,
    department = p_department,
    purchase_date = p_purchase_date,
    warranty_end_date = p_warranty_end_date,
    location = p_location,
    location_id = p_location_id,
    notes = p_notes,
    updated_at = now()
  where id = p_asset_id;
  
  -- Limpiar el contexto
  perform set_config('app.location_change_reason', null, false);
end;
$$;

-- 1. Tabla de auditoria para cambios de sede de activos
create table if not exists asset_location_changes (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id) on delete cascade,
  from_location_id uuid references locations(id) on delete set null,
  to_location_id uuid not null references locations(id) on delete restrict,
  reason text not null check (char_length(reason) >= 10),
  changed_by uuid not null references auth.users(id) on delete set null,
  changed_at timestamptz not null default now(),
  
  -- Metadata adicional
  asset_tag text not null,
  from_location_name text,
  to_location_name text not null,
  changed_by_name text,
  changed_by_email text
);

comment on table asset_location_changes is 'Registro de auditoría de cambios de sede de activos con justificación obligatoria';
comment on column asset_location_changes.reason is 'Justificación del cambio (mínimo 10 caracteres)';

-- Indices
create index if not exists idx_asset_location_changes_asset on asset_location_changes(asset_id);
create index if not exists idx_asset_location_changes_from on asset_location_changes(from_location_id);
create index if not exists idx_asset_location_changes_to on asset_location_changes(to_location_id);
create index if not exists idx_asset_location_changes_date on asset_location_changes(changed_at desc);
create index if not exists idx_asset_location_changes_user on asset_location_changes(changed_by);

-- 2. Funcion para validar y registrar cambio de sede
create or replace function validate_asset_location_change()
returns trigger
language plpgsql
security definer
as $$
declare
  v_reason text;
  v_from_location_name text;
  v_to_location_name text;
  v_user_name text;
  v_user_email text;
begin
  -- Solo validar si la ubicación cambió
  if old.location_id is not distinct from new.location_id then
    return new;
  end if;
  
  -- Obtener la razón del cambio desde el contexto (debe ser seteada desde la app)
  v_reason := current_setting('app.location_change_reason', true);
  
  -- VALIDACION ESTRICTA: Sin razón no se permite el cambio
  if v_reason is null or char_length(trim(v_reason)) < 10 then
    raise exception 'LOCATION_CHANGE_REQUIRES_REASON: El cambio de sede requiere una justificación de al menos 10 caracteres';
  end if;
  
  -- Obtener nombres para el registro
  select name into v_from_location_name
  from locations
  where id = old.location_id;
  
  select name into v_to_location_name
  from locations
  where id = new.location_id;
  
  -- Obtener datos del usuario
  select 
    coalesce(profiles.full_name, auth.users.email),
    auth.users.email
  into v_user_name, v_user_email
  from auth.users
  left join profiles on profiles.id = auth.users.id
  where auth.users.id = auth.uid();
  
  -- Registrar el cambio en auditoría
  insert into asset_location_changes (
    asset_id,
    asset_tag,
    from_location_id,
    from_location_name,
    to_location_id,
    to_location_name,
    reason,
    changed_by,
    changed_by_name,
    changed_by_email
  ) values (
    new.id,
    new.asset_tag,
    old.location_id,
    v_from_location_name,
    new.location_id,
    v_to_location_name,
    v_reason,
    auth.uid(),
    v_user_name,
    v_user_email
  );
  
  -- Limpiar el contexto
  perform set_config('app.location_change_reason', null, true);
  
  return new;
end;
$$;

-- Eliminar trigger anterior si existe y crear uno nuevo
drop trigger if exists trg_validate_asset_location_change on assets;
create trigger trg_validate_asset_location_change
before update of location_id on assets
for each row
execute function validate_asset_location_change();

-- 3. Funcion para obtener supervisores de una sede
create or replace function get_location_supervisors(p_location_id uuid)
returns table (
  user_id uuid,
  full_name text,
  email text
)
language plpgsql
security definer
stable
as $$
begin
  return query
  select 
    p.id,
    p.full_name,
    u.email
  from user_locations ul
  join profiles p on p.id = ul.user_id
  join auth.users u on u.id = p.id
  where ul.location_id = p_location_id
    and p.role = 'supervisor'
    and p.is_active = true;
end;
$$;

-- 4. Funcion para obtener todos los admins
create or replace function get_all_admins()
returns table (
  user_id uuid,
  full_name text,
  email text
)
language plpgsql
security definer
stable
as $$
begin
  return query
  select 
    p.id,
    p.full_name,
    u.email
  from profiles p
  join auth.users u on u.id = p.id
  where p.role = 'admin'
    and p.is_active = true;
end;
$$;

-- Función para obtener usuarios notificables (admins y supervisors activos)
create or replace function get_notifiable_users()
returns table (
  user_id uuid,
  full_name text,
  email text,
  role text
)
language plpgsql
security definer
stable
as $$
begin
  return query
  select 
    p.id,
    p.full_name,
    u.email,
    p.role
  from profiles p
  join auth.users u on u.id = p.id
  where p.role in ('admin', 'supervisor')
    and p.is_active = true
  order by p.role, p.full_name;
end;
$$;

-- 5. RLS Policies para asset_location_changes
alter table asset_location_changes enable row level security;

-- Admin puede ver todos los cambios
drop policy if exists "Admin puede ver cambios de sede" on asset_location_changes;
create policy "Admin puede ver cambios de sede"
on asset_location_changes for select
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

-- Supervisores ven cambios de sus sedes
drop policy if exists "Supervisores ven cambios de sus sedes" on asset_location_changes;
create policy "Supervisores ven cambios de sus sedes"
on asset_location_changes for select
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and profiles.role = 'supervisor'
  )
  and (
    from_location_id in (select get_accessible_locations())
    or to_location_id in (select get_accessible_locations())
  )
);

-- 6. Vista para reporte de cambios de sede
create or replace view asset_location_changes_report as
select 
  alc.id,
  alc.asset_id,
  alc.asset_tag,
  alc.from_location_name as sede_origen,
  alc.to_location_name as sede_destino,
  alc.reason as justificacion,
  alc.changed_by_name as usuario,
  alc.changed_by_email as email_usuario,
  alc.changed_at as fecha_cambio,
  a.asset_type as tipo_activo,
  a.brand as marca,
  a.model as modelo
from asset_location_changes alc
left join assets a on a.id = alc.asset_id
order by alc.changed_at desc;

comment on view asset_location_changes_report is 'Vista de reporte para auditoría de cambios de sede';

-- 7. Nota: Para cambiar sede desde SQL (admin override):
/*
-- Solo para casos excepcionales - establece la razón y luego actualiza
select set_config('app.location_change_reason', 'Reasignación por cierre de sucursal temporal', false);

update assets 
set location_id = (select id from locations where code = 'EMTY')
where asset_tag = '676482638';
*/
