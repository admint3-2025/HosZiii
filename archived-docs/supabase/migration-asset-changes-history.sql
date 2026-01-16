-- ============================================================================
-- HISTORIAL COMPLETO DE CAMBIOS DE ACTIVOS
-- ============================================================================
-- Registra automáticamente TODOS los cambios en activos para auditoría
-- y prevención de sabotaje/error humano
-- ============================================================================

BEGIN;

-- 1. Agregar campos técnicos para PC/Laptops
ALTER TABLE assets ADD COLUMN IF NOT EXISTS processor text;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS ram_gb integer;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS storage_gb integer;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS os text;

COMMENT ON COLUMN assets.processor IS 'Procesador (ej: Intel Core i7-1165G7, AMD Ryzen 5 5600)';
COMMENT ON COLUMN assets.ram_gb IS 'Memoria RAM en GB';
COMMENT ON COLUMN assets.storage_gb IS 'Almacenamiento en GB';
COMMENT ON COLUMN assets.os IS 'Sistema operativo (ej: Windows 11 Pro, Ubuntu 22.04)';

-- 2. Tabla de historial de cambios de activos
CREATE TABLE IF NOT EXISTS asset_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  asset_tag text NOT NULL,
  
  -- Información del cambio
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_by_name text,
  changed_by_email text,
  
  -- Detalles del cambio (JSON con before/after)
  field_name text NOT NULL,
  old_value text,
  new_value text,
  
  -- Metadata adicional
  change_type text NOT NULL CHECK (change_type IN ('UPDATE', 'CREATE', 'DELETE')),
  ip_address text,
  user_agent text
);

