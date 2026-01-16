-- Migración simplificada para sistema de QR codes en activos
-- Agrega asset_code único para PDFs de baja con QR

-- 1. Agregar columna asset_code (código único para QR)
ALTER TABLE assets ADD COLUMN IF NOT EXISTS asset_code TEXT UNIQUE;

-- 2. Agregar índice para búsqueda rápida por código
CREATE INDEX IF NOT EXISTS idx_assets_asset_code ON assets(asset_code) WHERE asset_code IS NOT NULL;

-- 3. Función para generar asset_code automático si no existe
-- NOTA: esta es una función normal; NO puede referenciar NEW.
CREATE OR REPLACE FUNCTION generate_asset_code(p_asset_type text, p_location_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_code text;
  code_exists boolean;
  type_prefix text;
  location_code text;
  attempts int := 0;
BEGIN
  type_prefix := CASE p_asset_type
    WHEN 'DESKTOP' THEN 'DESK'
    WHEN 'LAPTOP' THEN 'LAPT'
    WHEN 'TABLET' THEN 'TABL'
    WHEN 'PHONE' THEN 'PHON'
    WHEN 'MONITOR' THEN 'MONI'
    WHEN 'PRINTER' THEN 'PRIN'
    WHEN 'OTHER' THEN 'OTHR'
    ELSE 'ASET'
  END;

  SELECT code INTO location_code
  FROM locations
  WHERE id = p_location_id
  LIMIT 1;
  location_code := COALESCE(location_code, 'XXXX');

  LOOP
    attempts := attempts + 1;
    EXIT WHEN attempts > 10;

    new_code := UPPER(
      type_prefix || '-' ||
      location_code || '-' ||
      SUBSTRING(MD5(RANDOM()::text || NOW()::text), 1, 5)
    );

    SELECT EXISTS(SELECT 1 FROM assets WHERE asset_code = new_code) INTO code_exists;
    IF NOT code_exists THEN
      RETURN new_code;
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

-- 4. Trigger para asignar asset_code automáticamente al crear activo
CREATE OR REPLACE FUNCTION assign_asset_code_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.asset_code IS NULL THEN
    NEW.asset_code := generate_asset_code(NEW.asset_type::text, NEW.location_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assign_asset_code ON assets;
CREATE TRIGGER trg_assign_asset_code
  BEFORE INSERT ON assets
  FOR EACH ROW
  EXECUTE FUNCTION assign_asset_code_trigger();

-- 5. Generar códigos para activos existentes sin código
UPDATE assets
SET asset_code = UPPER(
  CASE asset_type
    WHEN 'DESKTOP' THEN 'DESK'
    WHEN 'LAPTOP' THEN 'LAPT'
    WHEN 'TABLET' THEN 'TABL'
    WHEN 'PHONE' THEN 'PHON'
    WHEN 'MONITOR' THEN 'MONI'
    WHEN 'PRINTER' THEN 'PRIN'
    WHEN 'OTHER' THEN 'OTHR'
    ELSE 'ASET'
  END || '-' ||
  COALESCE((SELECT code FROM locations WHERE id = assets.location_id LIMIT 1), 'XXXX') || '-' ||
  SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT || id::TEXT), 1, 5)
)
WHERE asset_code IS NULL;

-- 6. Comentario
COMMENT ON COLUMN assets.asset_code IS 'Código único QR del activo para PDFs de baja (ej: DESK-EGDLS-A7X9K)';
