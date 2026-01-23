-- ============================================
-- FIX CRÍTICO: Admin debe ver TODOS los tickets
-- SOLUCIÓN: Eliminar TODAS las políticas SELECT y crear una simple
-- ============================================

-- 0. Crear función current_service_area si no existe
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

-- 1. ELIMINAR TODAS LAS POLÍTICAS SELECT EXISTENTES
DROP POLICY IF EXISTS "tickets_select_requester" ON tickets;
DROP POLICY IF EXISTS "tickets_select_supervisor_admin" ON tickets;
DROP POLICY IF EXISTS "tickets_select_agents_own" ON tickets;
DROP POLICY IF EXISTS "tickets_select_deleted_auditor" ON tickets;
DROP POLICY IF EXISTS "tickets_select_agents" ON tickets;
DROP POLICY IF EXISTS "tickets_select_admin_all" ON tickets;
DROP POLICY IF EXISTS "tickets_select_supervisor_area" ON tickets;

-- 2. CREAR UNA SOLA POLÍTICA SIMPLE QUE CUBRA TODOS LOS CASOS
CREATE POLICY "tickets_select_unified" ON tickets
FOR SELECT
TO authenticated
USING (
  -- ADMIN: Ve TODO sin restricciones
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

-- ============================================
-- VERIFICACIÓN: Confirmar que admin puede ver tickets
-- ============================================
-- Ejecuta esto después para verificar:
-- SELECT COUNT(*) FROM tickets; 
-- (Debe mostrar TODOS los tickets si eres admin)
