-- Migración para agregar tablas de catálogos de activos
-- Permite agregar dinámicamente procesadores, sistemas operativos, y tipos de activos personalizados

-- 1. Tabla de procesadores
CREATE TABLE IF NOT EXISTS asset_processors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  manufacturer TEXT, -- Intel, AMD, Apple, etc.
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de sistemas operativos
CREATE TABLE IF NOT EXISTS asset_operating_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  os_family TEXT, -- Windows, Linux, macOS, Chrome OS, etc.
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de tipos de activos personalizados
-- Complementa los tipos base (DESKTOP, LAPTOP, etc.)
CREATE TABLE IF NOT EXISTS asset_custom_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas
CREATE INDEX IF NOT EXISTS idx_asset_processors_active ON asset_processors(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_asset_os_active ON asset_operating_systems(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_asset_custom_types_active ON asset_custom_types(is_active) WHERE is_active = true;

-- Triggers para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_asset_processors_updated_at ON asset_processors;
CREATE TRIGGER update_asset_processors_updated_at BEFORE UPDATE ON asset_processors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_asset_os_updated_at ON asset_operating_systems;
CREATE TRIGGER update_asset_os_updated_at BEFORE UPDATE ON asset_operating_systems
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_asset_custom_types_updated_at ON asset_custom_types;
CREATE TRIGGER update_asset_custom_types_updated_at BEFORE UPDATE ON asset_custom_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE asset_processors ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_operating_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_custom_types ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes para recrearlas
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver procesadores activos" ON asset_processors;
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver sistemas operativos activos" ON asset_operating_systems;
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver tipos personalizados activos" ON asset_custom_types;
DROP POLICY IF EXISTS "Admins y supervisores pueden insertar procesadores" ON asset_processors;
DROP POLICY IF EXISTS "Admins y supervisores pueden actualizar procesadores" ON asset_processors;
DROP POLICY IF EXISTS "Admins pueden eliminar procesadores" ON asset_processors;
DROP POLICY IF EXISTS "Admins y supervisores pueden insertar sistemas operativos" ON asset_operating_systems;
DROP POLICY IF EXISTS "Admins y supervisores pueden actualizar sistemas operativos" ON asset_operating_systems;
DROP POLICY IF EXISTS "Admins pueden eliminar sistemas operativos" ON asset_operating_systems;
DROP POLICY IF EXISTS "Admins y supervisores pueden insertar tipos personalizados" ON asset_custom_types;
DROP POLICY IF EXISTS "Admins y supervisores pueden actualizar tipos personalizados" ON asset_custom_types;
DROP POLICY IF EXISTS "Admins pueden eliminar tipos personalizados" ON asset_custom_types;

-- Políticas de lectura: todos los usuarios autenticados pueden ver catálogos activos
CREATE POLICY "Usuarios autenticados pueden ver procesadores activos"
  ON asset_processors FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Usuarios autenticados pueden ver sistemas operativos activos"
  ON asset_operating_systems FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Usuarios autenticados pueden ver tipos personalizados activos"
  ON asset_custom_types FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Políticas de escritura: solo admins y supervisores pueden modificar catálogos
CREATE POLICY "Admins y supervisores pueden insertar procesadores"
  ON asset_processors FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'supervisor')
    )
  );

CREATE POLICY "Admins y supervisores pueden actualizar procesadores"
  ON asset_processors FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'supervisor')
    )
  );

CREATE POLICY "Admins pueden eliminar procesadores"
  ON asset_processors FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Mismas políticas para sistemas operativos
CREATE POLICY "Admins y supervisores pueden insertar sistemas operativos"
  ON asset_operating_systems FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'supervisor')
    )
  );

CREATE POLICY "Admins y supervisores pueden actualizar sistemas operativos"
  ON asset_operating_systems FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'supervisor')
    )
  );

CREATE POLICY "Admins pueden eliminar sistemas operativos"
  ON asset_operating_systems FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Mismas políticas para tipos personalizados
