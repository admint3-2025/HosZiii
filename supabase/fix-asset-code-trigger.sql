-- Fix: Corregir trigger generate_asset_code para evitar error "missing FROM-clause entry for table 'new'"
-- El problema está en la referencia a NEW.location_id dentro de un SELECT en el COALESCE

-- 1. Recrear función generate_asset_code con parámetros (NO puede usar NEW)
DROP FUNCTION IF EXISTS generate_asset_code();
DROP FUNCTION IF EXISTS generate_asset_code(text, uuid);

CREATE OR REPLACE FUNCTION generate_asset_code(p_asset_type text, p_location_id uuid)
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
  type_prefix TEXT;
  location_code TEXT;
  attempts INT := 0;
BEGIN
  -- Mapeo de tipo a prefijo
  type_prefix := CASE p_asset_type
    WHEN 'DESKTOP' THEN 'DESK'
    WHEN 'LAPTOP' THEN 'LAPT'
    WHEN 'MONITOR' THEN 'MONI'
    WHEN 'PRINTER' THEN 'PRIN'
    WHEN 'SCANNER' THEN 'SCAN'
    WHEN 'PHONE' THEN 'PHON'
    WHEN 'TABLET' THEN 'TABL'
    WHEN 'SERVER' THEN 'SERV'
    WHEN 'NETWORK' THEN 'NETW'
    WHEN 'UPS' THEN 'UPSX'
    WHEN 'PROJECTOR' THEN 'PROJ'
    WHEN 'OTHER' THEN 'OTHR'
    ELSE 'XXXX'
  END;
  
  -- Obtener código de ubicación FUERA del loop
  SELECT code INTO location_code 
  FROM locations 
  WHERE id = p_location_id 
  LIMIT 1;
  
  -- Si no hay ubicación, usar placeholder
  location_code := COALESCE(location_code, 'XXXX');
  
  -- Intentar generar código único (máximo 10 intentos)
  LOOP
    attempts := attempts + 1;
    EXIT WHEN attempts > 10;
    
    -- Generar código: TIPO-SEDE-RANDOM (ej: DESK-HQ-A7X9K)
    new_code := UPPER(
      type_prefix || '-' ||
      location_code || '-' ||
      SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT), 1, 5)
    );
    
    -- Verificar si ya existe
    SELECT EXISTS(SELECT 1 FROM assets WHERE asset_code = new_code) INTO code_exists;
    
    IF NOT code_exists THEN
      RETURN new_code;
    END IF;
  END LOOP;
  
  -- Si después de 10 intentos no se generó código único, retornar NULL
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. Verificar que el trigger está bien (este debe estar correcto)
CREATE OR REPLACE FUNCTION assign_asset_code_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.asset_code IS NULL THEN
    NEW.asset_code := generate_asset_code(NEW.asset_type::text, NEW.location_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- No es necesario recrear el trigger, solo asegurarse de que existe
DROP TRIGGER IF EXISTS trg_assign_asset_code ON assets;
CREATE TRIGGER trg_assign_asset_code
  BEFORE INSERT ON assets
  FOR EACH ROW
  EXECUTE FUNCTION assign_asset_code_trigger();
