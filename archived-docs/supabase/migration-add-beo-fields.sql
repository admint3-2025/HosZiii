-- =====================================================
-- Migración: Campos BEO para tickets de eventos
-- Descripción: Extiende tickets con información de BEO (Banquet Event Order)
-- Fecha: 2026-01-03
-- =====================================================

-- 1. Agregar campos BEO a la tabla tickets
alter table tickets add column if not exists is_beo boolean default false;
alter table tickets add column if not exists beo_number text;
alter table tickets add column if not exists event_name text;
alter table tickets add column if not exists event_client text;
alter table tickets add column if not exists event_date timestamptz;
alter table tickets add column if not exists event_room text;
alter table tickets add column if not exists event_setup_type text;
alter table tickets add column if not exists event_attendees integer;
alter table tickets add column if not exists tech_projector boolean default false;
alter table tickets add column if not exists tech_audio boolean default false;
alter table tickets add column if not exists tech_wifi boolean default false;
alter table tickets add column if not exists tech_videoconf boolean default false;
alter table tickets add column if not exists tech_lighting boolean default false;
alter table tickets add column if not exists tech_other text;

-- Comentarios en columnas
comment on column tickets.is_beo is 'Indica si el ticket está basado en un BEO';
comment on column tickets.beo_number is 'Número de referencia del BEO en OPERA';
comment on column tickets.event_name is 'Nombre del evento';
comment on column tickets.event_client is 'Cliente o empresa del evento';
comment on column tickets.event_date is 'Fecha y hora del evento';
comment on column tickets.event_room is 'Salón o espacio del evento';
comment on column tickets.event_setup_type is 'Tipo de setup (Teatro, Banquete, Cóctel, etc.)';
comment on column tickets.event_attendees is 'Número estimado de asistentes';
comment on column tickets.tech_projector is 'Requiere proyector/pantalla';
comment on column tickets.tech_audio is 'Requiere micrófono/audio';
comment on column tickets.tech_wifi is 'Requiere internet/WiFi dedicado';
comment on column tickets.tech_videoconf is 'Requiere videoconferencia/streaming';
comment on column tickets.tech_lighting is 'Requiere iluminación especial';
comment on column tickets.tech_other is 'Otros requerimientos técnicos';

-- 2. Índices para búsquedas de BEOs
create index if not exists idx_tickets_is_beo on tickets(is_beo) where is_beo = true;
create index if not exists idx_tickets_beo_number on tickets(beo_number) where beo_number is not null;
create index if not exists idx_tickets_event_date on tickets(event_date) where event_date is not null;

-- 3. Vista especializada de tickets BEO
create or replace view beo_tickets_view as
select 
  t.id,
  t.ticket_number,
  t.title,
  t.description,
  t.status,
  t.priority,
  t.category_id,
  cat.name as category_name,
  t.created_at,
  t.updated_at,
  t.beo_number,
  t.event_name,
  t.event_client,
  t.event_date,
  t.event_room,
  t.event_setup_type,
  t.event_attendees,
  t.tech_projector,
  t.tech_audio,
  t.tech_wifi,
  t.tech_videoconf,
  t.tech_lighting,
  t.tech_other,
  -- Calcular días hasta el evento
  case 
    when t.event_date is not null then 
      extract(epoch from (t.event_date - now())) / 86400
    else null
  end as days_until_event,
  -- Indicador de urgencia
  case
    when t.event_date is not null and t.event_date < now() then 'PASADO'
    when t.event_date is not null and extract(epoch from (t.event_date - now())) / 3600 <= 24 then 'CRITICO'
    when t.event_date is not null and extract(epoch from (t.event_date - now())) / 3600 <= 48 then 'URGENTE'
    when t.event_date is not null and extract(epoch from (t.event_date - now())) / 3600 <= 72 then 'PROXIMO'
    else 'NORMAL'
  end as urgency_level,
  -- Información del solicitante
  requester.id as requester_id,
  requester.full_name as requester_name,
  requester.department as requester_department,
  -- Información del agente asignado
  agent.id as agent_id,
  agent.full_name as agent_name,
  -- Sede
  loc.id as location_id,
  loc.code as location_code,
  loc.name as location_name
