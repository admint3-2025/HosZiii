-- =====================================================
-- DIAGNOSTICO Y FIX: alta de usuario con email
-- edelatorre298@gmail.com
-- =====================================================
-- Objetivo:
-- 1. Detectar si el correo ya existe en auth.users
-- 2. Detectar perfiles o identidades huerfanas
-- 3. Limpiar residuos que bloqueen volver a crear/invitar al usuario
--
-- Uso recomendado:
-- 1. Ejecuta primero las secciones A y B
-- 2. Revisa resultados
-- 3. Si ves residuos inconsistentes, ejecuta la seccion C
-- 4. Luego vuelve a crear/invitar al usuario desde la app
-- =====================================================

-- =====================================================
-- A. DIAGNOSTICO
-- =====================================================

-- A1) Ver si el correo ya existe en auth.users
select
  u.id,
  u.email,
  u.created_at,
  u.updated_at,
  u.confirmed_at,
  u.email_confirmed_at,
  u.last_sign_in_at,
  u.raw_user_meta_data,
  u.raw_app_meta_data,
  u.is_sso_user,
  u.deleted_at,
  u.banned_until
from auth.users u
where lower(u.email) = lower('edelatorre298@gmail.com');

-- A2) Ver identities ligadas a ese correo o a ese user_id
select
  i.id,
  i.user_id,
  i.provider,
  i.identity_data,
  i.created_at,
  i.updated_at,
  i.last_sign_in_at,
  i.email
from auth.identities i
where lower(coalesce(i.email, i.identity_data ->> 'email', '')) = lower('edelatorre298@gmail.com')
   or i.user_id in (
     select id
     from auth.users
     where lower(email) = lower('edelatorre298@gmail.com')
   )
order by i.created_at;

-- A3) Ver perfil app ligado a ese correo
select
  p.id,
  p.full_name,
  p.role,
  p.department,
  p.position,
  p.location_id,
  p.asset_category,
  p.is_corporate,
  p.can_manage_assets,
  p.can_view_beo
from profiles p
where p.id in (
  select id
  from auth.users
  where lower(email) = lower('edelatorre298@gmail.com')
);

-- A4) Ver si hay profile huerfano con ese id pero sin usuario valido en auth.users
select
  p.id,
  p.full_name,
  p.role,
  case when u.id is null then 'PROFILE_HUERFANO' else 'OK' end as estado
from profiles p
left join auth.users u on u.id = p.id
where p.id in (
  select p2.id
  from profiles p2
  left join auth.users u2 on u2.id = p2.id
  where u2.id is null
)
and p.full_name ilike '%edith%de%la%torre%';

-- A5) Ver mapeos en user_locations del usuario, si existe
select
  ul.user_id,
  ul.location_id,
  l.code,
  l.name,
  l.is_active
from user_locations ul
left join locations l on l.id = ul.location_id
where ul.user_id in (
  select id
  from auth.users
  where lower(email) = lower('edelatorre298@gmail.com')
)
order by l.code;

-- A6) Resumen rapido de consistencia
with auth_match as (
  select id, email
  from auth.users
  where lower(email) = lower('edelatorre298@gmail.com')
),
profile_match as (
  select p.id
  from profiles p
  inner join auth_match a on a.id = p.id
),
identity_match as (
  select i.id
  from auth.identities i
  where lower(coalesce(i.email, i.identity_data ->> 'email', '')) = lower('edelatorre298@gmail.com')
     or i.user_id in (select id from auth_match)
)
select
  (select count(*) from auth_match) as auth_users_count,
  (select count(*) from profile_match) as profiles_count,
  (select count(*) from identity_match) as identities_count;

-- =====================================================
-- B. INTERPRETACION RAPIDA
-- =====================================================
-- Caso 1:
-- auth_users_count = 1
-- Resultado: el correo YA existe en Supabase Auth.
-- No debes intentar crearlo otra vez; debes reutilizarlo, actualizarlo o eliminarlo si fue alta fallida.
--
-- Caso 2:
-- auth_users_count = 0 y identities_count > 0
-- Resultado: hay residuos en auth.identities bloqueando el email.
--
-- Caso 3:
-- auth_users_count = 1 y profiles_count = 0
-- Resultado: el usuario existe en Auth pero tu app no termino de crear su profile.
--
-- Caso 4:
-- auth_users_count > 1
-- Resultado: inconsistencia grave en auth.users.

-- =====================================================
-- C. FIX DIRIGIDO
-- =====================================================
-- Ejecuta SOLO si quieres limpiar TODO lo relacionado con este correo
-- para volver a invitar/crear al usuario desde cero.
--
-- Este bloque elimina:
-- - user_locations del usuario
-- - profile
-- - identities
-- - auth.users
--
-- Si el diagnostico muestra auth_users_count = 0 pero identities_count > 0,
-- el bloque tambien limpia esas identities huerfanas.
-- =====================================================

begin;

-- C1) Borrar sedes del usuario si existe en auth.users
delete from user_locations
where user_id in (
  select id
  from auth.users
  where lower(email) = lower('edelatorre298@gmail.com')
);

-- C2) Borrar profile si existe
delete from profiles
where id in (
  select id
  from auth.users
  where lower(email) = lower('edelatorre298@gmail.com')
);

-- C3) Borrar identities por email o user_id
delete from auth.identities
where lower(coalesce(email, identity_data ->> 'email', '')) = lower('edelatorre298@gmail.com')
   or user_id in (
     select id
     from auth.users
     where lower(email) = lower('edelatorre298@gmail.com')
   );

-- C4) Borrar usuario auth
delete from auth.users
where lower(email) = lower('edelatorre298@gmail.com');

commit;

-- =====================================================
-- D. VALIDACION POST-LIMPIEZA
-- =====================================================
select 'auth.users' as origen, count(*) as total
from auth.users
where lower(email) = lower('edelatorre298@gmail.com')

union all

select 'auth.identities' as origen, count(*) as total
from auth.identities
where lower(coalesce(email, identity_data ->> 'email', '')) = lower('edelatorre298@gmail.com')

union all

select 'profiles' as origen, count(*) as total
from profiles
where id in (
  select id
  from auth.users
  where lower(email) = lower('edelatorre298@gmail.com')
);

-- =====================================================
-- E. SI NO QUIERES BORRAR EL USUARIO AUTH EXISTENTE
-- =====================================================
-- Si A1 devuelve 1 fila y quieres conservarla, en vez de recrearlo:
-- 1) deja auth.users intacto
-- 2) solo recrea el profile faltante con algo asi:
--
-- insert into profiles (
--   id,
--   full_name,
--   role
-- )
-- select
--   u.id,
--   'Edith De la Torre',
--   'requester'::user_role
-- from auth.users u
-- where lower(u.email) = lower('edelatorre298@gmail.com')
-- on conflict (id) do update
-- set full_name = excluded.full_name,
--     role = excluded.role;
-- =====================================================