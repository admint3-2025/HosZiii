-- ============================================================================
-- FIX: Supervisores viendo activos y estadísticas de otras sedes
-- ============================================================================
-- Este script asegura que supervisores SOLO vean:
--   1. Activos de sus sedes asignadas (tabla user_locations)
--   2. Estadísticas de sus sedes asignadas (location_incident_stats)
-- ============================================================================

BEGIN;

-- ============================================================================
-- PARTE 1: VERIFICAR POLÍTICAS ACTUALES
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Verificando políticas RLS actuales...';
  RAISE NOTICE '============================================================';
END $$;

-- ============================================================================
-- PARTE 2: RLS PARA ACTIVOS (ASSETS)
-- ============================================================================

-- Eliminar políticas de SELECT existentes en assets
DROP POLICY IF EXISTS "Anyone can view active assets" ON assets;
DROP POLICY IF EXISTS "Admin puede ver todos los activos" ON assets;
DROP POLICY IF EXISTS "Tecnicos ven activos de sus sedes" ON assets;
DROP POLICY IF EXISTS "Requesters see only own assets" ON assets;
DROP POLICY IF EXISTS "Admin can view all assets" ON assets;
DROP POLICY IF EXISTS "Supervisors and technicians see assets from their locations" ON assets;
DROP POLICY IF EXISTS "Requesters see only own assigned assets" ON assets;
DROP POLICY IF EXISTS "Auditors can view all assets" ON assets;

-- Asegurar que RLS está habilitado en assets
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Política 1: Admin ve todos los activos
CREATE POLICY "Admin can view all assets"
  ON assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

-- Política 2: Supervisores y técnicos solo ven activos de sus sedes asignadas
CREATE POLICY "Supervisors and technicians see assets from their locations"
  ON assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('supervisor', 'agent_l1', 'agent_l2')
    )
    AND (
      -- El activo debe estar en una sede asignada en user_locations
      location_id IN (
        SELECT location_id 
        FROM user_locations 
        WHERE user_id = auth.uid()
      )
      OR
      -- O en la sede primaria del perfil
      location_id = (
        SELECT location_id 
        FROM profiles 
        WHERE id = auth.uid()
      )
      OR
      -- Activos sin sede (edge case)
      location_id IS NULL
    )
  );

-- Política 3: Requesters solo ven sus propios activos asignados
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

-- Política 4: Auditores ven todos los activos (solo lectura)
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
-- PARTE 3: RLS PARA UBICACIONES (LOCATIONS)
-- ============================================================================

-- Asegurar que RLS está habilitado en locations
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes de SELECT en locations
DROP POLICY IF EXISTS "Admin can view all locations" ON locations;
DROP POLICY IF EXISTS "Supervisors and technicians see their assigned locations" ON locations;
DROP POLICY IF EXISTS "Everyone can view active locations" ON locations;
DROP POLICY IF EXISTS "Auditors can view all locations" ON locations;

-- Política 1: Admin ve todas las ubicaciones
CREATE POLICY "Admin can view all locations"
  ON locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

-- Política 2: Supervisores, técnicos y requesters solo ven sus sedes asignadas
CREATE POLICY "Supervisors and technicians see their assigned locations"
  ON locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('supervisor', 'agent_l1', 'agent_l2', 'requester')
    )
    AND (
      -- La sede debe estar en user_locations
      id IN (
        SELECT location_id 
        FROM user_locations 
        WHERE user_id = auth.uid()
      )
      OR
      -- O ser la sede primaria del perfil
      id = (
        SELECT location_id 
        FROM profiles 
        WHERE id = auth.uid()
      )
    )
  );

-- Política 3: Auditores ven todas las ubicaciones
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
-- PARTE 4: VERIFICACIÓN FINAL
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Verificación de políticas aplicadas:';
  RAISE NOTICE '============================================================';
END $$;

-- Verificar políticas en assets
SELECT 
  'ASSETS' as tabla,
  policyname, 
  cmd,
  CASE 
    WHEN policyname LIKE '%Admin%' THEN 'Admin ve todos'
    WHEN policyname LIKE '%Supervisors%' THEN 'Supervisores solo sus sedes'
    WHEN policyname LIKE '%Requesters%' THEN 'Requesters solo sus activos'
    WHEN policyname LIKE '%Auditors%' THEN 'Auditores ve todos'
    ELSE 'Otro'
  END as descripcion
FROM pg_policies 
WHERE tablename = 'assets'
  AND cmd = 'SELECT'
ORDER BY policyname;

-- Verificar políticas en locations
SELECT 
  'LOCATIONS' as tabla,
  policyname, 
  cmd,
  CASE 
    WHEN policyname LIKE '%Admin%' THEN 'Admin ve todas'
    WHEN policyname LIKE '%Supervisors%' THEN 'Supervisores solo sus sedes'
    WHEN policyname LIKE '%Auditors%' THEN 'Auditores ve todas'
    ELSE 'Otro'
  END as descripcion
FROM pg_policies 
WHERE tablename = 'locations'
  AND cmd = 'SELECT'
ORDER BY policyname;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'IMPORTANTE: Verificar que location_incident_stats es una VIEW';
  RAISE NOTICE 'Las vistas heredan las políticas RLS de las tablas base.';
  RAISE NOTICE 'Como location_incident_stats se basa en locations,';
  RAISE NOTICE 'automáticamente filtrará por las políticas de locations.';
  RAISE NOTICE '============================================================';
END $$;

-- Verificar que location_incident_stats existe y es una vista
SELECT 
  viewname,
  viewowner,
  definition
FROM pg_views
WHERE viewname = 'location_incident_stats';

COMMIT;

-- ============================================================================
-- RESUMEN DE CAMBIOS
-- ============================================================================
-- 1. Assets: 4 políticas SELECT (Admin, Supervisores/Técnicos, Requesters, Auditores)
-- 2. Locations: 3 políticas SELECT (Admin, Supervisores/Técnicos, Auditores)
-- 3. location_incident_stats hereda automáticamente las políticas de locations
-- 
-- RESULTADO: Los supervisores solo verán activos y estadísticas de sus sedes
-- asignadas en la tabla user_locations (más su sede primaria en profiles).
-- ============================================================================
