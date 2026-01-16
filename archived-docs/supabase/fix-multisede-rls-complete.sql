-- ============================================================================
-- RESTRICCIÓN COMPLETA POR SEDE: ACTIVOS Y ESTADÍSTICAS
-- ============================================================================
-- Objetivo: Asegurar que supervisores y técnicos SOLO vean:
--           1. Activos de sus ubicaciones asignadas
--           2. Estadísticas (location_incident_stats) de sus ubicaciones asignadas
--
-- Este script consolida fix-assets-rls-by-location.sql y fix-location-stats-rls.sql
-- ============================================================================

-- ============================================================================
-- PARTE 1: RLS PARA ACTIVOS (ASSETS)
-- ============================================================================

-- 1.1. Eliminar todas las políticas existentes de SELECT en assets
DROP POLICY IF EXISTS "Anyone can view active assets" ON assets;
DROP POLICY IF EXISTS "Admin puede ver todos los activos" ON assets;
DROP POLICY IF EXISTS "Tecnicos ven activos de sus sedes" ON assets;
DROP POLICY IF EXISTS "Requesters see only own assets" ON assets;
DROP POLICY IF EXISTS "Admin can view all assets" ON assets;
DROP POLICY IF EXISTS "Supervisors and technicians see assets from their locations" ON assets;
DROP POLICY IF EXISTS "Requesters see only own assigned assets" ON assets;
DROP POLICY IF EXISTS "Auditors can view all assets" ON assets;

-- 1.2. Política para ADMIN: ve todos los activos
CREATE POLICY "Admin can view all assets"
  ON assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

-- 1.3. Política para SUPERVISORES y TÉCNICOS: solo ven activos de sus sedes asignadas
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

-- 1.4. Política para REQUESTERS: solo ven activos asignados a ellos
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

-- 1.5. Política para AUDITOR: ve todos los activos (solo lectura)
CREATE POLICY "Auditors can view all assets"
  ON assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'auditor'
    )
  );

-- ============================================================================
-- PARTE 2: RLS PARA UBICACIONES (LOCATIONS) - AFECTA location_incident_stats
-- ============================================================================

-- 2.1. Asegurar que locations tiene RLS habilitado
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- 2.2. Eliminar políticas existentes de SELECT en locations (si existen)
DROP POLICY IF EXISTS "Admin can view all locations" ON locations;
DROP POLICY IF EXISTS "Supervisors and technicians see their assigned locations" ON locations;
DROP POLICY IF EXISTS "Everyone can view active locations" ON locations;
DROP POLICY IF EXISTS "Auditors can view all locations" ON locations;

-- 2.3. Política para ADMIN: ve todas las ubicaciones
CREATE POLICY "Admin can view all locations"
  ON locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

-- 2.4. Política para SUPERVISORES, TÉCNICOS y REQUESTERS: solo ven sus sedes asignadas
CREATE POLICY "Supervisors and technicians see their assigned locations"
  ON locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('supervisor', 'agent_l1', 'agent_l2', 'requester')
    )
    AND (
      -- La sede debe estar en las ubicaciones asignadas al usuario
      id IN (
        SELECT location_id 
        FROM user_locations 
        WHERE user_id = auth.uid()
      )
      OR
      -- Si el usuario tiene sede primaria en profiles, también la incluye
      id = (
        SELECT location_id 
        FROM profiles 
        WHERE id = auth.uid()
      )
    )
  );

-- 2.5. Política para AUDITOR: ve todas las ubicaciones (solo lectura)
CREATE POLICY "Auditors can view all locations"
  ON locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'auditor'
    )
  );

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

-- Verificar políticas en assets
SELECT 
  'ASSETS' as tabla,
  policyname, 
  cmd
FROM pg_policies 
WHERE tablename = 'assets'
  AND cmd = 'SELECT'
ORDER BY policyname;

-- Verificar políticas en locations
SELECT 
  'LOCATIONS' as tabla,
  policyname, 
  cmd
FROM pg_policies 
WHERE tablename = 'locations'
  AND cmd = 'SELECT'
ORDER BY policyname;

-- Resultado esperado:
-- ASSETS: 4 políticas SELECT (Admin, Supervisors and technicians, Requesters, Auditors)
-- LOCATIONS: 3 políticas SELECT (Admin, Supervisors and technicians, Auditors)

-- ============================================================================
-- NOTA IMPORTANTE
-- ============================================================================
-- Como location_incident_stats es una vista que hace LEFT JOIN de locations con tickets,
-- cuando un supervisor consulta esta vista, PostgreSQL automáticamente filtrará
-- las filas según las políticas RLS de locations.
--
-- Esto significa que un supervisor de EMTY solo verá estadísticas de EMTY
-- (y cualquier otra sede que tenga asignada en user_locations).
-- ============================================================================
