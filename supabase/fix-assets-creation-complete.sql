-- ============================================================================
-- FIX COMPLETO: Resolver error "missing FROM-clause entry for table 'new'"
-- al crear activos en producción
-- ============================================================================
-- Ejecutar COMPLETO en Supabase SQL Editor
-- ============================================================================

-- PARTE 1: Arreglar generate_asset_code() (NO puede usar NEW; debe ser parametrizada)
-- El problema: NEW.location_id dentro de un SELECT causa error
-- ============================================================================

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
  
  -- Obtener código de ubicación en variable separada (evita error)
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

-- Recrear trigger (por si acaso)
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


-- PARTE 2: Arreglar policies de INSERT en assets
-- El problema: referencias ambiguas a location_id
-- ============================================================================

-- Limpiar policies problemáticas
DROP POLICY IF EXISTS "Admin can insert assets" ON assets;
DROP POLICY IF EXISTS "Supervisors can insert assets in their locations" ON assets;
DROP POLICY IF EXISTS "Admins and supervisors can insert assets" ON assets;
DROP POLICY IF EXISTS "Technicians can insert assets in their locations" ON assets;

-- Policy de INSERT para Admin (sin restricciones de sede)
CREATE POLICY "Admin can insert assets"
  ON assets FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

-- Policy de INSERT para Supervisores (solo en sus sedes asignadas)
CREATE POLICY "Supervisors can insert assets in their locations"
  ON assets FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'supervisor'
    )
    AND
    (
      location_id IN (
        SELECT location_id FROM user_locations WHERE user_id = auth.uid()
      )
      OR
      location_id = (SELECT location_id FROM profiles WHERE id = auth.uid())
    )
  );

-- Policy de INSERT para Técnicos L1/L2 (solo en sus sedes asignadas)
CREATE POLICY "Technicians can insert assets in their locations"
  ON assets FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('agent_l1', 'agent_l2')
    )
    AND
    (
      location_id IN (
        SELECT location_id FROM user_locations WHERE user_id = auth.uid()
      )
      OR
      location_id = (SELECT location_id FROM profiles WHERE id = auth.uid())
    )
  );

-- ============================================================================
-- FIN DEL FIX
-- ============================================================================
-- Después de ejecutar esto, intenta crear un activo nuevamente
-- ============================================================================
