-- Migration: Filtrado de notificaciones in-app por categoría de activos (IT vs MAINTENANCE)
-- Fecha: 2026-01-15
-- Nota: Requiere columnas:
--   - profiles.asset_category (text, nullable o con default; si es NULL se considera "sin restricción")
--   - tickets.asset_id (uuid, nullable)
--   - assets.asset_type (text)
--
-- Esta migración SOLO reemplaza funciones (create or replace). Si ya existen los triggers
-- sobre `tickets` apuntando a `notify_ticket_created` y `notify_ticket_status_changed`,
-- empezarán a usar este filtrado inmediatamente.

-- Helper: inferir categoría del ticket a partir del asset_type (solo para IT vs mantenimiento)
create or replace function public.infer_ticket_asset_category(p_asset_type text)
returns text
language sql
immutable
as $$
  select case
    when p_asset_type is null then null
    when p_asset_type in ('DESKTOP','LAPTOP','TABLET','PHONE','MONITOR','PRINTER','SCANNER','SERVER','UPS','PROJECTOR') then 'IT'
    when p_asset_type in (
      'AIR_CONDITIONING','HVAC_SYSTEM','BOILER','REFRIGERATOR','KITCHEN_EQUIPMENT','WASHING_MACHINE','DRYER',
      'WATER_HEATER','PUMP','GENERATOR','ELEVATOR','FURNITURE','FIXTURE','CLEANING_EQUIPMENT','SECURITY_SYSTEM',
      'FIRE_SYSTEM','PLUMBING','ELECTRICAL','LIGHTING','VEHICLE','OTHER'
    ) then 'MAINTENANCE'
    else null
  end;
$$;

-- Función: Notificar creación de ticket a personal de la misma sede (filtrando por asset_category)
create or replace function public.notify_ticket_created()
returns trigger
language plpgsql
security definer
as $$
declare
  staff_id uuid;
  requester_name text;
  ticket_code text;
  ticket_category text;
begin
  requester_name := public.get_user_name(new.requester_id);

  ticket_code := to_char(new.created_at at time zone 'America/Mexico_City', 'YYYYMMDD') || '-' || lpad(new.ticket_number::text, 4, '0');

  -- Inferir categoría del ticket (si hay asset_id)
  select public.infer_ticket_asset_category(a.asset_type)
    into ticket_category
  from public.tickets t
  left join public.assets a on a.id = t.asset_id
  where t.id = new.id;

  for staff_id in
    select p.id
    from public.profiles p
    where p.role in ('supervisor', 'agent_l1', 'agent_l2', 'admin')
      and (
        (p.location_id = new.location_id and new.location_id is not null)
        or (p.role = 'admin' and p.location_id is null)
      )
      and (
        ticket_category is null
        or p.role = 'admin'
        or p.asset_category is null
        or p.asset_category = ticket_category
      )
  loop
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

-- Función: Notificar cambio de estado (filtrando por asset_category en notificaciones a personal de sede al cerrar)
create or replace function public.notify_ticket_status_changed()
returns trigger
language plpgsql
security definer
as $$
declare
  status_label text;
  staff_id uuid;
  ticket_code text;
  ticket_category text;
begin
  if new.status != old.status then
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

    ticket_code := to_char(new.created_at at time zone 'America/Mexico_City', 'YYYYMMDD') || '-' || lpad(new.ticket_number::text, 4, '0');

    insert into public.notifications (user_id, type, title, message, ticket_id, ticket_number)
    values (
      new.requester_id,
      'TICKET_STATUS_CHANGED',
      'Estado actualizado',
      format('Tu ticket %s cambió a: %s', ticket_code, status_label),
      new.id,
      new.ticket_number
    );

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

      if new.status = 'CLOSED' then
        select public.infer_ticket_asset_category(a.asset_type)
          into ticket_category
        from public.tickets t
        left join public.assets a on a.id = t.asset_id
        where t.id = new.id;

        for staff_id in
          select p.id
          from public.profiles p
          where p.role in ('supervisor', 'agent_l1', 'agent_l2', 'admin')
            and (
              (p.location_id = new.location_id and new.location_id is not null)
              or (p.role = 'admin' and p.location_id is null)
            )
            and p.id != new.requester_id
            and p.id != coalesce(new.assigned_agent_id, '00000000-0000-0000-0000-000000000000'::uuid)
            and (
              ticket_category is null
              or p.role = 'admin'
              or p.asset_category is null
              or p.asset_category = ticket_category
            )
        loop
          insert into public.notifications (user_id, type, title, message, ticket_id, ticket_number)
          values (
            staff_id,
            'TICKET_CLOSED'::notification_type,
            'Ticket cerrado',
            format('El ticket %s ha sido cerrado', ticket_code),
            new.id,
            new.ticket_number
          );
        end loop;
      end if;
    end if;
  end if;

  return new;
end;
$$;