from tickets t
left join categories cat on t.category_id = cat.id
left join profiles requester on t.requester_id = requester.id
left join profiles agent on t.assigned_agent_id = agent.id
left join locations loc on t.location_id = loc.id
where t.is_beo = true
  and t.deleted_at is null
order by 
  case 
    when t.event_date is not null and t.event_date < now() then 5
    when t.event_date is not null and extract(epoch from (t.event_date - now())) / 3600 <= 24 then 1
    when t.event_date is not null and extract(epoch from (t.event_date - now())) / 3600 <= 48 then 2
    when t.event_date is not null and extract(epoch from (t.event_date - now())) / 3600 <= 72 then 3
    else 4
  end,
  t.event_date asc nulls last;

comment on view beo_tickets_view is 'Vista especializada de tickets BEO con indicadores de urgencia';

-- 4. Función para obtener estadísticas de BEOs
create or replace function get_beo_stats(user_id uuid, user_role text)
returns jsonb
language plpgsql
security definer
as $$
declare
  result jsonb;
  user_location_id uuid;
begin
  -- Obtener la sede del usuario
  select location_id into user_location_id
  from profiles
  where id = user_id;

  select jsonb_build_object(
    'total_active', count(*) filter (where status != 'CLOSED'),
    'critical', count(*) filter (where 
      status != 'CLOSED' 
      and event_date is not null 
      and extract(epoch from (event_date - now())) / 3600 <= 24
    ),
    'urgent', count(*) filter (where 
      status != 'CLOSED' 
      and event_date is not null 
      and extract(epoch from (event_date - now())) / 3600 between 24 and 48
    ),
    'upcoming', count(*) filter (where 
      status != 'CLOSED' 
      and event_date is not null 
      and extract(epoch from (event_date - now())) / 3600 between 48 and 72
    ),
    'pending', count(*) filter (where status = 'NEW'),
    'in_progress', count(*) filter (where status = 'IN_PROGRESS'),
    'today_events', count(*) filter (where 
      event_date is not null 
      and date(event_date) = current_date
    ),
    'tomorrow_events', count(*) filter (where 
      event_date is not null 
      and date(event_date) = current_date + interval '1 day'
    )
  ) into result
  from tickets
  where is_beo = true
    and deleted_at is null
    and (
      -- Admin ve todo
      user_role = 'admin'
      -- No-admin solo ve su sede
      or (user_role != 'admin' and location_id = user_location_id)
    );

  return result;
end;
$$;

comment on function get_beo_stats is 'Obtiene estadísticas de tickets BEO con visibilidad según rol';

-- 5. Trigger para validar tickets BEO
create or replace function validate_beo_ticket()
returns trigger
language plpgsql
as $$
begin
  -- Si es BEO, validar campos obligatorios
  if new.is_beo = true then
    if new.beo_number is null or trim(new.beo_number) = '' then
      raise exception 'El número de BEO es obligatorio para tickets BEO';
    end if;
    
    if new.event_name is null or trim(new.event_name) = '' then
      raise exception 'El nombre del evento es obligatorio para tickets BEO';
    end if;
    
    if new.event_date is null then
      raise exception 'La fecha del evento es obligatoria para tickets BEO';
    end if;

    -- Forzar categoría específica para BEOs
    -- Buscar el ID de la categoría BEO si no está establecida
    if new.category_id is null then
      select id into new.category_id
      from categories
      where name = 'BEO - Evento'
      limit 1;
    end if;

    -- Ajustar prioridad automáticamente según fecha del evento
    if new.event_date is not null then
      if extract(epoch from (new.event_date - now())) / 3600 <= 24 then
        new.priority := 3; -- HIGH
      elsif extract(epoch from (new.event_date - now())) / 3600 <= 48 then
        new.priority := 2; -- MEDIUM
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_beo_ticket on tickets;
create trigger trg_validate_beo_ticket
  before insert or update on tickets
  for each row
  execute function validate_beo_ticket();

comment on function validate_beo_ticket is 'Valida campos obligatorios y ajusta prioridad de tickets BEO';

-- 6. Agregar categoría BEO al sistema
insert into categories (name) 
values ('BEO - Evento')
on conflict (parent_id, name) do nothing;
