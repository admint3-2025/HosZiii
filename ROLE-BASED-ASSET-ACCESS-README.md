# Control de Acceso a Activos por Rol (IT vs Mantenimiento)

## Descripción

Implementa segregación de activos de IT vs Mantenimiento con control de acceso basado en roles especializados. Los técnicos/supervisores solo ven y gestionan activos de su categoría.

## Estructura de Roles

### Roles Generales
- `admin` - Acceso a todos los activos (sin restricción)
- `supervisor` - Puede gestionar activos según su `asset_category`
- `agent_l1` - Técnico Nivel 1, solo consulta de activos
- `agent_l2` - Técnico Nivel 2, puede gestionar activos
- `requester` - Usuario final
- `auditor` - Solo auditoría

### Campo `asset_category` en profiles

| asset_category | Permisos |
|---|---|
| `'IT'` | Solo ve/gestiona activos IT (DESKTOP, LAPTOP, SERVER, etc.) |
| `'MAINTENANCE'` | Solo ve/gestiona activos Mantenimiento (HVAC, Kitchen, Laundry, etc.) |
| `NULL` (admin) | Ve/gestiona TODOS los activos |

## Categorías de Activos

### IT (10 tipos)
- DESKTOP, LAPTOP, TABLET, PHONE
- MONITOR, PRINTER, SCANNER
- SERVER, UPS, PROJECTOR

### MAINTENANCE (20 tipos)
- **HVAC**: AIR_CONDITIONING, HVAC_SYSTEM, BOILER
- **Kitchen**: REFRIGERATOR, KITCHEN_EQUIPMENT
- **Laundry**: WASHING_MACHINE, DRYER
- **Infrastructure**: WATER_HEATER, PUMP, GENERATOR, ELEVATOR
- **General**: FURNITURE, FIXTURE, CLEANING_EQUIPMENT, SECURITY_SYSTEM, FIRE_SYSTEM, PLUMBING, ELECTRICAL, LIGHTING, VEHICLE, OTHER

## Instalación

### 1. Ejecutar Migración SQL

Copiar el contenido de `migration-role-based-asset-access.sql` y ejecutar en **Supabase SQL Editor**.

> ⚠️ **Nota**: Si falla al agregar nuevos valores al ENUM `user_role`, ejecutar estos comandos en transacciones SEPARADAS:

```sql
-- Transacción 1
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'tech_it';

-- Transacción 2
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'tech_maintenance';
```

### 2. Verificar Creación

```sql
-- Verificar tabla asset_type_categories
SELECT COUNT(*) FROM asset_type_categories;
-- Resultado esperado: 30 registros

-- Verificar mapeo
SELECT DISTINCT category FROM asset_type_categories ORDER BY category;
-- Resultado esperado: IT, MAINTENANCE

-- Verificar función
SELECT get_asset_category('DESKTOP');
-- Resultado esperado: IT

SELECT get_asset_category('AIR_CONDITIONING');
-- Resultado esperado: MAINTENANCE
```

### 3. Asignar Categorías a Usuarios

```sql
-- Asignar técnico de IT
UPDATE profiles 
SET asset_category = 'IT'
WHERE email = 'tecnico.it@ejemplo.com';

-- Asignar técnico de Mantenimiento
UPDATE profiles 
SET asset_category = 'MAINTENANCE'
WHERE email = 'tecnico.mantenimiento@ejemplo.com';

-- Admin (dejar NULL)
UPDATE profiles 
SET asset_category = NULL
WHERE email = 'admin@ejemplo.com';
```

## Cambios en Frontend

### 1. Actualizar AssetList (filtrar por categoría)

El componente `AssetList` debe:
- Obtener `asset_category` del usuario actual
- Si es `'IT'` → mostrar solo activos IT
- Si es `'MAINTENANCE'` → mostrar solo activos MAINTENANCE
- Si es `NULL` → mostrar todos (admin)

### 2. Actualizar FormularioCrearTicket

El formulario debe:
- Cargar solo activos de la categoría del usuario
- Filtrar basado en `asset_category` del usuario autenticado

### 3. Actualizar GestiónInventario

- Supervisor IT ve solo activos IT
- Supervisor Mantenimiento ve solo activos Mantenimiento
- Pueden crear/editar solo activos de su categoría

## Auditoría

La tabla `user_category_audit` registra:
- Usuario que fue reasignado
- Categoría anterior y nueva
- Quién realizó el cambio
- Motivo (opcional)
- Timestamp

Consultar auditoría:
```sql
SELECT user_id, old_category, new_category, changed_by, changed_at, reason
FROM user_category_audit
ORDER BY changed_at DESC;
```

## Funciones Disponibles

### `get_asset_category(asset_type_param VARCHAR)`

Obtiene la categoría de un tipo de activo.

```sql
SELECT get_asset_category('LAPTOP'); -- Retorna 'IT'
SELECT get_asset_category('BOILER'); -- Retorna 'MAINTENANCE'
```

### `user_can_access_asset(user_id UUID, asset_type_param VARCHAR)`

Verifica si un usuario puede acceder a un tipo de activo.

```sql
SELECT user_can_access_asset('user-uuid', 'DESKTOP'); -- true/false
```

## Políticas de Seguridad (RLS)

### Lectura (SELECT)
- **Admin**: Ve todos los activos
- **Supervisor/Técnico con categoría**: Ve solo activos de su categoría
- **Supervisor/Técnico sin categoría**: Ve todos los activos
- **Requester**: Solo ve activos asignados a ellos (requiere otra política)

### Escritura (INSERT/UPDATE)
- **Admin**: Puede crear/editar cualquier activo
- **Supervisor/Técnico con `can_manage_assets=true`**: Solo activos de su categoría
- **Otros roles**: Sin acceso

## Próximos Pasos

1. ✅ Ejecutar migración SQL
2. ⏳ Actualizar componentes frontend (AssetList, FormularioCrearTicket, etc.)
3. ⏳ Agregar filtro visual "Mi Categoría" en UI
4. ⏳ Testar con usuarios IT y Mantenimiento
5. ⏳ Validar auditoría en tabla de cambios de categoría

## Troubleshooting

### Error: "Fila con fila_policy_id violaría política"
- Verificar que el usuario tenga `asset_category` asignada correctamente
- Verificar que `can_manage_assets = true` si intenta modificar

### Usuario ve activos que no debería
- Verificar que `asset_category` no sea NULL
- Ejecutar: `SELECT asset_category FROM profiles WHERE id = auth.uid();`

### Nueva categoría no aplica de inmediato
- Reiniciar sesión del usuario
- O: Ejecutar `SELECT pg_reload_conf();` en PostgreSQL (requiere permisos super)
