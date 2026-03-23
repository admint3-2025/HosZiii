-- =====================================================
-- PURGA TOTAL DE USUARIO POR CORREO
-- =====================================================
-- ADVERTENCIA:
-- Este script es destructivo. Elimina o desvincula registros relacionados
-- con el usuario para dejar libre el correo y poder recrearlo desde cero.
--
-- Uso:
-- 1. Cambia v_target_email por el correo que quieres erradicar.
-- 2. Ejecuta el bloque completo.
-- 3. Revisa los NOTICE y la validacion final.
-- =====================================================

begin;

do $$
declare
  v_target_email text := 'edelatorre298@gmail.com';
  v_user_id uuid;
  v_profile_id uuid;
  v_identity_count integer := 0;
  fk_record record;
  sql_text text;
  affected_rows bigint;
begin
  -- 1) Resolver usuario principal por auth.users
  select u.id
  into v_user_id
  from auth.users u
  where lower(u.email) = lower(v_target_email)
  limit 1;

  -- 2) Fallback: si no existe auth.users, intentar obtener user_id desde auth.identities
  if v_user_id is null then
    select i.user_id
    into v_user_id
    from auth.identities i
    where lower(coalesce(i.email, i.identity_data ->> 'email', '')) = lower(v_target_email)
      and i.user_id is not null
    limit 1;
  end if;

  v_profile_id := v_user_id;

  raise notice 'Purga iniciada para email=%', v_target_email;
  raise notice 'user_id resuelto=%', coalesce(v_user_id::text, 'NULL');

  -- 3) Nullificar autorreferencias en profiles (ej. supervisor_id)
  if v_profile_id is not null then
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'profiles'
        and column_name = 'supervisor_id'
    ) then
      update public.profiles
      set supervisor_id = null
      where supervisor_id = v_profile_id;

      get diagnostics affected_rows = row_count;
      if affected_rows > 0 then
        raise notice 'profiles.supervisor_id nullificados=%', affected_rows;
      end if;
    end if;
  end if;

  -- 4) Recorrer FKs que referencian public.profiles(id) o auth.users(id)
  --    Para SET NULL/SET DEFAULT desvincula.
  --    Para NO ACTION/RESTRICT/CASCADE elimina filas hijas.
  for fk_record in
    with fk_pairs as (
      select
        tc.constraint_name,
        tc.table_schema,
        tc.table_name,
        ccu.table_schema as referenced_schema,
        ccu.table_name as referenced_table,
        ccu.column_name as referenced_column,
        rc.delete_rule,
        kcu.column_name,
        row_number() over (partition by tc.constraint_name, tc.table_schema, tc.table_name order by kcu.ordinal_position) as rn,
        count(*) over (partition by tc.constraint_name, tc.table_schema, tc.table_name) as col_count
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on tc.constraint_name = kcu.constraint_name
       and tc.table_schema = kcu.table_schema
      join information_schema.constraint_column_usage ccu
        on tc.constraint_name = ccu.constraint_name
       and tc.table_schema = ccu.table_schema
      join information_schema.referential_constraints rc
        on tc.constraint_name = rc.constraint_name
       and tc.table_schema = rc.constraint_schema
      where tc.constraint_type = 'FOREIGN KEY'
        and (
          (ccu.table_schema = 'public' and ccu.table_name = 'profiles' and ccu.column_name = 'id')
          or
          (ccu.table_schema = 'auth' and ccu.table_name = 'users' and ccu.column_name = 'id')
        )
        and not (tc.table_schema = 'public' and tc.table_name = 'profiles')
        and not (tc.table_schema = 'auth' and tc.table_name in ('users', 'identities', 'sessions', 'refresh_tokens', 'mfa_factors', 'mfa_amr_claims', 'one_time_tokens', 'sso_providers', 'sso_domains'))
    )
    select *
    from fk_pairs
    where col_count = 1 and rn = 1
    order by
      case when delete_rule in ('SET NULL', 'SET DEFAULT') then 0 else 1 end,
      table_schema,
      table_name,
      column_name
  loop
    if fk_record.referenced_schema = 'public' and v_profile_id is null then
      continue;
    end if;

    if fk_record.referenced_schema = 'auth' and v_user_id is null then
      continue;
    end if;

    if fk_record.delete_rule = 'SET NULL' then
      sql_text := format(
        'update %I.%I set %I = null where %I = %L::uuid',
        fk_record.table_schema,
        fk_record.table_name,
        fk_record.column_name,
        fk_record.column_name,
        case when fk_record.referenced_schema = 'public' then v_profile_id::text else v_user_id::text end
      );
    elsif fk_record.delete_rule = 'SET DEFAULT' then
      sql_text := format(
        'update %I.%I set %I = default where %I = %L::uuid',
        fk_record.table_schema,
        fk_record.table_name,
        fk_record.column_name,
        fk_record.column_name,
        case when fk_record.referenced_schema = 'public' then v_profile_id::text else v_user_id::text end
      );
    else
      sql_text := format(
        'delete from %I.%I where %I = %L::uuid',
        fk_record.table_schema,
        fk_record.table_name,
        fk_record.column_name,
        case when fk_record.referenced_schema = 'public' then v_profile_id::text else v_user_id::text end
      );
    end if;

    execute sql_text;
    get diagnostics affected_rows = row_count;

    if affected_rows > 0 then
      raise notice 'FK cleanup: %.% columna=% regla=% afectados=% referencia=%.%',
        fk_record.table_schema,
        fk_record.table_name,
        fk_record.column_name,
        fk_record.delete_rule,
        affected_rows,
        fk_record.referenced_schema,
        fk_record.referenced_table;
    end if;
  end loop;

  -- 5) Limpieza explicita de tablas que a veces no tienen FK o pueden quedar fuera
  if v_user_id is not null then
    if to_regclass('public.audit_log') is not null then
      delete from public.audit_log
      where actor_id = v_user_id
         or (entity_type = 'user' and entity_id = v_user_id);
      get diagnostics affected_rows = row_count;
      if affected_rows > 0 then
        raise notice 'audit_log eliminados=%', affected_rows;
      end if;
    end if;

    if to_regclass('public.login_audits') is not null then
      delete from public.login_audits
      where user_id = v_user_id;
      get diagnostics affected_rows = row_count;
      if affected_rows > 0 then
        raise notice 'login_audits eliminados=%', affected_rows;
      end if;
    end if;

    if to_regclass('public.notifications') is not null then
      delete from public.notifications
      where user_id = v_user_id or actor_id = v_user_id;
      get diagnostics affected_rows = row_count;
      if affected_rows > 0 then
        raise notice 'notifications eliminadas=%', affected_rows;
      end if;
    end if;
  end if;

  if v_profile_id is not null then
    if to_regclass('public.user_locations') is not null then
      delete from public.user_locations
      where user_id = v_profile_id;
      get diagnostics affected_rows = row_count;
      if affected_rows > 0 then
        raise notice 'user_locations eliminadas=%', affected_rows;
      end if;
    end if;
  end if;

  -- 6) Borrar perfil si existe
  if v_profile_id is not null then
    delete from public.profiles
    where id = v_profile_id;
    get diagnostics affected_rows = row_count;
    raise notice 'profiles eliminados=%', affected_rows;
  end if;

  -- 7) Borrar identidades por user_id y por email
  delete from auth.identities
  where (v_user_id is not null and user_id = v_user_id)
     or lower(coalesce(email, identity_data ->> 'email', '')) = lower(v_target_email);
  get diagnostics v_identity_count = row_count;
  raise notice 'auth.identities eliminadas=%', v_identity_count;

  -- 8) Borrar auth.users
  if v_user_id is not null then
    delete from auth.users
    where id = v_user_id;
    get diagnostics affected_rows = row_count;
    raise notice 'auth.users eliminados=%', affected_rows;
  else
    raise notice 'No se encontro auth.users para el correo; se limpio solo residuo auxiliar';
  end if;

  -- 9) Segunda pasada por identidades por seguridad, si auth.users ya no existe
  delete from auth.identities
  where lower(coalesce(email, identity_data ->> 'email', '')) = lower(v_target_email);
  get diagnostics affected_rows = row_count;
  if affected_rows > 0 then
    raise notice 'auth.identities residuales eliminadas en segunda pasada=%', affected_rows;
  end if;

end $$;

-- =====================================================
-- VALIDACION FINAL
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
from public.profiles
where id in (
  select id from auth.users where lower(email) = lower('edelatorre298@gmail.com')
)

union all

select 'user_locations' as origen, count(*) as total
from public.user_locations
where user_id in (
  select id from auth.users where lower(email) = lower('edelatorre298@gmail.com')
);

commit;