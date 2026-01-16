-- =====================================================
-- Migracion: Auditoria extendida y estadisticas de activos
-- Descripcion:
--  - Registro de cambios de asignacion de usuario en activos
--  - Vista de estadisticas por activo (incidencias, cambios de sede, cambios de usuario)
-- Fecha: 2026-01-02
-- =====================================================

-- 1. Tabla de auditoria para cambios de asignacion de usuario en activos
create table if not exists asset_assignment_changes (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id) on delete cascade,
  from_user_id uuid references auth.users(id) on delete set null,
  to_user_id uuid references auth.users(id) on delete set null,
  changed_by uuid not null references auth.users(id) on delete set null,
  changed_at timestamptz not null default now(),

  from_user_name text,
  to_user_name text,
  changed_by_name text,
  changed_by_email text
);

comment on table asset_assignment_changes is 'Auditoria de cambios de asignacion de usuario en activos';

create index if not exists idx_asset_assignment_changes_asset on asset_assignment_changes(asset_id);
create index if not exists idx_asset_assignment_changes_date on asset_assignment_changes(changed_at desc);
create index if not exists idx_asset_assignment_changes_user on asset_assignment_changes(changed_by);

-- 2. Funcion para registrar cambios de asignacion de usuario
create or replace function log_asset_assignment_change()
returns trigger
language plpgsql
security definer
as $$
declare
  v_from_name text;
  v_to_name text;
  v_changed_by_name text;
  v_changed_by_email text;
begin
  -- Solo registrar si cambia el usuario asignado
  if old.assigned_to is not distinct from new.assigned_to then
    return new;
  end if;

  -- Nombre del usuario anterior
  if old.assigned_to is not null then
    select coalesce(p.full_name, u.email)
    into v_from_name
    from auth.users u
    left join profiles p on p.id = u.id
    where u.id = old.assigned_to;
  end if;

  -- Nombre del nuevo usuario
  if new.assigned_to is not null then
    select coalesce(p.full_name, u.email)
    into v_to_name
    from auth.users u
    left join profiles p on p.id = u.id
    where u.id = new.assigned_to;
  end if;

  -- Usuario que realiza el cambio
  select coalesce(p.full_name, u.email), u.email
  into v_changed_by_name, v_changed_by_email
  from auth.users u
  left join profiles p on p.id = u.id
  where u.id = auth.uid();

  insert into asset_assignment_changes (
    asset_id,
    from_user_id,
    to_user_id,
    changed_by,
    from_user_name,
    to_user_name,
    changed_by_name,
    changed_by_email
  ) values (
    new.id,
    old.assigned_to,
    new.assigned_to,
    auth.uid(),
    v_from_name,
    v_to_name,
    v_changed_by_name,
    v_changed_by_email
  );

  return new;
end;
$$;

-- 3. Trigger sobre assets para registrar cambios de assigned_to
drop trigger if exists trg_log_asset_assignment_change on assets;
create trigger trg_log_asset_assignment_change
before update of assigned_to on assets
for each row
execute function log_asset_assignment_change();

-- 4. Vista de estadisticas detalladas por activo
create or replace view asset_stats_detail as
select
  a.id,
  a.asset_tag,
  a.asset_type,
  a.status,
  a.location_id,
  l.code as location_code,
  l.name as location_name,
  a.assigned_to,
  pa.full_name as assigned_to_name,

  coalesce(t_stats.total_tickets, 0) as total_tickets,
  coalesce(t_stats.open_tickets, 0) as open_tickets,

  coalesce(loc_stats.change_count, 0) as location_change_count,
  loc_stats.last_change_at as last_location_change_at,

  coalesce(assign_stats.change_count, 0) as assignment_change_count,
  assign_stats.last_change_at as last_assignment_change_at
from assets a
left join locations l on l.id = a.location_id
left join profiles pa on pa.id = a.assigned_to
left join (
  select
    asset_id,
    count(*) as total_tickets,
    count(*) filter (where status not in ('CLOSED', 'RESOLVED') and deleted_at is null) as open_tickets
  from tickets
  where asset_id is not null
    and deleted_at is null
  group by asset_id
) t_stats on t_stats.asset_id = a.id
left join (
  select
    asset_id,
    count(*) as change_count,
    max(changed_at) as last_change_at
  from asset_location_changes
  group by asset_id
) loc_stats on loc_stats.asset_id = a.id
left join (
  select
    asset_id,
    count(*) as change_count,
    max(changed_at) as last_change_at
  from asset_assignment_changes
  group by asset_id
) assign_stats on assign_stats.asset_id = a.id
where a.deleted_at is null;

comment on view asset_stats_detail is 'Estadisticas consolidadas por activo: incidencias, cambios de sede y cambios de usuario';

-- 5. Funcion helper para obtener stats de un activo especifico
create or replace function get_asset_detail_stats(p_asset_id uuid)
returns table (
  id uuid,
  asset_tag text,
  asset_type asset_type,
  status asset_status,
  location_id uuid,
  location_code text,
  location_name text,
  assigned_to uuid,
  assigned_to_name text,
  total_tickets bigint,
  open_tickets bigint,
  location_change_count bigint,
  last_location_change_at timestamptz,
  assignment_change_count bigint,
  last_assignment_change_at timestamptz
)
language sql
security definer
as $$
  select *
  from asset_stats_detail
  where id = p_asset_id;
$$;

-- =====================================================
-- Fin de migracion
-- =====================================================
