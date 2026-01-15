# Instrucciones: Aplicar Control de Acceso por Rol

## PASO 1: Preparar la Migración

Abrir Supabase → SQL Editor y ejecutar los siguientes bloques EN ORDEN, esperando que cada uno complete:

### Bloque 1: Crear tabla asset_type_categories

```sql
-- Crear tabla de mapeo
CREATE TABLE IF NOT EXISTS asset_type_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_type VARCHAR(50) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT valid_asset_type CHECK (asset_type IN (
    'DESKTOP', 'LAPTOP', 'TABLET', 'PHONE', 'MONITOR', 'PRINTER', 'SCANNER', 
    'SERVER', 'UPS', 'PROJECTOR',
    'AIR_CONDITIONING', 'HVAC_SYSTEM', 'BOILER',
    'REFRIGERATOR', 'KITCHEN_EQUIPMENT',
    'WASHING_MACHINE', 'DRYER',
    'WATER_HEATER', 'PUMP', 'GENERATOR', 'ELEVATOR',
    'FURNITURE', 'FIXTURE', 'CLEANING_EQUIPMENT', 'SECURITY_SYSTEM', 
    'FIRE_SYSTEM', 'PLUMBING', 'ELECTRICAL', 'LIGHTING', 'VEHICLE', 'OTHER'
  )),
  CONSTRAINT valid_category CHECK (category IN ('IT', 'MAINTENANCE'))
);

-- Habilitar RLS
ALTER TABLE asset_type_categories ENABLE ROW LEVEL SECURITY;

-- Política de lectura
DROP POLICY IF EXISTS "Anyone can view asset type categories" ON asset_type_categories;
CREATE POLICY "Anyone can view asset type categories"
  ON asset_type_categories FOR SELECT
  USING (is_active = true);

-- Política de admin
DROP POLICY IF EXISTS "Admin can manage asset type categories" ON asset_type_categories;
CREATE POLICY "Admin can manage asset type categories"
  ON asset_type_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

✅ Resultado esperado: Tabla creada sin errores

---

### Bloque 2: Agregar columna a profiles

```sql
-- Agregar columna asset_category si no existe
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS asset_category VARCHAR(50) DEFAULT NULL;

-- Agregar índice para búsquedas
CREATE INDEX IF NOT EXISTS idx_profiles_role_asset_category 
  ON profiles(role, asset_category) 
  WHERE active = true;
```

✅ Resultado esperado: Columna agregada

---

### Bloque 3: Insertar mapeos de categorías

```sql
INSERT INTO asset_type_categories (asset_type, category, description) VALUES
-- IT (10)
('DESKTOP', 'IT', 'Computadora de Escritorio'),
('LAPTOP', 'IT', 'Computadora Portátil'),
('TABLET', 'IT', 'Tableta'),
('PHONE', 'IT', 'Teléfono'),
('MONITOR', 'IT', 'Monitor'),
('PRINTER', 'IT', 'Impresora'),
('SCANNER', 'IT', 'Escáner'),
('SERVER', 'IT', 'Servidor'),
('UPS', 'IT', 'Sistema de Alimentación Ininterrumpible'),
('PROJECTOR', 'IT', 'Proyector'),

-- MAINTENANCE - HVAC (3)
('AIR_CONDITIONING', 'MAINTENANCE', 'Aire Acondicionado'),
('HVAC_SYSTEM', 'MAINTENANCE', 'Sistema HVAC'),
('BOILER', 'MAINTENANCE', 'Caldera'),

-- MAINTENANCE - Kitchen (2)
('REFRIGERATOR', 'MAINTENANCE', 'Refrigerador'),
('KITCHEN_EQUIPMENT', 'MAINTENANCE', 'Equipo de Cocina'),

-- MAINTENANCE - Laundry (2)
('WASHING_MACHINE', 'MAINTENANCE', 'Lavadora'),
('DRYER', 'MAINTENANCE', 'Secadora'),

