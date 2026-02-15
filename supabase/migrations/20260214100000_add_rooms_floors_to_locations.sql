-- =====================================================
-- Migración: Agregar campos de infraestructura hotelera a locations
-- Fecha: 2026-02-14
-- Descripción: Número de habitaciones, pisos, y marca hotelera
--              para integrar con el módulo de Housekeeping.
-- =====================================================

-- 1. Número total de habitaciones (solo aplica a hoteles)
ALTER TABLE locations
ADD COLUMN IF NOT EXISTS total_rooms SMALLINT DEFAULT NULL;

COMMENT ON COLUMN locations.total_rooms IS 'Número total de habitaciones de la propiedad. Solo aplica a business_type = hotel.';

-- 2. Número de pisos
ALTER TABLE locations
ADD COLUMN IF NOT EXISTS total_floors SMALLINT DEFAULT NULL;

COMMENT ON COLUMN locations.total_floors IS 'Número total de pisos de la propiedad. Usado por Housekeeping para organizar habitaciones.';

-- 3. Marca hotelera (ej: Microtel Inn & Suites, Ramada Encore)
ALTER TABLE locations
ADD COLUMN IF NOT EXISTS brand TEXT DEFAULT NULL;

COMMENT ON COLUMN locations.brand IS 'Marca o cadena hotelera (Microtel, Ramada Encore, etc.)';

-- 4. Índice para filtrar propiedades hoteleras con habitaciones
CREATE INDEX IF NOT EXISTS idx_locations_hotel_rooms
ON locations(business_type, total_rooms)
WHERE business_type = 'hotel' AND total_rooms IS NOT NULL;
