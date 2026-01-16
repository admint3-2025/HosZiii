-- =====================================================
-- Migración: Control de Acceso a Activos por Rol
-- Fecha: 15 Enero 2026
-- Descripción: Implementa segregación de activos IT vs Mantenimiento
-- =====================================================

-- 1. Extender tipo user_role para incluir roles especializados
-- NOTA: En Postgres, los tipos ENUM se agregan con ALTER TYPE en transacciones separadas

-- Primero, verificar que ya existan los nuevos roles (si no, agregarlos)
-- Ejecutar estos comandos en Supabase SQL Editor en transacciones SEPARADAS si falla el primero

DO $$
BEGIN
  -- Intentar agregar nuevos roles si no existen
  PERFORM 1 FROM pg_enum WHERE enumtypid = 'user_role'::regtype 
    AND enumlabel = 'tech_it';
  
  IF NOT FOUND THEN
    -- Si no están agregados, usar ALTER TYPE
    -- NOTA: Esto puede requerir transacciones separadas en algunas versiones
    EXECUTE 'ALTER TYPE user_role ADD VALUE IF NOT EXISTS ''tech_it''';
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Si falla, intentar de otra forma
  NULL;
END $$;

-- 2. Agregar columna asset_category a profiles (si no existe)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS asset_category VARCHAR(50) DEFAULT NULL;

-- Agregar comentario
COMMENT ON COLUMN profiles.asset_category IS 
  'Categoría de activos que puede gestionar: IT, MAINTENANCE, null=todas (admin)';

-- 3. Crear índice para búsquedas frecuentes por role + asset_category
CREATE INDEX IF NOT EXISTS idx_profiles_role_asset_category 
  ON profiles(role, asset_category) 
  WHERE active = true;

-- 4. Crear tabla de mapeo: qué tipos de activos pertenecen a qué categoría
CREATE TABLE IF NOT EXISTS asset_type_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_type VARCHAR(50) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL, -- 'IT' o 'MAINTENANCE'
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT valid_asset_type CHECK (asset_type IN (
    'DESKTOP', 'LAPTOP', 'TABLET', 'PHONE', 'MONITOR', 'PRINTER', 'SCANNER', 
    'SERVER', 'UPS', 'PROJECTOR',
    'AIR_CONDITIONING', 'HVAC_SYSTEM', 'BOILER',
    'REFRIGERATOR', 'KITCHEN_EQUIPMENT',
    'WASHING_MACHINE', 'DRYER',
    'WATER_HEATER', 'PUMP', 'GENERATOR', 'ELEVATOR',
    'FURNITURE', 'FIXTURE', 'CLEANING_EQUIPMENT', 'SECURITY_SYSTEM', 
    'FIRE_SYSTEM', 'PLUMBING', 'ELECTRICAL', 'LIGHTING', 'VEHICLE', 'OTHER'
  )),
  CONSTRAINT valid_category CHECK (category IN ('IT', 'MAINTENANCE'))
);

-- Agregar comentarios
COMMENT ON TABLE asset_type_categories IS 
  'Mapeo entre tipos de activos y categorías (IT vs MAINTENANCE)';

-- 5. Habilitar RLS en asset_type_categories
ALTER TABLE asset_type_categories ENABLE ROW LEVEL SECURITY;

-- Política: todos pueden leer
DROP POLICY IF EXISTS "Anyone can view asset type categories" ON asset_type_categories;
CREATE POLICY "Anyone can view asset type categories"
  ON asset_type_categories FOR SELECT
  USING (is_active = true);

-- Política: solo admin puede modificar
DROP POLICY IF EXISTS "Admin can manage asset type categories" ON asset_type_categories;
CREATE POLICY "Admin can manage asset type categories"
  ON asset_type_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 6. Insertar mapeos de categorías para todos los tipos de activos
INSERT INTO asset_type_categories (asset_type, category, description) VALUES
-- IT
('DESKTOP', 'IT', 'Computadora de Escritorio'),
('LAPTOP', 'IT', 'Computadora Portátil'),
('TABLET', 'IT', 'Tableta'),
('PHONE', 'IT', 'Teléfono'),
('MONITOR', 'IT', 'Monitor'),
('PRINTER', 'IT', 'Impresora'),
('SCANNER', 'IT', 'Escáner'),
('SERVER', 'IT', 'Servidor'),
('UPS', 'IT', 'Sistema de Alimentación Ininterrumpible'),
('PROJECTOR', 'IT', 'Proyector'),

-- MAINTENANCE - HVAC
('AIR_CONDITIONING', 'MAINTENANCE', 'Aire Acondicionado'),
('HVAC_SYSTEM', 'MAINTENANCE', 'Sistema HVAC'),
('BOILER', 'MAINTENANCE', 'Caldera'),

-- MAINTENANCE - Kitchen
('REFRIGERATOR', 'MAINTENANCE', 'Refrigerador'),
('KITCHEN_EQUIPMENT', 'MAINTENANCE', 'Equipo de Cocina'),

-- MAINTENANCE - Laundry
('WASHING_MACHINE', 'MAINTENANCE', 'Lavadora'),
('DRYER', 'MAINTENANCE', 'Secadora'),

-- MAINTENANCE - Infrastructure
('WATER_HEATER', 'MAINTENANCE', 'Calentador de Agua'),
('PUMP', 'MAINTENANCE', 'Bomba'),
('GENERATOR', 'MAINTENANCE', 'Generador'),
('ELEVATOR', 'MAINTENANCE', 'Ascensor'),

