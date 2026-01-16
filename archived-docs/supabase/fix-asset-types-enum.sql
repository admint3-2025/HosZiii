-- =====================================================
-- FIX: Agregar todos los tipos de activos que faltan
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Verificar tipos actuales
SELECT unnest(enum_range(NULL::asset_type)) as tipo FROM public.asset_type ORDER BY 1;

-- 2. Agregar tipos faltantes UNO POR UNO (sin transacción)
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'VEHICLE';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'ELEVATOR';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'SECURITY_SYSTEM';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'FIRE_SYSTEM';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'HVAC_EQUIPMENT';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'BOILER_SYSTEM';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'REFRIGERATION';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'KITCHEN_EQUIPMENT';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'LAUNDRY_EQUIPMENT';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'WATER_HEATER';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'PUMP_SYSTEM';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'GENERATOR';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'ELECTRICAL_EQUIPMENT';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'LIGHTING';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'PLUMBING';

-- 3. Verificar tipos después de agregar
SELECT COUNT(*) as total_tipos FROM (
  SELECT unnest(enum_range(NULL::asset_type))
) AS tipos;

-- 4. Listar todos los tipos disponibles
SELECT unnest(enum_range(NULL::asset_type)) as asset_types 
ORDER BY asset_types;