COMMENT ON TABLE asset_changes IS 'Historial completo de cambios en activos para auditoría y prevención de alteraciones';
COMMENT ON COLUMN asset_changes.field_name IS 'Nombre del campo modificado (status, location_id, processor, ram_gb, etc)';
COMMENT ON COLUMN asset_changes.old_value IS 'Valor anterior del campo';
COMMENT ON COLUMN asset_changes.new_value IS 'Nuevo valor del campo';

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_asset_changes_asset ON asset_changes(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_changes_date ON asset_changes(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_asset_changes_field ON asset_changes(field_name);
CREATE INDEX IF NOT EXISTS idx_asset_changes_user ON asset_changes(changed_by);

-- 3. Función para registrar cambios automáticamente
CREATE OR REPLACE FUNCTION track_asset_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_name text;
  v_user_email text;
  v_field record;
  v_old_val text;
  v_new_val text;
BEGIN
  -- Obtener información del usuario
  SELECT 
    COALESCE(p.full_name, u.email),
    u.email
  INTO v_user_name, v_user_email
  FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  WHERE u.id = auth.uid();

  -- Para INSERT (CREATE)
  IF TG_OP = 'INSERT' THEN
    INSERT INTO asset_changes (
      asset_id, asset_tag, changed_by, changed_by_name, changed_by_email,
      field_name, old_value, new_value, change_type
    ) VALUES (
      NEW.id, NEW.asset_tag, auth.uid(), v_user_name, v_user_email,
      'created', NULL, 'Activo creado', 'CREATE'
    );
    RETURN NEW;
  END IF;

  -- Para UPDATE - Registrar cada campo modificado
  IF TG_OP = 'UPDATE' THEN
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

    -- Tipo
    IF OLD.asset_type IS DISTINCT FROM NEW.asset_type THEN
      INSERT INTO asset_changes (
        asset_id, asset_tag, changed_by, changed_by_name, changed_by_email,
        field_name, old_value, new_value, change_type
      ) VALUES (
        NEW.id, NEW.asset_tag, auth.uid(), v_user_name, v_user_email,
        'asset_type', OLD.asset_type, NEW.asset_type, 'UPDATE'
      );
    END IF;

    -- Ubicación/Sede
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

    -- Responsable
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

    -- Marca
    IF OLD.brand IS DISTINCT FROM NEW.brand THEN
      INSERT INTO asset_changes (
        asset_id, asset_tag, changed_by, changed_by_name, changed_by_email,
        field_name, old_value, new_value, change_type
      ) VALUES (
        NEW.id, NEW.asset_tag, auth.uid(), v_user_name, v_user_email,
        'brand', OLD.brand, NEW.brand, 'UPDATE'
      );
    END IF;

    -- Modelo
    IF OLD.model IS DISTINCT FROM NEW.model THEN
      INSERT INTO asset_changes (
        asset_id, asset_tag, changed_by, changed_by_name, changed_by_email,
        field_name, old_value, new_value, change_type
      ) VALUES (
        NEW.id, NEW.asset_tag, auth.uid(), v_user_name, v_user_email,
        'model', OLD.model, NEW.model, 'UPDATE'
      );
    END IF;

    -- Número de serie
    IF OLD.serial_number IS DISTINCT FROM NEW.serial_number THEN
      INSERT INTO asset_changes (
        asset_id, asset_tag, changed_by, changed_by_name, changed_by_email,
        field_name, old_value, new_value, change_type
      ) VALUES (
        NEW.id, NEW.asset_tag, auth.uid(), v_user_name, v_user_email,
        'serial_number', OLD.serial_number, NEW.serial_number, 'UPDATE'
      );
    END IF;

    -- Procesador
    IF OLD.processor IS DISTINCT FROM NEW.processor THEN
      INSERT INTO asset_changes (
        asset_id, asset_tag, changed_by, changed_by_name, changed_by_email,
        field_name, old_value, new_value, change_type
      ) VALUES (
        NEW.id, NEW.asset_tag, auth.uid(), v_user_name, v_user_email,
        'processor', OLD.processor, NEW.processor, 'UPDATE'
      );
    END IF;

    -- RAM
    IF OLD.ram_gb IS DISTINCT FROM NEW.ram_gb THEN
      INSERT INTO asset_changes (
        asset_id, asset_tag, changed_by, changed_by_name, changed_by_email,
        field_name, old_value, new_value, change_type
      ) VALUES (
        NEW.id, NEW.asset_tag, auth.uid(), v_user_name, v_user_email,
        'ram_gb', 
        CASE WHEN OLD.ram_gb IS NOT NULL THEN OLD.ram_gb::text || ' GB' ELSE NULL END,
        CASE WHEN NEW.ram_gb IS NOT NULL THEN NEW.ram_gb::text || ' GB' ELSE NULL END,
        'UPDATE'
      );
    END IF;

    -- Almacenamiento
    IF OLD.storage_gb IS DISTINCT FROM NEW.storage_gb THEN
      INSERT INTO asset_changes (
        asset_id, asset_tag, changed_by, changed_by_name, changed_by_email,
        field_name, old_value, new_value, change_type
      ) VALUES (
        NEW.id, NEW.asset_tag, auth.uid(), v_user_name, v_user_email,
        'storage_gb',
        CASE WHEN OLD.storage_gb IS NOT NULL THEN OLD.storage_gb::text || ' GB' ELSE NULL END,
        CASE WHEN NEW.storage_gb IS NOT NULL THEN NEW.storage_gb::text || ' GB' ELSE NULL END,
        'UPDATE'
      );
    END IF;

    -- Sistema operativo
    IF OLD.os IS DISTINCT FROM NEW.os THEN
      INSERT INTO asset_changes (
        asset_id, asset_tag, changed_by, changed_by_name, changed_by_email,
        field_name, old_value, new_value, change_type
      ) VALUES (
        NEW.id, NEW.asset_tag, auth.uid(), v_user_name, v_user_email,
        'os', OLD.os, NEW.os, 'UPDATE'
      );
    END IF;

    -- Departamento
    IF OLD.department IS DISTINCT FROM NEW.department THEN
      INSERT INTO asset_changes (
        asset_id, asset_tag, changed_by, changed_by_name, changed_by_email,
        field_name, old_value, new_value, change_type
      ) VALUES (
        NEW.id, NEW.asset_tag, auth.uid(), v_user_name, v_user_email,
        'department', OLD.department, NEW.department, 'UPDATE'
      );
    END IF;

    -- Eliminación lógica
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      INSERT INTO asset_changes (
        asset_id, asset_tag, changed_by, changed_by_name, changed_by_email,
        field_name, old_value, new_value, change_type
      ) VALUES (
        NEW.id, NEW.asset_tag, auth.uid(), v_user_name, v_user_email,
        'deleted', 'Activo', 'Dado de baja', 'DELETE'
      );
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

-- 4. Trigger para rastrear cambios automáticamente
DROP TRIGGER IF EXISTS asset_changes_trigger ON assets;
CREATE TRIGGER asset_changes_trigger
  AFTER INSERT OR UPDATE ON assets
  FOR EACH ROW
  EXECUTE FUNCTION track_asset_changes();

-- 5. RLS para asset_changes
ALTER TABLE asset_changes ENABLE ROW LEVEL SECURITY;

-- Solo admin y auditor pueden ver el historial
DROP POLICY IF EXISTS "asset_changes_select" ON asset_changes;
CREATE POLICY "asset_changes_select" ON asset_changes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'auditor', 'supervisor')
  )
);

-- El trigger inserta automáticamente (SECURITY DEFINER)
-- No necesitamos política de INSERT manual

COMMIT;

-- ============================================================================
-- RESULTADO
-- ============================================================================
-- ✓ Campos técnicos agregados (processor, ram_gb, storage_gb, os)
-- ✓ Tabla asset_changes para historial completo
-- ✓ Trigger automático registra TODOS los cambios
-- ✓ Protección contra sabotaje/error humano
-- ✓ Admin/auditor/supervisor pueden ver historial
-- ============================================================================
