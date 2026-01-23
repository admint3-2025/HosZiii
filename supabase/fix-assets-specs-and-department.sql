-- ============================================================================
-- FIX: Agregar campos faltantes para assets_it y assets_maintenance
-- Fecha: 2026-01-23
-- ============================================================================

-- ============================================================================
-- PARTE 1: Agregar columnas a assets_it
-- ============================================================================

-- Campos básicos faltantes
ALTER TABLE assets_it ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE assets_it ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Campos de especificaciones técnicas (IT legacy - PC/Laptop)
ALTER TABLE assets_it ADD COLUMN IF NOT EXISTS processor TEXT;
ALTER TABLE assets_it ADD COLUMN IF NOT EXISTS ram_gb INTEGER;
ALTER TABLE assets_it ADD COLUMN IF NOT EXISTS storage_gb INTEGER;
ALTER TABLE assets_it ADD COLUMN IF NOT EXISTS os TEXT;

-- Campos dinámicos para tipos específicos (guardados como JSONB para flexibilidad)
ALTER TABLE assets_it ADD COLUMN IF NOT EXISTS dynamic_specs JSONB DEFAULT '{}'::jsonb;

-- Índice para búsquedas en dynamic_specs
CREATE INDEX IF NOT EXISTS idx_assets_it_dynamic_specs ON assets_it USING gin(dynamic_specs);

-- Comentarios
COMMENT ON COLUMN assets_it.department IS 'Departamento al que pertenece el activo';
COMMENT ON COLUMN assets_it.updated_by IS 'Usuario que realizó la última actualización';
COMMENT ON COLUMN assets_it.processor IS 'Procesador (legacy - solo PC/Laptop)';
COMMENT ON COLUMN assets_it.ram_gb IS 'RAM en GB (legacy - solo PC/Laptop)';
COMMENT ON COLUMN assets_it.storage_gb IS 'Almacenamiento en GB (legacy - solo PC/Laptop)';
COMMENT ON COLUMN assets_it.os IS 'Sistema Operativo (legacy - solo PC/Laptop)';
COMMENT ON COLUMN assets_it.dynamic_specs IS 'Especificaciones dinámicas según tipo de activo (JSONB)';

-- ============================================================================
-- PARTE 2: Agregar columnas a assets_maintenance
-- ============================================================================

ALTER TABLE assets_maintenance ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE assets_maintenance ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE assets_maintenance ADD COLUMN IF NOT EXISTS dynamic_specs JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_assets_maintenance_dynamic_specs ON assets_maintenance USING gin(dynamic_specs);

COMMENT ON COLUMN assets_maintenance.updated_by IS 'Usuario que realizó la última actualización';
COMMENT ON COLUMN assets_maintenance.department IS 'Departamento al que pertenece el activo';
COMMENT ON COLUMN assets_maintenance.dynamic_specs IS 'Especificaciones dinámicas según tipo de activo (JSONB)';

-- ============================================================================
-- PARTE 3: Actualizar trigger de assets_it para registrar cambios de specs
-- ============================================================================

