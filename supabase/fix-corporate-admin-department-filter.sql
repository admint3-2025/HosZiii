-- =====================================================
-- FIX: Filtrar inspecciones por departamentos permitidos
-- para corporate_admin
-- =====================================================
--
-- Problema: corporate_admin está viendo TODAS las inspecciones
-- sin filtrar por el campo allowed_departments de su perfil.
--
-- Solución: Aplicar la política correcta que usa la función
-- user_can_access_department() para filtrar por departamento.
-- =====================================================

-- 1. Eliminar políticas existentes que permiten acceso sin filtro
DROP POLICY IF EXISTS "inspections_rrhh_select_policy" ON inspections_rrhh;
DROP POLICY IF EXISTS "Users can view inspections from their locations" ON inspections_rrhh;
DROP POLICY IF EXISTS "Users can view inspections from their departments" ON inspections_rrhh;

-- 2. Crear política SELECT con filtro por departamento para corporate_admin
CREATE POLICY "Users can view inspections from their departments"
  ON inspections_rrhh FOR SELECT
  USING (
    -- Admin puede ver TODO
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
    OR
    -- Corporate_admin ve sus propias inspecciones + inspecciones de sus departamentos permitidos
    (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'corporate_admin'
      )
      AND
      (
        -- Sus propias inspecciones (las que él creó)
        inspector_user_id = auth.uid()
        OR
        -- Inspecciones de sus departamentos permitidos
        user_can_access_department(auth.uid(), department)
      )
    )
    OR
    -- Usuarios normales SOLO sus ubicaciones asignadas (NO corporativos)
    (
      location_id IN (
        SELECT location_id FROM user_locations WHERE user_id = auth.uid()
      )
      AND
      NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'corporate_admin')
      )
    )
  );

-- 3. Comentario en la política
COMMENT ON POLICY "Users can view inspections from their departments" ON inspections_rrhh IS
'Filtra inspecciones según rol:
✅ Admin: ve TODO sin filtro.
✅ Corporate_admin: ve sus propias inspecciones + inspecciones de departamentos en su allowed_departments.
✅ Usuarios normales: SOLO ven inspecciones de sus ubicaciones asignadas (user_locations).
La lógica: corporate_admin ve todo lo que creó + lo que tiene permitido gestionar.';

-- 4. Verificar que la función user_can_access_department existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'user_can_access_department'
    AND n.nspname = 'public'
  ) THEN
    RAISE EXCEPTION '❌ Error: La función user_can_access_department() no existe. Ejecuta primero: supabase/add-allowed-departments-to-profiles.sql';
  END IF;
  
  RAISE NOTICE '✅ Política de filtrado por departamento aplicada correctamente';
END $$;

-- 5. Query de prueba (ejecutar logueado como corporate_admin en la app)
-- SELECT 
--   id,
--   property_code,
--   department,
--   inspector_name,
--   status,
--   inspection_date
-- FROM inspections_rrhh
-- ORDER BY inspection_date DESC
-- LIMIT 10;
--
-- Resultado esperado: SOLO inspecciones de departamentos permitidos
