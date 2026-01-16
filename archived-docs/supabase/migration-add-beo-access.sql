-- Migración: Agregar control de acceso BEO a perfiles de usuario
-- Descripción: Agrega campo can_view_beo para controlar acceso al dashboard BEO

-- Agregar columna can_view_beo a la tabla profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS can_view_beo BOOLEAN DEFAULT false;

-- Comentario en la columna
COMMENT ON COLUMN profiles.can_view_beo IS 'Permite al usuario acceder al Dashboard BEO para gestión de eventos';

-- Habilitar acceso BEO para roles IT (admin, supervisor, agentes)
UPDATE profiles
SET can_view_beo = true
WHERE role IN ('admin', 'supervisor', 'agent_l1', 'agent_l2');

-- Crear índice para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_profiles_can_view_beo 
ON profiles(can_view_beo) 
WHERE can_view_beo = true;

-- Actualizar políticas RLS para beo_tickets_view si existen
-- (Las políticas existentes seguirán funcionando, solo agregamos el filtro adicional)

COMMENT ON COLUMN profiles.can_view_beo IS 
'Control de acceso al módulo BEO (Banquet Event Order). 
true = Usuario puede ver y gestionar eventos BEO
false = Usuario no tiene acceso al módulo BEO
Por defecto habilitado para admin, supervisor, agent_l1, agent_l2';
