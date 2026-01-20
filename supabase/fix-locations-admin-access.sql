-- Agregar política RLS para que admins puedan consultar locations
DROP POLICY IF EXISTS "Admins can view all locations" ON locations;

CREATE POLICY "Admins can view all locations"
  ON locations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text IN ('admin','director'))
    OR id IN (SELECT location_id FROM user_locations WHERE user_id = auth.uid())
  );
