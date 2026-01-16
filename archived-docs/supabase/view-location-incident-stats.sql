-- Vista de estadísticas por sede: tickets e incidencias
-- Ejecutar en Supabase para habilitar análisis por ubicación

create or replace view location_incident_stats as
select
  l.id as location_id,
  l.code as location_code,
  l.name as location_name,
  count(t.id) filter (where t.deleted_at is null) as total_tickets,
  count(t.id) filter (where t.deleted_at is null and t.status in ('NEW','ASSIGNED','IN_PROGRESS','NEEDS_INFO','WAITING_THIRD_PARTY')) as open_tickets,
  count(t.id) filter (where t.deleted_at is null and t.status in ('RESOLVED','CLOSED')) as closed_tickets,
  coalesce(avg(extract(epoch from (t.closed_at - t.created_at)) / 86400)
           filter (where t.deleted_at is null and t.closed_at is not null), 0)::numeric(10,2) as avg_resolution_days
from locations l
left join tickets t on t.location_id = l.id
where l.is_active = true
group by l.id, l.code, l.name
order by l.name;

comment on view location_incident_stats is 'Estadísticas agregadas de tickets por sede (total, abiertos, cerrados, tiempo promedio de resolución)';
