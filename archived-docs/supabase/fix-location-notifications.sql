-- Script para corregir triggers de notificaciones por sede
-- Ejecutar en Supabase SQL Editor para aplicar los cambios

-- ========================================
-- CORRECCIÓN: Notificar solo al personal de la sede
-- ========================================

-- 1. Actualizar función de creación de ticket
create or replace function notify_ticket_created()
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
  requester_name := get_user_name(new.requester_id);

  -- Código visible del ticket (fecha + secuencia, zona CDMX)
  ticket_code := to_char(new.created_at at time zone 'America/Mexico_City', 'YYYYMMDD') || '-' || lpad(new.ticket_number::text, 4, '0');

  -- Notificar a supervisores, técnicos L1/L2 de la misma sede + admins (sin sede específica)
  for staff_id in
    select id 
    from profiles 
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
      insert into notifications (user_id, type, title, message, ticket_id, ticket_number, actor_id)
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

-- 2. Actualizar función de cambio de estado
create or replace function notify_ticket_status_changed()
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
    insert into notifications (user_id, type, title, message, ticket_id, ticket_number)
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
      insert into notifications (user_id, type, title, message, ticket_id, ticket_number)
      values (
        new.assigned_agent_id,
        'TICKET_STATUS_CHANGED',
        'Estado actualizado',
        format('El ticket %s cambió a: %s', ticket_code, status_label),
        new.id,
        new.ticket_number
      );
    end if;

    -- Notificaciones especiales para estados críticos
    if new.status in ('RESOLVED', 'CLOSED') then
      update notifications
      set type = case when new.status = 'RESOLVED' then 'TICKET_RESOLVED'::notification_type else 'TICKET_CLOSED'::notification_type end
      where ticket_id = new.id
        and user_id = new.requester_id
        and created_at = (select max(created_at) from notifications where ticket_id = new.id and user_id = new.requester_id);
      
      -- Notificar a personal de la sede cuando se cierra un ticket
      if new.status = 'CLOSED' then
        for staff_id in
          select id 
          from profiles 
          where role in ('supervisor', 'agent_l1', 'agent_l2', 'admin')
            and (
              -- Personal de la misma sede
              (location_id = new.location_id and new.location_id is not null)
              -- O admins sin sede asignada (ven todos)
              or (role = 'admin' and location_id is null)
            )
            and id != new.requester_id
            and id != coalesce(new.assigned_agent_id, '00000000-0000-0000-0000-000000000000'::uuid)
        loop
          insert into notifications (user_id, type, title, message, ticket_id, ticket_number)
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

-- ========================================
-- VERIFICACIÓN
-- ========================================

-- Ver personal que recibirá notificaciones para una sede específica
-- Reemplaza el UUID con el location_id del ticket
SELECT 
  p.id,
  p.full_name,
  p.role,
  p.location_id,
  l.name as location_name
FROM profiles p
LEFT JOIN locations l ON p.location_id = l.id
WHERE p.role IN ('supervisor', 'agent_l1', 'agent_l2', 'admin')
  AND (
    -- Personal de una sede específica (reemplaza el UUID)
    (p.location_id = 'c0bfd972-fb79-493c-a407-4c91005395cb')
    -- O admins sin sede
    OR (p.role = 'admin' AND p.location_id IS NULL)
  )
ORDER BY p.role, p.full_name;

-- ========================================
-- COMPLETADO
-- ========================================
-- Los triggers ahora notificarán solo al personal de la misma sede
-- + admins sin location_id asignado (ven todos los tickets)
