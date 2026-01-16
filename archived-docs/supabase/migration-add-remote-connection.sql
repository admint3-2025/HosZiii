-- Agregar campos de conexión remota a tickets
-- Ejecutar en Supabase SQL Editor

ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS remote_connection_type TEXT CHECK (remote_connection_type IN ('rustdesk', 'anydesk', 'teamviewer', 'chrome_remote', 'otros')),
ADD COLUMN IF NOT EXISTS remote_connection_id TEXT,
ADD COLUMN IF NOT EXISTS remote_connection_password TEXT;

-- Índice para búsquedas por tipo de conexión
CREATE INDEX IF NOT EXISTS idx_tickets_remote_connection_type 
ON tickets(remote_connection_type) 
WHERE remote_connection_type IS NOT NULL AND deleted_at IS NULL;

COMMENT ON COLUMN tickets.remote_connection_type IS 'Tipo de software de conexión remota solicitado por el usuario';
COMMENT ON COLUMN tickets.remote_connection_id IS 'ID o código de conexión remota proporcionado por el usuario';
COMMENT ON COLUMN tickets.remote_connection_password IS 'Password temporal para conexión remota (si aplica)';
