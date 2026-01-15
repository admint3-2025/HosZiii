-- ============================================================================
-- FIX CRÍTICO: generate_asset_code() NO debe usar NEW (no es trigger)
--
-- Error típico en INSERT:
--   missing FROM-clause entry for table "new"
--
-- Causa raíz:
--   generate_asset_code() fue creada como función normal (RETURNS text)
--   pero referencia NEW.asset_type / NEW.location_id (solo existe en triggers).
--
-- Solución:
--   1) Re-crear generate_asset_code(asset_type, location_id)
--   2) Re-crear assign_asset_code_trigger() para llamar la función con NEW.*
--   3) Re-crear trigger trg_assign_asset_code
-- ============================================================================

-- 1) Re-crear generate_asset_code con parámetros
DROP FUNCTION IF EXISTS generate_asset_code();
DROP FUNCTION IF EXISTS generate_asset_code(text, uuid);

CREATE FUNCTION generate_asset_code(p_asset_type text, p_location_id uuid)
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

-- 2) Re-crear assign_asset_code_trigger para usar la función parametrizada
DROP FUNCTION IF EXISTS assign_asset_code_trigger() CASCADE;

CREATE FUNCTION assign_asset_code_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.asset_code IS NULL THEN
    NEW.asset_code := generate_asset_code(NEW.asset_type::text, NEW.location_id);
  END IF;
  RETURN NEW;
END;
$$;

-- 3) Re-crear el trigger
DROP TRIGGER IF EXISTS trg_assign_asset_code ON assets;
CREATE TRIGGER trg_assign_asset_code
  BEFORE INSERT ON assets
  FOR EACH ROW
  EXECUTE FUNCTION assign_asset_code_trigger();

-- 4) Validación rápida: ver definiciones
SELECT 'generate_asset_code(text, uuid)' as fn, pg_get_functiondef(p.oid) AS def
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'generate_asset_code';

SELECT 'assign_asset_code_trigger()' as fn, pg_get_functiondef(p.oid) AS def
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'assign_asset_code_trigger';
