-- ============================================================================
-- FIX: Verificar y corregir políticas RLS de assets_maintenance para INSERT
-- ============================================================================

-- 1. Ver políticas actuales
SELECT 
  policyname,
  cmd,
  permissive,
  qual::text as using_clause,
  with_check::text as with_check_clause
FROM pg_policies 
WHERE tablename = 'assets_maintenance';

-- 2. Si no hay política INSERT, crear una que permita a supervisores de mantenimiento
-- Primero eliminar si existe
DROP POLICY IF EXISTS "Maintenance supervisors can insert assets" ON assets_maintenance;

-- 3. Crear política de INSERT para supervisores
CREATE POLICY "Maintenance supervisors can insert assets"
ON assets_maintenance
FOR INSERT
WITH CHECK (
  -- Admin puede todo
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  OR
  -- Supervisor de mantenimiento puede insertar en sus sedes
  (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'supervisor'
    AND 
    (SELECT asset_category FROM profiles WHERE id = auth.uid()) IN ('MAINTENANCE', 'BOTH')
    AND (
      -- Sin sede específica (null) o en una de sus sedes asignadas
      location_id IS NULL
      OR location_id IN (
        SELECT location_id FROM user_locations WHERE user_id = auth.uid()
      )
      OR (SELECT location_id FROM profiles WHERE id = auth.uid()) = location_id
    )
  )
);

-- 4. Verificar que la política se creó
SELECT 'Política INSERT creada para assets_maintenance' as resultado;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'assets_maintenance' AND cmd = 'INSERT';
