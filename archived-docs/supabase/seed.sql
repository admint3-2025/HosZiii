-- Seed data for ZIII Helpdesk
-- Run this after schema.sql and policies.sql

-- 1) Categories (Incidents)
-- Tree: Hardware / Software / Redes / Accesos

with
hardware as (
  insert into categories (name, slug, parent_id, sort_order)
  values ('Hardware', 'hardware', null, 10)
  on conflict (parent_id, name) do update set slug = excluded.slug
  returning id
),
software as (
  insert into categories (name, slug, parent_id, sort_order)
  values ('Software', 'software', null, 20)
  on conflict (parent_id, name) do update set slug = excluded.slug
  returning id
),
redes as (
  insert into categories (name, slug, parent_id, sort_order)
  values ('Redes', 'redes', null, 30)
  on conflict (parent_id, name) do update set slug = excluded.slug
  returning id
),
accesos as (
  insert into categories (name, slug, parent_id, sort_order)
  values ('Accesos', 'accesos', null, 40)
  on conflict (parent_id, name) do update set slug = excluded.slug
  returning id
)
select 1;

-- Hardware subcategories
with
hardware as (select id from categories where parent_id is null and name = 'Hardware' limit 1),
pc as (
  insert into categories (name, slug, parent_id, sort_order)
  select 'PC / Laptop', 'pc-laptop', hardware.id, 10 from hardware
  on conflict (parent_id, name) do update set slug = excluded.slug
  returning id
),
perifs as (
  insert into categories (name, slug, parent_id, sort_order)
  select 'Periféricos', 'perifericos', hardware.id, 20 from hardware
  on conflict (parent_id, name) do update set slug = excluded.slug
  returning id
),
storage as (
  insert into categories (name, slug, parent_id, sort_order)
  select 'Almacenamiento', 'almacenamiento', hardware.id, 30 from hardware
  on conflict (parent_id, name) do update set slug = excluded.slug
  returning id
)
select 1;

insert into categories (name, parent_id, sort_order)
select v.name, pc.id, v.sort_order
from (values
  ('No enciende / no arranca', 10),
  ('Lentitud / sobrecalentamiento', 20),
  ('Pantalla (sin imagen/parpadeo)', 30),
  ('Teclado / touchpad / mouse', 40),
  ('Batería / cargador / puertos', 50)
) v(name, sort_order)
cross join (select id from categories where name = 'PC / Laptop' limit 1) pc
on conflict (parent_id, name) do update set sort_order = excluded.sort_order;

insert into categories (name, parent_id, sort_order)
select v.name, p.id, v.sort_order
from (values
  ('Impresora (no imprime/atasco/cola)', 10),
  ('Escáner (no detecta/calidad)', 20),
  ('Monitores / docks', 30),
  ('Telefonía / auriculares', 40)
) v(name, sort_order)
cross join (select id from categories where name = 'Periféricos' limit 1) p
on conflict (parent_id, name) do update set sort_order = excluded.sort_order;

insert into categories (name, parent_id, sort_order)
select v.name, s.id, v.sort_order
from (values
  ('Disco lleno', 10),
  ('Fallo de disco / SMART', 20),
  ('Recuperación de archivos', 30)
) v(name, sort_order)
cross join (select id from categories where name = 'Almacenamiento' limit 1) s
on conflict (parent_id, name) do update set sort_order = excluded.sort_order;

-- Software subcategories
with
software as (select id from categories where parent_id is null and name = 'Software' limit 1),
os as (
  insert into categories (name, slug, parent_id, sort_order)
  select 'Sistema Operativo', 'sistema-operativo', software.id, 10 from software
  on conflict (parent_id, name) do update set slug = excluded.slug
  returning id
),
apps as (
  insert into categories (name, slug, parent_id, sort_order)
  select 'Aplicaciones de negocio', 'apps-negocio', software.id, 20 from software
  on conflict (parent_id, name) do update set slug = excluded.slug
  returning id
),
office as (
  insert into categories (name, slug, parent_id, sort_order)
  select 'Ofimática', 'ofimatica', software.id, 30 from software
  on conflict (parent_id, name) do update set slug = excluded.slug
  returning id
),
browsers as (
  insert into categories (name, slug, parent_id, sort_order)
  select 'Navegadores', 'navegadores', software.id, 40 from software
  on conflict (parent_id, name) do update set slug = excluded.slug
  returning id
)
select 1;

insert into categories (name, parent_id, sort_order)
select v.name, os.id, v.sort_order
from (values
  ('Actualizaciones (falla/reinicios)', 10),
  ('Perfil de usuario (lento/corrupto)', 20),
  ('Antivirus/EDR (bloqueos/detecciones)', 30)
) v(name, sort_order)
cross join (select id from categories where name = 'Sistema Operativo' limit 1) os
on conflict (parent_id, name) do update set sort_order = excluded.sort_order;

insert into categories (name, parent_id, sort_order)
select v.name, a.id, v.sort_order
from (values
  ('Error al abrir / se cierra', 10),
  ('Licenciamiento / activación', 20),
  ('Rendimiento (lento)', 30),
  ('Integración (con otros sistemas)', 40)
) v(name, sort_order)
cross join (select id from categories where name = 'Aplicaciones de negocio' limit 1) a
on conflict (parent_id, name) do update set sort_order = excluded.sort_order;

insert into categories (name, parent_id, sort_order)
select v.name, o.id, v.sort_order
from (values
  ('Outlook (envío/recepción/perfil)', 10),
  ('Office (Word/Excel/PowerPoint)', 20)
) v(name, sort_order)
cross join (select id from categories where name = 'Ofimática' limit 1) o
on conflict (parent_id, name) do update set sort_order = excluded.sort_order;

