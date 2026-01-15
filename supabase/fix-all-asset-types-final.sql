-- =====================================================
-- FIX FINAL: Agregar TODOS los tipos de activos faltantes
-- Ejecutar en Supabase SQL Editor - LOTE 1
-- =====================================================

-- LOTE 1: Tipos IT básicos
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'DESKTOP';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'LAPTOP';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'TABLET';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'PHONE';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'MONITOR';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'PRINTER';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'SCANNER';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'SERVER';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'UPS';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'PROJECTOR';

-- Verificar lote 1
SELECT COUNT(*) as total_tipos_lote1 FROM (
  SELECT unnest(enum_range(NULL::asset_type))
) AS tipos;
