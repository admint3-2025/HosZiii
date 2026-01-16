# Permiso Especial: Acceso Total a Reportes para Supervisores

## Descripción

Por defecto, los supervisores solo pueden ver reportes y datos de las sedes que tienen asignadas. Este permiso especial permite a un administrador otorgar acceso completo a reportes para casos específicos donde un supervisor necesite visibilidad total.

## Comportamiento por Rol

### Admins y Auditores
- **Acceso**: Total y sin restricciones a todos los reportes de todas las sedes
- **Configuración**: No requiere permiso especial (siempre activo)

### Supervisores (por defecto)
- **Acceso**: Solo datos de las sedes asignadas en `user_locations` y `profiles.location_id`
- **Reportes filtrados**:
  - Todos los tickets
  - Actividad por usuario
  - Inventario de activos
  - Cambios de activos
  - Ubicaciones de activos
  - Especificaciones de activos
  - Y cualquier otro reporte futuro

### Supervisores con `can_view_all_reports = true`
- **Acceso**: Total, igual que admin/auditor
- **Configuración**: Solo un administrador puede activar este permiso
- **Uso**: Casos especiales donde se requiere visibilidad completa (ej: supervisor regional, auditoría temporal, etc.)

## Implementación Técnica

### Base de Datos

```sql
-- Columna en tabla profiles
profiles.can_view_all_reports: boolean (default false)

-- Función auxiliar
has_full_reports_access(user_id) → boolean
```

### Frontend

```typescript
// Helper para obtener filtro de ubicaciones
import { getReportsLocationFilter } from '@/lib/supabase/reports-filter'

const filter = await getReportsLocationFilter()
// filter.shouldFilter: boolean (true si debe filtrar por sedes)
// filter.locationIds: string[] (UUIDs de las sedes permitidas)
// filter.hasFullAccess: boolean (true si tiene acceso total)
```

### Aplicación en Reportes

Todos los reportes ahora usan este patrón:

```typescript
const locationFilter = await getReportsLocationFilter()

// En queries de Supabase
if (locationFilter.shouldFilter && locationFilter.locationIds.length > 0) {
  query = query.in('location_id', locationFilter.locationIds)
} else if (locationFilter.shouldFilter && locationFilter.locationIds.length === 0) {
  // Supervisor sin sedes: no mostrar datos
  query = query.eq('id', '00000000-0000-0000-0000-000000000000')
}
```

## Cómo Otorgar el Permiso

### Paso 1: Identificar el Supervisor
```sql
SELECT id, full_name, role, can_view_all_reports
FROM profiles
WHERE role = 'supervisor'
ORDER BY full_name;
```

### Paso 2: Activar el Permiso
```sql
UPDATE profiles
SET can_view_all_reports = true
WHERE id = '<supervisor-uuid>';
```

### Paso 3: Verificar
```sql
SELECT 
  p.full_name,
  p.role,
  p.can_view_all_reports,
  has_full_reports_access(p.id) as tiene_acceso_total
FROM profiles p
WHERE p.id = '<supervisor-uuid>';
```

## Casos de Uso

1. **Supervisor Regional**
   - Necesita ver métricas de múltiples sedes no directamente asignadas
   - Se activa el permiso especial temporalmente o permanentemente

2. **Auditoría Interna**
   - Un supervisor es designado para revisar datos de todas las sedes
   - Se activa el permiso durante el período de auditoría

3. **Transición de Roles**
   - Un supervisor está siendo promovido pero aún no es admin
   - Se le da acceso temporal para familiarizarse con datos globales

## Seguridad

- **Auditable**: Todos los cambios a `can_view_all_reports` quedan registrados
- **Controlado**: Solo admins pueden modificar este permiso
- **Reversible**: Se puede desactivar en cualquier momento
- **Transparente**: El sistema registra qué datos ve cada usuario según su permiso

## Migración

Para aplicar esta funcionalidad en la base de datos:

```bash
# Ejecutar en Supabase SQL Editor
psql -f supabase/migration-add-supervisor-reports-permission.sql
```

## Próximos Pasos

Si en el futuro necesitas más granularidad (ej: acceso a solo ciertos tipos de reportes), puedes extender esto a una tabla `special_permissions` con permisos más específicos:

```sql
CREATE TABLE special_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  permission_type text, -- 'view_all_tickets', 'view_all_assets', etc.
  granted_by uuid REFERENCES profiles(id),
  granted_at timestamptz DEFAULT now(),
  expires_at timestamptz
);
```
