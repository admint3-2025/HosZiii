-- Fix completo: Restaurar funciones de notificación sin dependencia de asset_category
-- Ejecutar en Supabase SQL Editor
-- Fecha: 2026-01-15

-- Primero crear/recrear la función helper con el schema explícito
drop function if exists public.infer_ticket_asset_category(text);

create function public.infer_ticket_asset_category(p_asset_type text)
returns text
language sql
immutable
as $$
  select case
    when p_asset_type is null then null
    when p_asset_type in ('DESKTOP','LAPTOP','TABLET','PHONE','MONITOR','PRINTER','SCANNER','SERVER','NETWORK','UPS','PROJECTOR') then 'IT'
    when p_asset_type in (
      'AIR_CONDITIONING','HVAC_SYSTEM','BOILER','REFRIGERATOR','KITCHEN_EQUIPMENT','WASHING_MACHINE','DRYER',
      'WATER_HEATER','PUMP','GENERATOR','ELEVATOR','FURNITURE','FIXTURE','CLEANING_EQUIPMENT','SECURITY_SYSTEM',
      'FIRE_SYSTEM','PLUMBING','ELECTRICAL','LIGHTING','VEHICLE','OTHER'
    ) then 'MAINTENANCE'
    else null
  end;
$$;

-- Grant permissions
grant execute on function public.infer_ticket_asset_category(text) to authenticated;
grant execute on function public.infer_ticket_asset_category(text) to service_role;
grant execute on function public.infer_ticket_asset_category(text) to anon;

-- Restaurar notify_ticket_created SIN filtrado por asset_category (versión simple y estable)
create or replace function public.notify_ticket_created()
returns trigger
language plpgsql
security definer
as $$
declare
  staff_id uuid;
  requester_name text;
  ticket_code text;
begin
  -- Obtener nombre del solicitante
  requester_name := public.get_user_name(new.requester_id);

  -- Código visible del ticket (fecha + secuencia, zona CDMX)
  ticket_code := to_char(new.created_at at time zone 'America/Mexico_City', 'YYYYMMDD') || '-' || lpad(new.ticket_number::text, 4, '0');

  -- Notificar a supervisores, técnicos L1/L2 de la misma sede + admins (sin sede específica)
  for staff_id in
    select id 
    from public.profiles 
    where role in ('supervisor', 'agent_l1', 'agent_l2', 'admin')
      and (
        -- Personal de la misma sede
        (location_id = new.location_id and new.location_id is not null)
        -- O admins sin sede asignada (ven todos)
        or (role = 'admin' and location_id is null)
      )
  loop
    -- No notificar al creador del ticket
    if staff_id != new.requester_id then
      insert into public.notifications (user_id, type, title, message, ticket_id, ticket_number, actor_id)
      values (
        staff_id,
        'TICKET_CREATED',
        'Nuevo ticket creado',
        format('"%s" ha creado el ticket %s', requester_name, ticket_code),
        new.id,
        new.ticket_number,
        new.requester_id
      );
    end if;
  end loop;

  return new;
end;
$$;

-- Restaurar notify_ticket_status_changed SIN filtrado por asset_category (versión simple y estable)
create or replace function public.notify_ticket_status_changed()
returns trigger
language plpgsql
security definer
as $$
declare
  status_label text;
  staff_id uuid;
  ticket_code text;
begin
  -- Solo si hay cambio de estado
  if new.status != old.status then
    
    -- Traducir estado
    status_label := case new.status
      when 'NEW' then 'Nuevo'
      when 'ASSIGNED' then 'Asignado'
      when 'IN_PROGRESS' then 'En progreso'
      when 'NEEDS_INFO' then 'Requiere información'
      when 'WAITING_THIRD_PARTY' then 'Esperando tercero'
      when 'RESOLVED' then 'Resuelto'
      when 'CLOSED' then 'Cerrado'
      else new.status::text
    end;

    -- Código visible del ticket
    ticket_code := to_char(new.created_at at time zone 'America/Mexico_City', 'YYYYMMDD') || '-' || lpad(new.ticket_number::text, 4, '0');

    -- Notificar al solicitante
    insert into public.notifications (user_id, type, title, message, ticket_id, ticket_number)
    values (
      new.requester_id,
      'TICKET_STATUS_CHANGED',
      'Estado actualizado',
      format('Tu ticket %s cambió a: %s', ticket_code, status_label),
      new.id,
      new.ticket_number
    );

    -- Si hay agente asignado y es diferente al solicitante, notificarle también
    if new.assigned_agent_id is not null and new.assigned_agent_id != new.requester_id then
      insert into public.notifications (user_id, type, title, message, ticket_id, ticket_number)
      values (
        new.assigned_agent_id,
        'TICKET_STATUS_CHANGED',
        'Estado actualizado',
        format('El ticket %s cambió a: %s', ticket_code, status_label),
        new.id,
        new.ticket_number
      );
    end if;

    -- Si el ticket se resuelve o cierra, actualizar el tipo de notificación
    if new.status in ('RESOLVED', 'CLOSED') then
      update public.notifications
      set type = case when new.status = 'RESOLVED' then 'TICKET_RESOLVED'::notification_type else 'TICKET_CLOSED'::notification_type end
      where ticket_id = new.id
        and user_id = new.requester_id
        and created_at = (
          select max(created_at)
          from public.notifications
          where ticket_id = new.id and user_id = new.requester_id
        );
    end if;
  end if;

  return new;
end;
$$;

-- Verificar que la función existe
select 'infer_ticket_asset_category existe' as status 
where exists (
  select 1 from pg_proc p 
  join pg_namespace n on p.pronamespace = n.oid 
  where n.nspname = 'public' and p.proname = 'infer_ticket_asset_category'
);
