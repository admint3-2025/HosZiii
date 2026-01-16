-- ============================================================================
-- CORRECCIÓN COMPLETA RLS: ELIMINAR TODAS LAS POLÍTICAS CONFLICTIVAS
-- ============================================================================
-- Problema identificado: Las políticas FOR ALL permiten acceso implícito a SELECT
-- Este script elimina TODAS las políticas y recrea solo las necesarias
-- ============================================================================

-- ============================================================================
-- PASO 1: ELIMINAR TODAS LAS POLÍTICAS EN ASSETS
-- ============================================================================

DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'assets') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON assets', r.policyname);
    END LOOP;
END $$;

-- ============================================================================
-- PASO 2: RECREAR POLÍTICAS DE ASSETS - SEPARADAS POR OPERACIÓN
-- ============================================================================

-- 2.1. SELECT: Admin ve todos los activos
CREATE POLICY "Admin can view all assets"
  ON assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

-- 2.2. SELECT: Supervisores y técnicos ven solo activos de sus sedes
CREATE POLICY "Supervisors and technicians see assets from their locations"
  ON assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('supervisor', 'agent_l1', 'agent_l2')
    )
    AND (
      location_id IN (
        SELECT location_id 
        FROM user_locations 
        WHERE user_id = auth.uid()
      )
      OR
      location_id = (
        SELECT location_id 
        FROM profiles 
        WHERE id = auth.uid()
      )
      OR
      location_id IS NULL
    )
  );

-- 2.3. SELECT: Requesters solo ven activos asignados a ellos
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

-- 2.4. SELECT: Auditors ven todos los activos
CREATE POLICY "Auditors can view all assets"
  ON assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'auditor'
    )
  );

-- 2.5. INSERT: Admin puede insertar activos
CREATE POLICY "Admin can insert assets"
  ON assets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

-- 2.6. INSERT: Supervisores pueden insertar activos en sus sedes
CREATE POLICY "Supervisors can insert assets in their locations"
  ON assets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'supervisor'
    )
    AND (
      location_id IN (
        SELECT location_id 
        FROM user_locations 
        WHERE user_id = auth.uid()
      )
      OR
      location_id = (
        SELECT location_id 
        FROM profiles 
        WHERE id = auth.uid()
      )
    )
  );

-- 2.7. UPDATE: Admin puede actualizar todos los activos
CREATE POLICY "Admin can update assets"
  ON assets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

-- 2.8. UPDATE: Supervisores pueden actualizar activos de sus sedes
CREATE POLICY "Supervisors can update assets in their locations"
  ON assets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'supervisor'
    )
    AND (
      location_id IN (
        SELECT location_id 
        FROM user_locations 
        WHERE user_id = auth.uid()
      )
      OR
      location_id = (
        SELECT location_id 
        FROM profiles 
        WHERE id = auth.uid()
      )
    )
  );

-- 2.9. DELETE: Solo admin puede soft-delete activos
CREATE POLICY "Admin can delete assets"
  ON assets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

-- ============================================================================
-- PASO 3: ELIMINAR TODAS LAS POLÍTICAS EN LOCATIONS
-- ============================================================================

DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'locations') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON locations', r.policyname);
    END LOOP;
END $$;

-- ============================================================================
-- PASO 4: RECREAR POLÍTICAS DE LOCATIONS
-- ============================================================================

-- Asegurar que RLS está habilitado
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- 4.1. SELECT: Admin ve todas las ubicaciones
CREATE POLICY "Admin can view all locations"
  ON locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

-- 4.2. SELECT: Supervisores, técnicos y requesters ven solo sus sedes
CREATE POLICY "Supervisors and technicians see their assigned locations"
  ON locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('supervisor', 'agent_l1', 'agent_l2', 'requester')
    )
    AND (
      id IN (
        SELECT location_id 
        FROM user_locations 
        WHERE user_id = auth.uid()
      )
      OR
      id = (
        SELECT location_id 
        FROM profiles 
        WHERE id = auth.uid()
      )
    )
  );

-- 4.3. SELECT: Auditors ven todas las ubicaciones
CREATE POLICY "Auditors can view all locations"
  ON locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'auditor'
    )
  );

-- 4.4. INSERT/UPDATE: Solo admin puede modificar ubicaciones
CREATE POLICY "Admin can manage locations"
  ON locations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

-- Ver todas las políticas en assets
SELECT 
  'ASSETS' as tabla,
  policyname, 
  cmd,
  permissive
FROM pg_policies 
WHERE tablename = 'assets'
ORDER BY cmd, policyname;

-- Ver todas las políticas en locations
SELECT 
  'LOCATIONS' as tabla,
  policyname, 
  cmd,
  permissive
FROM pg_policies 
WHERE tablename = 'locations'
ORDER BY cmd, policyname;

-- ============================================================================
-- RESULTADO ESPERADO
-- ============================================================================
-- ASSETS debe tener 9 políticas:
--   4 SELECT (Admin, Supervisors/technicians, Requesters, Auditors)
--   2 INSERT (Admin, Supervisors)
--   2 UPDATE (Admin, Supervisors)
--   1 UPDATE para DELETE (Admin)
--
-- LOCATIONS debe tener 4 políticas:
--   3 SELECT (Admin, Supervisors/technicians/requesters, Auditors)
--   1 ALL (Admin manage)
-- ============================================================================
