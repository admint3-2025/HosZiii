-- =====================================================
-- SCHEMA: Inspecciones GSH (Guest Service Handler)
-- Descripción: Sistema de inspecciones departamentales GSH
-- Replica la estructura de RRHH para mantener consistencia
-- =====================================================

-- Tabla principal de inspecciones GSH
CREATE TABLE IF NOT EXISTS inspections_gsh (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  department VARCHAR(100) NOT NULL DEFAULT 'GSH',
  inspector_user_id UUID NOT NULL REFERENCES auth.users(id),
  inspector_name VARCHAR(255) NOT NULL,
  
  -- Metadata
  inspection_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  property_code VARCHAR(50),
  property_name VARCHAR(255),
  
  -- Estado
  status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, completed, approved, rejected
  
  -- Estadísticas calculadas (denormalizadas para performance)
  total_areas INTEGER DEFAULT 0,
  total_items INTEGER DEFAULT 0,
  items_cumple INTEGER DEFAULT 0,
  items_no_cumple INTEGER DEFAULT 0,
  items_na INTEGER DEFAULT 0,
  items_pending INTEGER DEFAULT 0,
  coverage_percentage DECIMAL(5,2) DEFAULT 0,
  compliance_percentage DECIMAL(5,2) DEFAULT 0,
  average_score DECIMAL(5,2) DEFAULT 0,
  
  -- Comentarios generales
  general_comments TEXT,
  
  -- Metadata de auditoría
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by_user_id UUID REFERENCES auth.users(id)
);

-- Áreas de inspección GSH
CREATE TABLE IF NOT EXISTS inspections_gsh_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections_gsh(id) ON DELETE CASCADE,
  
  area_name VARCHAR(255) NOT NULL,
  area_order INTEGER NOT NULL DEFAULT 0,
  
  -- Calificación calculada del área
  calculated_score DECIMAL(5,2) DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(inspection_id, area_name)
);

-- Items de evaluación por área GSH
CREATE TABLE IF NOT EXISTS inspections_gsh_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID NOT NULL REFERENCES inspections_gsh_areas(id) ON DELETE CASCADE,
  inspection_id UUID NOT NULL REFERENCES inspections_gsh(id) ON DELETE CASCADE,
  
  item_order INTEGER NOT NULL DEFAULT 0,
  descripcion TEXT NOT NULL,
  tipo_dato VARCHAR(50) DEFAULT 'Fijo',
  
  -- Valores editables
  cumplimiento_valor VARCHAR(50) DEFAULT '', -- '', 'Cumple', 'No Cumple', 'N/A'
  cumplimiento_editable BOOLEAN DEFAULT TRUE,
  
  calif_valor DECIMAL(5,2) DEFAULT 0,
  calif_editable BOOLEAN DEFAULT TRUE,
  
  comentarios_valor TEXT DEFAULT '',
  comentarios_libre BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Log de eliminaciones para auditoría
