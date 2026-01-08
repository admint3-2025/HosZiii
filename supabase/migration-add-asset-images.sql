-- Migration: Agregar soporte de imágenes para activos
-- Fecha: 2026-01-08
-- Descripción: Permite subir fotos de los activos para documentación visual

-- 1. Agregar columna de imagen a la tabla assets
ALTER TABLE assets
ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN assets.image_url IS 'URL de la imagen del activo almacenada en Supabase Storage';

-- 2. Crear bucket para imágenes de activos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'asset-images',
  'asset-images',
  true,
  5242880, -- 5MB límite
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 3. Políticas de Storage para asset-images

-- Política: Cualquiera puede ver imágenes (bucket público)
DROP POLICY IF EXISTS "asset_images_public_read" ON storage.objects;
CREATE POLICY "asset_images_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'asset-images');

-- Política: Usuarios autenticados con permiso pueden subir imágenes
DROP POLICY IF EXISTS "asset_images_insert" ON storage.objects;
CREATE POLICY "asset_images_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'asset-images'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.role = 'admin'
      OR profiles.role = 'supervisor'
      OR profiles.can_manage_assets = true
    )
  )
);

-- Política: Usuarios autenticados con permiso pueden actualizar imágenes
DROP POLICY IF EXISTS "asset_images_update" ON storage.objects;
CREATE POLICY "asset_images_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'asset-images'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.role = 'admin'
      OR profiles.role = 'supervisor'
      OR profiles.can_manage_assets = true
    )
  )
);

-- Política: Usuarios autenticados con permiso pueden eliminar imágenes
DROP POLICY IF EXISTS "asset_images_delete" ON storage.objects;
CREATE POLICY "asset_images_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'asset-images'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.role = 'admin'
      OR profiles.role = 'supervisor'
      OR profiles.can_manage_assets = true
    )
  )
);

-- 4. Índice para búsqueda por imagen
CREATE INDEX IF NOT EXISTS idx_assets_image ON assets(image_url) WHERE image_url IS NOT NULL;

-- 5. Actualizar función RPC para incluir image_url con auditoría
-- Eliminar todas las versiones posibles de la función (por cada firma conocida)

-- Versión sin defaults (19 parámetros)
DROP FUNCTION IF EXISTS public.update_asset_with_location_reason(uuid, text, text, text, text, text, text, text, date, date, text, uuid, text, uuid, text, integer, integer, text, text);

-- Versión con algunos defaults (puede tener menos parámetros requeridos)
DROP FUNCTION IF EXISTS public.update_asset_with_location_reason(uuid, text, text, text, text, text, text, text, date, date, text, uuid, text, uuid);

-- Versión completa con todos los parámetros nombrados
DROP FUNCTION IF EXISTS public.update_asset_with_location_reason(
  p_asset_id uuid,
  p_asset_tag text,
  p_asset_type text,
  p_status text,
  p_serial_number text,
  p_model text,
  p_brand text,
  p_department text,
  p_purchase_date date,
  p_warranty_end_date date,
  p_location text,
  p_location_id uuid,
  p_notes text,
  p_assigned_to uuid,
  p_processor text,
  p_ram_gb integer,
  p_storage_gb integer,
  p_os text,
  p_location_change_reason text
);