-- MAINTENANCE - Infrastructure (4)
('WATER_HEATER', 'MAINTENANCE', 'Calentador de Agua'),
('PUMP', 'MAINTENANCE', 'Bomba'),
('GENERATOR', 'MAINTENANCE', 'Generador'),
('ELEVATOR', 'MAINTENANCE', 'Ascensor'),

-- MAINTENANCE - General (9)
('FURNITURE', 'MAINTENANCE', 'Mueble'),
('FIXTURE', 'MAINTENANCE', 'Accesorio Fijo'),
('CLEANING_EQUIPMENT', 'MAINTENANCE', 'Equipo de Limpieza'),
('SECURITY_SYSTEM', 'MAINTENANCE', 'Sistema de Seguridad'),
('FIRE_SYSTEM', 'MAINTENANCE', 'Sistema de Fuego/Extinción'),
('PLUMBING', 'MAINTENANCE', 'Equipo de Fontanería'),
('ELECTRICAL', 'MAINTENANCE', 'Equipo Eléctrico'),
('LIGHTING', 'MAINTENANCE', 'Iluminación'),
('VEHICLE', 'MAINTENANCE', 'Vehículo'),
('OTHER', 'MAINTENANCE', 'Otro')
ON CONFLICT (asset_type) DO NOTHING;

-- Verificar
SELECT category, COUNT(*) as total FROM asset_type_categories GROUP BY category;
```

✅ Resultado esperado:
```
category    | total
MAINTENANCE | 20
IT          | 10
```

---

### Bloque 4: Crear funciones helper

```sql
-- Función: obtener categoría de activo
CREATE OR REPLACE FUNCTION get_asset_category(asset_type_param VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
  category VARCHAR;
BEGIN
  SELECT category INTO category
  FROM asset_type_categories
  WHERE asset_type = asset_type_param
  AND is_active = true
  LIMIT 1;
  
  RETURN COALESCE(category, 'OTHER');
END;
$$ LANGUAGE plpgsql STABLE;

-- Función: verificar acceso del usuario a activo
CREATE OR REPLACE FUNCTION user_can_access_asset(user_id UUID, asset_type_param VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  user_role VARCHAR;
  user_category VARCHAR;
  asset_category VARCHAR;
BEGIN
  SELECT role, asset_category INTO user_role, user_category
  FROM profiles
  WHERE id = user_id
  AND active = true
  LIMIT 1;
  
  IF user_role = 'admin' THEN
    RETURN true;
  END IF;
  
  IF user_category IS NULL THEN
    RETURN true;
  END IF;
  
  SELECT category INTO asset_category
  FROM asset_type_categories
  WHERE asset_type = asset_type_param
  AND is_active = true
  LIMIT 1;
  
  RETURN (user_category = asset_category);
END;
$$ LANGUAGE plpgsql STABLE;

-- Verificar funciones
SELECT get_asset_category('LAPTOP');        -- Debe retornar 'IT'
SELECT get_asset_category('AIR_CONDITIONING'); -- Debe retornar 'MAINTENANCE'
```

✅ Resultado esperado: Ambas funciones retornan sus categorías

---

### Bloque 5: Actualizar RLS de assets

```sql
-- REEMPLAZAR las políticas existentes de assets para incluir filtro por categoría

-- Política SELECT: filtrar por categoría
DROP POLICY IF EXISTS "Users view assets by role and category" ON assets;
CREATE POLICY "Users view assets by role and category"
  ON assets FOR SELECT
  USING (
    -- Admin ve todo
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    OR
    -- Otros roles: filtrar por categoría
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.active = true
      AND p.role IN ('supervisor', 'agent_l1', 'agent_l2')
      AND (
        EXISTS (
          SELECT 1 FROM asset_type_categories atc
          WHERE atc.asset_type = assets.asset_type
          AND atc.category = p.asset_category
        )
        OR
        p.asset_category IS NULL
      )
    )
  );

-- Política INSERT: solo admin o supervisor con categoría
DROP POLICY IF EXISTS "Users can create update assets by category" ON assets;
CREATE POLICY "Users can create update assets by category"
  ON assets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.active = true
      AND p.role IN ('supervisor', 'agent_l1', 'agent_l2')
      AND p.can_manage_assets = true
      AND (
        EXISTS (
          SELECT 1 FROM asset_type_categories atc
          WHERE atc.asset_type = asset_type
          AND atc.category = p.asset_category
        )
        OR
        p.asset_category IS NULL
      )
    )
  );

