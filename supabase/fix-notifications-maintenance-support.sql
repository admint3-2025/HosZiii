-- ============================================================================
-- FIX: Permitir que notifications.ticket_id pueda referenciar tanto tickets IT como Mantenimiento
-- El campo ticket_id ya no tendrá FK estricta para poder almacenar IDs de ambas tablas
-- ============================================================================

-- 1. Eliminar la FK existente que apunta solo a tickets (IT)
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_ticket_id_fkey;

-- 2. Agregar columna para identificar el origen del ticket (opcional pero útil)
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS ticket_source TEXT DEFAULT 'tickets' CHECK (ticket_source IN ('tickets', 'tickets_maintenance'));

-- 3. Comentario de documentación
COMMENT ON COLUMN notifications.ticket_id IS 'ID del ticket, puede ser de tickets (IT) o tickets_maintenance';
COMMENT ON COLUMN notifications.ticket_source IS 'Tabla origen: tickets (IT) o tickets_maintenance';

-- 4. Verificar estructura
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND column_name IN ('ticket_id', 'ticket_source');
