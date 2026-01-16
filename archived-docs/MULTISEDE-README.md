# Funcionalidad Multisede

## Descripción

La funcionalidad multisede permite segmentar el helpdesk por ubicaciones/sedes físicas diferentes. Cada usuario y ticket pertenece a una sede específica, y el sistema filtra automáticamente la información según la sede del usuario.

## Características

### Segmentación por Rol

- **Administradores (`admin`)**: Pueden ver y gestionar **todas las sedes**
- **Técnicos N1, N2, Supervisores, Usuarios**: Solo ven datos de **su sede asignada**

### Afecta a:

- ✅ Dashboard (KPIs, gráficos, métricas)
- ✅ Lista de tickets
- ✅ Reportes y exportaciones
- ✅ Auditoría
- ✅ Estadísticas de aging
- ✅ Asignación de tickets

## Instalación

### 1. Aplicar Migración de Base de Datos

Ejecuta el script de migración desde PowerShell:

```powershell
.\scripts\apply-locations-migration.ps1
```

O ejecuta manualmente el archivo SQL:

```bash
psql $DATABASE_URL -f supabase/migration-add-locations.sql
```

### 2. Crear Sedes Iniciales

Accede al panel de Supabase → Table Editor → `locations` e inserta tus sedes:

```sql
insert into locations (name, code, city, state) values
  ('Sede Central Monterrey', 'MTY', 'Monterrey', 'Nuevo León'),
  ('Sucursal Ciudad de México', 'CDMX', 'Ciudad de México', 'CDMX'),
  ('Sucursal Guadalajara', 'GDL', 'Guadalajara', 'Jalisco');
```

Campos de la tabla `locations`:

| Campo         | Tipo    | Descripción                              |
| ------------- | ------- | ---------------------------------------- |
| `id`          | uuid    | ID único (auto-generado)                 |
| `name`        | text    | Nombre descriptivo de la sede            |
| `code`        | text    | Código corto único (MTY, CDMX, GDL)      |
| `address`     | text    | Dirección física (opcional)              |
| `city`        | text    | Ciudad                                   |
| `state`       | text    | Estado/Provincia                         |
| `country`     | text    | País (default: México)                   |
| `phone`       | text    | Teléfono de contacto (opcional)          |
| `email`       | text    | Email de contacto (opcional)             |
| `manager_name`| text    | Nombre del responsable (opcional)        |
| `is_active`   | boolean | Si la sede está activa (default: true)   |

### 3. Asignar Sedes a Usuarios

En Supabase → Table Editor → `profiles`, actualiza el campo `location_id` de cada usuario:

```sql
-- Ejemplo: Asignar usuarios a diferentes sedes
update profiles 
set location_id = (select id from locations where code = 'MTY')
where email in ('tecnico1@empresa.com', 'user1@empresa.com');

update profiles 
set location_id = (select id from locations where code = 'CDMX')
where email in ('tecnico2@empresa.com', 'user2@empresa.com');
```

### 4. Migrar Tickets Existentes (Opcional)

Si ya tienes tickets creados antes de implementar multisede:

```sql
-- Asignar sede del solicitante a tickets existentes
update tickets t
set location_id = p.location_id
from profiles p
where t.requester_id = p.id
  and t.location_id is null
  and p.location_id is not null;
```

## Uso

### Comportamiento Automático

1. **Al crear un ticket**: Se asigna automáticamente la sede del solicitante
2. **Al consultar dashboard**: Se filtran automáticamente los datos por sede del usuario
3. **Al listar tickets**: Solo se muestran tickets de la sede del usuario
4. **Reportes y exportaciones**: Se generan solo con datos de la sede del usuario

### Para Administradores

Los administradores ven:
- Todas las sedes en un selector de filtro
- Estadísticas consolidadas de todas las sedes
- Opción para filtrar por sede específica o ver "Todas las sedes"

## Estructura de Archivos

