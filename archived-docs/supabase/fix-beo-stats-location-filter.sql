-- Fix: Corregir filtro de ubicación en estadísticas BEO
-- Problema: Supervisores/agentes de otras sedes ven contador > 0 aunque no tengan BEO en su sede
-- Solución: Simplificar lógica para que admin vea todo y no-admin solo su sede

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

comment on function get_beo_stats is 'Obtiene estadísticas de tickets BEO con filtro correcto por ubicación';
