-- =====================================================
-- MIGRACIÓN: Corregir configuración de habitaciones EGDLS
-- Fecha: 2026-02-16
-- Objetivo: Establecer los valores definitivos de total_rooms y total_floors
--           para Encore Guadalajara Sur (EGDLS).
--
-- Numeración definitiva (validada con formato COD-151 rev 12/02/19):
--   Piso 2: 202,204,205,206,207,208,209,210,211,212,213,215,218,220,222,223,224,225,227,229,230,231 (22 habitaciones)
--   Pisos 3-6: x01-x31 excepto x16, x26, x28 (28 habitaciones por piso × 4 pisos = 112)
--   Total: 135 habitaciones en 5 pisos operativos (2-6)
-- =====================================================

-- Actualizar total_rooms y total_floors para EGDLS
UPDATE locations
SET total_rooms  = 135,
    total_floors = 5,
    updated_at   = now()
WHERE code = 'EGDLS'
  AND business_type = 'hotel';

-- Limpiar todas las habitaciones existentes de EGDLS para regenerarlas con numeración definitiva.
-- El endpoint seed-rooms con force=true insertará la configuración exacta.
DELETE FROM hk_rooms
WHERE location_id IN (SELECT id FROM locations WHERE code = 'EGDLS');
