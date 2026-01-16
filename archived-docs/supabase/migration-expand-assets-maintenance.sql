-- ============================================================================
-- Migración: Expandir activos para mantenimiento general (no solo IT)
-- Fecha: 2026-01-14
-- ============================================================================

-- 1. Agregar nuevos tipos de activos de mantenimiento general
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'AIR_CONDITIONING';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'REFRIGERATOR';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'WASHING_MACHINE';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'DRYER';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'WATER_HEATER';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'ELEVATOR';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'GENERATOR';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'PUMP';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'BOILER';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'HVAC_SYSTEM';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'FURNITURE';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'FIXTURE';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'KITCHEN_EQUIPMENT';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'CLEANING_EQUIPMENT';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'SECURITY_SYSTEM';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'FIRE_SYSTEM';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'PLUMBING';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'ELECTRICAL';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'LIGHTING';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'VEHICLE';

-- 2. Agregar nuevos campos específicos para mantenimiento
ALTER TABLE assets ADD COLUMN IF NOT EXISTS asset_name TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS installation_date DATE;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS service_provider TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS responsible_area TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS capacity TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS power_rating TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS voltage TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS refrigerant_type TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS btu_rating TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS tonnage TEXT;

-- 3. Comentarios
COMMENT ON COLUMN assets.asset_name IS 'Nombre descriptivo del activo (ej: Mini Split Inverter 1.5 Toneladas)';
COMMENT ON COLUMN assets.installation_date IS 'Fecha de instalación del activo';
COMMENT ON COLUMN assets.service_provider IS 'Proveedor de servicio/mantenimiento';
COMMENT ON COLUMN assets.responsible_area IS 'Área responsable del activo (ej: Climatización, Housekeeping)';
COMMENT ON COLUMN assets.capacity IS 'Capacidad del activo (ej: 100 litros, 5 kg)';
COMMENT ON COLUMN assets.power_rating IS 'Potencia nominal (ej: 1500W, 3HP)';
COMMENT ON COLUMN assets.voltage IS 'Voltaje de operación (ej: 110V, 220V, 440V)';
COMMENT ON COLUMN assets.refrigerant_type IS 'Tipo de refrigerante (para equipos HVAC)';
COMMENT ON COLUMN assets.btu_rating IS 'Capacidad en BTU (para equipos de climatización)';
COMMENT ON COLUMN assets.tonnage IS 'Tonelaje (para equipos HVAC)';

-- 4. Actualizar función de tracking de cambios para incluir nuevos campos
CREATE OR REPLACE FUNCTION track_asset_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_user_name text;
  v_user_email text;