```
src/lib/supabase/
  └── locations.ts          # Utilidades para manejo de sedes

supabase/
  └── migration-add-locations.sql  # Migración SQL

scripts/
  └── apply-locations-migration.ps1  # Script de aplicación
```

## API de Utilidades

### `getLocationFilter()`

Obtiene el ID de la sede para filtrar queries. Retorna `null` si es admin (ve todo).

```typescript
import { getLocationFilter } from '@/lib/supabase/locations'

const locationId = await getLocationFilter()
// null para admin, string con ID de sede para otros roles
```

### `applyLocationFilter(query)`

Aplica automáticamente el filtro de sede a una query de Supabase.

```typescript
import { applyLocationFilter } from '@/lib/supabase/locations'

let query = supabase.from('tickets').select('*')
query = await applyLocationFilter(query)

const { data } = await query
```

### `getAllLocations()`

Obtiene todas las ubicaciones activas.

```typescript
import { getAllLocations } from '@/lib/supabase/locations'

const locations = await getAllLocations()
```

### `isAdminUser(userId)`

Verifica si un usuario es administrador.

```typescript
import { isAdminUser } from '@/lib/supabase/locations'

const isAdmin = await isAdminUser(user.id)
```

### `getUserLocation(userId)`

Obtiene el ID de la sede de un usuario específico.

```typescript
import { getUserLocation } from '@/lib/supabase/locations'

const locationId = await getUserLocation(userId)
```

## Ejemplo de Implementación

### En una página (Server Component):

```typescript
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { applyLocationFilter } from '@/lib/supabase/locations'

export default async function TicketsPage() {
  const supabase = await createSupabaseServerClient()
  
  // Construir query base
  let query = supabase
    .from('tickets')
    .select('*')
    .is('deleted_at', null)
  
  // Aplicar filtro de sede automáticamente
  query = await applyLocationFilter(query)
  
  const { data: tickets } = await query
  
  return <TicketList tickets={tickets} />
}
```

### En una API Route:

```typescript
import { getLocationFilter } from '@/lib/supabase/locations'

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient()
  const locationId = await getLocationFilter()
  
  let query = supabase.from('tickets').select('*')
  
  if (locationId) {
    query = query.eq('location_id', locationId)
  }
  
  const { data } = await query
  return Response.json(data)
}
```

## Consideraciones de Seguridad

1. **RLS (Row Level Security)**: Considera agregar políticas RLS adicionales para forzar el filtrado a nivel de base de datos
2. **Validación de permisos**: El sistema valida el rol antes de permitir ver otras sedes
3. **Auditoría**: Todos los cambios de sede se registran en `audit_log`

## Políticas RLS Recomendadas (Opcional)

Para mayor seguridad, puedes agregar políticas RLS:

```sql
-- Política para tickets: usuarios ven solo su sede (excepto admin)
create policy "Users see only their location tickets"
on tickets for select
using (
  location_id = get_user_location()
  or is_admin_user(auth.uid())
);

-- Política para profiles: usuarios ven solo perfiles de su sede
create policy "Users see only their location profiles"
on profiles for select
using (
  location_id = get_user_location()
  or is_admin_user(auth.uid())
);
```

## Preguntas Frecuentes

**P: ¿Qué pasa si un usuario no tiene sede asignada?**  
R: No verá ningún ticket (se filtrará por `location_id = null`)

**P: ¿Puede un ticket cambiar de sede?**  
R: Sí, un admin puede actualizar el campo `location_id` del ticket manualmente

**P: ¿Los administradores necesitan tener una sede asignada?**  
R: No es obligatorio. Los admins ven todas las sedes independientemente de su `location_id`

**P: ¿Cómo desactivo una sede?**  
R: Actualiza el campo `is_active = false` en la tabla `locations`. Los usuarios seguirán vinculados pero no se mostrará en selectores

## Soporte

Para más información o problemas con la implementación multisede, contacta al equipo de desarrollo.
