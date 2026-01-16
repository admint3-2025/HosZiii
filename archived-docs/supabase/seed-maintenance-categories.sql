-- Seed básico de categorías para Mantenimiento.
-- Idempotente: no duplica si ya existen.
-- Ejecutar en Supabase SQL Editor (recomendado) o via script con service role.

begin;

-- 1) Crear raíz "Mantenimiento"
insert into public.categories (name, parent_id, sort_order)
select 'Mantenimiento', null, 50
where not exists (
  select 1 from public.categories
  where parent_id is null and lower(name) = lower('Mantenimiento')
);

-- 2) Subcategorías nivel 2
with root as (
  select id from public.categories
  where parent_id is null and lower(name) = lower('Mantenimiento')
  order by sort_order nulls last
  limit 1
)
insert into public.categories (name, parent_id, sort_order)
select v.name, root.id, v.sort_order
from root
cross join (
  values
    ('Electricidad', 10),
    ('Plomería', 20),
    ('Aire acondicionado', 30),
    ('Carpintería', 40),
    ('Pintura', 50),
    ('Cerrajería', 60),
    ('General', 70)
) as v(name, sort_order)
where not exists (
  select 1
  from public.categories c
  where c.parent_id = root.id and lower(c.name) = lower(v.name)
);

commit;
