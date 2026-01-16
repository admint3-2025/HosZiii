-- ============================================================================
-- RLS DE ACTIVOS: RESTRICCIÓN POR UBICACIÓN/SEDE
-- ============================================================================
-- Objetivo: Asegurar que supervisores y técnicos solo vean activos de sus
--           ubicaciones asignadas, mientras que admin ve todo y requesters
--           solo ven los activos que les están asignados.
-- ============================================================================

-- 1. Eliminar todas las políticas existentes de SELECT en assets
DROP POLICY IF EXISTS "Anyone can view active assets" ON assets;
DROP POLICY IF EXISTS "Admin puede ver todos los activos" ON assets;
DROP POLICY IF EXISTS "Tecnicos ven activos de sus sedes" ON assets;
DROP POLICY IF EXISTS "Requesters see only own assets" ON assets;

-- 2. Política para ADMIN: ve todos los activos
CREATE POLICY "Admin can view all assets"
  ON assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

-- 3. Política para SUPERVISORES y TÉCNICOS: solo ven activos de sus sedes asignadas
CREATE POLICY "Supervisors and technicians see assets from their locations"
  ON assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('supervisor', 'agent_l1', 'agent_l2')
    )
    AND (
      -- El activo debe estar en una sede que el usuario tiene asignada
      location_id IN (
        SELECT location_id 
        FROM user_locations 
        WHERE user_id = auth.uid()
      )
      OR
      -- Si el usuario tiene sede primaria en profiles, también la incluye
      location_id = (
        SELECT location_id 
        FROM profiles 
        WHERE id = auth.uid()
      )
      OR
      -- Activos sin sede asignada (edge case - debería ser raro)
      location_id IS NULL
    )
  );

-- 4. Política para REQUESTERS: solo ven activos asignados a ellos
CREATE POLICY "Requesters see only own assigned assets"
  ON assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'requester'
    )
    AND assigned_to = auth.uid()
  );

-- 5. Política para AUDITOR: ve todos los activos (solo lectura)
CREATE POLICY "Auditors can view all assets"
  ON assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'auditor'
    )
  );

-- 6. Verificar políticas actuales
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd,
  roles,
  qual
FROM pg_policies 
WHERE tablename = 'assets'
  AND cmd = 'SELECT'
ORDER BY policyname;

-- Resultado esperado: 4 políticas de SELECT:
-- 1. Admin can view all assets
-- 2. Supervisors and technicians see assets from their locations
-- 3. Requesters see only own assigned assets
-- 4. Auditors can view all assets
