-- Migration: create asset_types table and seed common types
BEGIN;

-- Tabla para tipos de activos gestionables por admin
CREATE TABLE IF NOT EXISTS asset_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  value text NOT NULL UNIQUE,
  label text NOT NULL,
  category text NOT NULL,
  sort_order integer DEFAULT 100,
  created_at timestamptz DEFAULT now()
);

-- Seed: common types (category, value, label)
INSERT INTO asset_types (value, label, category, sort_order) VALUES
  ('DESKTOP','PC de Escritorio','IT',10),
  ('LAPTOP','Laptop','IT',20),
  ('TABLET','Tablet','IT',30),
  ('PHONE','Teléfono','IT',40),
  ('MONITOR','Monitor','IT',50),
  ('PRINTER','Impresora','IT',60),
  ('SCANNER','Escáner','IT',70),
  ('SERVER','Servidor','IT',80),
  ('NETWORK_DEVICE','Equipo de Red','IT',90),
  ('UPS','UPS/No-Break','IT',100),
  ('PROJECTOR','Proyector','IT',110),
  ('AIR_CONDITIONING','Aire Acondicionado','HVAC',200),
  ('WASHING_MACHINE','Lavadora','Lavandería',210),
  ('PUMP','Bomba','Plomería',220),
  ('REFRIGERATOR','Refrigerador','Cocina/Minibar',230),
  ('FURNITURE','Mobiliario','Housekeeping',300)
ON CONFLICT (value) DO NOTHING;

COMMIT;
