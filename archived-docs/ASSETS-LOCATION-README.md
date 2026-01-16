# Sistema de Control de Activos por Sede

## Descripción
Sistema de gestión de inventario de activos de TI con control de acceso basado en sedes/ubicaciones.

## Características

### 1. Asignación de Activos a Sedes
- Cada activo puede pertenecer a una sede específica
- Los activos heredan la sede del usuario al que son asignados
- Los activos sin sede asignada son visibles para todos

### 2. Control de Acceso por Rol

#### **Admin**
- ✅ Ve **todos los activos** de todas las sedes
- ✅ Puede crear/modificar/eliminar cualquier activo
- ✅ Filtro por sede disponible en la UI
- ✅ Puede asignar técnicos a sedes

#### **Supervisor**
- 🔒 Ve **solo activos de sus sedes asignadas**
- ✅ Puede crear/modificar activos de sus sedes
- ❌ No ve activos de otras sedes

#### **Técnicos (L1/L2)**
- 🔒 Ve **solo activos de sus sedes asignadas**
- ❌ No pueden crear/modificar activos (solo consulta)
- ❌ No ven activos de otras sedes

### 3. Asignación Multisede
- Un técnico/supervisor puede estar asignado a **múltiples sedes**
- Tabla `user_locations` gestiona la relación muchos-a-muchos
- Permite flexibilidad operativa (técnicos itinerantes, cobertura regional)

## Estructura de Base de Datos

### Tablas Principales

#### `locations` (Sedes)
```sql
id              uuid    PRIMARY KEY
name            text    NOT NULL UNIQUE  -- "Oficina Principal"
code            text    NOT NULL UNIQUE  -- "HQ"
city            text                     -- "Monterrey"
state           text                     -- "Nuevo León"
address         text
phone           text
email           text
manager_name    text
is_active       boolean DEFAULT true
created_at      timestamptz
updated_at      timestamptz
```

#### `assets` (Activos)
```sql
-- Campos existentes...
location_id     uuid    REFERENCES locations(id)  -- Nueva columna
```

#### `user_locations` (Asignación usuarios-sedes)
```sql
id              uuid    PRIMARY KEY
user_id         uuid    REFERENCES auth.users(id)
location_id     uuid    REFERENCES locations(id)
created_at      timestamptz
created_by      uuid    REFERENCES auth.users(id)

UNIQUE(user_id, location_id)
```

### Funciones

#### `can_access_location(user_id, location_id)`
Verifica si un usuario tiene acceso a una sede específica.
- Admin: siempre `true`
- Otros: verifica en `user_locations`

#### `get_accessible_locations()`
Devuelve todas las sedes accesibles por el usuario actual.
- Admin: todas las sedes activas
- Otros: solo sus sedes asignadas

### RLS Policies

#### Assets
```sql
-- Admin ve todo
"Admin puede ver todos los activos"

-- Técnicos/supervisores ven solo sus sedes
"Tecnicos ven activos de sus sedes"
WHERE location_id IN (SELECT get_accessible_locations())

-- Admin gestiona todo
"Admin puede gestionar activos"

-- Supervisores gestionan solo sus sedes
"Supervisores gestionan activos de sus sedes"
WHERE location_id IN (SELECT get_accessible_locations())
```

## Configuración Inicial

### 1. Ejecutar Migración
```powershell
.\scripts\apply-assets-location-migration.ps1
```

Luego ejecutar el SQL en Supabase Studio (http://192.168.31.238:8000)

### 2. Crear Sedes
```sql
INSERT INTO locations (name, code, city, state, address) VALUES
  ('Oficina Principal', 'HQ', 'Monterrey', 'Nuevo León', 'Av. Constitución 100'),
  ('Sucursal Norte', 'NORTE', 'Monterrey', 'Nuevo León', 'Av. Gonzalitos 200'),
  ('Sucursal Sur', 'SUR', 'San Pedro', 'Nuevo León', 'Av. Vasconcelos 300');
```

### 3. Asignar Técnicos a Sedes

#### Consultar técnicos disponibles
```sql
SELECT 
  p.id, 
  p.full_name, 
  p.role,
  au.email
FROM profiles p
JOIN auth.users au ON au.id = p.id
WHERE p.role IN ('agent_l1', 'agent_l2', 'supervisor')
ORDER BY p.full_name;
```

#### Consultar sedes
```sql
SELECT id, code, name 
FROM locations 
WHERE is_active = true
ORDER BY name;
```

#### Asignar técnico a una sede
```sql
INSERT INTO user_locations (user_id, location_id)
VALUES (
  'uuid-del-tecnico',
  (SELECT id FROM locations WHERE code = 'HQ')
);
```

#### Asignar técnico a múltiples sedes
```sql
INSERT INTO user_locations (user_id, location_id)
SELECT 
  'uuid-del-tecnico',
  id
FROM locations
WHERE code IN ('HQ', 'NORTE', 'SUR');
```

#### Ver asignaciones actuales
```sql
SELECT 
  p.full_name,
  au.email,
  p.role,
  l.code,
  l.name
FROM user_locations ul
JOIN profiles p ON p.id = ul.user_id
JOIN auth.users au ON au.id = p.id
JOIN locations l ON l.id = ul.location_id
ORDER BY p.full_name, l.code;
```

## Uso en la UI

### Para Administradores
1. Ver todos los activos de todas las sedes
2. Usar filtro "Sede / Ubicación" para filtrar por sede específica
3. Crear activos y asignarlos a cualquier sede

### Para Supervisores/Técnicos
1. Ver automáticamente solo activos de sus sedes asignadas
2. Indicador visual muestra "Mis sedes: HQ, NORTE"
3. No pueden ver activos de otras sedes (RLS enforced)

## Triggers Automáticos

### `set_asset_location()`
- Se ejecuta al crear un activo
- Si el activo se asigna a un usuario, hereda la sede de ese usuario automáticamente
- Si ya tiene `location_id`, no se modifica

## Seguridad

### Row Level Security (RLS)
- ✅ Todas las tablas tienen RLS habilitado
- ✅ Las policies se aplican a nivel de base de datos
- ✅ Imposible bypassear desde el frontend
- ✅ Auditoría completa de accesos

### Restricciones
- `ON DELETE RESTRICT` en `location_id`: no se puede borrar una sede con activos
- `UNIQUE(user_id, location_id)`: evita duplicados en asignaciones
- `CHECK is_active`: solo sedes activas son usables

## Mantenimiento

### Reasignar activo a otra sede
```sql
UPDATE assets 
SET location_id = (SELECT id FROM locations WHERE code = 'NORTE')
WHERE asset_tag = 'PC-001';
```

### Desactivar una sede
```sql
UPDATE locations 
SET is_active = false 
WHERE code = 'SUR';
```

### Remover asignación de técnico a sede
```sql
DELETE FROM user_locations
WHERE user_id = 'uuid-del-tecnico'
  AND location_id = (SELECT id FROM locations WHERE code = 'HQ');
```

## Mejoras Futuras
- [ ] Dashboard de activos por sede
- [ ] Reportes de inventario por ubicación
- [ ] Transferencia masiva de activos entre sedes
- [ ] Alertas de mantenimiento por sede
- [ ] Estadísticas por ubicación geográfica
