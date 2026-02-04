-- =====================================================
-- Migración: Agregar tipo de negocio a ubicaciones
-- Descripción: Diferenciar entre propiedades hoteleras y corporativos
-- Fecha: 2026-02-04
-- =====================================================

-- 1. Agregar campo business_type a locations
alter table locations 
add column if not exists business_type text not null default 'hotel' check (business_type in ('hotel', 'corporate', 'office', 'warehouse', 'other'));

comment on column locations.business_type is 'Tipo de negocio: hotel (propiedad hotelera), corporate (oficina corporativa), office (oficina), warehouse (almacén), other (otro)';

-- 2. Crear índice para filtrado rápido
create index if not exists idx_locations_business_type on locations(business_type);

-- 3. Actualizar ubicaciones existentes
-- Por defecto, todas se marcan como hotel excepto las que tengan "Grupo" en el nombre
update locations 
set business_type = 'corporate' 
where lower(name) like '%grupo%' or lower(name) like '%corporativo%' or lower(name) like '%corporativa%';

-- 4. Comentario de migración
comment on table locations is 'Tabla de ubicaciones/sedes para segmentación multisede. Incluye tipo de negocio para filtrar hoteles vs corporativos.';
