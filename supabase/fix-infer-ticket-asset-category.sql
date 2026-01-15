-- Fix: Crear función infer_ticket_asset_category que falta
-- Ejecutar en Supabase SQL Editor
-- Fecha: 2026-01-15

-- Helper: inferir categoría del ticket a partir del asset_type (solo para IT vs mantenimiento)
create or replace function public.infer_ticket_asset_category(p_asset_type text)
returns text
language sql
immutable
as $$
  select case
    when p_asset_type is null then null
    when p_asset_type in ('DESKTOP','LAPTOP','TABLET','PHONE','MONITOR','PRINTER','SCANNER','SERVER','NETWORK','UPS','PROJECTOR') then 'IT'
    when p_asset_type in (
      'AIR_CONDITIONING','HVAC_SYSTEM','BOILER','REFRIGERATOR','KITCHEN_EQUIPMENT','WASHING_MACHINE','DRYER',
      'WATER_HEATER','PUMP','GENERATOR','ELEVATOR','FURNITURE','FIXTURE','CLEANING_EQUIPMENT','SECURITY_SYSTEM',
      'FIRE_SYSTEM','PLUMBING','ELECTRICAL','LIGHTING','VEHICLE','OTHER'
    ) then 'MAINTENANCE'
    else null
  end;
$$;

-- Grant execute permission
grant execute on function public.infer_ticket_asset_category(text) to authenticated;
grant execute on function public.infer_ticket_asset_category(text) to service_role;
