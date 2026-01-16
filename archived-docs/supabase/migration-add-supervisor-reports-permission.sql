-- Migration: Agregar permiso especial para supervisores con acceso total a reportes
-- Fecha: 2026-01-05
-- Descripción: Por defecto, supervisores solo ven datos de sus sedes.
--              Este permiso permite a un admin otorgar acceso total a reportes específicos.

-- Agregar columna de permiso especial para reportes completos
alter table profiles 
add column if not exists can_view_all_reports boolean not null default false;

-- Índice para búsquedas rápidas de supervisores con permisos especiales
create index if not exists idx_profiles_reports_permission 
on profiles(role, can_view_all_reports) 
where role = 'supervisor';

-- Comentarios
comment on column profiles.can_view_all_reports is 
'Permiso especial para supervisores: permite ver reportes de todas las sedes en lugar de solo las asignadas. Solo admins pueden otorgar este permiso.';

-- Función auxiliar para verificar si un supervisor tiene acceso total a reportes
create or replace function has_full_reports_access(user_id uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  user_role user_role;
  has_permission boolean;
begin
  select role, can_view_all_reports
  into user_role, has_permission
  from profiles
  where id = user_id;
  
  -- Admins y auditores siempre tienen acceso total
  if user_role in ('admin', 'auditor') then
    return true;
  end if;
  
  -- Supervisores solo si tienen el permiso especial
  if user_role = 'supervisor' then
    return coalesce(has_permission, false);
  end if;
  
  -- Otros roles no tienen acceso a reportes completos
  return false;
end;
$$;

comment on function has_full_reports_access is 
'Verifica si un usuario tiene acceso completo a reportes de todas las sedes. Retorna true para admins/auditores siempre, y para supervisores solo si tienen el permiso especial habilitado.';

-- ========================================
-- COMPLETADO
-- ========================================
-- Ahora los reportes pueden verificar:
-- 1. Si el usuario es admin/auditor → acceso total
-- 2. Si el usuario es supervisor:
--    a. Con can_view_all_reports = true → acceso total
--    b. Con can_view_all_reports = false → solo sus sedes
-- 3. Otros roles → sin acceso a reportes (manejado por middleware)