insert into categories (name, parent_id, sort_order)
select v.name, b.id, v.sort_order
from (values
  ('Certificados / HTTPS', 10),
  ('Extensiones / compatibilidad', 20)
) v(name, sort_order)
cross join (select id from categories where name = 'Navegadores' limit 1) b
on conflict (parent_id, name) do update set sort_order = excluded.sort_order;

-- Redes subcategories
with
redes as (select id from categories where parent_id is null and name = 'Redes' limit 1),
conn as (
  insert into categories (name, slug, parent_id, sort_order)
  select 'Conectividad', 'conectividad', redes.id, 10 from redes
  on conflict (parent_id, name) do update set slug = excluded.slug
  returning id
),
svc as (
  insert into categories (name, slug, parent_id, sort_order)
  select 'Servicios de red', 'servicios-red', redes.id, 20 from redes
  on conflict (parent_id, name) do update set slug = excluded.slug
  returning id
),
access as (
  insert into categories (name, slug, parent_id, sort_order)
  select 'Acceso a recursos', 'acceso-recursos', redes.id, 30 from redes
  on conflict (parent_id, name) do update set slug = excluded.slug
  returning id
)
select 1;

insert into categories (name, parent_id, sort_order)
select v.name, c.id, v.sort_order
from (values
  ('Sin internet / intermitente', 10),
  ('Wi‑Fi (se cae/baja señal)', 20),
  ('LAN (sin enlace/IP)', 30)
) v(name, sort_order)
cross join (select id from categories where name = 'Conectividad' limit 1) c
on conflict (parent_id, name) do update set sort_order = excluded.sort_order;

insert into categories (name, parent_id, sort_order)
select v.name, s.id, v.sort_order
from (values
  ('DNS (no resuelve)', 10),
  ('DHCP (sin IP/conflicto)', 20),
  ('Proxy (bloqueos)', 30),
  ('VPN (no conecta/MFA)', 40)
) v(name, sort_order)
cross join (select id from categories where name = 'Servicios de red' limit 1) s
on conflict (parent_id, name) do update set sort_order = excluded.sort_order;

insert into categories (name, parent_id, sort_order)
select v.name, a.id, v.sort_order
from (values
  ('Carpetas compartidas / NAS', 10),
  ('Impresoras en red', 20),
  ('RDP/VDI/Citrix', 30)
) v(name, sort_order)
cross join (select id from categories where name = 'Acceso a recursos' limit 1) a
on conflict (parent_id, name) do update set sort_order = excluded.sort_order;

-- Accesos subcategories
with
accesos as (select id from categories where parent_id is null and name = 'Accesos' limit 1),
auth as (
  insert into categories (name, slug, parent_id, sort_order)
  select 'Cuenta / autenticación', 'cuenta-autenticacion', accesos.id, 10 from accesos
  on conflict (parent_id, name) do update set slug = excluded.slug
  returning id
),
perms as (
  insert into categories (name, slug, parent_id, sort_order)
  select 'Permisos', 'permisos', accesos.id, 20 from accesos
  on conflict (parent_id, name) do update set slug = excluded.slug
  returning id
),
mail as (
  insert into categories (name, slug, parent_id, sort_order)
  select 'Correo / colaboración', 'correo-colaboracion', accesos.id, 30 from accesos
  on conflict (parent_id, name) do update set slug = excluded.slug
  returning id
)
select 1;

insert into categories (name, parent_id, sort_order)
select v.name, a.id, v.sort_order
from (values
  ('Bloqueo de cuenta', 10),
  ('Reset / cambio de contraseña', 20),
  ('MFA/2FA (no llega/cambio dispositivo)', 30),
  ('Alta/Baja de usuario', 40)
) v(name, sort_order)
cross join (select id from categories where name = 'Cuenta / autenticación' limit 1) a
on conflict (parent_id, name) do update set sort_order = excluded.sort_order;

insert into categories (name, parent_id, sort_order)
select v.name, p.id, v.sort_order
from (values
  ('Acceso a carpeta / SharePoint / Teams', 10),
  ('Roles en aplicación de negocio', 20),
  ('Acceso a correo / buzón compartido', 30)
) v(name, sort_order)
cross join (select id from categories where name = 'Permisos' limit 1) p
on conflict (parent_id, name) do update set sort_order = excluded.sort_order;

insert into categories (name, parent_id, sort_order)
select v.name, m.id, v.sort_order
from (values
  ('No puede enviar/recibir (políticas)', 10),
  ('Listas de distribución / grupos', 20)
) v(name, sort_order)
cross join (select id from categories where name = 'Correo / colaboración' limit 1) m
on conflict (parent_id, name) do update set sort_order = excluded.sort_order;

-- 2) Initial role bootstrap helper
-- This is intentionally locked down (EXECUTE revoked from public).

create or replace function public.set_user_role(user_email text, new_role user_role, new_full_name text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  select u.id into uid
  from auth.users u
  where lower(u.email) = lower(user_email)
  limit 1;

  if uid is null then
    raise exception 'No existe un usuario en auth.users con email: %', user_email;
  end if;

  insert into public.profiles(id, full_name, role)
  values (uid, coalesce(new_full_name, user_email), new_role)
  on conflict (id) do update
    set role = excluded.role,
        full_name = coalesce(excluded.full_name, profiles.full_name);
end;
$$;

revoke all on function public.set_user_role(text, user_role, text) from public;

-- Example (run manually after creating the auth user):
-- select public.set_user_role('admin@tuempresa.com', 'supervisor', 'Administrador');