CREATE POLICY "Admins y supervisores pueden insertar tipos personalizados"
  ON asset_custom_types FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'supervisor')
    )
  );

CREATE POLICY "Admins y supervisores pueden actualizar tipos personalizados"
  ON asset_custom_types FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'supervisor')
    )
  );

CREATE POLICY "Admins pueden eliminar tipos personalizados"
  ON asset_custom_types FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Insertar datos iniciales de procesadores
INSERT INTO asset_processors (name, manufacturer) VALUES
  ('Intel Core i3-1215U', 'Intel'),
  ('Intel Core i5-1235U', 'Intel'),
  ('Intel Core i5-1335U', 'Intel'),
  ('Intel Core i5-1340P', 'Intel'),
  ('Intel Core i7-1255U', 'Intel'),
  ('Intel Core i7-1355U', 'Intel'),
  ('Intel Core i7-1365U', 'Intel'),
  ('Intel Core i7-1370P', 'Intel'),
  ('Intel Core i9-13900H', 'Intel'),
  ('Intel Core i9-14900HX', 'Intel'),
  ('Intel Celeron N4500', 'Intel'),
  ('Intel Pentium Gold 8505', 'Intel'),
  ('AMD Ryzen 3 7320U', 'AMD'),
  ('AMD Ryzen 5 5500U', 'AMD'),
  ('AMD Ryzen 5 5600G', 'AMD'),
  ('AMD Ryzen 5 7520U', 'AMD'),
  ('AMD Ryzen 5 7530U', 'AMD'),
  ('AMD Ryzen 5 7535U', 'AMD'),
  ('AMD Ryzen 5 7600X', 'AMD'),
  ('AMD Ryzen 7 5700G', 'AMD'),
  ('AMD Ryzen 7 5700U', 'AMD'),
  ('AMD Ryzen 7 7730U', 'AMD'),
  ('AMD Ryzen 7 7735U', 'AMD'),
  ('AMD Ryzen 7 7840U', 'AMD'),
  ('AMD Ryzen 9 7940HS', 'AMD'),
  ('AMD Ryzen 9 7950X', 'AMD'),
  ('Apple M1', 'Apple'),
  ('Apple M1 Pro', 'Apple'),
  ('Apple M1 Max', 'Apple'),
  ('Apple M2', 'Apple'),
  ('Apple M2 Pro', 'Apple'),
  ('Apple M2 Max', 'Apple'),
  ('Apple M3', 'Apple'),
  ('Apple M3 Pro', 'Apple'),
  ('Apple M3 Max', 'Apple')
ON CONFLICT (name) DO NOTHING;

-- Insertar datos iniciales de sistemas operativos
INSERT INTO asset_operating_systems (name, os_family) VALUES
  ('Windows 10 Home', 'Windows'),
  ('Windows 10 Pro', 'Windows'),
  ('Windows 11 Home', 'Windows'),
  ('Windows 11 Pro', 'Windows'),
  ('Windows 11 Pro for Workstations', 'Windows'),
  ('Windows Server 2019', 'Windows'),
  ('Windows Server 2022', 'Windows'),
  ('Ubuntu 20.04 LTS', 'Linux'),
  ('Ubuntu 22.04 LTS', 'Linux'),
  ('Ubuntu 24.04 LTS', 'Linux'),
  ('Debian 11', 'Linux'),
  ('Debian 12', 'Linux'),
  ('Fedora 39', 'Linux'),
  ('Fedora 40', 'Linux'),
  ('Linux Mint 21', 'Linux'),
  ('macOS Ventura', 'macOS'),
  ('macOS Sonoma', 'macOS'),
  ('macOS Sequoia', 'macOS'),
  ('Chrome OS', 'Chrome OS')
ON CONFLICT (name) DO NOTHING;

-- Comentarios
COMMENT ON TABLE asset_processors IS 'Catálogo de procesadores para activos';
COMMENT ON TABLE asset_operating_systems IS 'Catálogo de sistemas operativos para activos';
COMMENT ON TABLE asset_custom_types IS 'Tipos de activos personalizados adicionales a los tipos base';