-- Verificar políticas
SELECT policyname FROM pg_policies WHERE tablename = 'assets';
```

✅ Resultado esperado: Dos nuevas políticas creadas

---

### Bloque 6: Tabla de auditoría (opcional pero recomendado)

```sql
CREATE TABLE IF NOT EXISTS user_category_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  old_category VARCHAR(50),
  new_category VARCHAR(50),
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reason TEXT,
  
  CONSTRAINT valid_category CHECK (new_category IN ('IT', 'MAINTENANCE', NULL))
);

ALTER TABLE user_category_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can view user category audit" ON user_category_audit;
CREATE POLICY "Admin can view user category audit"
  ON user_category_audit FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

✅ Resultado esperado: Tabla de auditoría creada

---

## PASO 2: Asignar Categorías a Usuarios

### Caso 1: Técnico/Supervisor de IT

```sql
UPDATE profiles 
SET asset_category = 'IT'
WHERE email = 'tecnico.it@empresa.com'  -- Cambiar email
  AND active = true;

-- Verificar
SELECT email, role, asset_category FROM profiles 
WHERE email = 'tecnico.it@empresa.com';
```

### Caso 2: Técnico/Supervisor de Mantenimiento

```sql
UPDATE profiles 
SET asset_category = 'MAINTENANCE'
WHERE email = 'tecnico.manto@empresa.com'  -- Cambiar email
  AND active = true;
```

### Caso 3: Admin (acceso a todo)

```sql
UPDATE profiles 
SET asset_category = NULL  -- NULL = acceso a todos
WHERE email = 'admin@empresa.com'
  AND active = true;
```

---

## PASO 3: Verificar Funcionamiento

### Testear acceso a activos

```sql
-- Como admin (debería ver TODOS)
SELECT COUNT(*) FROM assets;

-- Como técnico IT (debería ver solo IT)
SELECT COUNT(*) FROM assets 
WHERE asset_type IN (
  SELECT asset_type FROM asset_type_categories WHERE category = 'IT'
);

-- Como técnico Mantenimiento (debería ver solo MAINTENANCE)
SELECT COUNT(*) FROM assets 
WHERE asset_type IN (
  SELECT asset_type FROM asset_type_categories WHERE category = 'MAINTENANCE'
);
```

---

## PASO 4: Actualizar Frontend (próximo paso)

Los componentes que necesitan actualizarse:
1. `AssetList.tsx` - Filtrar por `asset_category`
2. `CreateTicketForm` - Mostrar solo activos de la categoría
3. `AssetInventoryManager` - Filtrar por categoría
4. `AssetCreateForm` - Validar que solo se creen activos de la categoría del usuario

---

## ✅ Checklist Final

- [ ] Tabla `asset_type_categories` creada con 30 registros
- [ ] Columna `asset_category` agregada a `profiles`
- [ ] Funciones `get_asset_category()` y `user_can_access_asset()` creadas
- [ ] RLS actualizado en tabla `assets`
- [ ] Usuarios asignados a categorías (IT o MAINTENANCE)
- [ ] Tabla `user_category_audit` creada (opcional)
- [ ] Frontend actualizado para filtrar por categoría
- [ ] Tests realizados con usuarios IT y Mantenimiento

## 🔧 Troubleshooting

**P: "Error: conflicting policies"**
- R: Ejecutar `DROP POLICY` antes de `CREATE POLICY`

**P: Usuario no ve activos aunque tenga categoría**
- R: Verificar que `asset_category` NO sea NULL. Si es NULL, accede a todos.

**P: Cambio de categoría no aplica de inmediato**
- R: El usuario debe cerrar/reabrir sesión para que el cambio tenga efecto
