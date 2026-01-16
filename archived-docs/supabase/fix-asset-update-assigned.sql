-- Fix: Incluir assigned_to y campos técnicos en la actualización de activos con auditoría de sede
-- Ejecutar en Supabase SQL Editor para actualizar la función RPC

create or replace function public.update_asset_with_location_reason(
  p_asset_id uuid,
  p_asset_tag text,
  p_asset_type text,
  p_status text,
  p_serial_number text,
  p_model text,
  p_brand text,
  p_department text,
  p_purchase_date date,
  p_warranty_end_date date,
  p_location text,
  p_location_id uuid,
  p_notes text,
  p_assigned_to uuid,
  p_processor text default null,
  p_ram_gb integer default null,
  p_storage_gb integer default null,
  p_os text default null,
  p_location_change_reason text default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_old_location_id uuid;
  v_old_assigned_to uuid;
  v_old_status text;
begin
  -- Obtener valores anteriores para comparar
  select location_id, assigned_to, status
  into v_old_location_id, v_old_assigned_to, v_old_status
  from assets
  where id = p_asset_id;

  -- Si se proporciona una razón, establecerla en el contexto
  if p_location_change_reason is not null and p_location_change_reason <> '' then
    perform set_config('app.location_change_reason', p_location_change_reason, false);
  end if;
  
  -- Actualizar el activo (el trigger validará si cambió location_id y otro trigger registra cambios de assigned_to)
  update assets set
    asset_tag = p_asset_tag,
    asset_type = p_asset_type::asset_type,
    status = p_status::asset_status,
    serial_number = p_serial_number,
    model = p_model,
    brand = p_brand,
    department = p_department,
    purchase_date = p_purchase_date,
    warranty_end_date = p_warranty_end_date,
    location = p_location,
    location_id = p_location_id,
    assigned_to = p_assigned_to,
    notes = p_notes,
    processor = p_processor,
    ram_gb = p_ram_gb,
    storage_gb = p_storage_gb,
    os = p_os,
    updated_at = now()
  where id = p_asset_id;
  
  -- Registrar en auditoría general con información específica de cambios
  insert into audit_log (
    entity_type,
    entity_id,
    action,
    actor_id,
    metadata
  )
  values (
    'asset',
    p_asset_id,
    'UPDATE',
    auth.uid(),
    jsonb_build_object(
      'asset_tag', p_asset_tag,
      'asset_type', p_asset_type,
      'model', p_model,
      'brand', p_brand,
      'changes', jsonb_strip_nulls(jsonb_build_object(
        'status', case when v_old_status <> p_status then jsonb_build_object('from', v_old_status, 'to', p_status) else null end,
        'location', case when v_old_location_id <> p_location_id then jsonb_build_object(
          'from', (select code from locations where id = v_old_location_id),
          'to', (select code from locations where id = p_location_id)
        ) else null end,
        'assigned_to', case when v_old_assigned_to is distinct from p_assigned_to then jsonb_build_object(
          'from', (select full_name from profiles where id = v_old_assigned_to),
          'to', (select full_name from profiles where id = p_assigned_to)
        ) else null end
      ))
    )
  );
  
  -- Limpiar el contexto
  perform set_config('app.location_change_reason', null, false);
end;
$$;
