-- ============================================================================
-- AGREGAR COLUMNAS FALTANTES A tickets_maintenance
-- Permite vincular tickets con activos, categorías y campos ITIL
-- ============================================================================

-- 1. Agregar columna asset_id (nullable, referencia a assets_maintenance)
ALTER TABLE tickets_maintenance 
ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES assets_maintenance(id) ON DELETE SET NULL;

-- 2. Agregar columna category_id (UUID sin FK)
ALTER TABLE tickets_maintenance 
ADD COLUMN IF NOT EXISTS category_id UUID;

-- 3. Agregar columnas ITIL (impact, urgency, priority, support_level)
ALTER TABLE tickets_maintenance 
ADD COLUMN IF NOT EXISTS impact INTEGER DEFAULT 3;

ALTER TABLE tickets_maintenance 
ADD COLUMN IF NOT EXISTS urgency INTEGER DEFAULT 3;

ALTER TABLE tickets_maintenance 
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 3;

ALTER TABLE tickets_maintenance 
ADD COLUMN IF NOT EXISTS support_level INTEGER DEFAULT 1;

ALTER TABLE tickets_maintenance 
ADD COLUMN IF NOT EXISTS service_area TEXT DEFAULT 'maintenance';

-- 4. Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_tickets_maintenance_asset_id 
ON tickets_maintenance(asset_id);

CREATE INDEX IF NOT EXISTS idx_tickets_maintenance_category_id 
ON tickets_maintenance(category_id);

CREATE INDEX IF NOT EXISTS idx_tickets_maintenance_priority 
ON tickets_maintenance(priority);

-- 5. Comentarios para documentación
COMMENT ON COLUMN tickets_maintenance.asset_id IS 'Activo de mantenimiento relacionado con el ticket';
COMMENT ON COLUMN tickets_maintenance.category_id IS 'Categoría del ticket de mantenimiento';
COMMENT ON COLUMN tickets_maintenance.impact IS 'Impacto del incidente (1-5)';
COMMENT ON COLUMN tickets_maintenance.urgency IS 'Urgencia del incidente (1-5)';
COMMENT ON COLUMN tickets_maintenance.priority IS 'Prioridad calculada (1-5)';
COMMENT ON COLUMN tickets_maintenance.support_level IS 'Nivel de soporte (1, 2, 3)';
COMMENT ON COLUMN tickets_maintenance.service_area IS 'Área de servicio (maintenance, it, etc)';

-- 6. POLÍTICAS RLS - Permitir inserción de tickets
-- Eliminar política existente si hay conflicto
DROP POLICY IF EXISTS "Users can insert maintenance tickets" ON tickets_maintenance;
DROP POLICY IF EXISTS "Allow insert maintenance tickets" ON tickets_maintenance;

-- Crear política para insertar (usuarios autenticados)
CREATE POLICY "Allow insert maintenance tickets"
ON tickets_maintenance
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Actualizar política de SELECT si es necesario
DROP POLICY IF EXISTS "Users can view maintenance tickets" ON tickets_maintenance;

CREATE POLICY "Users can view maintenance tickets"
ON tickets_maintenance
FOR SELECT
TO authenticated
USING (true);

-- Política para UPDATE
DROP POLICY IF EXISTS "Users can update maintenance tickets" ON tickets_maintenance;

CREATE POLICY "Users can update maintenance tickets"
ON tickets_maintenance
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 7. Verificar que se crearon correctamente
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tickets_maintenance' 
AND column_name IN ('asset_id', 'category_id', 'impact', 'urgency', 'priority', 'support_level', 'service_area');
