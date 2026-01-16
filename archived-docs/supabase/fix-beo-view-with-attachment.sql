-- =====================================================
-- Fix: Agregar attachment PDF a vista BEO
-- Descripción: Incluye el primer PDF adjunto del BEO para mostrar miniatura
-- Fecha: 2026-01-04
-- =====================================================

-- Primero eliminar la vista existente
drop view if exists beo_tickets_view;

-- Crear vista actualizada con campo beo_attachment
create view beo_tickets_view as
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
  -- Primer attachment PDF del BEO
  (
    select jsonb_build_object(
      'id', att.id,
      'file_name', att.file_name,
      'file_size', att.file_size,
      'file_type', att.file_type,
      'storage_path', att.storage_path
    )
    from ticket_attachments att
    where att.ticket_id = t.id
      and att.deleted_at is null
      and att.file_type = 'application/pdf'
    order by att.created_at asc
    limit 1
  ) as beo_attachment,
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

comment on view beo_tickets_view is 'Vista especializada de tickets BEO con indicadores de urgencia y attachment PDF';
