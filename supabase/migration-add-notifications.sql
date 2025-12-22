-- Migration: Sistema de notificaciones in-app
-- Fecha: 2025-12-22

-- Tipos de notificaciones
do $$ begin
  create type notification_type as enum (
    'TICKET_CREATED',
    'TICKET_ASSIGNED',
    'TICKET_STATUS_CHANGED',
    'TICKET_COMMENT_ADDED',
    'TICKET_ESCALATED',
    'TICKET_RESOLVED',
    'TICKET_CLOSED'
  );
exception
  when duplicate_object then null;
end $$;

-- Tabla de notificaciones
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type notification_type not null,
  title text not null,
  message text not null,
  ticket_id uuid references tickets(id) on delete cascade,
  ticket_number bigint,
  actor_id uuid references auth.users(id) on delete set null,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

-- Índices para performance
create index if not exists idx_notifications_user_id on notifications(user_id);
create index if not exists idx_notifications_is_read on notifications(is_read);
create index if not exists idx_notifications_created_at on notifications(created_at desc);
create index if not exists idx_notifications_user_unread on notifications(user_id, is_read) where is_read = false;

-- Habilitar Realtime para notificaciones
alter publication supabase_realtime add table notifications;

-- Función auxiliar para obtener nombre de usuario
create or replace function get_user_name(user_id uuid)
returns text
language plpgsql
security definer
as $$
declare
  user_name text;
begin
  select coalesce(p.full_name, u.email, 'Usuario')
  into user_name
  from auth.users u
  left join profiles p on p.id = u.id
  where u.id = user_id;
  
  return user_name;
end;
$$;

-- Función: Notificar creación de ticket a supervisores/admins
create or replace function notify_ticket_created()
returns trigger
language plpgsql
security definer
as $$
declare
  supervisor_id uuid;
  admin_id uuid;
  requester_name text;
begin
  -- Obtener nombre del solicitante
  requester_name := get_user_name(new.requester_id);

  -- Notificar a supervisores y admins
  for admin_id in
    select id from profiles where role in ('supervisor', 'admin')
  loop
    if admin_id != new.requester_id then
      insert into notifications (user_id, type, title, message, ticket_id, ticket_number, actor_id)
      values (
        admin_id,
        'TICKET_CREATED',
        'Nuevo ticket creado',
        format('"%s" ha creado el ticket #%s', requester_name, new.ticket_number),
        new.id,
        new.ticket_number,
        new.requester_id
      );
    end if;
  end loop;

  return new;
end;
$$;

-- Función: Notificar asignación de ticket
create or replace function notify_ticket_assigned()
returns trigger
language plpgsql
security definer
as $$
declare
  assigner_name text;
begin
  -- Solo si hay cambio de asignación
  if new.assigned_agent_id is not null and (old.assigned_agent_id is null or old.assigned_agent_id != new.assigned_agent_id) then
    
    assigner_name := get_user_name(coalesce(new.assigned_agent_id, new.requester_id));

    -- Notificar al agente asignado
    insert into notifications (user_id, type, title, message, ticket_id, ticket_number, actor_id)
    values (
      new.assigned_agent_id,
      'TICKET_ASSIGNED',
      'Ticket asignado a ti',
      format('Te han asignado el ticket #%s: "%s"', new.ticket_number, new.title),
      new.id,
      new.ticket_number,
      new.requester_id
    );

    -- Notificar al solicitante (si es diferente)
    if new.requester_id != new.assigned_agent_id then
      insert into notifications (user_id, type, title, message, ticket_id, ticket_number, actor_id)
      values (
        new.requester_id,
        'TICKET_ASSIGNED',
        'Tu ticket ha sido asignado',
        format('Tu ticket #%s ha sido asignado a %s', new.ticket_number, get_user_name(new.assigned_agent_id)),
        new.id,
        new.ticket_number,
        new.assigned_agent_id
      );
    end if;
  end if;

  return new;
end;
$$;

-- Función: Notificar cambio de estado
create or replace function notify_ticket_status_changed()
returns trigger
language plpgsql
security definer
as $$
declare
  status_label text;
