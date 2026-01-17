-- =====================================================
-- SCHEMA: Inspecciones RRHH
-- Descripción: Sistema de inspecciones departamentales
-- con evaluación por áreas e items, registro histórico
-- y generación de reportes.
-- =====================================================

-- Tabla principal de inspecciones
CREATE TABLE IF NOT EXISTS inspections_rrhh (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  department VARCHAR(100) NOT NULL DEFAULT 'RRHH',
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

-- Áreas de inspección (configurables por departamento)
CREATE TABLE IF NOT EXISTS inspections_rrhh_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections_rrhh(id) ON DELETE CASCADE,
  
  area_name VARCHAR(255) NOT NULL,
  area_order INTEGER NOT NULL DEFAULT 0,
  
  -- Calificación calculada del área
  calculated_score DECIMAL(5,2) DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(inspection_id, area_name)
);

-- Items de evaluación por área
CREATE TABLE IF NOT EXISTS inspections_rrhh_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID NOT NULL REFERENCES inspections_rrhh_areas(id) ON DELETE CASCADE,
  inspection_id UUID NOT NULL REFERENCES inspections_rrhh(id) ON DELETE CASCADE,
  
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

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_inspections_rrhh_location ON inspections_rrhh(location_id);
CREATE INDEX IF NOT EXISTS idx_inspections_rrhh_inspector ON inspections_rrhh(inspector_user_id);
CREATE INDEX IF NOT EXISTS idx_inspections_rrhh_date ON inspections_rrhh(inspection_date DESC);
CREATE INDEX IF NOT EXISTS idx_inspections_rrhh_status ON inspections_rrhh(status);
CREATE INDEX IF NOT EXISTS idx_inspections_rrhh_areas_inspection ON inspections_rrhh_areas(inspection_id);
CREATE INDEX IF NOT EXISTS idx_inspections_rrhh_items_area ON inspections_rrhh_items(area_id);
CREATE INDEX IF NOT EXISTS idx_inspections_rrhh_items_inspection ON inspections_rrhh_items(inspection_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_inspections_rrhh_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_inspections_rrhh_updated_at
  BEFORE UPDATE ON inspections_rrhh
  FOR EACH ROW
  EXECUTE FUNCTION update_inspections_rrhh_updated_at();

CREATE TRIGGER trigger_inspections_rrhh_items_updated_at
  BEFORE UPDATE ON inspections_rrhh_items
  FOR EACH ROW
  EXECUTE FUNCTION update_inspections_rrhh_updated_at();

-- Función para calcular estadísticas de una inspección
CREATE OR REPLACE FUNCTION calculate_inspection_rrhh_stats(p_inspection_id UUID)
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
  FROM inspections_rrhh_items
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
  
  -- Calcular score promedio de áreas
  SELECT 
    AVG(calculated_score),
    COUNT(*)
  INTO v_avg_score, v_total_areas
  FROM inspections_rrhh_areas
  WHERE inspection_id = p_inspection_id;
  
  -- Actualizar inspección
  UPDATE inspections_rrhh
  SET 
    total_items = v_total_items,
    items_cumple = v_cumple,
    items_no_cumple = v_no_cumple,
    items_na = v_na,
    items_pending = v_pending,
    coverage_percentage = v_coverage,
    compliance_percentage = v_compliance,
    average_score = COALESCE(v_avg_score, 0),
    total_areas = v_total_areas,
    updated_at = NOW()
  WHERE id = p_inspection_id;
END;
$$ LANGUAGE plpgsql;

-- Función para calcular score de un área
CREATE OR REPLACE FUNCTION calculate_area_rrhh_score(p_area_id UUID)
RETURNS VOID AS $$
DECLARE
  v_score DECIMAL(5,2);
BEGIN
  SELECT 
    CASE 
      WHEN COUNT(*) FILTER (WHERE cumplimiento_valor = 'Cumple') > 0 
      THEN AVG(calif_valor) FILTER (WHERE cumplimiento_valor = 'Cumple')
      ELSE 0
    END
  INTO v_score
  FROM inspections_rrhh_items
  WHERE area_id = p_area_id;
  
  UPDATE inspections_rrhh_areas
  SET calculated_score = COALESCE(v_score, 0)
  WHERE id = p_area_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger para recalcular stats cuando cambian items
CREATE OR REPLACE FUNCTION trigger_recalculate_inspection_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalcular score del área
  PERFORM calculate_area_rrhh_score(COALESCE(NEW.area_id, OLD.area_id));
  
  -- Recalcular stats de la inspección
  PERFORM calculate_inspection_rrhh_stats(COALESCE(NEW.inspection_id, OLD.inspection_id));
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_rrhh_items_stats
  AFTER INSERT OR UPDATE OR DELETE ON inspections_rrhh_items
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_inspection_stats();

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================

ALTER TABLE inspections_rrhh ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections_rrhh_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections_rrhh_items ENABLE ROW LEVEL SECURITY;

-- Políticas para inspections_rrhh
CREATE POLICY "Users can view inspections from their locations"
  ON inspections_rrhh FOR SELECT
  USING (
    -- Admin puede ver todo
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
    OR
    -- Usuarios normales solo sus ubicaciones
    location_id IN (
      SELECT location_id FROM user_locations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create inspections in their locations"
  ON inspections_rrhh FOR INSERT
  WITH CHECK (
    -- Admin puede crear en cualquier ubicación
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
    OR
    -- Usuarios normales solo en sus ubicaciones
    location_id IN (
      SELECT location_id FROM user_locations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own draft inspections"
  ON inspections_rrhh FOR UPDATE
  USING (
    -- Admin puede actualizar todo
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
    OR
    -- Usuarios pueden actualizar sus propios borradores
    (
      inspector_user_id = auth.uid() 
      AND status = 'draft'
      AND location_id IN (
        SELECT location_id FROM user_locations WHERE user_id = auth.uid()
      )
    )
    OR
    -- Supervisores pueden actualizar en sus ubicaciones
    (
      location_id IN (
        SELECT location_id FROM user_locations 
        WHERE user_id = auth.uid()
      )
      AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'supervisor'
      )
    )
  );

-- Políticas para inspections_rrhh_areas
CREATE POLICY "Users can view areas from accessible inspections"
  ON inspections_rrhh_areas FOR SELECT
  USING (
    -- Admin puede ver todo
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
    OR
    -- Usuarios normales solo de inspecciones en sus ubicaciones
    inspection_id IN (
      SELECT id FROM inspections_rrhh 
      WHERE location_id IN (
        SELECT location_id FROM user_locations WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage areas in their inspections"
  ON inspections_rrhh_areas FOR ALL
  USING (
    -- Admin puede gestionar todo
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
    OR
    -- Usuarios normales solo sus inspecciones
    inspection_id IN (
      SELECT id FROM inspections_rrhh 
      WHERE inspector_user_id = auth.uid()
      AND location_id IN (
        SELECT location_id FROM user_locations WHERE user_id = auth.uid()
      )
    )
  );

-- Políticas para inspections_rrhh_items
CREATE POLICY "Users can view items from accessible inspections"
  ON inspections_rrhh_items FOR SELECT
  USING (
    -- Admin puede ver todo
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
    OR
    -- Usuarios normales solo items de inspecciones en sus ubicaciones
    inspection_id IN (
      SELECT id FROM inspections_rrhh 
      WHERE location_id IN (
        SELECT location_id FROM user_locations WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage items in their inspections"
  ON inspections_rrhh_items FOR ALL
  USING (
    -- Admin puede gestionar todo
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
    OR
    -- Usuarios normales solo items de sus inspecciones
    inspection_id IN (
      SELECT id FROM inspections_rrhh 
      WHERE inspector_user_id = auth.uid()
      AND location_id IN (
        SELECT location_id FROM user_locations WHERE user_id = auth.uid()
      )
    )
  );

-- =====================================================
-- COMENTARIOS
-- =====================================================

COMMENT ON TABLE inspections_rrhh IS 'Inspecciones departamentales de RRHH con evaluación por áreas';
COMMENT ON TABLE inspections_rrhh_areas IS 'Áreas evaluadas en cada inspección';
COMMENT ON TABLE inspections_rrhh_items IS 'Items de evaluación por área';
COMMENT ON FUNCTION calculate_inspection_rrhh_stats IS 'Recalcula estadísticas agregadas de una inspección';
COMMENT ON FUNCTION calculate_area_rrhh_score IS 'Recalcula el score promedio de un área';
