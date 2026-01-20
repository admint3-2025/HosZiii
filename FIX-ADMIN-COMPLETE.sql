-- ============================================
-- FIX COMPLETO: Admin ve TODO (tickets, locations, estadísticas)
-- ============================================

-- ==========================================
-- PARTE 1: FUNCIONES AUXILIARES
-- ==========================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS(
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION is_auditor()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS(
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role IN ('auditor','supervisor','admin')
  );
$$;

CREATE OR REPLACE FUNCTION current_service_area()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    CASE
      WHEN p.asset_category = 'MAINTENANCE' THEN 'maintenance'
      WHEN p.asset_category = 'IT' THEN 'it'
      WHEN LOWER(COALESCE(p.department, '')) LIKE '%mantenim%' THEN 'maintenance'
      ELSE 'it'
    END
  FROM profiles p
  WHERE p.id = auth.uid();
$$;

-- ==========================================
-- PARTE 2: POLÍTICAS PARA TICKETS
-- ==========================================

-- Eliminar todas las políticas SELECT existentes de tickets
DROP POLICY IF EXISTS "tickets_select_requester" ON tickets;
DROP POLICY IF EXISTS "tickets_select_supervisor_admin" ON tickets;
DROP POLICY IF EXISTS "tickets_select_agents_own" ON tickets;
DROP POLICY IF EXISTS "tickets_select_deleted_auditor" ON tickets;
DROP POLICY IF EXISTS "tickets_select_agents" ON tickets;
DROP POLICY IF EXISTS "tickets_select_admin_all" ON tickets;
DROP POLICY IF EXISTS "tickets_select_supervisor_area" ON tickets;
DROP POLICY IF EXISTS "tickets_select_unified" ON tickets;

-- Crear política unificada para SELECT en tickets
CREATE POLICY "tickets_select_unified" ON tickets
FOR SELECT
TO authenticated
USING (
  -- ADMIN: Ve TODO sin restricciones (incluyendo deleted, todas las áreas, todas las sedes)
  is_admin()
  
  OR
  
  -- REQUESTER: Ve sus propios tickets (activos)
  (deleted_at IS NULL AND requester_id = auth.uid())
  
  OR
  
  -- SUPERVISOR: Ve tickets de su área (activos)
  (
    deleted_at IS NULL
    AND EXISTS(
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'supervisor'
        AND (tickets.service_area = current_service_area() OR tickets.service_area IS NULL)
    )
  )
  
  OR
  
  -- AGENTES L1/L2: Ven tickets propios o asignados (activos)
  (
    deleted_at IS NULL
    AND EXISTS(
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
        AND p.role IN ('agent_l1','agent_l2')
    )
    AND (requester_id = auth.uid() OR assigned_agent_id = auth.uid())
  )
  
  OR
  
  -- AUDITOR: Ve tickets eliminados
  (deleted_at IS NOT NULL AND is_auditor())
);

-- ==========================================
-- PARTE 3: POLÍTICAS PARA LOCATIONS
-- ==========================================

-- Habilitar RLS en locations
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes de locations
DROP POLICY IF EXISTS "Admin can view all locations" ON locations;
DROP POLICY IF EXISTS "Supervisors and technicians see their assigned locations" ON locations;
DROP POLICY IF EXISTS "Everyone can view active locations" ON locations;
DROP POLICY IF EXISTS "locations_select_all" ON locations;
DROP POLICY IF EXISTS "locations_select_assigned" ON locations;

-- Crear política unificada para SELECT en locations
CREATE POLICY "locations_select_unified" ON locations
FOR SELECT
TO authenticated
USING (
  -- ADMIN: Ve TODAS las ubicaciones (activas e inactivas)
  is_admin()
  
  OR
  
  -- OTROS USUARIOS: Solo ven ubicaciones activas asignadas
  (
    is_active = true
    AND (
      -- Ubicación en user_locations
      id IN (
        SELECT location_id 
        FROM user_locations 
        WHERE user_id = auth.uid()
      )
      OR
      -- Ubicación primaria en profiles
      id = (
        SELECT location_id 
        FROM profiles 
        WHERE id = auth.uid()
      )
    )
  )
);

-- ==========================================
-- VERIFICACIÓN
-- ==========================================
-- Ejecuta después para verificar:
-- SELECT COUNT(*) FROM tickets; -- Admin debe ver TODOS
-- SELECT COUNT(*) FROM locations; -- Admin debe ver TODAS
-- SELECT * FROM location_incident_stats; -- Admin debe ver estadísticas de TODAS las sedes
