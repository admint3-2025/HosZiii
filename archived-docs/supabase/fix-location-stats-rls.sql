-- ============================================================================
-- RLS PARA location_incident_stats VIEW
-- ============================================================================
-- Objetivo: Restringir el acceso a estadísticas de sedes según las 
--           ubicaciones asignadas al usuario. Admin ve todo, supervisores
--           y técnicos solo ven estadísticas de sus sedes asignadas.
-- ============================================================================

-- La vista location_incident_stats está basada en la tabla locations.
-- Para aplicar RLS a una vista, debemos asegurarnos de que la tabla subyacente
-- tiene RLS habilitado y las políticas apropiadas.

-- 1. Verificar que locations tiene RLS habilitado
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas existentes de SELECT en locations (si existen)
DROP POLICY IF EXISTS "Admin can view all locations" ON locations;
DROP POLICY IF EXISTS "Supervisors and technicians see their assigned locations" ON locations;
DROP POLICY IF EXISTS "Everyone can view active locations" ON locations;

-- 3. Política para ADMIN: ve todas las ubicaciones
CREATE POLICY "Admin can view all locations"
  ON locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

-- 4. Política para SUPERVISORES, TÉCNICOS y REQUESTERS: solo ven sus sedes asignadas
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

-- 5. Política para AUDITOR: ve todas las ubicaciones (solo lectura)
CREATE POLICY "Auditors can view all locations"
  ON locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'auditor'
    )
  );

-- 6. IMPORTANTE: Las vistas heredan el RLS de sus tablas base
-- Como location_incident_stats hace LEFT JOIN de locations con tickets,
-- cuando un supervisor consulta esta vista, PostgreSQL automáticamente
-- filtrará las filas de locations según las políticas RLS arriba.

-- 7. Verificar políticas actuales en locations
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd,
  roles,
  qual
FROM pg_policies 
WHERE tablename = 'locations'
  AND cmd = 'SELECT'
ORDER BY policyname;

-- Resultado esperado: 3 políticas de SELECT en locations:
-- 1. Admin can view all locations
-- 2. Supervisors and technicians see their assigned locations
-- 3. Auditors can view all locations
