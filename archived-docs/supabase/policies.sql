-- RLS policies for ZIII Helpdesk

alter table profiles enable row level security;
alter table categories enable row level security;
alter table tickets enable row level security;
alter table ticket_comments enable row level security;
alter table ticket_status_history enable row level security;
alter table audit_log enable row level security;

create or replace function is_role(role_name text)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists(
    select 1
    from profiles p
    where p.id = auth.uid() and p.role::text = role_name
  );
$$;

create or replace function is_agent()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists(
    select 1
    from profiles p
    where p.id = auth.uid() and p.role in ('agent_l1','agent_l2','supervisor','admin')
  );
$$;

create or replace function is_auditor()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists(
    select 1
    from profiles p
    where p.id = auth.uid() and p.role in ('auditor','supervisor','admin')
  );
$$;

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists(
    select 1
    from profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- Map current user profile.department -> ticket service area
create or replace function current_service_area()
returns text
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select
    case
      when lower(coalesce(p.department, '')) like '%mantenim%' then 'maintenance'
      else 'it'
    end
  from profiles p
  where p.id = auth.uid();
$$;

-- Centralize ticket access rules so related tables (comments/history) stay consistent
create or replace function can_access_ticket(ticket_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists(
    select 1
    from tickets t
    join profiles p on p.id = auth.uid()
    where t.id = can_access_ticket.ticket_id
      and (
        (t.deleted_at is null and t.requester_id = auth.uid())
        or (t.deleted_at is null and t.assigned_agent_id = auth.uid())
        or (t.deleted_at is null and p.role = 'admin')
        or (t.deleted_at is null and p.role = 'supervisor' and t.service_area = current_service_area())
        or (t.deleted_at is null and p.role in ('agent_l1','agent_l2') and (t.requester_id = auth.uid() or t.assigned_agent_id = auth.uid()))
        or (t.deleted_at is not null and p.role in ('auditor','supervisor','admin'))
      )
  );
$$;

-- profiles
drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own" on profiles
for select
to authenticated
using (id = auth.uid() or is_agent() or is_auditor());

drop policy if exists "profiles_upsert_own" on profiles;
create policy "profiles_upsert_own" on profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- categories (readable to all authenticated)
drop policy if exists "categories_read" on categories;
create policy "categories_read" on categories
for select
to authenticated
using (true);

drop policy if exists "categories_insert" on categories;
create policy "categories_insert" on categories
for insert
to authenticated
with check (is_agent());

drop policy if exists "categories_update" on categories;
create policy "categories_update" on categories
for update
to authenticated
using (is_admin())
with check (is_admin());

drop policy if exists "categories_delete" on categories;
create policy "categories_delete" on categories
for delete
to authenticated
using (is_admin());

-- tickets
drop policy if exists "tickets_insert" on tickets;
create policy "tickets_insert" on tickets
for insert
to authenticated
with check (
  -- Users can create tickets for themselves
  requester_id = auth.uid()
  or
  -- Agents can create tickets on behalf of other users
  (
    is_agent()
    and requester_id is not null
  )
);

drop policy if exists "tickets_select_requester" on tickets;
create policy "tickets_select_requester" on tickets
for select
to authenticated
using (
  deleted_at is null and requester_id = auth.uid()
);

drop policy if exists "tickets_select_agents" on tickets;
drop policy if exists "tickets_select_supervisor_admin" on tickets;
create policy "tickets_select_supervisor_admin" on tickets
for select
to authenticated
using (
  deleted_at is null
  and (
    is_admin()
    or exists(
      select 1 from profiles p
      where p.id = auth.uid()
        and p.role = 'supervisor'
        and tickets.service_area = current_service_area()
    )
  )
);

drop policy if exists "tickets_select_agents_own" on tickets;
create policy "tickets_select_agents_own" on tickets
for select
to authenticated
using (
  deleted_at is null
  and exists(
    select 1 from profiles p
    where p.id = auth.uid() and p.role in ('agent_l1','agent_l2')
  )
  and (
    requester_id = auth.uid() or assigned_agent_id = auth.uid()
  )
);

drop policy if exists "tickets_select_deleted_auditor" on tickets;
create policy "tickets_select_deleted_auditor" on tickets
for select
to authenticated
using (
  deleted_at is not null and is_auditor()
);

drop policy if exists "tickets_update_requester_limited" on tickets;
create policy "tickets_update_requester_limited" on tickets
for update
to authenticated
using (deleted_at is null and requester_id = auth.uid())
with check (deleted_at is null and requester_id = auth.uid());

drop policy if exists "tickets_update_agents" on tickets;
create policy "tickets_update_agents" on tickets
for update
to authenticated
using (
  deleted_at is null
  and (
    is_admin()
    or exists(
      select 1 from profiles p
      where p.id = auth.uid()
        and p.role = 'supervisor'
        and tickets.service_area = current_service_area()
    )
    or (
      exists(
        select 1 from profiles p
        where p.id = auth.uid() and p.role in ('agent_l1','agent_l2')
      )
      and (requester_id = auth.uid() or assigned_agent_id = auth.uid())
    )
  )
)
with check (
  deleted_at is null
  and (
    is_admin()
    or exists(
      select 1 from profiles p
      where p.id = auth.uid()
        and p.role = 'supervisor'
        and tickets.service_area = current_service_area()
    )
    or (
      exists(
        select 1 from profiles p
        where p.id = auth.uid() and p.role in ('agent_l1','agent_l2')
      )
      and (requester_id = auth.uid() or assigned_agent_id = auth.uid())
    )
  )
);

-- tickets soft-delete (auditable)
-- Separate policy because the generic update policy blocks setting deleted_at.
drop policy if exists "tickets_soft_delete_agents" on tickets;
create policy "tickets_soft_delete_agents" on tickets
for update
to authenticated
using (deleted_at is null and is_agent() and can_access_ticket(id))
with check (
  deleted_at is not null
  and deleted_by = auth.uid()
  and deleted_reason is not null
  and length(trim(deleted_reason)) > 0
  and is_agent()
  and can_access_ticket(id)
);

-- ticket_comments
drop policy if exists "ticket_comments_select" on ticket_comments;
create policy "ticket_comments_select" on ticket_comments
for select
to authenticated
using (
  can_access_ticket(ticket_comments.ticket_id)
);

drop policy if exists "ticket_comments_insert" on ticket_comments;
create policy "ticket_comments_insert" on ticket_comments
for insert
to authenticated
with check (
  author_id = auth.uid()
  and can_access_ticket(ticket_comments.ticket_id)
);

-- ticket_status_history
drop policy if exists "ticket_status_history_select" on ticket_status_history;
create policy "ticket_status_history_select" on ticket_status_history
for select
to authenticated
using (
  can_access_ticket(ticket_status_history.ticket_id)
);

drop policy if exists "ticket_status_history_insert_agents" on ticket_status_history;
create policy "ticket_status_history_insert_agents" on ticket_status_history
for insert
to authenticated
with check (
  is_agent()
  and actor_id = auth.uid()
  and can_access_ticket(ticket_status_history.ticket_id)
  and exists(
    select 1 from tickets t
    where t.id = ticket_status_history.ticket_id
      and t.deleted_at is null
  )
);

-- audit_log
drop policy if exists "audit_log_select_auditor" on audit_log;
create policy "audit_log_select_auditor" on audit_log
for select
to authenticated
using (is_auditor());

-- Allow auditing of ticket soft-delete trigger inserts
drop policy if exists "audit_log_insert_ticket_soft_delete" on audit_log;
create policy "audit_log_insert_ticket_soft_delete" on audit_log
for insert
to authenticated
with check (
  entity_type = 'ticket'
  and action = 'SOFT_DELETE'
  and is_agent()
  and actor_id = auth.uid()
);

-- Allow users to log their own report exports
drop policy if exists "audit_log_insert_report_export" on audit_log;
create policy "audit_log_insert_report_export" on audit_log
for insert
to authenticated
with check (
  entity_type = 'report'
  and action = 'EXPORT'
  and actor_id = auth.uid()
);
