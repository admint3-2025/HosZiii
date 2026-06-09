-- ============================================================================
-- Crear tablas para plantillas de inspecciones (admin editable)
-- ============================================================================

create table if not exists public.inspection_templates (
  id uuid primary key default gen_random_uuid(),
  department_id text not null,
  department_name text null,
  is_active boolean not null default true,
  created_by uuid null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inspection_template_areas (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.inspection_templates(id) on delete cascade,
  area_name text not null,
  area_order integer not null,
  applies_to text[] null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inspection_template_items (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references public.inspection_template_areas(id) on delete cascade,
  item_order integer not null,
  descripcion text not null,
  tipo_dato text not null default 'Fijo',
  cumplimiento_editable boolean not null default true,
  calif_editable boolean not null default true,
  comentarios_libre boolean not null default true,
  default_calif numeric not null default 0,
  default_comments text not null default '',
  applies_to text[] null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inspection_templates_department_idx
  on public.inspection_templates (department_id);

create index if not exists inspection_template_areas_template_idx
  on public.inspection_template_areas (template_id, area_order);

create index if not exists inspection_template_items_area_idx
  on public.inspection_template_items (area_id, item_order);

alter table public.inspection_templates enable row level security;
alter table public.inspection_template_areas enable row level security;
alter table public.inspection_template_items enable row level security;

-- Lectura: cualquier usuario autenticado puede leer plantillas
drop policy if exists inspection_templates_select on public.inspection_templates;
create policy inspection_templates_select
  on public.inspection_templates
  for select
  to authenticated
  using (auth.uid() is not null);

drop policy if exists inspection_template_areas_select on public.inspection_template_areas;
create policy inspection_template_areas_select
  on public.inspection_template_areas
  for select
  to authenticated
  using (auth.uid() is not null);

drop policy if exists inspection_template_items_select on public.inspection_template_items;
create policy inspection_template_items_select
  on public.inspection_template_items
  for select
  to authenticated
  using (auth.uid() is not null);

-- Escritura: solo admins
drop policy if exists inspection_templates_admin_write on public.inspection_templates;
create policy inspection_templates_admin_write
  on public.inspection_templates
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

drop policy if exists inspection_template_areas_admin_write on public.inspection_template_areas;
create policy inspection_template_areas_admin_write
  on public.inspection_template_areas
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

drop policy if exists inspection_template_items_admin_write on public.inspection_template_items;
create policy inspection_template_items_admin_write
  on public.inspection_template_items
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );
