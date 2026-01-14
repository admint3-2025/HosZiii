-- Fix: Corregir policies de INSERT en assets para evitar error "missing FROM-clause entry for table new"
-- Solución: usar CTEs y funciones auxiliares para evitar ambigüedad en referencias a columnas

-- DROP las policies problemáticas
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
    -- Usuario debe ser supervisor
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'supervisor'
    )
    AND
    -- Y el activo debe estar en una sede del supervisor
    (
      -- Opción 1: sede asignada en user_locations
      location_id IN (
        SELECT location_id FROM user_locations WHERE user_id = auth.uid()
      )
      OR
      -- Opción 2: sede en perfil del usuario
      location_id = (SELECT location_id FROM profiles WHERE id = auth.uid())
    )
  );

-- Policy de INSERT para Técnicos L1/L2 (solo en sus sedes asignadas)
CREATE POLICY "Technicians can insert assets in their locations"
  ON assets FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Usuario debe ser técnico
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('agent_l1', 'agent_l2')
    )
    AND
    -- Y el activo debe estar en una sede del técnico
    (
      location_id IN (
        SELECT location_id FROM user_locations WHERE user_id = auth.uid()
      )
      OR
      location_id = (SELECT location_id FROM profiles WHERE id = auth.uid())
    )
  );