BEGIN
  SELECT full_name, email INTO v_user_name, v_user_email
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.id = auth.uid()
  LIMIT 1;

  -- Tracking de campos existentes (mantener lógica anterior)
  IF TG_OP = 'INSERT' THEN
    INSERT INTO asset_changes (
      asset_id, asset_tag, changed_by, changed_by_name, changed_by_email,
      field_name, old_value, new_value, change_type
    ) VALUES (
      NEW.id, NEW.asset_tag, auth.uid(), v_user_name, v_user_email,
      'created', NULL, 'Asset created', 'CREATE'
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Status
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO asset_changes (
        asset_id, asset_tag, changed_by, changed_by_name, changed_by_email,
        field_name, old_value, new_value, change_type
      ) VALUES (
        NEW.id, NEW.asset_tag, auth.uid(), v_user_name, v_user_email,
        'status', OLD.status, NEW.status, 'UPDATE'
      );
    END IF;
    
    -- Asset Name
    IF OLD.asset_name IS DISTINCT FROM NEW.asset_name THEN
      INSERT INTO asset_changes (
        asset_id, asset_tag, changed_by, changed_by_name, changed_by_email,
        field_name, old_value, new_value, change_type
      ) VALUES (
        NEW.id, NEW.asset_tag, auth.uid(), v_user_name, v_user_email,
        'asset_name', OLD.asset_name, NEW.asset_name, 'UPDATE'
      );
    END IF;

    -- Installation Date
    IF OLD.installation_date IS DISTINCT FROM NEW.installation_date THEN
      INSERT INTO asset_changes (
        asset_id, asset_tag, changed_by, changed_by_name, changed_by_email,
        field_name, old_value, new_value, change_type
      ) VALUES (
        NEW.id, NEW.asset_tag, auth.uid(), v_user_name, v_user_email,
        'installation_date', OLD.installation_date::text, NEW.installation_date::text, 'UPDATE'
      );
    END IF;

    -- Service Provider
    IF OLD.service_provider IS DISTINCT FROM NEW.service_provider THEN
      INSERT INTO asset_changes (
        asset_id, asset_tag, changed_by, changed_by_name, changed_by_email,
        field_name, old_value, new_value, change_type
      ) VALUES (
        NEW.id, NEW.asset_tag, auth.uid(), v_user_name, v_user_email,
        'service_provider', OLD.service_provider, NEW.service_provider, 'UPDATE'
      );
    END IF;

    -- Responsible Area
    IF OLD.responsible_area IS DISTINCT FROM NEW.responsible_area THEN
      INSERT INTO asset_changes (
        asset_id, asset_tag, changed_by, changed_by_name, changed_by_email,
        field_name, old_value, new_value, change_type
      ) VALUES (
        NEW.id, NEW.asset_tag, auth.uid(), v_user_name, v_user_email,
        'responsible_area', OLD.responsible_area, NEW.responsible_area, 'UPDATE'
      );
    END IF;

    -- Continuar con campos existentes...
    IF OLD.asset_type IS DISTINCT FROM NEW.asset_type THEN
      INSERT INTO asset_changes (
        asset_id, asset_tag, changed_by, changed_by_name, changed_by_email,
        field_name, old_value, new_value, change_type
      ) VALUES (
        NEW.id, NEW.asset_tag, auth.uid(), v_user_name, v_user_email,
        'asset_type', OLD.asset_type, NEW.asset_type, 'UPDATE'
      );
    END IF;

    IF OLD.location_id IS DISTINCT FROM NEW.location_id THEN
      INSERT INTO asset_changes (
        asset_id, asset_tag, changed_by, changed_by_name, changed_by_email,
        field_name, old_value, new_value, change_type
      ) VALUES (
        NEW.id, NEW.asset_tag, auth.uid(), v_user_name, v_user_email,
        'location_id',
        (SELECT code FROM locations WHERE id = OLD.location_id),
        (SELECT code FROM locations WHERE id = NEW.location_id),
        'UPDATE'
      );
    END IF;

    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      INSERT INTO asset_changes (
        asset_id, asset_tag, changed_by, changed_by_name, changed_by_email,
        field_name, old_value, new_value, change_type
      ) VALUES (
        NEW.id, NEW.asset_tag, auth.uid(), v_user_name, v_user_email,
        'assigned_to',
        (SELECT full_name FROM profiles WHERE id = OLD.assigned_to),
        (SELECT full_name FROM profiles WHERE id = NEW.assigned_to),
        'UPDATE'
      );
    END IF;

    IF OLD.brand IS DISTINCT FROM NEW.brand THEN
      INSERT INTO asset_changes (
        asset_id, asset_tag, changed_by, changed_by_name, changed_by_email,
        field_name, old_value, new_value, change_type
      ) VALUES (
        NEW.id, NEW.asset_tag, auth.uid(), v_user_name, v_user_email,
        'brand', OLD.brand, NEW.brand, 'UPDATE'
      );
    END IF;

    IF OLD.model IS DISTINCT FROM NEW.model THEN
      INSERT INTO asset_changes (
        asset_id, asset_tag, changed_by, changed_by_name, changed_by_email,
        field_name, old_value, new_value, change_type
      ) VALUES (
        NEW.id, NEW.asset_tag, auth.uid(), v_user_name, v_user_email,
        'model', OLD.model, NEW.model, 'UPDATE'
      );
    END IF;

    IF OLD.serial_number IS DISTINCT FROM NEW.serial_number THEN
      INSERT INTO asset_changes (
        asset_id, asset_tag, changed_by, changed_by_name, changed_by_email,
        field_name, old_value, new_value, change_type
      ) VALUES (
        NEW.id, NEW.asset_tag, auth.uid(), v_user_name, v_user_email,
        'serial_number', OLD.serial_number, NEW.serial_number, 'UPDATE'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrear trigger
DROP TRIGGER IF EXISTS asset_changes_trigger ON assets;
CREATE TRIGGER asset_changes_trigger
  AFTER INSERT OR UPDATE ON assets
  FOR EACH ROW
  EXECUTE FUNCTION track_asset_changes();

-- 5. Crear vista con labels amigables para tipos de activos
CREATE OR REPLACE VIEW asset_type_labels AS
SELECT 
  'DESKTOP'::text AS type_code, 'PC de Escritorio' AS label, 'IT' AS category
UNION ALL SELECT 'LAPTOP', 'Laptop', 'IT'
UNION ALL SELECT 'TABLET', 'Tablet', 'IT'
UNION ALL SELECT 'PHONE', 'Teléfono', 'IT'
UNION ALL SELECT 'MONITOR', 'Monitor', 'IT'
UNION ALL SELECT 'PRINTER', 'Impresora', 'IT'
UNION ALL SELECT 'SCANNER', 'Escáner', 'IT'
UNION ALL SELECT 'SERVER', 'Servidor', 'IT'
UNION ALL SELECT 'NETWORK', 'Equipo de Red', 'IT'
UNION ALL SELECT 'UPS', 'UPS/No-Break', 'IT'
UNION ALL SELECT 'PROJECTOR', 'Proyector', 'IT'
UNION ALL SELECT 'AIR_CONDITIONING', 'Aire Acondicionado', 'HVAC'
UNION ALL SELECT 'REFRIGERATOR', 'Refrigerador', 'Cocina/Minibar'
UNION ALL SELECT 'WASHING_MACHINE', 'Lavadora', 'Lavandería'
UNION ALL SELECT 'DRYER', 'Secadora', 'Lavandería'
UNION ALL SELECT 'WATER_HEATER', 'Calentador de Agua', 'Plomería'
UNION ALL SELECT 'ELEVATOR', 'Elevador', 'Infraestructura'
UNION ALL SELECT 'GENERATOR', 'Generador', 'Eléctrico'
UNION ALL SELECT 'PUMP', 'Bomba', 'Plomería'
UNION ALL SELECT 'BOILER', 'Caldera', 'HVAC'
UNION ALL SELECT 'HVAC_SYSTEM', 'Sistema HVAC', 'HVAC'
UNION ALL SELECT 'FURNITURE', 'Mobiliario', 'Housekeeping'
UNION ALL SELECT 'FIXTURE', 'Fixture/Accesorio', 'Housekeeping'
UNION ALL SELECT 'KITCHEN_EQUIPMENT', 'Equipo de Cocina', 'Cocina'
UNION ALL SELECT 'CLEANING_EQUIPMENT', 'Equipo de Limpieza', 'Housekeeping'
UNION ALL SELECT 'SECURITY_SYSTEM', 'Sistema de Seguridad', 'Seguridad'
UNION ALL SELECT 'FIRE_SYSTEM', 'Sistema Contra Incendios', 'Seguridad'
UNION ALL SELECT 'PLUMBING', 'Equipo de Plomería', 'Plomería'
UNION ALL SELECT 'ELECTRICAL', 'Equipo Eléctrico', 'Eléctrico'
UNION ALL SELECT 'LIGHTING', 'Iluminación', 'Eléctrico'
UNION ALL SELECT 'VEHICLE', 'Vehículo', 'Transporte'
UNION ALL SELECT 'OTHER', 'Otro', 'General';

COMMENT ON VIEW asset_type_labels IS 'Labels amigables y categorías para tipos de activos';

-- 6. Actualizar función de generación de código para nuevos tipos
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
    -- IT
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
    -- HVAC
    WHEN 'AIR_CONDITIONING' THEN 'AC'
    WHEN 'HVAC_SYSTEM' THEN 'HVAC'
    WHEN 'BOILER' THEN 'BOIL'
    -- Cocina/Lavandería
    WHEN 'REFRIGERATOR' THEN 'REFR'
    WHEN 'WASHING_MACHINE' THEN 'WASH'
    WHEN 'DRYER' THEN 'DRYR'
    WHEN 'KITCHEN_EQUIPMENT' THEN 'KITCH'
    -- Infraestructura
    WHEN 'WATER_HEATER' THEN 'WH'
    WHEN 'ELEVATOR' THEN 'ELEV'
    WHEN 'GENERATOR' THEN 'GEN'
    WHEN 'PUMP' THEN 'PUMP'
    -- General
    WHEN 'FURNITURE' THEN 'FURN'
    WHEN 'FIXTURE' THEN 'FIX'
    WHEN 'CLEANING_EQUIPMENT' THEN 'CLEN'
    WHEN 'SECURITY_SYSTEM' THEN 'SEC'
    WHEN 'FIRE_SYSTEM' THEN 'FIRE'
    WHEN 'PLUMBING' THEN 'PLUM'
    WHEN 'ELECTRICAL' THEN 'ELEC'
    WHEN 'LIGHTING' THEN 'LGHT'
    WHEN 'VEHICLE' THEN 'VEH'
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

-- 7. Generar códigos para activos existentes si no tienen
UPDATE assets
SET asset_code = generate_asset_code(asset_type::text, location_id)
WHERE asset_code IS NULL;

SELECT 'Migración completada: Activos expandidos para mantenimiento general' AS status;