CREATE TABLE IF NOT EXISTS public.inspections_gsh_deletion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL,
  deleted_by_user_id UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  inspection_data JSONB,
  reason TEXT
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_inspections_gsh_location ON inspections_gsh(location_id);
CREATE INDEX IF NOT EXISTS idx_inspections_gsh_inspector ON inspections_gsh(inspector_user_id);
CREATE INDEX IF NOT EXISTS idx_inspections_gsh_date ON inspections_gsh(inspection_date DESC);
CREATE INDEX IF NOT EXISTS idx_inspections_gsh_status ON inspections_gsh(status);
CREATE INDEX IF NOT EXISTS idx_inspections_gsh_areas_inspection ON inspections_gsh_areas(inspection_id);
CREATE INDEX IF NOT EXISTS idx_inspections_gsh_items_area ON inspections_gsh_items(area_id);
CREATE INDEX IF NOT EXISTS idx_inspections_gsh_items_inspection ON inspections_gsh_items(inspection_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_inspections_gsh_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_inspections_gsh_updated_at ON inspections_gsh;
CREATE TRIGGER trigger_inspections_gsh_updated_at
  BEFORE UPDATE ON inspections_gsh
  FOR EACH ROW
  EXECUTE FUNCTION update_inspections_gsh_updated_at();

DROP TRIGGER IF EXISTS trigger_inspections_gsh_items_updated_at ON inspections_gsh_items;
CREATE TRIGGER trigger_inspections_gsh_items_updated_at
  BEFORE UPDATE ON inspections_gsh_items
  FOR EACH ROW
  EXECUTE FUNCTION update_inspections_gsh_updated_at();

-- Función para calcular estadísticas de una inspección GSH
CREATE OR REPLACE FUNCTION calculate_inspection_gsh_stats(p_inspection_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_items INTEGER;
  v_cumple INTEGER;
  v_no_cumple INTEGER;
  v_na INTEGER;
  v_pending INTEGER;
  v_evaluated INTEGER;
  v_applicable INTEGER;
  v_coverage DECIMAL(5,2);
  v_compliance DECIMAL(5,2);
  v_avg_score DECIMAL(5,2);
  v_total_areas INTEGER;
BEGIN
  -- Contar items por estado
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE cumplimiento_valor = 'Cumple'),
    COUNT(*) FILTER (WHERE cumplimiento_valor = 'No Cumple'),
    COUNT(*) FILTER (WHERE cumplimiento_valor = 'N/A'),
    COUNT(*) FILTER (WHERE cumplimiento_valor = '' OR cumplimiento_valor IS NULL)
  INTO v_total_items, v_cumple, v_no_cumple, v_na, v_pending
  FROM inspections_gsh_items
  WHERE inspection_id = p_inspection_id;
  
  -- Calcular métricas
  v_evaluated := v_cumple + v_no_cumple + v_na;
  v_applicable := v_cumple + v_no_cumple;
  
  v_coverage := CASE 
    WHEN v_total_items > 0 THEN (v_evaluated::DECIMAL / v_total_items) * 100
    ELSE 0
  END;
  
  v_compliance := CASE 
    WHEN v_applicable > 0 THEN (v_cumple::DECIMAL / v_applicable) * 100
    ELSE 0
  END;
  
  -- Calcular promedio de calificaciones
  SELECT AVG(calif_valor)
  INTO v_avg_score
  FROM inspections_gsh_items
  WHERE inspection_id = p_inspection_id
    AND cumplimiento_valor = 'Cumple';
  
  -- Contar áreas
  SELECT COUNT(*)
  INTO v_total_areas
  FROM inspections_gsh_areas
  WHERE inspection_id = p_inspection_id;
  
  -- Actualizar inspección
  UPDATE inspections_gsh
  SET 
    total_areas = v_total_areas,
    total_items = v_total_items,
    items_cumple = v_cumple,
    items_no_cumple = v_no_cumple,
    items_na = v_na,
    items_pending = v_pending,
    coverage_percentage = v_coverage,
    compliance_percentage = v_compliance,
    average_score = COALESCE(v_avg_score, 0)
  WHERE id = p_inspection_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Habilitar RLS
ALTER TABLE inspections_gsh ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections_gsh_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections_gsh_items ENABLE ROW LEVEL SECURITY;

-- Políticas para inspections_gsh
DROP POLICY IF EXISTS "Usuarios pueden ver inspecciones de sus ubicaciones" ON inspections_gsh;
CREATE POLICY "Usuarios pueden ver inspecciones de sus ubicaciones"
  ON inspections_gsh FOR SELECT
  TO authenticated
  USING (
    location_id IN (
      SELECT location_id FROM user_locations WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'director', 'corporate_admin')
    )
  );

DROP POLICY IF EXISTS "Usuarios pueden crear inspecciones" ON inspections_gsh;
CREATE POLICY "Usuarios pueden crear inspecciones"
  ON inspections_gsh FOR INSERT
  TO authenticated
  WITH CHECK (
    location_id IN (
      SELECT location_id FROM user_locations WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'director', 'corporate_admin')
    )
  );

DROP POLICY IF EXISTS "Usuarios pueden actualizar sus inspecciones" ON inspections_gsh;
CREATE POLICY "Usuarios pueden actualizar sus inspecciones"
  ON inspections_gsh FOR UPDATE
  TO authenticated
  USING (
    inspector_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'supervisor', 'director')
    )
  );

DROP POLICY IF EXISTS "Solo admins pueden eliminar inspecciones" ON inspections_gsh;
CREATE POLICY "Solo admins pueden eliminar inspecciones"
  ON inspections_gsh FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'director')
    )
  );

