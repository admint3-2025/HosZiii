-- =====================================================
-- Migración: Control de acceso por departamento
-- Descripción: Permite restringir acceso de usuarios
-- corporativos a departamentos específicos
-- =====================================================

-- 1. Agregar columna allowed_departments a profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS allowed_departments TEXT[] DEFAULT NULL;

-- 2. Comentario descriptivo
COMMENT ON COLUMN profiles.allowed_departments IS 
'Departamentos permitidos para roles corporativos (corporate_admin, supervisor, auditor). 
NULL o vacío = acceso a todos los departamentos (igual que admin).
Valores válidos: RECURSOS HUMANOS, GSH, DIV. CUARTOS, MANTENIMIENTO, SISTEMAS, ALIMENTOS Y BEBIDAS, AMA DE LLAVES, CONTABILIDAD';

-- 3. Índice para mejorar performance en consultas
CREATE INDEX IF NOT EXISTS idx_profiles_allowed_departments 
ON profiles USING GIN (allowed_departments);

-- 4. Función helper para verificar acceso a departamento
CREATE OR REPLACE FUNCTION user_can_access_department(
  p_user_id UUID,
  p_department TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
  v_allowed_departments TEXT[];
BEGIN
  -- Obtener rol y departamentos permitidos
  SELECT role, allowed_departments
  INTO v_role, v_allowed_departments
  FROM profiles
  WHERE id = p_user_id;
  
  -- Admin siempre tiene acceso total
  IF v_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- SOLO corporate_admin tiene acceso corporativo
  -- Los supervisores y auditors regulares NO tienen acceso
  IF v_role = 'corporate_admin' THEN
    -- Sin restricción (NULL o array vacío) = acceso a todos los departamentos
    IF v_allowed_departments IS NULL OR array_length(v_allowed_departments, 1) IS NULL THEN
      RETURN TRUE;
    END IF;
    
    -- Con restricción = verificar si el departamento está en la lista permitida
    RETURN p_department = ANY(v_allowed_departments);
  END IF;
  
  -- Otros roles (supervisor, auditor regulares, etc) NO tienen acceso corporativo
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Comentario en la función
COMMENT ON FUNCTION user_can_access_department(UUID, TEXT) IS
'Verifica si un usuario tiene acceso a un departamento específico.
✅ Admin: acceso total a todo.
✅ Corporate_admin sin restricción (NULL/vacío): acceso a TODOS los departamentos corporativos.
✅ Corporate_admin con departamentos: solo acceso a los departamentos especificados.
❌ Supervisor/Auditor regulares: SIN acceso corporativo (necesitan ser corporate_admin).
❌ Otros roles: sin acceso corporativo.';

-- 6. Actualizar política RLS de inspections_rrhh (si existe)
-- Para que respete los departamentos permitidos
DROP POLICY IF EXISTS "Users can view inspections from their departments" ON inspections_rrhh;

CREATE POLICY "Users can view inspections from their departments"
  ON inspections_rrhh FOR SELECT
  USING (
    -- Admin puede ver todo
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
    OR
    -- SOLO corporate_admin con acceso al departamento
    (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'corporate_admin'
      )
      AND
      user_can_access_department(auth.uid(), department)
    )
    OR
    -- Usuarios normales solo sus ubicaciones (no corporativos)
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

-- 7. Actualizar política de INSERT
DROP POLICY IF EXISTS "Users can create inspections in their departments" ON inspections_rrhh;

CREATE POLICY "Users can create inspections in their departments"
  ON inspections_rrhh FOR INSERT
  WITH CHECK (
    -- Admin puede crear en cualquier ubicación
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
    OR
    -- SOLO corporate_admin con acceso al departamento
    (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'corporate_admin'
      )
      AND
      user_can_access_department(auth.uid(), department)
    )
    OR
    -- Usuarios normales solo en sus ubicaciones (no corporativos)
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

-- =====================================================
-- Verificación post-migración
-- =====================================================

-- Verificar que la columna existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'allowed_departments'
  ) THEN
    RAISE NOTICE '✅ Columna allowed_departments agregada correctamente';
  ELSE
    RAISE EXCEPTION '❌ Error: No se pudo agregar la columna allowed_departments';
  END IF;
END $$;

-- Verificar que la función existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_proc 
    WHERE proname = 'user_can_access_department'
  ) THEN
    RAISE NOTICE '✅ Función user_can_access_department creada correctamente';
  ELSE
    RAISE EXCEPTION '❌ Error: No se pudo crear la función user_can_access_department';
  END IF;
END $$;

-- Mostrar usuarios corporativos actuales (para referencia)
-- SOLO corporate_admin verá corporativo
SELECT 
  id,
  full_name,
  role,
  allowed_departments,
  CASE 
    WHEN role = 'admin' THEN 'Acceso total (Admin)'
    WHEN role = 'corporate_admin' AND allowed_departments IS NULL 
      THEN 'Acceso a TODOS los departamentos corporativos'
    WHEN role = 'corporate_admin' AND array_length(allowed_departments, 1) IS NULL
      THEN 'Acceso a TODOS los departamentos corporativos (array vacío)'
    WHEN role = 'corporate_admin' 
      THEN 'Acceso restringido a: ' || array_to_string(allowed_departments, ', ')
    ELSE 'SIN acceso corporativo ❌'
  END as nivel_acceso
FROM profiles
WHERE role IN ('admin', 'corporate_admin', 'supervisor', 'auditor')
ORDER BY role DESC, full_name;
