create or replace function public.admin_hard_reset_user(
  p_actor_id uuid,
  p_target_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_role text;
  v_target_role text;
  v_target_name text;
  v_target_email text;
  v_target_label text;
  v_descriptor text;
  v_admin_count integer;
  v_comment record;
begin
  if p_actor_id is null or p_target_id is null then
    raise exception 'actor y target son obligatorios';
  end if;

  if p_actor_id = p_target_id then
    raise exception 'No puedes hacer hard reset de tu propio usuario';
  end if;

  select role
  into v_actor_role
  from public.profiles
  where id = p_actor_id;

  if v_actor_role is distinct from 'admin' then
    raise exception 'Solo un admin puede hacer hard reset de usuarios';
  end if;

  select count(*)
  into v_admin_count
  from public.profiles
  where role = 'admin';

  select p.role, p.full_name, u.email
  into v_target_role, v_target_name, v_target_email
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = p_target_id;

  if not found then
    raise exception 'Usuario no encontrado';
  end if;

  if v_target_role = 'admin' and v_admin_count <= 1 then
    raise exception 'No se puede eliminar el unico usuario administrador del sistema';
  end if;

  v_target_label := coalesce(nullif(trim(v_target_name), ''), nullif(trim(v_target_email), ''), 'usuario-' || left(p_target_id::text, 8));
  v_descriptor := 'Usuario eliminado: ' || v_target_label ||
    case
      when coalesce(trim(v_target_email), '') <> '' and v_target_email <> v_target_label then ' <' || v_target_email || '>'
      else ''
    end;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'ticket_comments' and column_name = 'author_id'
  ) then
    for v_comment in
      select id, body
      from public.ticket_comments
      where author_id = p_target_id
    loop
      update public.ticket_comments
      set body = case
        when coalesce(v_comment.body, '') like '[' || v_descriptor || ']%' then v_comment.body
        when coalesce(v_comment.body, '') = '' then '[' || v_descriptor || ']'
        else '[' || v_descriptor || E']\n\n' || v_comment.body
      end
      where id = v_comment.id;
    end loop;

    update public.ticket_comments
    set author_id = p_actor_id
    where author_id = p_target_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'maintenance_ticket_comments' and column_name = 'author_id'
  ) then
    for v_comment in
      select id, body
      from public.maintenance_ticket_comments
      where author_id = p_target_id
    loop
      update public.maintenance_ticket_comments
      set body = case
        when coalesce(v_comment.body, '') like '[' || v_descriptor || ']%' then v_comment.body
        when coalesce(v_comment.body, '') = '' then '[' || v_descriptor || ']'
        else '[' || v_descriptor || E']\n\n' || v_comment.body
      end
      where id = v_comment.id;
    end loop;

    update public.maintenance_ticket_comments
    set author_id = p_actor_id
    where author_id = p_target_id;
  end if;

  if to_regclass('public.login_audits') is not null then
    delete from public.login_audits where user_id = p_target_id;
  end if;

  if to_regclass('public.policy_acknowledgments') is not null then
    delete from public.policy_acknowledgments where user_id = p_target_id;
  end if;

  if to_regclass('public.user_telegram_chat_ids') is not null then
    delete from public.user_telegram_chat_ids where user_id = p_target_id;
  end if;

  if to_regclass('public.knowledge_base_usage') is not null then
    delete from public.knowledge_base_usage where used_by = p_target_id;
  end if;

  if to_regclass('public.academy_quiz_attempts') is not null then
    delete from public.academy_quiz_attempts where user_id = p_target_id;
  end if;

  if to_regclass('public.academy_progress') is not null then
    delete from public.academy_progress where user_id = p_target_id;
  end if;

  if to_regclass('public.academy_enrollments') is not null then
    delete from public.academy_enrollments where user_id = p_target_id;
    update public.academy_enrollments set enrolled_by = p_actor_id where enrolled_by = p_target_id;
  end if;

  if to_regclass('public.academy_bookmarks') is not null then
    delete from public.academy_bookmarks where user_id = p_target_id;
  end if;

  if to_regclass('public.academy_certificates') is not null then
    delete from public.academy_certificates where user_id = p_target_id;
    update public.academy_certificates set issued_by_id = p_actor_id where issued_by_id = p_target_id;
  end if;

  if to_regclass('public.hk_staff') is not null then
    delete from public.hk_staff where profile_id = p_target_id;
  end if;

  if to_regclass('public.user_locations') is not null then
    delete from public.user_locations where user_id = p_target_id;
    update public.user_locations set created_by = p_actor_id where created_by = p_target_id;
  end if;

  if to_regclass('public.notifications') is not null then
    delete from public.notifications where user_id = p_target_id;
    update public.notifications set actor_id = p_actor_id where actor_id = p_target_id;
  end if;

  if to_regclass('public.hk_rooms') is not null then
    update public.hk_rooms set assigned_to = null where assigned_to = p_target_id;
  end if;

  if to_regclass('public.hk_room_status_log') is not null then
    update public.hk_room_status_log set changed_by = p_actor_id where changed_by = p_target_id;
  end if;

  if to_regclass('public.tickets') is not null then
    update public.tickets set requester_id = p_actor_id where requester_id = p_target_id;
    update public.tickets set assigned_agent_id = null where assigned_agent_id = p_target_id;
    update public.tickets set closed_by = p_actor_id where closed_by = p_target_id;
    update public.tickets set deleted_by = p_actor_id where deleted_by = p_target_id;
  end if;

  if to_regclass('public.ticket_attachments') is not null then
    update public.ticket_attachments set uploaded_by = p_actor_id where uploaded_by = p_target_id;
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'ticket_attachments' and column_name = 'deleted_by'
    ) then
      execute 'update public.ticket_attachments set deleted_by = $1 where deleted_by = $2'
      using p_actor_id, p_target_id;
    end if;
  end if;

  if to_regclass('public.ticket_status_history') is not null then
    update public.ticket_status_history set actor_id = p_actor_id where actor_id = p_target_id;
  end if;

  if to_regclass('public.tickets_it') is not null then
    update public.tickets_it set requester_id = p_actor_id where requester_id = p_target_id;
    update public.tickets_it set assigned_agent_id = null where assigned_agent_id = p_target_id;
    update public.tickets_it set created_by = p_actor_id where created_by = p_target_id;
  end if;

  if to_regclass('public.tickets_maintenance') is not null then
    update public.tickets_maintenance set requester_id = p_actor_id where requester_id = p_target_id;
    update public.tickets_maintenance set assigned_agent_id = null where assigned_agent_id = p_target_id;
    update public.tickets_maintenance set created_by = p_actor_id where created_by = p_target_id;
  end if;

  if to_regclass('public.ticket_comments_it') is not null then
    update public.ticket_comments_it set created_by = p_actor_id where created_by = p_target_id;
  end if;

  if to_regclass('public.ticket_comments_maintenance') is not null then
    update public.ticket_comments_maintenance set created_by = p_actor_id where created_by = p_target_id;
  end if;

  if to_regclass('public.ticket_attachments_it') is not null then
    update public.ticket_attachments_it set uploaded_by = p_actor_id where uploaded_by = p_target_id;
  end if;

  if to_regclass('public.ticket_attachments_maintenance') is not null then
    update public.ticket_attachments_maintenance set uploaded_by = p_actor_id where uploaded_by = p_target_id;
  end if;

  if to_regclass('public.audit_log') is not null then
    update public.audit_log set actor_id = p_actor_id where actor_id = p_target_id;
  end if;

  if to_regclass('public.asset_changes') is not null then
    update public.asset_changes set changed_by = p_actor_id where changed_by = p_target_id;
  end if;

  if to_regclass('public.asset_assignment_changes') is not null then
    update public.asset_assignment_changes set changed_by = p_actor_id where changed_by = p_target_id;
    update public.asset_assignment_changes set from_user_id = p_actor_id where from_user_id = p_target_id;
    update public.asset_assignment_changes set to_user_id = p_actor_id where to_user_id = p_target_id;
  end if;

  if to_regclass('public.assets_it') is not null then
    update public.assets_it set assigned_to_user_id = null where assigned_to_user_id = p_target_id;
    update public.assets_it set created_by = p_actor_id where created_by = p_target_id;
  end if;

  if to_regclass('public.assets_maintenance') is not null then
    update public.assets_maintenance set assigned_to_user_id = null where assigned_to_user_id = p_target_id;
    update public.assets_maintenance set created_by = p_actor_id where created_by = p_target_id;
  end if;

  if to_regclass('public.asset_disposal_requests') is not null then
    update public.asset_disposal_requests set requested_by = p_actor_id where requested_by = p_target_id;
    update public.asset_disposal_requests set reviewed_by = p_actor_id where reviewed_by = p_target_id;
  end if;

  if to_regclass('public.asset_processors') is not null then
    update public.asset_processors set created_by = p_actor_id where created_by = p_target_id;
  end if;

  if to_regclass('public.asset_operating_systems') is not null then
    update public.asset_operating_systems set created_by = p_actor_id where created_by = p_target_id;
  end if;

  if to_regclass('public.asset_custom_types') is not null then
    update public.asset_custom_types set created_by = p_actor_id where created_by = p_target_id;
  end if;

  if to_regclass('public.departments') is not null then
    update public.departments set created_by = p_actor_id where created_by = p_target_id;
  end if;

  if to_regclass('public.brands') is not null then
    update public.brands set created_by = p_actor_id where created_by = p_target_id;
  end if;

  if to_regclass('public.job_positions') is not null then
    update public.job_positions set created_by = p_actor_id where created_by = p_target_id;
  end if;

  if to_regclass('public.policies') is not null then
    update public.policies set created_by = p_actor_id where created_by = p_target_id;
    update public.policies set updated_by = p_actor_id where updated_by = p_target_id;
  end if;

  if to_regclass('public.knowledge_base_articles') is not null then
    update public.knowledge_base_articles set created_by = p_actor_id where created_by = p_target_id;
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'knowledge_base_articles' and column_name = 'approved_by'
    ) then
      execute 'update public.knowledge_base_articles set approved_by = $1 where approved_by = $2'
      using p_actor_id, p_target_id;
    end if;
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'knowledge_base_articles' and column_name = 'deleted_by'
    ) then
      execute 'update public.knowledge_base_articles set deleted_by = $1 where deleted_by = $2'
      using p_actor_id, p_target_id;
    end if;
  end if;

  if to_regclass('public.knowledge_base_suggestions') is not null then
    update public.knowledge_base_suggestions set reviewed_by = p_actor_id where reviewed_by = p_target_id;
  end if;

  if to_regclass('public.inspections_rrhh') is not null then
    update public.inspections_rrhh set inspector_user_id = p_actor_id where inspector_user_id = p_target_id;
    update public.inspections_rrhh set approved_by_user_id = p_actor_id where approved_by_user_id = p_target_id;
  end if;

  if to_regclass('public.inspections_rrhh_deletion_log') is not null then
    update public.inspections_rrhh_deletion_log set deleted_by_user_id = p_actor_id where deleted_by_user_id = p_target_id;
  end if;

  if to_regclass('public.inspections_gsh') is not null then
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'inspections_gsh' and column_name = 'inspector_user_id'
    ) then
      execute 'update public.inspections_gsh set inspector_user_id = $1 where inspector_user_id = $2'
      using p_actor_id, p_target_id;
    end if;
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'inspections_gsh' and column_name = 'approved_by_user_id'
    ) then
      execute 'update public.inspections_gsh set approved_by_user_id = $1 where approved_by_user_id = $2'
      using p_actor_id, p_target_id;
    end if;
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'inspections_gsh' and column_name = 'deleted_by_user_id'
    ) then
      execute 'update public.inspections_gsh set deleted_by_user_id = $1 where deleted_by_user_id = $2'
      using p_actor_id, p_target_id;
    end if;
  end if;

  if to_regclass('public.profiles') is not null then
    update public.profiles set supervisor_id = null where supervisor_id = p_target_id;
    delete from public.profiles where id = p_target_id;
  end if;

  delete from auth.users where id = p_target_id;

  if to_regclass('public.audit_log') is not null then
    insert into public.audit_log (
      entity_type,
      entity_id,
      action,
      actor_id,
      metadata
    ) values (
      'user',
      p_target_id,
      'DELETE',
      p_actor_id,
      jsonb_build_object(
        'hard_delete', true,
        'target_email', v_target_email,
        'target_label', v_target_label,
        'replacement_admin_id', p_actor_id,
        'comment_descriptor', v_descriptor
      )
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'target_id', p_target_id,
    'target_email', v_target_email,
    'target_label', v_target_label
  );
end;
$$;

revoke all on function public.admin_hard_reset_user(uuid, uuid) from public;
grant execute on function public.admin_hard_reset_user(uuid, uuid) to authenticated;
grant execute on function public.admin_hard_reset_user(uuid, uuid) to service_role;

comment on function public.admin_hard_reset_user(uuid, uuid) is
'Hard reset administrativo de usuario. Reasigna historial relevante al admin actor, limpia relaciones personales y elimina el usuario de auth.users.';