-- Crear (o reemplazar) versión con p_image_url
CREATE OR REPLACE FUNCTION public.update_asset_with_location_reason(
  p_asset_id uuid,
  p_asset_tag text,
  p_asset_type text,
  p_status text,
  p_serial_number text,
  p_model text,
  p_brand text,
  p_department text,
  p_purchase_date date,
  p_warranty_end_date date,
  p_location text,
  p_location_id uuid,
  p_notes text,
  p_assigned_to uuid,
  p_processor text DEFAULT NULL,
  p_ram_gb integer DEFAULT NULL,
  p_storage_gb integer DEFAULT NULL,
  p_os text DEFAULT NULL,
  p_image_url text DEFAULT NULL,
  p_location_change_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY definer
AS $$
DECLARE
  v_old_location_id uuid;
  v_old_assigned_to uuid;
  v_old_status text;
  v_old_image_url text;
BEGIN
  -- Obtener valores anteriores para comparar
  SELECT location_id, assigned_to, status, image_url
  INTO v_old_location_id, v_old_assigned_to, v_old_status, v_old_image_url
  FROM assets
  WHERE id = p_asset_id;

  -- Si se proporciona una razón, establecerla en el contexto
  IF p_location_change_reason IS NOT NULL AND p_location_change_reason <> '' THEN
    PERFORM set_config('app.location_change_reason', p_location_change_reason, false);
  END IF;
  
  -- Actualizar el activo (triggers registrarán cambios automáticamente)
  UPDATE assets SET
    asset_tag = p_asset_tag,
    asset_type = p_asset_type::asset_type,
    status = p_status::asset_status,
    serial_number = p_serial_number,
    model = p_model,
    brand = p_brand,
    department = p_department,
    purchase_date = p_purchase_date,
    warranty_end_date = p_warranty_end_date,
    location = p_location,
    location_id = p_location_id,
    assigned_to = p_assigned_to,
    notes = p_notes,
    processor = p_processor,
    ram_gb = p_ram_gb,
    storage_gb = p_storage_gb,
    os = p_os,
    image_url = p_image_url,
    updated_at = now()
  WHERE id = p_asset_id;
  
  -- Registrar en auditoría general
  INSERT INTO audit_log (
    entity_type,
    entity_id,
    action,
    actor_id,
    metadata
  )
  VALUES (
    'asset',
    p_asset_id,
    'UPDATE',
    auth.uid(),
    jsonb_build_object(
      'asset_tag', p_asset_tag,
      'asset_type', p_asset_type,
      'model', p_model,
      'brand', p_brand,
      'changes', jsonb_strip_nulls(jsonb_build_object(
        'status', CASE WHEN v_old_status <> p_status THEN jsonb_build_object('from', v_old_status, 'to', p_status) ELSE NULL END,
        'location', CASE WHEN v_old_location_id <> p_location_id THEN jsonb_build_object(
          'from', (SELECT code FROM locations WHERE id = v_old_location_id),
          'to', (SELECT code FROM locations WHERE id = p_location_id)
        ) ELSE NULL END,
        'assigned_to', CASE WHEN v_old_assigned_to IS DISTINCT FROM p_assigned_to THEN jsonb_build_object(
          'from', (SELECT full_name FROM profiles WHERE id = v_old_assigned_to),
          'to', (SELECT full_name FROM profiles WHERE id = p_assigned_to)
        ) ELSE NULL END,
        'image_url', CASE WHEN v_old_image_url IS DISTINCT FROM p_image_url THEN jsonb_build_object(
          'from', COALESCE(v_old_image_url, 'Sin imagen'),
          'to', COALESCE(p_image_url, 'Imagen eliminada')
        ) ELSE NULL END
      ))
    )
  );
  
  -- Limpiar el contexto
  PERFORM set_config('app.location_change_reason', NULL, false);
END;
$$;

COMMENT ON FUNCTION public.update_asset_with_location_reason(
  uuid,               -- p_asset_id
  text,               -- p_asset_tag
  text,               -- p_asset_type
  text,               -- p_status
  text,               -- p_serial_number
  text,               -- p_model
  text,               -- p_brand
  text,               -- p_department
  date,               -- p_purchase_date
  date,               -- p_warranty_end_date
  text,               -- p_location
  uuid,               -- p_location_id
  text,               -- p_notes
  uuid,               -- p_assigned_to
  text,               -- p_processor
  integer,            -- p_ram_gb
  integer,            -- p_storage_gb
  text,               -- p_os
  text,               -- p_image_url
  text                -- p_location_change_reason
) IS 'Actualiza un activo con auditoría completa incluyendo imagen';

-- 6. Eliminar trigger viejo de auditoría de imagen (si existe) - usaba schema incorrecto
DROP TRIGGER IF EXISTS trigger_audit_asset_image ON assets;
DROP FUNCTION IF EXISTS audit_asset_image_change();

-- 7. Actualizar track_asset_changes para incluir image_url
CREATE OR REPLACE FUNCTION track_asset_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_name text;
  v_user_email text;
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

    -- Imagen del activo
    IF OLD.image_url IS DISTINCT FROM NEW.image_url THEN
      INSERT INTO asset_changes (
        asset_id, asset_tag, changed_by, changed_by_name, changed_by_email,
        field_name, old_value, new_value, change_type
      ) VALUES (
        NEW.id, NEW.asset_tag, auth.uid(), v_user_name, v_user_email,
        'image_url',
        COALESCE(OLD.image_url, 'Sin imagen'),
        COALESCE(NEW.image_url, 'Imagen eliminada'),
        'UPDATE'
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
