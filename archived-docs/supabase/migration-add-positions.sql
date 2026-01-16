-- =====================================================
-- Migración: Sistema de puestos de trabajo
-- Descripción: Catálogo de puestos para usuarios
-- Fecha: 2026-01-03
-- =====================================================

-- 1. Crear tabla de puestos
create table if not exists job_positions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- Índices
create index if not exists idx_job_positions_name on job_positions(name);
create index if not exists idx_job_positions_category on job_positions(category);
create index if not exists idx_job_positions_active on job_positions(is_active) where is_active = true;

-- Trigger para updated_at
drop trigger if exists trg_job_positions_set_updated_at on job_positions;
create trigger trg_job_positions_set_updated_at
  before update on job_positions
  for each row
  execute function set_updated_at();

-- 2. Insertar puestos predefinidos
insert into job_positions (name, category, description, is_active) values
  -- Front Office y Atención al Cliente
  ('Recepcionista', 'Front Office', 'Atención en recepción y registro de huéspedes', true),
  ('Conserje', 'Front Office', 'Servicios de conserjería y asistencia', true),
  ('Botones (Bell Boy)', 'Front Office', 'Asistencia con equipaje y transporte', true),
  ('Agente de Reservas', 'Front Office', 'Gestión de reservaciones', true),
  
  -- Housekeeping y Limpieza
  ('Ama de Llaves (Housekeeping)', 'Housekeeping', 'Supervisión de limpieza y mantenimiento', true),
  ('Camarista', 'Housekeeping', 'Limpieza de habitaciones', true),
  ('Supervisor de Piso', 'Housekeeping', 'Supervisión de pisos y áreas', true),
  ('Operador de Lavandería', 'Housekeeping', 'Operación de lavandería', true),
  
  -- Servicios Generales
  ('Valet Parking', 'Servicios', 'Estacionamiento y valet', true),
  ('Portero', 'Servicios', 'Control de acceso y seguridad', true),
  ('Guardia de Seguridad', 'Servicios', 'Seguridad y vigilancia', true),
  ('Chofer', 'Servicios', 'Transporte y logística', true),
  ('Socorrista', 'Servicios', 'Seguridad en piscinas y áreas recreativas', true),
  
  -- Mantenimiento
  ('Jefe de Mantenimiento', 'Mantenimiento', 'Supervisión de mantenimiento', true),
  
  -- Ventas y Marketing
  ('Ejecutivo de Ventas', 'Ventas', 'Gestión de ventas', true),
  ('Ejecutivo de Cuentas', 'Ventas', 'Administración de cuentas clave', true),
  ('Community Manager', 'Marketing', 'Gestión de redes sociales', true),
  ('Analista de Marketing Digital', 'Marketing', 'Análisis y estrategia digital', true),
  ('Especialista en SEO', 'Marketing', 'Optimización para motores de búsqueda', true),
  ('Coordinador de Eventos y Banquetes', 'Ventas', 'Organización de eventos', true),
  ('Revenue Management', 'Ventas', 'Gestión de ingresos y tarifas', true),
  
  -- Tecnología
  ('Soporte Técnico (IT)', 'IT', 'Soporte técnico y mantenimiento de sistemas', true),
  ('Administrador de Sistemas', 'IT', 'Administración de infraestructura IT', true),
  ('Desarrollador de Software', 'IT', 'Desarrollo de aplicaciones', true),
  ('Diseñador Gráfico', 'IT', 'Diseño gráfico y multimedia', true),
  
  -- Recursos Humanos
  ('Reclutador', 'RRHH', 'Reclutamiento y selección', true),
  ('Especialista en Capacitación', 'RRHH', 'Capacitación y desarrollo', true),
  ('Generalista de RRHH', 'RRHH', 'Gestión general de recursos humanos', true),
  ('Coordinador de Bienestar Laboral', 'RRHH', 'Bienestar y clima laboral', true),
  ('Médico de Empresa', 'RRHH', 'Salud ocupacional', true),
  
  -- Administración y Finanzas
  ('Asistente Administrativo', 'Administración', 'Apoyo administrativo', true),
  ('Recepcionista Administrativo', 'Administración', 'Recepción administrativa', true),
  ('Contador', 'Finanzas', 'Contabilidad general', true),
  ('Auxiliar Contable', 'Finanzas', 'Asistencia contable', true),
  ('Analista Financiero', 'Finanzas', 'Análisis financiero', true),
  ('Tesorero', 'Finanzas', 'Gestión de tesorería', true),
  ('Especialista en Nóminas', 'Finanzas', 'Procesamiento de nóminas', true),
  ('Auditor Nocturno (Hotel)', 'Finanzas', 'Auditoría nocturna hotelera', true),
  
  -- Compras y Logística
  ('Comprador', 'Compras', 'Gestión de compras', true),
  ('Jefe de Economato', 'Compras', 'Administración de economato', true)
on conflict (name) do nothing;

-- 3. RLS Policies
alter table job_positions enable row level security;

-- Todos pueden ver puestos activos
drop policy if exists "Anyone can view active positions" on job_positions;
create policy "Anyone can view active positions"
  on job_positions for select
  using (is_active = true);

-- Solo admins pueden crear puestos
drop policy if exists "Admins can insert positions" on job_positions;
create policy "Admins can insert positions"
  on job_positions for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role = 'admin'
    )
  );

-- Solo admins pueden actualizar puestos
drop policy if exists "Admins can update positions" on job_positions;
create policy "Admins can update positions"
  on job_positions for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role = 'admin'
    )
  );

-- 4. Función para obtener todos los puestos activos
create or replace function get_active_positions()
returns table (
  id uuid,
  name text,
  category text,
  description text
)
language sql
security definer
stable
as $$
  select id, name, category, description
  from job_positions
  where is_active = true
  order by name;
$$;

-- 5. Vista para reporte de puestos
create or replace view positions_report as
select 
  p.id,
  p.name as puesto,
  p.category as categoria,
  p.description as descripcion,
  count(distinct u.id) as total_usuarios,
  p.is_active as activo,
  p.created_at as fecha_creacion
from job_positions p
left join profiles u on u.position = p.name
group by p.id, p.name, p.category, p.description, p.is_active, p.created_at
order by p.name;

comment on table job_positions is 'Catálogo de puestos de trabajo';
comment on view positions_report is 'Vista de reporte de puestos con conteo de usuarios';

-- Comentarios en columnas
comment on column job_positions.name is 'Nombre del puesto';
comment on column job_positions.category is 'Categoría del puesto';
comment on column job_positions.is_active is 'Indica si el puesto está activo en el sistema';
