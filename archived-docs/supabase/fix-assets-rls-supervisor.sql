-- Actualizar políticas RLS para permitir que supervisores gestionen activos
-- Ejecuta este script en el SQL Editor de Supabase

-- Eliminar políticas existentes
drop policy if exists "Admins can insert assets" on assets;
drop policy if exists "Admins can update assets" on assets;

-- Crear nuevas políticas que incluyen a supervisores
create policy "Admins and supervisors can insert assets"
  on assets for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role in ('admin', 'supervisor')
    )
  );

create policy "Admins and supervisors can update assets"
  on assets for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role in ('admin', 'supervisor')
    )
  );

-- Verificar las políticas actuales
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies 
where tablename = 'assets'
order by policyname;
