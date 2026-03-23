-- =====================================================
-- DIAGNOSTICO: fallas al crear/invitar usuarios en Supabase Auth
-- Error observado en app: "Database error checking email"
-- =====================================================
-- Objetivo:
-- 1. Ver triggers activos sobre auth.users
-- 2. Ver la definicion de las funciones que se ejecutan al crear usuario
-- 3. Detectar si public.profiles tiene columnas/restricciones incompatibles
-- 4. Detectar triggers sobre profiles que puedan romper la insercion
-- =====================================================

-- A1) Triggers no internos sobre auth.users
select
  t.tgname as trigger_name,
  n.nspname as table_schema,
  c.relname as table_name,
  p.proname as function_name,
  pn.nspname as function_schema,
  pg_get_triggerdef(t.oid, true) as trigger_def
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
join pg_namespace pn on pn.oid = p.pronamespace
where n.nspname = 'auth'
  and c.relname = 'users'
  and not t.tgisinternal
order by t.tgname;

-- A2) Definicion completa de funciones comunmente usadas al crear usuarios
select
  pn.nspname as function_schema,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_def
from pg_proc p
join pg_namespace pn on pn.oid = p.pronamespace
where p.proname in (
  'handle_new_user',
  'on_auth_user_created',
  'create_profile_for_user'
)
order by pn.nspname, p.proname;

-- A3) Todas las funciones referenciadas por triggers de auth.users
select distinct
  pn.nspname as function_schema,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_def
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
join pg_namespace pn on pn.oid = p.pronamespace
where n.nspname = 'auth'
  and c.relname = 'users'
  and not t.tgisinternal
order by pn.nspname, p.proname;

-- B1) Estructura actual de public.profiles
select
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
order by ordinal_position;

-- B2) Restricciones de profiles
select
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_schema as foreign_table_schema,
  ccu.table_name as foreign_table_name,
  ccu.column_name as foreign_column_name
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
  and tc.table_schema = kcu.table_schema
left join information_schema.constraint_column_usage ccu
  on tc.constraint_name = ccu.constraint_name
  and tc.table_schema = ccu.table_schema
where tc.table_schema = 'public'
  and tc.table_name = 'profiles'
order by tc.constraint_type, tc.constraint_name, kcu.ordinal_position;

-- B3) Triggers no internos sobre public.profiles
select
  t.tgname as trigger_name,
  p.proname as function_name,
  pn.nspname as function_schema,
  pg_get_triggerdef(t.oid, true) as trigger_def
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
join pg_namespace pn on pn.oid = p.pronamespace
where n.nspname = 'public'
  and c.relname = 'profiles'
  and not t.tgisinternal
order by t.tgname;

-- B4) Definicion de funciones usadas por triggers de profiles
select distinct
  pn.nspname as function_schema,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_def
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
join pg_namespace pn on pn.oid = p.pronamespace
where n.nspname = 'public'
  and c.relname = 'profiles'
  and not t.tgisinternal
order by pn.nspname, p.proname;

-- C1) Ver enum de roles si existe
select
  n.nspname as schema_name,
  t.typname as enum_name,
  e.enumsortorder,
  e.enumlabel
from pg_type t
join pg_enum e on e.enumtypid = t.oid
join pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'public'
  and t.typname in ('user_role')
order by t.typname, e.enumsortorder;

-- C2) Ver columnas NOT NULL en profiles sin default
select
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and is_nullable = 'NO'
  and column_default is null
order by ordinal_position;

-- D1) Dependencias que referencian auth.users desde funciones SQL/PLpgSQL
with function_defs as (
  select
    pn.nspname as function_schema,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_def
  from pg_proc p
  join pg_namespace pn on pn.oid = p.pronamespace
  where p.prokind = 'f'
)
select
  function_schema,
  function_name,
  function_def
from function_defs
where function_def ilike '%auth.users%'
  and (
    function_def ilike '%profiles%'
    or function_def ilike '%raw_user_meta_data%'
    or function_def ilike '%new.email%'
  )
order by function_schema, function_name;

-- =====================================================
-- INTERPRETACION
-- =====================================================
-- Si A1 devuelve un trigger como on_auth_user_created o handle_new_user,
-- revisa su function_def en A2/A3.
--
-- Busca especialmente estos problemas:
-- 1. Inserta en profiles una columna que ya no existe.
-- 2. Inserta role con un valor que ya no pertenece al enum user_role.
-- 3. Omite una columna NOT NULL nueva en profiles.
-- 4. Usa referencias antiguas como is_maintenance_supervisor u otras columnas retiradas.
--
-- Si A1 no devuelve triggers en auth.users, entonces el problema ya no es trigger SQL.
-- En ese caso el siguiente paso es probar desde la app creando con password
-- (createUser) en lugar de invitacion (inviteUserByEmail), porque el flujo de invitacion
-- pasa por mas validaciones internas de Auth.
-- =====================================================