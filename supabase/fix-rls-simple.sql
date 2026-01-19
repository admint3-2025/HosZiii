-- ============================================================================
-- FIX URGENTE: Políticas RLS simplificadas que FUNCIONAN
-- ============================================================================

-- ============================================================================
-- TABLA: assets
-- ============================================================================

DROP POLICY IF EXISTS "assets_unified_select" ON assets;

-- Política SIMPLE: Si eres admin o supervisor o agente, ves TODO
CREATE POLICY "assets_simple_select" ON assets FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM profiles 
    WHERE role IN ('admin', 'supervisor', 'agent_l1', 'agent_l2', 'requester')
  )
);

-- ============================================================================
-- TABLA: assets_maintenance  
-- ============================================================================

DROP POLICY IF EXISTS "assets_maintenance_unified_select" ON assets_maintenance;

-- Política SIMPLE: Si eres admin o supervisor o agente, ves TODO
CREATE POLICY "assets_maintenance_simple_select" ON assets_maintenance FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM profiles 
    WHERE role IN ('admin', 'supervisor', 'agent_l1', 'agent_l2', 'requester')
  )
);

-- Verificación
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename IN ('assets', 'assets_maintenance')
  AND cmd = 'SELECT'
ORDER BY tablename;
