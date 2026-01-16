# Resumen de Cambios: Filtrado de Reportes por Sede para Supervisores

## Objetivo
Restringir el acceso de supervisores a reportes para que solo vean datos de sus sedes asignadas, con opción de permiso especial para acceso total cuando sea necesario.

## Archivos Modificados

### 1. Base de Datos
**`supabase/migration-add-supervisor-reports-permission.sql`** (NUEVO)
- Agrega columna `can_view_all_reports` a `profiles`
- Crea función `has_full_reports_access(user_id)`
- Índice para optimizar consultas de permisos

### 2. Backend/Helpers
**`src/lib/supabase/reports-filter.ts`** (NUEVO)
- Función `getReportsLocationFilter()` que retorna:
  - `shouldFilter`: boolean (si debe filtrar)
  - `locationIds`: string[] (UUIDs de sedes permitidas)
  - `role`: string (rol del usuario)
  - `hasFullAccess`: boolean (si tiene acceso total)
- Lógica:
  - Admin/Auditor → acceso total sin filtro
  - Supervisor con `can_view_all_reports=true` → acceso total
  - Supervisor con `can_view_all_reports=false` → solo sus sedes
  - Otros roles → sin acceso

### 3. Reportes Actualizados

**`src/app/(app)/reports/all-tickets/page.tsx`**
- Importa `getReportsLocationFilter`
- Aplica filtro `.in('location_id', locationIds)` si es supervisor sin permiso especial

**`src/app/(app)/reports/user-activity/page.tsx`**
- Importa `getReportsLocationFilter`
- Filtra tickets por `location_id` antes de calcular métricas
- Supervisores sin permiso solo ven actividad de tickets de sus sedes

**`src/app/(app)/reports/asset-inventory/page.tsx`**
- Importa `getReportsLocationFilter`
- Filtra activos por `location_id`
- Filtra dropdown de sedes para mostrar solo las permitidas
- Estadísticas calculadas solo sobre activos visibles

### 4. Documentación
**`SUPERVISOR-REPORTS-PERMISSION-README.md`** (NUEVO)
- Explicación completa del sistema de permisos
- Casos de uso
- Instrucciones SQL para otorgar/revocar permisos
- Ejemplos de implementación

## Cómo Funciona

### Para Admins/Auditores
```
Usuario → Reportes → Ver TODO sin restricciones
```

### Para Supervisores (default)
```
Usuario → Reportes → Solo datos de sedes en user_locations + profiles.location_id
```

### Para Supervisores con Permiso Especial
```
Usuario → Admin activa can_view_all_reports → Reportes → Ver TODO
```

## Próximos Reportes a Actualizar

Los siguientes reportes aún necesitan aplicar el mismo filtro:

1. **`src/app/(app)/reports/deleted-tickets/page.tsx`**
   - Tickets eliminados (soft-delete)

2. **`src/app/(app)/reports/asset-changes/page.tsx`**
   - Historial de cambios en activos

3. **`src/app/(app)/reports/asset-locations/page.tsx`**
   - Control de ubicaciones de activos

4. **`src/app/(app)/reports/asset-specs/page.tsx`**
   - Especificaciones técnicas de activos

5. **`src/app/(app)/reports/resolution-times/page.tsx`**
   - Tiempos de resolución de tickets

6. **`src/app/(app)/reports/state-changes/page.tsx`**
   - Cambios de estado de tickets

## Patrón a Seguir en Nuevos Reportes

```typescript
import { getReportsLocationFilter } from '@/lib/supabase/reports-filter'

// En la función del componente
const locationFilter = await getReportsLocationFilter()

// Al construir query
let query = supabase.from('tabla').select('*')

if (locationFilter.shouldFilter && locationFilter.locationIds.length > 0) {
  query = query.in('location_id', locationFilter.locationIds)
} else if (locationFilter.shouldFilter && locationFilter.locationIds.length === 0) {
  query = query.eq('id', '00000000-0000-0000-0000-000000000000') // No mostrar nada
}
```

## Aplicar en Base de Datos

```bash
# Conectar a Supabase SQL Editor y ejecutar:
supabase/migration-add-supervisor-reports-permission.sql
```

## Verificar Funcionamiento

1. **Como Admin**:
   - Login como admin
   - Ir a reportes → debe ver TODOS los datos de TODAS las sedes

2. **Como Supervisor (sin permiso)**:
   - Login como supervisor
   - Ir a reportes → debe ver SOLO datos de sus sedes asignadas

3. **Como Supervisor (con permiso)**:
   ```sql
   UPDATE profiles SET can_view_all_reports = true WHERE id = '<supervisor-id>';
   ```
   - Login como ese supervisor
   - Ir a reportes → debe ver TODOS los datos como si fuera admin

## Beneficios

✅ **Seguridad**: Supervisores solo ven lo que les corresponde  
✅ **Flexibilidad**: Admins pueden otorgar acceso total cuando sea necesario  
✅ **Auditable**: Todos los permisos quedan registrados en la base  
✅ **Escalable**: Patrón reutilizable para todos los reportes actuales y futuros  
✅ **Consistente**: Misma lógica en dashboard y reportes
