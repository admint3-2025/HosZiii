-- =====================================================
-- Migración: Sistema de departamentos
-- Descripción: Catálogo de departamentos para usuarios y activos
-- Fecha: 2026-01-03
-- =====================================================

-- 1. Crear tabla de departamentos
create table if not exists departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- Índices
create index if not exists idx_departments_name on departments(name);
create index if not exists idx_departments_code on departments(code);
create index if not exists idx_departments_active on departments(is_active) where is_active = true;

-- Trigger para updated_at
drop trigger if exists trg_departments_set_updated_at on departments;
create trigger trg_departments_set_updated_at
  before update on departments
  for each row
  execute function set_updated_at();

-- 2. Insertar departamentos predefinidos
insert into departments (name, code, description, is_active) values
  ('Dirección General', 'DIR-GEN', 'Dirección y administración general de la organización', true),
  ('Administración', 'ADMIN', 'Gestión administrativa y recursos de la organización', true),
  ('Recursos Humanos', 'RRHH', 'Gestión de personal y desarrollo organizacional', true),
  ('Contabilidad', 'CONTA', 'Gestión contable y financiera', true),
  ('Finanzas', 'FIN', 'Planificación y análisis financiero', true),
  ('Marketing', 'MKT', 'Estrategia de marketing y comunicación de marca', true),
  ('Ventas', 'VTA', 'Gestión de ventas y desarrollo comercial', true),
  ('Comercial', 'COM', 'Área comercial y relaciones con clientes', true),
  ('Atención al Cliente', 'ATC', 'Servicio y soporte al cliente', true),
  ('Operaciones', 'OPS', 'Gestión de operaciones y procesos', true),
  ('Producción', 'PROD', 'Manufactura y producción', true),
  ('Logística', 'LOG', 'Cadena de suministro y logística', true),
  ('Compras', 'COMP', 'Adquisiciones y gestión de proveedores', true),
  ('IT', 'IT', 'Tecnologías de información', true),
  ('Sistemas', 'SIS', 'Sistemas informáticos y desarrollo', true),
  ('Legal', 'LEG', 'Asesoría legal y cumplimiento', true),
  ('Investigación y Desarrollo (I+D)', 'I+D', 'Investigación, desarrollo e innovación', true),
  ('Control de Calidad', 'QA', 'Aseguramiento y control de calidad', true),
  ('Comunicación', 'COMUN', 'Comunicación interna y externa', true),
  ('Mantenimiento', 'MANT', 'Mantenimiento de instalaciones y equipos', true),
  ('Recepción', 'RCP', 'Atención en recepción y front desk', true),
  ('Reservas', 'RESV', 'Gestión de reservas y bookings', true),
  ('Ama de Llaves (Housekeeping)', 'HSK', 'Limpieza y mantenimiento de habitaciones', true),
  ('Alimentos y Bebidas (A&B)', 'A&B', 'Gestión de alimentos y bebidas', true),
  ('Cocina', 'COC', 'Preparación de alimentos', true),
  ('Room Service', 'RS', 'Servicio a habitaciones', true),
  ('Lavandería', 'LAV', 'Servicios de lavandería', true),
  ('Banquetes y Eventos', 'BYE', 'Organización de banquetes y eventos', true),
  ('Seguridad', 'SEG', 'Seguridad y vigilancia', true),
  ('Concierge', 'CONC', 'Servicios de conserjería', true),
  ('Botones (Bell Boys)', 'BOT', 'Asistencia con equipaje y transporte', true),
  ('Revenue Management', 'REV', 'Gestión de ingresos y tarifas', true),
  ('Spa y Wellness', 'SPA', 'Servicios de spa y bienestar', true),
  ('Animación', 'ANIM', 'Actividades recreativas y entretenimiento', true)
on conflict (name) do nothing;

-- 3. RLS Policies
alter table departments enable row level security;

-- Todos pueden ver departamentos activos
drop policy if exists "Anyone can view active departments" on departments;
create policy "Anyone can view active departments"
  on departments for select
  using (is_active = true);

-- Solo admins pueden crear departamentos
drop policy if exists "Admins can insert departments" on departments;
create policy "Admins can insert departments"
  on departments for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role = 'admin'
    )
  );

-- Solo admins pueden actualizar departamentos
drop policy if exists "Admins can update departments" on departments;
create policy "Admins can update departments"
  on departments for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role = 'admin'
    )
  );

-- 4. Función para obtener todos los departamentos activos
create or replace function get_active_departments()
returns table (
  id uuid,
  name text,
  code text,
  description text
)
language sql
security definer
stable
as $$
  select id, name, code, description
  from departments
  where is_active = true
  order by name;
$$;

-- 5. Vista para reporte de departamentos
create or replace view departments_report as
select 
  d.id,
  d.name as departamento,
  d.code as codigo,
  d.description as descripcion,
  count(distinct p.id) as total_usuarios,
  count(distinct a.id) as total_activos,
  d.is_active as activo,
  d.created_at as fecha_creacion
from departments d
left join profiles p on p.department = d.name
left join assets a on a.department = d.name and a.deleted_at is null
group by d.id, d.name, d.code, d.description, d.is_active, d.created_at
order by d.name;

comment on table departments is 'Catálogo de departamentos organizacionales';
comment on view departments_report is 'Vista de reporte de departamentos con conteos de usuarios y activos';

-- Comentarios en columnas
comment on column departments.name is 'Nombre completo del departamento';
comment on column departments.code is 'Código abreviado del departamento';
comment on column departments.is_active is 'Indica si el departamento está activo en el sistema';
