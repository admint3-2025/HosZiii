# Lógica Unificada de Filtrado de Activos por Sede

## Problema Resuelto

El sistema tenía problemas de filtrado de activos inconsistentes entre los módulos de IT y Mantenimiento. Cada formulario implementaba su propia lógica de forma diferente, causando que usuarios no vieran los activos que debían ver.

## Nueva Lógica Unificada

### Archivo Principal
- **`src/lib/supabase/user-locations.ts`**: Utilidad client-side centralizada

### Funciones Clave

#### `getUserLocationInfo(supabase, userId)`
Obtiene información completa de sedes de un usuario:
- `primaryLocationId`: Sede principal (de `profiles.location_id`)
- `allLocationIds`: Todas las sedes (`user_locations` + sede principal)
- `canViewAllLocations`: Si puede ver todas las sedes (solo admin en modo gestión)

#### `getLocationIdsForAssetFilter(supabase, userId, mode)`
Obtiene los IDs de sedes para filtrar activos:
- **mode = 'ticket'**: Para crear tickets (admin actúa como usuario de su sede)
- **mode = 'management'**: Para gestión de inventario (admin ve todo)

#### `applyLocationFilterToQuery(query, locationIds)`
Aplica el filtro a una query de Supabase:
- `null` = sin filtro (admin en modo gestión)
- `[]` = ningún resultado (usuario sin sedes)
- `[id]` = una sede
- `[id1, id2, ...]` = múltiples sedes

## Reglas de Negocio

### Usuario Normal (requester)
- **IT**: Ve solo sus equipos asignados personalmente (`assigned_to = user_id`)
- **Mantenimiento**: Ve activos de su sede asignada

### Agente (agent_l1, agent_l2)
- Ve activos de sus sedes asignadas (user_locations + profiles.location_id)
- Si crea ticket para otro usuario, ve activos de las sedes de ESE usuario

### Supervisor
- Ve activos de TODAS sus sedes asignadas (puede tener múltiples sedes)
- Si crea ticket para otro usuario, ve activos de las sedes de ESE usuario

### Admin / Admin Corporativo
- **Al crear tickets**: Actúan como usuario de sus sedes asignadas
- **En gestión de inventario**: Ven todo

## Tablas Involucradas

```sql
-- Sede principal del usuario
profiles.location_id

-- Sedes adicionales del usuario (para supervisores con múltiples sedes)
user_locations (user_id, location_id)

-- Activos de IT
assets (tabla, status: OPERATIONAL, MAINTENANCE)

-- Activos de Mantenimiento  
assets_maintenance (tabla, status: ACTIVE, MAINTENANCE)
```

## Verificación de Datos

Ejecutar el script SQL de verificación:
```sql
-- En Supabase SQL Editor
-- Archivo: supabase/verify-fix-asset-status.sql
```

Este script:
1. Muestra cuántos activos hay por sede
2. Verifica valores de status
3. Corrige activos sin status o con status inválido
4. Muestra resumen final

## Archivos Modificados

1. **`src/lib/supabase/user-locations.ts`** (NUEVO)
   - Utilidad centralizada de sedes

2. **`src/app/(app)/tickets/new/ui/TicketCreateForm.tsx`**
   - Usa nueva lógica unificada
   - Importa `getLocationIdsForAssetFilter`, `applyLocationFilterToQuery`

3. **`src/app/(app)/mantenimiento/tickets/new/ui/MaintenanceTicketCreateForm.tsx`**
   - Usa nueva lógica unificada
   - Importa `getLocationIdsForAssetFilter`, `applyLocationFilterToQuery`

## Logs de Depuración

Ambos formularios ahora emiten logs en consola:
```
[TicketCreateForm] 📍 Usuario: xxx Rol: supervisor Área: it
[TicketCreateForm] 📍 Sedes permitidas: ['id1', 'id2']
[TicketCreateForm] ✅ Activos encontrados: 15
```

```
[MaintenanceTicketCreateForm] 📍 Usuario: xxx Rol: requester
[MaintenanceTicketCreateForm] 📍 Sedes permitidas: ['id1']
[MaintenanceTicketCreateForm] ✅ Activos encontrados: 5
```

## Troubleshooting

### "Sin activos disponibles"
1. Verificar que el usuario tenga sede asignada:
   ```sql
   SELECT location_id FROM profiles WHERE id = 'user-id';
   SELECT * FROM user_locations WHERE user_id = 'user-id';
   ```

2. Verificar que haya activos en esa sede con status correcto:
   ```sql
   -- Mantenimiento
   SELECT * FROM assets_maintenance 
   WHERE location_id = 'sede-id' 
     AND status IN ('ACTIVE', 'MAINTENANCE')
     AND deleted_at IS NULL;
   
   -- IT
   SELECT * FROM assets 
   WHERE location_id = 'sede-id' 
     AND status IN ('OPERATIONAL', 'MAINTENANCE')
     AND deleted_at IS NULL;
   ```

### Supervisor no ve activos de todas sus sedes
1. Verificar que tenga sedes en user_locations:
   ```sql
   SELECT ul.location_id, l.code, l.name
   FROM user_locations ul
   JOIN locations l ON l.id = ul.location_id
   WHERE ul.user_id = 'supervisor-id';
   ```
