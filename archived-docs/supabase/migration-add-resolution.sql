-- Agregar campos closed_at, closed_by y resolution a tickets
-- Ejecutar este script en la base de datos Supabase

alter table tickets 
  add column if not exists closed_at timestamptz,
  add column if not exists closed_by uuid references auth.users(id) on delete set null,
  add column if not exists resolution text;

comment on column tickets.closed_at is 'Fecha y hora en que el ticket fue cerrado';
comment on column tickets.closed_by is 'Usuario que cerró el ticket';
comment on column tickets.resolution is 'Resolución o solución proporcionada al cerrar el ticket';
