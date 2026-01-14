-- Fix: Corregir policies de INSERT en assets para evitar error "missing FROM-clause entry for table new"
-- El problema está en la referencia ambigua a location_id sin especificar la tabla

-- DROP las policies problemáticas
DROP POLICY IF EXISTS "Admin can insert assets" ON assets;
DROP POLICY IF EXISTS "Supervisors can insert assets in their locations" ON assets;
DROP POLICY IF EXISTS "Admins and supervisors can insert assets" ON assets;

-- Recrear policy de INSERT para Admin (limpia y sin ambigüedades)
CREATE POLICY "Admin can insert assets"
  ON assets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Recrear policy de INSERT para Supervisores (con referencias explícitas a assets.location_id)
CREATE POLICY "Supervisors can insert assets in their locations"
  ON assets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'supervisor'
    )
    AND (
      -- Referencia explícita: assets.location_id hace referencia al NEW record
      assets.location_id IN (
        SELECT ul.location_id 
        FROM user_locations ul
        WHERE ul.user_id = auth.uid()
      )
      OR
      assets.location_id = (
        SELECT p.location_id 
        FROM profiles p
        WHERE p.id = auth.uid()
      )
    )
  );

-- Policy para técnicos L1/L2 (pueden crear activos en sus sedes)
CREATE POLICY "Technicians can insert assets in their locations"
  ON assets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('agent_l1', 'agent_l2')
    )
    AND (
      assets.location_id IN (
        SELECT ul.location_id 
        FROM user_locations ul
        WHERE ul.user_id = auth.uid()
      )
      OR
      assets.location_id = (
        SELECT p.location_id 
        FROM profiles p
        WHERE p.id = auth.uid()
      )
    )
  );