-- MAINTENANCE - General
('FURNITURE', 'MAINTENANCE', 'Mueble'),
('FIXTURE', 'MAINTENANCE', 'Accesorio Fijo'),
('CLEANING_EQUIPMENT', 'MAINTENANCE', 'Equipo de Limpieza'),
('SECURITY_SYSTEM', 'MAINTENANCE', 'Sistema de Seguridad'),
('FIRE_SYSTEM', 'MAINTENANCE', 'Sistema de Fuego/Extinción'),
('PLUMBING', 'MAINTENANCE', 'Equipo de Fontanería'),
('ELECTRICAL', 'MAINTENANCE', 'Equipo Eléctrico'),
('LIGHTING', 'MAINTENANCE', 'Iluminación'),
('VEHICLE', 'MAINTENANCE', 'Vehículo'),
('OTHER', 'MAINTENANCE', 'Otro')
ON CONFLICT (asset_type) DO NOTHING;

-- 7. ACTUALIZAR RLS de tabla assets para incluir filtro por categoría
-- NOTA: Primero, verificar que la tabla assets exista y tener políticas actuales

-- Obtener la categoría del usuario y permitir ver activos de esa categoría
DROP POLICY IF EXISTS "Users view assets by role and category" ON assets;
CREATE POLICY "Users view assets by role and category"
  ON assets FOR SELECT
  USING (
    -- Admins ven todos los activos
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    OR
    -- Supervisores/Técnicos ven activos de su categoría asignada
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.active = true
      AND p.role IN ('supervisor', 'agent_l1', 'agent_l2')
      AND (
        -- Ver activos de su categoría
        EXISTS (
          SELECT 1 FROM asset_type_categories atc
          WHERE atc.asset_type = assets.asset_type
          AND atc.category = p.asset_category
        )
        OR
        -- O no tiene categoría asignada (acceso a todas)
        p.asset_category IS NULL
      )
    )
  );

-- 8. Política INSERT/UPDATE para assets
-- Usuarios pueden crear/editar activos solo si pueden verlos
DROP POLICY IF EXISTS "Users can create update assets by category" ON assets;
CREATE POLICY "Users can create update assets by category"
  ON assets FOR INSERT
  WITH CHECK (
    -- Admins pueden insertar cualquier cosa
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    OR
    -- Supervisores/Técnicos pueden insertar activos de su categoría
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.active = true
      AND p.role IN ('supervisor', 'agent_l1', 'agent_l2')
      AND p.can_manage_assets = true
      AND (
        -- Insertar activos de su categoría
        EXISTS (
          SELECT 1 FROM asset_type_categories atc
          WHERE atc.asset_type = asset_type
          AND atc.category = p.asset_category
        )
        OR
        -- O no tiene categoría asignada
        p.asset_category IS NULL
      )
    )
  );

-- 9. Crear función helper: obtener categoría de activo
CREATE OR REPLACE FUNCTION get_asset_category(asset_type_param VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
  category VARCHAR;
BEGIN
  SELECT category INTO category
  FROM asset_type_categories
  WHERE asset_type = asset_type_param
  AND is_active = true
  LIMIT 1;
  
  RETURN COALESCE(category, 'OTHER');
END;
$$ LANGUAGE plpgsql STABLE;

-- 10. Crear función helper: validar acceso a activo
CREATE OR REPLACE FUNCTION user_can_access_asset(user_id UUID, asset_type_param VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  user_role VARCHAR;
  user_category VARCHAR;
  asset_category VARCHAR;
BEGIN
  -- Obtener datos del usuario
  SELECT role, asset_category INTO user_role, user_category
  FROM profiles
  WHERE id = user_id
  AND active = true
  LIMIT 1;
  
  -- Admin puede acceder a todo
  IF user_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Si el usuario no tiene categoría asignada, puede acceder a todo
  IF user_category IS NULL THEN
    RETURN true;
  END IF;
  
  -- Obtener categoría del activo
  SELECT category INTO asset_category
  FROM asset_type_categories
  WHERE asset_type = asset_type_param
  AND is_active = true
  LIMIT 1;
  
  -- Verificar que coincidan
  RETURN (user_category = asset_category);
END;
$$ LANGUAGE plpgsql STABLE;

-- 11. Crear tabla de auditoría para cambios de categoría de usuario
CREATE TABLE IF NOT EXISTS user_category_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  old_category VARCHAR(50),
  new_category VARCHAR(50),
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reason TEXT,
  
  CONSTRAINT valid_category CHECK (new_category IN ('IT', 'MAINTENANCE', NULL))
);

-- Habilitar RLS en tabla de auditoría
ALTER TABLE user_category_audit ENABLE ROW LEVEL SECURITY;

-- Solo admin puede ver auditoría
DROP POLICY IF EXISTS "Admin can view user category audit" ON user_category_audit;
CREATE POLICY "Admin can view user category audit"
  ON user_category_audit FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 12. Trigger para registrar cambios de categoría
CREATE OR REPLACE FUNCTION audit_user_category_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.asset_category IS DISTINCT FROM NEW.asset_category THEN
    INSERT INTO user_category_audit (user_id, old_category, new_category, changed_by)
    VALUES (NEW.id, OLD.asset_category, NEW.asset_category, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_category_audit_trigger ON profiles;
CREATE TRIGGER user_category_audit_trigger
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION audit_user_category_change();

-- 13. Comentarios finales
COMMENT ON COLUMN profiles.asset_category IS 
  'Categoría de activos: IT (solo IT), MAINTENANCE (solo Mantenimiento), NULL (todas)';

COMMENT ON FUNCTION get_asset_category IS 
  'Obtiene la categoría (IT o MAINTENANCE) para un tipo de activo';

COMMENT ON FUNCTION user_can_access_asset IS 
  'Verifica si un usuario tiene acceso a un tipo de activo específico';