-- Políticas para inspections_gsh_areas
DROP POLICY IF EXISTS "Usuarios pueden ver áreas de inspecciones accesibles" ON inspections_gsh_areas;
CREATE POLICY "Usuarios pueden ver áreas de inspecciones accesibles"
  ON inspections_gsh_areas FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inspections_gsh
      WHERE inspections_gsh.id = inspection_id
      AND (
        location_id IN (
          SELECT location_id FROM user_locations WHERE user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role IN ('admin', 'director', 'corporate_admin')
        )
      )
    )
  );

DROP POLICY IF EXISTS "Usuarios pueden crear áreas" ON inspections_gsh_areas;
CREATE POLICY "Usuarios pueden crear áreas"
  ON inspections_gsh_areas FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inspections_gsh
      WHERE inspections_gsh.id = inspection_id
      AND (
        inspector_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role IN ('admin', 'director', 'corporate_admin')
        )
      )
    )
  );

DROP POLICY IF EXISTS "Usuarios pueden actualizar áreas" ON inspections_gsh_areas;
CREATE POLICY "Usuarios pueden actualizar áreas"
  ON inspections_gsh_areas FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inspections_gsh
      WHERE inspections_gsh.id = inspection_id
      AND (
        inspector_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role IN ('admin', 'supervisor', 'director')
        )
      )
    )
  );

DROP POLICY IF EXISTS "Solo admins pueden eliminar áreas" ON inspections_gsh_areas;
CREATE POLICY "Solo admins pueden eliminar áreas"
  ON inspections_gsh_areas FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'director')
    )
  );

-- Políticas para inspections_gsh_items
DROP POLICY IF EXISTS "Usuarios pueden ver items de inspecciones accesibles" ON inspections_gsh_items;
CREATE POLICY "Usuarios pueden ver items de inspecciones accesibles"
  ON inspections_gsh_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inspections_gsh
      WHERE inspections_gsh.id = inspection_id
      AND (
        location_id IN (
          SELECT location_id FROM user_locations WHERE user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role IN ('admin', 'director', 'corporate_admin')
        )
      )
    )
  );

DROP POLICY IF EXISTS "Usuarios pueden crear items" ON inspections_gsh_items;
CREATE POLICY "Usuarios pueden crear items"
  ON inspections_gsh_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inspections_gsh
      WHERE inspections_gsh.id = inspection_id
      AND (
        inspector_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role IN ('admin', 'director', 'corporate_admin')
        )
      )
    )
  );

DROP POLICY IF EXISTS "Usuarios pueden actualizar items" ON inspections_gsh_items;
CREATE POLICY "Usuarios pueden actualizar items"
  ON inspections_gsh_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inspections_gsh
      WHERE inspections_gsh.id = inspection_id
      AND (
        inspector_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role IN ('admin', 'supervisor', 'director')
        )
      )
    )
  );

DROP POLICY IF EXISTS "Solo admins pueden eliminar items" ON inspections_gsh_items;
CREATE POLICY "Solo admins pueden eliminar items"
  ON inspections_gsh_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'director')
    )
  );

-- =====================================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- =====================================================

COMMENT ON TABLE inspections_gsh IS 'Inspecciones del departamento GSH (Guest Service Handler)';
COMMENT ON TABLE inspections_gsh_areas IS 'Áreas de evaluación dentro de cada inspección GSH';
COMMENT ON TABLE inspections_gsh_items IS 'Items individuales de evaluación por área GSH';
COMMENT ON COLUMN inspections_gsh.status IS 'draft: borrador, completed: completada pendiente aprobación, approved: aprobada, rejected: rechazada';
COMMENT ON COLUMN inspections_gsh.coverage_percentage IS 'Porcentaje de items evaluados (Cumple + No Cumple + N/A) / Total';
COMMENT ON COLUMN inspections_gsh.compliance_percentage IS 'Porcentaje de cumplimiento (Cumple) / (Cumple + No Cumple)';
COMMENT ON COLUMN inspections_gsh.average_score IS 'Promedio de calificaciones de items que cumplen';

-- Verificación
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inspections_gsh') THEN
    RAISE NOTICE '✓ Tablas de inspecciones GSH creadas correctamente';
  ELSE
    RAISE EXCEPTION '✗ Error al crear tablas de inspecciones GSH';
  END IF;
END $$;
