# Fix: Usuarios sin acceso a reportes (métricas en cero)

## Problema

Los usuarios (requesters, agentes, supervisores) ven métricas en **cero** en la página de reportes aunque existan tickets en el sistema.

### Causa raíz

El sistema filtra los datos de reportes por **ubicación/sede** del usuario. Si un usuario no tiene:
- `location_id` asignado en la tabla `profiles`, Y
- No tiene registros en la tabla `user_locations`

Entonces el filtro de ubicación devuelve un array vacío `[]`, causando que NO se muestre ningún dato en los reportes.

## Solución

### 1. Verificar usuarios sin ubicación

Ejecuta en Supabase SQL Editor:

```sql
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.location_id,
  COUNT(ul.location_id) as user_locations_count
FROM profiles p
LEFT JOIN user_locations ul ON ul.user_id = p.id
WHERE p.role IN ('requester', 'agent_l1', 'agent_l2', 'supervisor')
GROUP BY p.id, p.email, p.full_name, p.role, p.location_id
HAVING p.location_id IS NULL AND COUNT(ul.location_id) = 0;
```

### 2. Asignar ubicación predeterminada

Ejecuta el script completo:

```bash
cd /media/jmosorioe/DEV/deV/ZIII-helpdesk
psql [connection-string] -f supabase/fix-user-location-access.sql
```

O manualmente desde Supabase SQL Editor, ejecuta todo el contenido de `supabase/fix-user-location-access.sql`

### 3. Verificar resultado

Después de ejecutar el script, verifica que los usuarios tengan ubicaciones asignadas:

```sql
SELECT 
  p.email,
  p.full_name,
  p.role,
  l.name as location_name,
  l.code as location_code
FROM profiles p
LEFT JOIN locations l ON l.id = p.location_id
WHERE p.role IN ('requester', 'agent_l1', 'agent_l2', 'supervisor')
ORDER BY p.role, p.full_name;
```

## Cambios en el código

### Archivo modificado: `src/lib/supabase/reports-filter.ts`

**Antes**: Los usuarios no-admin/no-supervisor caían en un caso que devolvía `locationIds: []` (sin ubicaciones permitidas).

**Después**: Todos los roles (requesters, agentes, supervisores) obtienen sus sedes desde:
1. `user_locations.location_id` (sedes múltiples asignadas)
2. `profiles.location_id` (sede principal del usuario)

Esto alinea el comportamiento de reportes con el dashboard, donde los usuarios ya podían ver métricas correctamente.

## Asignación manual de ubicaciones

Para asignar una sede específica a un usuario:

```sql
-- Opción 1: Asignar sede principal en profiles
UPDATE profiles 
SET location_id = '[UUID-de-la-sede]',
    updated_at = NOW()
WHERE email = 'usuario@example.com';

-- Opción 2: Asignar múltiples sedes (user_locations)
INSERT INTO user_locations (user_id, location_id)
VALUES (
  (SELECT id FROM profiles WHERE email = 'usuario@example.com'),
  '[UUID-de-la-sede]'
);
```

## Verificación final

1. Iniciar sesión como el usuario afectado
2. Navegar a `/reports`
3. Verificar que las métricas muestren valores correctos
4. Verificar que los reportes individuales (ej. "Todos los Tickets") muestren datos

## Notas

- **Admins**: Ven todos los datos sin filtros de ubicación
- **Auditores**: Ven todos los datos sin filtros de ubicación
- **Supervisores con `can_view_all_reports=true`**: Ven todos los datos sin filtros
- **Supervisores con `can_view_all_reports=false`**: Solo ven datos de sus sedes asignadas
- **Agentes y Requesters**: Solo ven datos de sus sedes asignadas

Si un usuario necesita ver datos de múltiples sedes, agrega registros en `user_locations` para cada sede adicional.
