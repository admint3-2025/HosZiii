-- Core schema for ZIII Helpdesk

create extension if not exists "pgcrypto";

-- Roles
do $$ begin
  create type user_role as enum ('requester', 'agent_l1', 'agent_l2', 'supervisor', 'auditor', 'admin');
exception
  when duplicate_object then null;
end $$;

-- Ensure newer enum value exists on existing DBs (safe re-run)
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'user_role'
      and e.enumlabel = 'admin'
  ) then
    alter type user_role add value 'admin';
  end if;
end $$;

do $$ begin
  create type ticket_status as enum (
    'NEW',
    'ASSIGNED',
    'IN_PROGRESS',
    'NEEDS_INFO',
    'WAITING_THIRD_PARTY',
    'RESOLVED',
    'CLOSED'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type comment_visibility as enum ('public', 'internal');
exception
  when duplicate_object then null;
end $$;

-- Profile for role-based access
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role user_role not null default 'requester',
  department text,
  phone text,
  building text,
  floor text,
  position text,
  supervisor_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_profiles_supervisor on profiles(supervisor_id);
create index if not exists idx_profiles_department on profiles(department);

-- Auto-create a profile on user signup (Supabase Auth)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    'requester'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Categories (simple tree)
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references categories(id) on delete set null,
  name text not null,
  slug text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists categories_parent_name_uq on categories(parent_id, name);

-- Tickets
create sequence if not exists ticket_number_seq;

create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number bigint not null default nextval('ticket_number_seq'),

  requester_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
  affected_user_email text,

  category_id uuid references categories(id) on delete set null,
  title text not null,
  description text not null,

  impact smallint not null check (impact between 1 and 4),
  urgency smallint not null check (urgency between 1 and 4),
  priority smallint not null check (priority between 1 and 4),

  status ticket_status not null default 'NEW',
  support_level smallint not null default 1 check (support_level in (1,2)),

  assigned_group text,
  assigned_agent_id uuid references auth.users(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  closed_by uuid references auth.users(id) on delete set null,
  resolution text,

  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null,
  deleted_reason text
);

create unique index if not exists tickets_ticket_number_uq on tickets(ticket_number);
create index if not exists tickets_status_idx on tickets(status);
create index if not exists tickets_support_level_idx on tickets(support_level);
create index if not exists tickets_assigned_agent_idx on tickets(assigned_agent_id);

-- Keep updated_at current
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_tickets_set_updated_at on tickets;
create trigger trg_tickets_set_updated_at
before update on tickets
for each row
execute function set_updated_at();

-- Comments
create table if not exists ticket_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete restrict,
  visibility comment_visibility not null default 'public',
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists ticket_comments_ticket_idx on ticket_comments(ticket_id);

-- Status history
create table if not exists ticket_status_history (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  from_status ticket_status,
  to_status ticket_status not null,
  actor_id uuid not null references auth.users(id) on delete restrict,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists ticket_status_history_ticket_idx on ticket_status_history(ticket_id);

-- Audit log
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  actor_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_created_idx on audit_log(created_at desc);

-- Auto-audit soft-delete transitions
create or replace function audit_ticket_soft_delete() returns trigger as $$
begin
  if (old.deleted_at is null and new.deleted_at is not null) then
    insert into audit_log(entity_type, entity_id, action, actor_id, metadata)
    values (
      'ticket',
      new.id,
      'SOFT_DELETE',
      new.deleted_by,
      jsonb_build_object(
        'ticket_number', new.ticket_number,
        'reason', new.deleted_reason,
        'previous_status', old.status,
        'previous_support_level', old.support_level
      )
    );
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_tickets_audit_soft_delete on tickets;
create trigger trg_tickets_audit_soft_delete
after update on tickets
for each row
execute function audit_ticket_soft_delete();
