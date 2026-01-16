# Permiso de Gestión de Activos (can_manage_assets)

## Resumen
Se agregó un nuevo permiso `can_manage_assets` que permite a usuarios (especialmente supervisores) tener acceso completo al inventario de activos de TODAS las sedes, sin estar limitados por su `location_id` o `user_locations`.

## Comportamiento por Rol

### Admin
- **Sin cambios**: Siempre ve todos los activos de todas las sedes
- `can_manage_assets` no afecta (ya tiene acceso total)

### Supervisor
- **Sin `can_manage_assets` (default)**: Solo ve activos de sus sedes asignadas en `user_locations`
- **Con `can_manage_assets` = true**: Ve TODOS los activos de TODAS las sedes (igual que admin)

### Agent L1/L2 y otros roles
- Solo ven activos de sus sedes asignadas (sin importar `can_manage_assets`)
- El permiso solo aplica a roles `supervisor` y superiores

## Archivos Modificados

### 1. Base de Datos
**Archivo**: `supabase/migration-add-asset-permission.sql`
- Agrega columna `can_manage_assets BOOLEAN DEFAULT false` a tabla `profiles`
- Índice para optimizar filtros
- Por defecto activa para: admin, supervisor, agent_l2

### 2. Frontend - Lista de Activos
**Archivo**: `src/app/(app)/admin/assets/page.tsx`
- Lee `can_manage_assets` del perfil del usuario
- Si `admin` o `can_manage_assets=true`: muestra todos los activos
- Si no: filtra por `user_locations`

### 3. API - Búsqueda de Activos
**Archivo**: `src/app/api/assets/search/route.ts`
- Valida `can_manage_assets` al buscar activos
- Usa `createSupabaseAdminClient()` si tiene permiso global
- Omite filtro de `location_id` para usuarios con permiso

### 4. API - Opciones de Sedes
**Archivo**: `src/app/api/locations/options/route.ts`
- Si `admin` o `can_manage_assets=true`: devuelve TODAS las sedes
- Si no: solo devuelve sedes asignadas al usuario

### 5. UI - Gestión de Usuarios
**Archivos**:
- `src/app/(app)/admin/users/ui/UserCreateForm.tsx`
- `src/app/(app)/admin/users/ui/UserList.tsx`
- `src/app/api/admin/users/route.ts`
- `src/app/api/admin/users/[id]/route.ts`

**Cambios**:
- Checkbox "Gestión de activos (inventario)" en crear/editar usuario
- Estado `editCanManageAssets` para manejar el toggle
- API lee/escribe `can_manage_assets` en profiles

## Uso Administrativo

### Dar permiso a un supervisor
1. Ir a `/admin/users`
2. Buscar al supervisor
3. Click en "Editar"
4. Marcar checkbox: ✅ **Puede gestionar inventario y activos**
5. Guardar cambios

### Resultado
El supervisor ahora puede:
- Ver inventario completo de TODAS las sedes en `/admin/assets`
- Buscar/asignar activos de cualquier sede en tickets
- Ver todas las sedes en selectores de ubicación
- Gestionar activos sin restricciones de ubicación

## Migración Requerida

Ejecutar en Supabase (SQL Editor):
```sql
-- Archivo: supabase/migration-add-asset-permission.sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS can_manage_assets BOOLEAN DEFAULT false;

UPDATE profiles
SET can_manage_assets = true
WHERE role IN ('admin', 'supervisor', 'agent_l2');

CREATE INDEX IF NOT EXISTS idx_profiles_can_manage_assets
ON profiles(can_manage_assets)
WHERE can_manage_assets = true;
```

## Testing

### Caso 1: Supervisor sin permiso
- Login como supervisor sin `can_manage_assets`
- Ir a `/admin/assets`
- **Resultado**: Solo ve activos de sus sedes asignadas

### Caso 2: Supervisor con permiso
- Admin marca checkbox "Gestión de activos" en el supervisor
- Login como ese supervisor
- Ir a `/admin/assets`
- **Resultado**: Ve activos de TODAS las sedes

### Caso 3: Crear ticket con activo
- Supervisor con permiso abre `/tickets/[id]`
- Click en "Buscar" activo
- **Resultado**: Selector de sede muestra TODAS las sedes (no solo las asignadas)
