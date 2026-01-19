-- ============================================================================
-- LIMPIEZA COMPLETA: Eliminar TODAS las políticas SELECT antiguas y crear nuevas
-- ============================================================================

-- ============================================================================
-- TABLA: assets (Activos de IT)
-- ============================================================================

-- Eliminar TODAS las políticas SELECT existentes de assets
DROP POLICY IF EXISTS "assets_select" ON assets;
DROP POLICY IF EXISTS "Admin can view all assets" ON assets;
DROP POLICY IF EXISTS "Auditors can view all assets" ON assets;
DROP POLICY IF EXISTS "Requesters see only own assigned assets" ON assets;
DROP POLICY IF EXISTS "Supervisors get/loan activos de sus sedes" ON assets;
DROP POLICY IF EXISTS "Supervisors and technicians see assets from their locations" ON assets;
DROP POLICY IF EXISTS "Users can view IT assets from their locations" ON assets;
DROP POLICY IF EXISTS "Users view assets by role and category" ON assets;

-- Crear UNA SOLA política SELECT para assets con lógica completa
CREATE POLICY "assets_unified_select" ON assets FOR SELECT
USING (
  -- 1. ADMIN ve TODO sin restricciones
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
  OR
  -- 2. SUPERVISOR ve activos de sus sedes asignadas
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'supervisor'
    AND (
      -- Sede principal del perfil
      assets.location_id = profiles.location_id
      OR
      -- Sedes adicionales en user_locations
      assets.location_id IN (
        SELECT location_id FROM user_locations 
        WHERE user_id = auth.uid()
      )
    )
  )
  OR
  -- 3. REQUESTER ve solo activos asignados a él
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'requester'
    AND assets.assigned_to = auth.uid()
  )
  OR
  -- 4. AGENTES (agent_l1, agent_l2) ven activos de sus sedes
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('agent_l1', 'agent_l2')
    AND (
      -- Sede principal del perfil
      assets.location_id = profiles.location_id
      OR
      -- Sedes adicionales en user_locations
      assets.location_id IN (
        SELECT location_id FROM user_locations 
        WHERE user_id = auth.uid()
      )
    )
  )
);

-- ============================================================================
-- TABLA: assets_maintenance (Activos de Mantenimiento)
-- ============================================================================

-- Eliminar TODAS las políticas SELECT existentes de assets_maintenance
DROP POLICY IF EXISTS "assets_maintenance_select" ON assets_maintenance;
DROP POLICY IF EXISTS "Maintenance supervisors can insert assets" ON assets_maintenance;
DROP POLICY IF EXISTS "Users can view assets from their locations" ON assets_maintenance;

-- Crear UNA SOLA política SELECT para assets_maintenance con lógica completa
CREATE POLICY "assets_maintenance_unified_select" ON assets_maintenance FOR SELECT
USING (
  -- 1. ADMIN ve TODO sin restricciones
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
  OR
  -- 2. SUPERVISOR ve activos de sus sedes asignadas
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'supervisor'
    AND (
      -- Sede principal del perfil
      assets_maintenance.location_id = profiles.location_id
      OR
      -- Sedes adicionales en user_locations
      assets_maintenance.location_id IN (
        SELECT location_id FROM user_locations 
        WHERE user_id = auth.uid()
      )
    )
  )
  OR
  -- 3. REQUESTER ve activos de su sede
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'requester'
    AND assets_maintenance.location_id = profiles.location_id
  )
  OR
  -- 4. AGENTES (agent_l1, agent_l2) ven activos de sus sedes
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('agent_l1', 'agent_l2')
    AND (
      -- Sede principal del perfil
      assets_maintenance.location_id = profiles.location_id
      OR
      -- Sedes adicionales en user_locations
      assets_maintenance.location_id IN (
        SELECT location_id FROM user_locations 
        WHERE user_id = auth.uid()
      )
    )
  )
);

-- ============================================================================
-- Verificación
-- ============================================================================

-- Ver las políticas resultantes
SELECT 
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename IN ('assets', 'assets_maintenance')
  AND cmd = 'SELECT'
ORDER BY tablename, policyname;

-- Comentario: Ahora deberías ver solo 2 políticas SELECT:
-- - assets_unified_select en tabla assets
-- - assets_maintenance_unified_select en tabla assets_maintenance