-- Función para registrar cambios en assets_it
CREATE OR REPLACE FUNCTION track_asset_it_changes()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Intentar obtener el ID del usuario actual de varias formas
  -- 1. Desde auth.uid() (contexto de sesión normal)
  current_user_id := auth.uid();
  
  -- 2. Si no hay auth.uid(), usar updated_by si existe en el NEW record
  IF current_user_id IS NULL AND NEW.updated_by IS NOT NULL THEN
    current_user_id := NEW.updated_by;
  END IF;
  
  -- 3. Si aún es NULL, usar created_by del registro
  IF current_user_id IS NULL THEN
    current_user_id := NEW.created_by;
  END IF;
  
  -- 4. Como último recurso, buscar en current_setting si fue establecido
  IF current_user_id IS NULL THEN
    BEGIN
      current_user_id := current_setting('app.current_user_id', true)::uuid;
    EXCEPTION
      WHEN OTHERS THEN
        current_user_id := NULL;
    END;
  END IF;

  -- Registrar cambio de ubicación
  IF OLD.location_id IS DISTINCT FROM NEW.location_id THEN
    INSERT INTO asset_changes (
      asset_id, asset_tag, field_name, change_type,
      old_value, new_value, changed_by, changed_at
    ) VALUES (
      NEW.id, NEW.asset_code, 'location_id', 'UPDATE',
      COALESCE(OLD.location_id::text, 'Sin sede'),
      COALESCE(NEW.location_id::text, 'Sin sede'),
      current_user_id, NOW()
    );
  END IF;

  -- Registrar cambio de estado
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO asset_changes (
      asset_id, asset_tag, field_name, change_type,
      old_value, new_value, changed_by, changed_at
    ) VALUES (
      NEW.id, NEW.asset_code, 'status', 'UPDATE',
      OLD.status, NEW.status,
      current_user_id, NOW()
    );
  END IF;

  -- Registrar cambio de asignación
  IF OLD.assigned_to_user_id IS DISTINCT FROM NEW.assigned_to_user_id THEN
    INSERT INTO asset_changes (
      asset_id, asset_tag, field_name, change_type,
      old_value, new_value, changed_by, changed_at
    ) VALUES (
      NEW.id, NEW.asset_code, 'assigned_to', 'UPDATE',
      COALESCE(OLD.assigned_to_user_id::text, 'Sin asignar'),
      COALESCE(NEW.assigned_to_user_id::text, 'Sin asignar'),
      current_user_id, NOW()
    );
  END IF;

  -- Registrar cambio de departamento
  IF OLD.department IS DISTINCT FROM NEW.department THEN
    INSERT INTO asset_changes (
      asset_id, asset_tag, field_name, change_type,
      old_value, new_value, changed_by, changed_at
    ) VALUES (
      NEW.id, NEW.asset_code, 'department', 'UPDATE',
      COALESCE(OLD.department, 'Sin departamento'),
      COALESCE(NEW.department, 'Sin departamento'),
      current_user_id, NOW()
    );
  END IF;

  -- Registrar cambio de procesador
  IF OLD.processor IS DISTINCT FROM NEW.processor THEN
    INSERT INTO asset_changes (
      asset_id, asset_tag, field_name, change_type,
      old_value, new_value, changed_by, changed_at
    ) VALUES (
      NEW.id, NEW.asset_code, 'processor', 'UPDATE',
      COALESCE(OLD.processor, 'No especificado'),
      COALESCE(NEW.processor, 'No especificado'),
      current_user_id, NOW()
    );
  END IF;

  -- Registrar cambio de RAM
  IF OLD.ram_gb IS DISTINCT FROM NEW.ram_gb THEN
    INSERT INTO asset_changes (
      asset_id, asset_tag, field_name, change_type,
      old_value, new_value, changed_by, changed_at
    ) VALUES (
      NEW.id, NEW.asset_code, 'ram_gb', 'UPDATE',
      COALESCE(OLD.ram_gb::text || ' GB', 'No especificado'),
      COALESCE(NEW.ram_gb::text || ' GB', 'No especificado'),
      current_user_id, NOW()
    );
  END IF;

  -- Registrar cambio de almacenamiento
  IF OLD.storage_gb IS DISTINCT FROM NEW.storage_gb THEN
    INSERT INTO asset_changes (
      asset_id, asset_tag, field_name, change_type,
      old_value, new_value, changed_by, changed_at
    ) VALUES (
      NEW.id, NEW.asset_code, 'storage_gb', 'UPDATE',
      COALESCE(OLD.storage_gb::text || ' GB', 'No especificado'),
      COALESCE(NEW.storage_gb::text || ' GB', 'No especificado'),
      current_user_id, NOW()
    );
  END IF;

  -- Registrar cambio de OS
  IF OLD.os IS DISTINCT FROM NEW.os THEN
    INSERT INTO asset_changes (
      asset_id, asset_tag, field_name, change_type,
      old_value, new_value, changed_by, changed_at
    ) VALUES (
      NEW.id, NEW.asset_code, 'os', 'UPDATE',
      COALESCE(OLD.os, 'No especificado'),
      COALESCE(NEW.os, 'No especificado'),
      current_user_id, NOW()
    );
  END IF;

  -- Registrar cambio de imagen
  IF OLD.image_url IS DISTINCT FROM NEW.image_url THEN
    INSERT INTO asset_changes (
      asset_id, asset_tag, field_name, change_type,
      old_value, new_value, changed_by, changed_at
    ) VALUES (
      NEW.id, NEW.asset_code, 'image_url', 'UPDATE',
      CASE WHEN OLD.image_url IS NULL THEN 'Sin imagen' ELSE 'Con imagen' END,
      CASE WHEN NEW.image_url IS NULL THEN 'Imagen eliminada' ELSE 'Imagen actualizada' END,
      current_user_id, NOW()
    );
  END IF;

  -- Registrar cambio de especificaciones dinámicas
  IF OLD.dynamic_specs IS DISTINCT FROM NEW.dynamic_specs THEN
    INSERT INTO asset_changes (
      asset_id, asset_tag, field_name, change_type,
      old_value, new_value, changed_by, changed_at
    ) VALUES (
      NEW.id, NEW.asset_code, 'dynamic_specs', 'UPDATE',
      OLD.dynamic_specs::text,
      NEW.dynamic_specs::text,
      current_user_id, NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger
DROP TRIGGER IF EXISTS track_asset_it_changes_trigger ON assets_it;
CREATE TRIGGER track_asset_it_changes_trigger
  AFTER UPDATE ON assets_it
  FOR EACH ROW
  EXECUTE FUNCTION track_asset_it_changes();

-- ============================================================================
-- PARTE 4: Trigger similar para assets_maintenance
-- ============================================================================

CREATE OR REPLACE FUNCTION track_asset_maintenance_changes()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Intentar obtener el ID del usuario actual de varias formas
  -- 1. Desde auth.uid() (contexto de sesión normal)
  current_user_id := auth.uid();
  
  -- 2. Si no hay auth.uid(), usar updated_by si existe en el NEW record
  IF current_user_id IS NULL AND NEW.updated_by IS NOT NULL THEN
    current_user_id := NEW.updated_by;
  END IF;
  
  -- 3. Si aún es NULL, usar created_by del registro
  IF current_user_id IS NULL THEN
    current_user_id := NEW.created_by;
  END IF;
  
  -- 4. Como último recurso, buscar en current_setting si fue establecido
  IF current_user_id IS NULL THEN
    BEGIN
      current_user_id := current_setting('app.current_user_id', true)::uuid;
    EXCEPTION
      WHEN OTHERS THEN
        current_user_id := NULL;
    END;
  END IF;

  -- Registrar cambio de ubicación
  IF OLD.location_id IS DISTINCT FROM NEW.location_id THEN
    INSERT INTO asset_changes (
      asset_id, asset_tag, field_name, change_type,
      old_value, new_value, changed_by, changed_at
    ) VALUES (
      NEW.id, NEW.asset_code, 'location_id', 'UPDATE',
      COALESCE(OLD.location_id::text, 'Sin sede'),
      COALESCE(NEW.location_id::text, 'Sin sede'),
      current_user_id, NOW()
    );
  END IF;

  -- Registrar cambio de estado
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO asset_changes (
      asset_id, asset_tag, field_name, change_type,
      old_value, new_value, changed_by, changed_at
    ) VALUES (
      NEW.id, NEW.asset_code, 'status', 'UPDATE',
      OLD.status, NEW.status,
      current_user_id, NOW()
    );
  END IF;

  -- Registrar cambio de asignación
  IF OLD.assigned_to_user_id IS DISTINCT FROM NEW.assigned_to_user_id THEN
    INSERT INTO asset_changes (
      asset_id, asset_tag, field_name, change_type,
      old_value, new_value, changed_by, changed_at
    ) VALUES (
      NEW.id, NEW.asset_code, 'assigned_to', 'UPDATE',
      COALESCE(OLD.assigned_to_user_id::text, 'Sin asignar'),
      COALESCE(NEW.assigned_to_user_id::text, 'Sin asignar'),
      current_user_id, NOW()
    );
  END IF;

  -- Registrar cambio de departamento
  IF OLD.department IS DISTINCT FROM NEW.department THEN
    INSERT INTO asset_changes (
      asset_id, asset_tag, field_name, change_type,
      old_value, new_value, changed_by, changed_at
    ) VALUES (
      NEW.id, NEW.asset_code, 'department', 'UPDATE',
      COALESCE(OLD.department, 'Sin departamento'),
      COALESCE(NEW.department, 'Sin departamento'),
      current_user_id, NOW()
    );
  END IF;

  -- Registrar cambio de imagen
  IF OLD.image_url IS DISTINCT FROM NEW.image_url THEN
    INSERT INTO asset_changes (
      asset_id, asset_tag, field_name, change_type,
      old_value, new_value, changed_by, changed_at
    ) VALUES (
      NEW.id, NEW.asset_code, 'image_url', 'UPDATE',
      CASE WHEN OLD.image_url IS NULL THEN 'Sin imagen' ELSE 'Con imagen' END,
      CASE WHEN NEW.image_url IS NULL THEN 'Imagen eliminada' ELSE 'Imagen actualizada' END,
      current_user_id, NOW()
    );
  END IF;

  -- Registrar cambio de especificaciones dinámicas
  IF OLD.dynamic_specs IS DISTINCT FROM NEW.dynamic_specs THEN
    INSERT INTO asset_changes (
      asset_id, asset_tag, field_name, change_type,
      old_value, new_value, changed_by, changed_at
    ) VALUES (
      NEW.id, NEW.asset_code, 'dynamic_specs', 'UPDATE',
      OLD.dynamic_specs::text,
      NEW.dynamic_specs::text,
      current_user_id, NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS track_asset_maintenance_changes_trigger ON assets_maintenance;
CREATE TRIGGER track_asset_maintenance_changes_trigger
  AFTER UPDATE ON assets_maintenance
  FOR EACH ROW
  EXECUTE FUNCTION track_asset_maintenance_changes();

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

SELECT 'FIX COMPLETO APLICADO' as status;
SELECT 'Columnas agregadas a assets_it y assets_maintenance' as resultado;
SELECT 'Triggers de auditoría creados para ambas tablas' as resultado;

-- Verificar columnas agregadas
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name IN ('assets_it', 'assets_maintenance')
AND column_name IN ('department', 'updated_by', 'processor', 'ram_gb', 'storage_gb', 'os', 'dynamic_specs')
ORDER BY table_name, column_name;
