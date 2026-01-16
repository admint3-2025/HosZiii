-- =====================================================
-- Migración: Sistema de marcas
-- Descripción: Catálogo de marcas para activos
-- Fecha: 2026-01-03
-- =====================================================

-- 1. Crear tabla de marcas
create table if not exists brands (
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
create index if not exists idx_brands_name on brands(name);
create index if not exists idx_brands_category on brands(category);
create index if not exists idx_brands_active on brands(is_active) where is_active = true;

-- Trigger para updated_at
drop trigger if exists trg_brands_set_updated_at on brands;
create trigger trg_brands_set_updated_at
  before update on brands
  for each row
  execute function set_updated_at();

-- 2. Insertar marcas predefinidas
insert into brands (name, category, description, is_active) values
  -- Computadoras y Laptops
  ('Acer', 'Computadoras', 'Computadoras y laptops', true),
  ('Apple', 'Computadoras', 'Computadoras Mac y dispositivos Apple', true),
  ('ASUS', 'Computadoras', 'Computadoras, laptops y componentes', true),
  ('Dell', 'Computadoras', 'Computadoras y laptops empresariales', true),
  ('Fujitsu', 'Computadoras', 'Equipos de cómputo empresariales', true),
  ('HP', 'Computadoras', 'Computadoras y laptops', true),
  ('Huawei', 'Computadoras', 'Laptops y dispositivos móviles', true),
  ('Lenovo', 'Computadoras', 'Computadoras y laptops ThinkPad', true),
  ('LG', 'Computadoras', 'Laptops y monitores', true),
  ('Microsoft', 'Computadoras', 'Surface y software', true),
  ('MSI', 'Computadoras', 'Laptops gaming y workstation', true),
  ('Razer', 'Computadoras', 'Laptops y periféricos gaming', true),
  ('Samsung', 'Computadoras', 'Laptops y dispositivos electrónicos', true),
  ('Toshiba', 'Computadoras', 'Laptops y equipos empresariales', true),
  
  -- Impresoras y Escáneres
  ('Brother', 'Impresoras', 'Impresoras y escáneres', true),
  ('Canon', 'Impresoras', 'Impresoras, escáneres y multifuncionales', true),
  ('Epson', 'Impresoras', 'Impresoras y proyectores', true),
  ('Konica Minolta', 'Impresoras', 'Impresoras y copiadoras multifuncionales', true),
  ('Kyocera', 'Impresoras', 'Impresoras y soluciones documentales', true),
  ('Lexmark', 'Impresoras', 'Impresoras empresariales', true),
  ('OKI', 'Impresoras', 'Impresoras láser', true),
  ('Pantum', 'Impresoras', 'Impresoras láser', true),
  ('Ricoh', 'Impresoras', 'Impresoras multifuncionales', true),
  ('Xerox', 'Impresoras', 'Impresoras y copiadoras', true),
  ('Zebra', 'Impresoras', 'Impresoras de etiquetas y códigos de barras', true),
  
  -- Almacenamiento
  ('Crucial', 'Almacenamiento', 'Memoria RAM y SSD', true),
  ('Kingston', 'Almacenamiento', 'Memoria RAM y almacenamiento', true),
  ('SanDisk', 'Almacenamiento', 'Tarjetas de memoria y USB', true),
  ('Seagate', 'Almacenamiento', 'Discos duros y almacenamiento', true),
  ('Western Digital', 'Almacenamiento', 'Discos duros y almacenamiento', true),
  
  -- Componentes de Hardware
  ('AMD', 'Componentes', 'Procesadores y tarjetas gráficas', true),
  ('Corsair', 'Componentes', 'Memoria RAM, fuentes de poder y periféricos', true),
  ('Gigabyte', 'Componentes', 'Tarjetas madre y componentes', true),
  ('Intel', 'Componentes', 'Procesadores y componentes de red', true),
  ('NVIDIA', 'Componentes', 'Tarjetas gráficas', true),
  
  -- Periféricos
  ('Genius', 'Periféricos', 'Teclados, mouse y accesorios', true),
  ('HyperX', 'Periféricos', 'Periféricos gaming', true),
  ('Logitech', 'Periféricos', 'Teclados, mouse y webcams', true),
  ('Redragon', 'Periféricos', 'Periféricos gaming', true),
  ('SteelSeries', 'Periféricos', 'Periféricos gaming', true),
  ('Trust', 'Periféricos', 'Accesorios y periféricos', true),
  
  -- Audio
  ('JBL', 'Audio', 'Altavoces y audio', true),
  ('Sony', 'Audio', 'Audio y dispositivos electrónicos', true),
  
  -- Redes
  ('Cisco', 'Redes', 'Equipos de red empresariales', true),
  ('D-Link', 'Redes', 'Routers y switches', true),
  ('Linksys', 'Redes', 'Routers y equipos de red', true),
  ('Mercusys', 'Redes', 'Routers y equipos de red', true),
  ('MikroTik', 'Redes', 'Routers y equipos de red profesionales', true),
  ('Tenda', 'Redes', 'Routers y equipos de red', true),
  ('TP-Link', 'Redes', 'Routers y equipos de red', true),
  ('Ubiquiti', 'Redes', 'Equipos de red empresariales', true),
  
  -- Monitores
  ('AOC', 'Monitores', 'Monitores y pantallas', true),
  ('BenQ', 'Monitores', 'Monitores y proyectores', true),
  ('Philips', 'Monitores', 'Monitores y pantallas', true),
  ('ViewSonic', 'Monitores', 'Monitores y proyectores', true)
on conflict (name) do nothing;

-- 3. RLS Policies
alter table brands enable row level security;

-- Todos pueden ver marcas activas
drop policy if exists "Anyone can view active brands" on brands;
create policy "Anyone can view active brands"
  on brands for select
  using (is_active = true);

-- Solo admins pueden crear marcas
drop policy if exists "Admins can insert brands" on brands;
create policy "Admins can insert brands"
  on brands for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role = 'admin'
    )
  );

-- Solo admins pueden actualizar marcas
drop policy if exists "Admins can update brands" on brands;
create policy "Admins can update brands"
  on brands for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role = 'admin'
    )
  );

-- 4. Función para obtener todas las marcas activas
create or replace function get_active_brands()
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
  from brands
  where is_active = true
  order by name;
$$;

-- 5. Vista para reporte de marcas
create or replace view brands_report as
select 
  b.id,
  b.name as marca,
  b.category as categoria,
  b.description as descripcion,
  count(distinct a.id) as total_activos,
  b.is_active as activo,
  b.created_at as fecha_creacion
from brands b
left join assets a on a.brand = b.name and a.deleted_at is null
group by b.id, b.name, b.category, b.description, b.is_active, b.created_at
order by b.name;

comment on table brands is 'Catálogo de marcas de activos';
comment on view brands_report is 'Vista de reporte de marcas con conteo de activos';

-- Comentarios en columnas
comment on column brands.name is 'Nombre de la marca';
comment on column brands.category is 'Categoría de productos de la marca';
comment on column brands.is_active is 'Indica si la marca está activa en el sistema';