begin
  -- Solo si hay cambio de estado
  if new.status != old.status then
    
    -- Traducir estado
    status_label := case new.status
      when 'NEW' then 'Nuevo'
      when 'ASSIGNED' then 'Asignado'
      when 'IN_PROGRESS' then 'En progreso'
      when 'NEEDS_INFO' then 'Requiere información'
      when 'WAITING_THIRD_PARTY' then 'Esperando tercero'
      when 'RESOLVED' then 'Resuelto'
      when 'CLOSED' then 'Cerrado'
      else new.status::text
    end;

    -- Notificar al solicitante
    insert into notifications (user_id, type, title, message, ticket_id, ticket_number)
    values (
      new.requester_id,
      'TICKET_STATUS_CHANGED',
      'Estado actualizado',
      format('Tu ticket #%s cambió a: %s', new.ticket_number, status_label),
      new.id,
      new.ticket_number
    );

    -- Si hay agente asignado y es diferente al solicitante, notificarle también
    if new.assigned_agent_id is not null and new.assigned_agent_id != new.requester_id then
      insert into notifications (user_id, type, title, message, ticket_id, ticket_number)
      values (
        new.assigned_agent_id,
        'TICKET_STATUS_CHANGED',
        'Estado actualizado',
        format('El ticket #%s cambió a: %s', new.ticket_number, status_label),
        new.id,
        new.ticket_number
      );
    end if;

    -- Notificaciones especiales para estados críticos
    if new.status in ('RESOLVED', 'CLOSED') then
      update notifications
      set type = case when new.status = 'RESOLVED' then 'TICKET_RESOLVED'::notification_type else 'TICKET_CLOSED'::notification_type end
      where ticket_id = new.id
        and user_id = new.requester_id
        and created_at = (select max(created_at) from notifications where ticket_id = new.id and user_id = new.requester_id);
    end if;
  end if;

  return new;
end;
$$;

-- Función: Notificar nuevo comentario
create or replace function notify_ticket_comment_added()
returns trigger
language plpgsql
security definer
as $$
declare
  ticket_rec record;
  author_name text;
begin
  -- Obtener información del ticket
  select t.*, get_user_name(new.author_id) as author
  into ticket_rec
  from tickets t
  where t.id = new.ticket_id;

  author_name := get_user_name(new.author_id);

  -- Notificar al solicitante (si no es el autor del comentario)
  if ticket_rec.requester_id != new.author_id then
    insert into notifications (user_id, type, title, message, ticket_id, ticket_number, actor_id)
    values (
      ticket_rec.requester_id,
      'TICKET_COMMENT_ADDED',
      'Nuevo comentario',
      format('%s comentó en el ticket #%s', author_name, ticket_rec.ticket_number),
      ticket_rec.id,
      ticket_rec.ticket_number,
      new.author_id
    );
  end if;

  -- Notificar al agente asignado (si existe y no es el autor)
  if ticket_rec.assigned_agent_id is not null 
     and ticket_rec.assigned_agent_id != new.author_id
     and ticket_rec.assigned_agent_id != ticket_rec.requester_id then
    insert into notifications (user_id, type, title, message, ticket_id, ticket_number, actor_id)
    values (
      ticket_rec.assigned_agent_id,
      'TICKET_COMMENT_ADDED',
      'Nuevo comentario',
      format('%s comentó en el ticket #%s', author_name, ticket_rec.ticket_number),
      ticket_rec.id,
      ticket_rec.ticket_number,
      new.author_id
    );
  end if;

  return new;
end;
$$;

-- Crear triggers
drop trigger if exists trg_notify_ticket_created on tickets;
create trigger trg_notify_ticket_created
  after insert on tickets
  for each row
  execute function notify_ticket_created();

drop trigger if exists trg_notify_ticket_assigned on tickets;
create trigger trg_notify_ticket_assigned
  after update on tickets
  for each row
  when (old.assigned_agent_id is distinct from new.assigned_agent_id)
  execute function notify_ticket_assigned();

drop trigger if exists trg_notify_ticket_status_changed on tickets;
create trigger trg_notify_ticket_status_changed
  after update on tickets
  for each row
  when (old.status is distinct from new.status)
  execute function notify_ticket_status_changed();

drop trigger if exists trg_notify_comment_added on ticket_comments;
create trigger trg_notify_comment_added
  after insert on ticket_comments
  for each row
  execute function notify_ticket_comment_added();

-- Políticas de seguridad (RLS)
alter table notifications enable row level security;

-- Los usuarios solo pueden ver sus propias notificaciones
create policy "Users can view own notifications"
  on notifications for select
  using (auth.uid() = user_id);

-- Los usuarios pueden actualizar sus propias notificaciones (marcar como leídas)
create policy "Users can update own notifications"
  on notifications for update
  using (auth.uid() = user_id);

-- Solo el sistema puede crear notificaciones
create policy "System can insert notifications"
  on notifications for insert
  with check (true);

-- Comentario
comment on table notifications is 'Sistema de notificaciones in-app para mantener a los usuarios informados sobre cambios en tickets';
