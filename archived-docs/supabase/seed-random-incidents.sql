-- ============================================================================
-- SEED DE DATOS DE PRUEBA (INCIDENCIAS ALEATORIAS MULTISEDE)
-- ----------------------------------------------------------------------------
-- Objetivo:
--   Generar múltiples tickets con datos aleatorios para probar:
--   - Dashboard, KPIs y tendencias
--   - Estadísticas por sede (location_incident_stats)
--   - Aging (días abiertos) y distribución de estados/prioridades
--
-- Supuestos:
--   - Ya existen usuarios en auth.users y profiles (requester / agentes).
--   - Ya existen sedes en locations (is_active = true).
--   - Ya existen categorías en categories (seed.sql ejecutado).
--   - Ejecutar preferentemente en el editor SQL de Supabase (rol de servicio).
--
-- Recomendado:
--   1) Ejecutar primero el script ReinicioDB.txt (limpieza de demo).
--   2) Ejecutar este script para volver a poblar tickets de prueba.
-- ============================================================================

-- Cantidad de tickets a generar (ajusta este valor manualmente)
-- Ejemplos: 100, 200, 500, etc.
-- IMPORTANTE: Este script está pensado para ejecutarse en Supabase SQL Editor,
-- por eso NO usa comandos especiales como \set o variables :nombre.
-- Modifica el valor directamente en generate_series más abajo.

with
  -- Usuarios que pueden ser solicitantes (cualquier perfil existente).
  -- Usamos profiles directamente para no depender de que haya "requester" registrados.
  reqs as (
    select id as user_id, location_id
    from profiles
  ),
  -- Usuarios que pueden ser agentes/responsables. Si no hubiera roles de agente,
  -- este CTE quedaría vacío, pero el insert seguirá funcionando porque assigned_agent_id es nullable.
  agents as (
    select id as user_id
    from profiles
    where role in ('agent_l1', 'agent_l2', 'supervisor', 'admin')
  )
insert into tickets (
  requester_id,
  affected_user_email,
  category_id,
  title,
  description,
  impact,
  urgency,
  priority,
  status,
  support_level,
  assigned_group,
  assigned_agent_id,
  created_at,
  updated_at,
  closed_at,
  closed_by,
  resolution,
  location_id
)
select
  r.user_id as requester_id,
  null::text as affected_user_email,
  c.id as category_id,
  format('Incidencia DEMO #%s en %s', g.i, l.code) as title,
  format(
    'Incidencia DEMO generada automáticamente para pruebas de dashboard y reportes. Sede: %s (%s). Este ticket forma parte de un lote de datos sintéticos para validar KPIs, aging y tendencias.',
    l.name,
    l.code
  ) as description,
  (1 + floor(random() * 4))::smallint as impact,
  (1 + floor(random() * 4))::smallint as urgency,
  (1 + floor(random() * 4))::smallint as priority,
  s.status::ticket_status as status,
  case when random() < 0.7 then 1 else 2 end as support_level,
  null::text as assigned_group,
  a.user_id as assigned_agent_id,
  t.created_at,
  t.created_at as updated_at,
  case when s.status in ('RESOLVED', 'CLOSED') then t.created_at + (interval '1 day') * (1 + floor(random() * 10)) else null end as closed_at,
  case when s.status in ('RESOLVED', 'CLOSED') then a.user_id else null end as closed_by,
  case when s.status in ('RESOLVED', 'CLOSED')
       then 'Ticket de prueba resuelto automáticamente para alimentar estadísticas de cierre.'
       else null
  end as resolution,
  l.id as location_id
from generate_series(1, 200) as g(i)  -- ← ajusta 200 si quieres más/menos tickets
-- categoría aleatoria
cross join lateral (
  select id
  from categories
  order by random()
  limit 1
) as c
-- sede aleatoria (solo activas)
cross join lateral (
  select id, code, name
  from locations
  where is_active = true
  order by random()
  limit 1
) as l
-- solicitante aleatorio (requester), priorizando usuarios de la misma sede
cross join lateral (
  select user_id
  from reqs
  where location_id = l.id or location_id is null
  order by
    case when location_id = l.id then 0 else 1 end,
    random()
  limit 1
) as r
-- agente / responsable aleatorio (si no hay agentes, quedará null)
cross join lateral (
  select user_id
  from agents
  order by random()
  limit 1
) as a
-- estado aleatorio con mezcla de abiertos/cerrados
cross join lateral (
  select status
  from (values
    ('NEW'::text),
    ('ASSIGNED'::text),
    ('IN_PROGRESS'::text),
    ('NEEDS_INFO'::text),
    ('WAITING_THIRD_PARTY'::text),
    ('RESOLVED'::text),
    ('CLOSED'::text)
  ) as v(status)
  order by random()
  limit 1
) as s
-- fecha de creación aleatoria en los últimos ~90 días
cross join lateral (
  select
    now()
    - (interval '90 days') * random() as created_at
) as t;

-- Verificación rápida
select
  l.code as sede,
  count(*) as total_tickets,
  sum(case when status in ('NEW','ASSIGNED','IN_PROGRESS','NEEDS_INFO','WAITING_THIRD_PARTY') then 1 else 0 end) as abiertos,
  sum(case when status in ('RESOLVED','CLOSED') then 1 else 0 end) as cerrados
from tickets t
join locations l on l.id = t.location_id
where t.deleted_at is null
group by l.code
order by l.code;
