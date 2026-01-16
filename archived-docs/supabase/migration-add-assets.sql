-- Migration: Sistema de gestión de activos
-- Fecha: 2025-12-22

-- Tipos de activos
do $$ begin
  create type asset_type as enum (
    'DESKTOP',
    'LAPTOP',
    'PRINTER',
    'SCANNER',
    'MONITOR',
    'PHONE',
    'TABLET',
    'SERVER',
    'NETWORK_DEVICE',
    'PERIPHERAL',
    'OTHER'
  );
exception
  when duplicate_object then null;
end $$;

-- Estados de activos
do $$ begin
  create type asset_status as enum (
    'OPERATIONAL',
    'MAINTENANCE',
    'OUT_OF_SERVICE',
    'RETIRED'
  );
exception
  when duplicate_object then null;
end $$;

-- Tabla de activos
create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  asset_tag text not null unique,
  asset_type asset_type not null,
  brand text,
  model text,
  serial_number text,
  
  -- Información de ubicación y asignación
  assigned_to uuid references auth.users(id) on delete set null,
  location text,
  department text,
  
  -- Estado y mantenimiento
  status asset_status not null default 'OPERATIONAL',
  purchase_date date,
  warranty_end_date date,
  
  -- Notas
  notes text,
  
  -- Auditoría
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  
  -- Soft delete
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null
);

-- Índices
create index if not exists idx_assets_asset_tag on assets(asset_tag);
create index if not exists idx_assets_assigned_to on assets(assigned_to);
create index if not exists idx_assets_status on assets(status);
create index if not exists idx_assets_type on assets(asset_type);
create index if not exists idx_assets_department on assets(department);
create index if not exists idx_assets_deleted on assets(deleted_at) where deleted_at is null;

-- Trigger para updated_at
drop trigger if exists trg_assets_set_updated_at on assets;
create trigger trg_assets_set_updated_at
  before update on assets
  for each row
  execute function set_updated_at();

-- Agregar campo asset_id a la tabla tickets
alter table tickets 
  add column if not exists asset_id uuid references assets(id) on delete set null;

create index if not exists idx_tickets_asset_id on tickets(asset_id);

-- Políticas de seguridad (RLS)
alter table assets enable row level security;

-- Todos pueden ver activos activos (no eliminados)
create policy "Anyone can view active assets"
  on assets for select
  using (deleted_at is null);

-- Solo admins pueden crear activos
create policy "Admins can insert assets"
  on assets for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role = 'admin'
    )
  );

-- Solo admins pueden actualizar activos
create policy "Admins can update assets"
  on assets for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role = 'admin'
    )
  );

-- Vista para historial de incidencias por activo
create or replace view asset_ticket_history as
select 
  a.id as asset_id,
  a.asset_tag,
  a.asset_type,
  a.brand,
  a.model,
  a.status as asset_status,
  t.id as ticket_id,
  t.ticket_number,
  t.title as ticket_title,
  t.status as ticket_status,
  t.priority,
  t.created_at as incident_date,
  t.closed_at,
  t.requester_id,
  t.assigned_agent_id
from assets a
left join tickets t on t.asset_id = a.id
where a.deleted_at is null
  and (t.deleted_at is null or t.deleted_at is not null);

-- Función para obtener estadísticas de activos
create or replace function get_asset_stats()
returns table (
  total_assets bigint,
  operational bigint,
  in_maintenance bigint,
  out_of_service bigint,
  retired bigint,
  total_incidents bigint,
  open_incidents bigint
)
language sql
security definer
as $$
  select 
    count(*)::bigint as total_assets,
    count(*) filter (where status = 'OPERATIONAL')::bigint as operational,
    count(*) filter (where status = 'MAINTENANCE')::bigint as in_maintenance,
    count(*) filter (where status = 'OUT_OF_SERVICE')::bigint as out_of_service,
    count(*) filter (where status = 'RETIRED')::bigint as retired,
    (select count(*)::bigint from tickets where asset_id is not null and deleted_at is null) as total_incidents,
    (select count(*)::bigint from tickets where asset_id is not null and deleted_at is null and status not in ('CLOSED', 'RESOLVED')) as open_incidents
  from assets
  where deleted_at is null;
$$;

-- Comentarios
comment on table assets is 'Gestión de activos de TI (computadoras, impresoras, etc.)';
comment on column assets.asset_tag is 'Identificador único del activo (ej: PC-001, IMP-005)';
comment on column assets.status is 'Estado operativo del activo';
comment on view asset_ticket_history is 'Historial completo de incidencias por activo';
