-- Migración: Agregar permiso de gestión de activos a perfiles de usuario
-- Descripción: Agrega campo can_manage_assets para habilitar acceso a gestión de inventario de TI

-- 1. Agregar columna a profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS can_manage_assets BOOLEAN DEFAULT false;

COMMENT ON COLUMN profiles.can_manage_assets IS 'Permite al usuario acceder a pantallas de gestión y asignación de activos de TI.';

-- 2. (Opcional) Habilitar por defecto para roles IT
UPDATE profiles
SET can_manage_assets = true
WHERE role IN ('admin', 'supervisor', 'agent_l2');

-- 3. Índice para filtros rápidos
CREATE INDEX IF NOT EXISTS idx_profiles_can_manage_assets
ON profiles(can_manage_assets)
WHERE can_manage_assets = true;
