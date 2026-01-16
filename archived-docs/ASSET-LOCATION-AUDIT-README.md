# Auditoría de Cambios de Sede de Activos

## Descripción

Sistema de control estricto para cambios de sede de activos con:
- **Validación obligatoria**: Requiere justificación mínima de 10 caracteres
- **Registro de auditoría**: Todos los cambios quedan registrados permanentemente
- **Notificaciones automáticas**: Se envía correo a admins y supervisores involucrados
- **Sin excepciones**: Ni siquiera los administradores pueden cambiar sede sin justificar

## Características

### 1. Validación a Nivel de Base de Datos
- Trigger `validate_asset_location_change` intercepta cualquier cambio de `location_id`
- Requiere que la aplicación establezca `app.location_change_reason` antes del update
- Si no hay razón válida (≥10 caracteres), el cambio es rechazado con error

### 2. Tabla de Auditoría
```sql
asset_location_changes
├── id (uuid)
├── asset_id (uuid) → referencia a assets
├── from_location_id (uuid) → sede origen
├── to_location_id (uuid) → sede destino
├── reason (text) → justificación (mínimo 10 caracteres)
├── changed_by (uuid) → usuario que realizó el cambio
├── changed_at (timestamptz) → fecha/hora del cambio
└── metadata (nombres, emails para reporte)
```

### 3. Notificaciones por Correo

Se notifica automáticamente a:
- ✅ **Todos los administradores** del sistema
- ✅ **Supervisores de la sede origen** (si tiene)
- ✅ **Supervisores de la sede destino**

El correo incluye:
- Identificación del activo
- Sede origen y destino
- Usuario que realizó el cambio
- Fecha y hora
- **Justificación completa**

### 4. Interfaz de Usuario

Cuando un usuario intenta cambiar la sede en el formulario:

1. **Detección automática**: El sistema detecta que `location_id` cambió
2. **Modal de confirmación**: Aparece ventana requiriendo justificación
3. **Advertencia visual**: Indica que se enviará notificación
4. **Validación**: No permite continuar si la justificación tiene menos de 10 caracteres
5. **Confirmación**: Usuario debe confirmar explícitamente el cambio

## Instalación

### 1. Ejecutar Migración

```powershell
# Desde la raíz del proyecto
.\scripts\apply-asset-location-audit.ps1
```

O manualmente en Supabase Studio:
```sql
-- SQL Editor
-- Copiar y pegar contenido de:
supabase/migration-asset-location-audit.sql
```

### 2. Verificar Instalación

```sql
-- Verificar que la tabla existe
SELECT * FROM asset_location_changes LIMIT 1;

-- Verificar que el trigger está activo
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgname = 'trg_validate_asset_location_change';

-- Verificar funciones
\df get_location_supervisors
\df get_all_admins
```

## Uso

### Cambiar Sede desde la Aplicación

1. Usuario abre el activo en edición
2. Cambia el dropdown de "Sede / Ubicación"
3. Aparece advertencia amarilla indicando que se requiere justificación
4. Al intentar guardar, se abre modal de confirmación
5. Usuario ingresa justificación (mínimo 10 caracteres)
6. Usuario confirma el cambio
7. Sistema ejecuta:
   - Actualización del activo
   - Registro en auditoría
   - Envío de notificaciones por correo

### Cambiar Sede desde SQL (Admin Override)

```sql
-- SOLO PARA CASOS EXCEPCIONALES
-- Paso 1: Establecer la razón
SELECT set_config(
  'app.location_change_reason', 
  'Reasignación masiva por cierre temporal de sucursal EMTY debido a remodelación', 
  false
);

-- Paso 2: Actualizar el activo
UPDATE assets 
SET location_id = (SELECT id FROM locations WHERE code = 'EGDLS')
WHERE asset_tag = '676482638';

-- El trigger validará y registrará automáticamente
```

### Consultar Historial de Cambios

```sql
-- Vista de reporte (todos los campos listos)
SELECT * FROM asset_location_changes_report
ORDER BY fecha_cambio DESC;

-- Cambios de un activo específico
SELECT * FROM asset_location_changes
WHERE asset_tag = '676482638'
ORDER BY changed_at DESC;

-- Cambios realizados por un usuario
SELECT * FROM asset_location_changes
WHERE changed_by_email = 'admin@example.com'
ORDER BY changed_at DESC;

-- Cambios en un período
SELECT * FROM asset_location_changes
WHERE changed_at >= NOW() - INTERVAL '30 days'
ORDER BY changed_at DESC;

-- Activos que han cambiado de sede más de 3 veces
SELECT 
  asset_tag,
  COUNT(*) as num_cambios,
  MAX(changed_at) as ultimo_cambio
FROM asset_location_changes
GROUP BY asset_tag
HAVING COUNT(*) > 3
ORDER BY num_cambios DESC;
```

## Seguridad

### Políticas RLS

```sql
-- Admin puede ver todos los cambios
"Admin puede ver cambios de sede"

-- Supervisores solo ven cambios de sus sedes
"Supervisores ven cambios de sus sedes"
```

### Integridad de Datos

- `reason` tiene constraint CHECK: `char_length(reason) >= 10`
- `from_location_id` puede ser NULL (para activos que no tenían sede)
- `to_location_id` es NOT NULL (siempre debe ir a alguna sede)
- ON DELETE CASCADE en `asset_id` (si se elimina el activo, se mantiene el historial)
- ON DELETE SET NULL en usuarios (para auditoría histórica)

## Notificaciones por Correo

### Plantilla del Correo

El correo enviado incluye:
- 📧 **Asunto**: "🔄 Cambio de Sede - Activo [ETIQUETA]"
- 📝 **Contenido**:
  - Header con advertencia de auditoría
  - Datos del activo
  - Sede origen y destino
  - Usuario que realizó el cambio
  - Fecha y hora (timezone México)
  - **Justificación completa**
  - Footer con instrucciones

### Destinatarios

El sistema automáticamente:
1. Consulta todos los admin activos
2. Consulta supervisores de sede origen (si existe)
3. Consulta supervisores de sede destino
4. Elimina duplicados (un supervisor puede estar en ambas sedes)
5. Envía correo a cada destinatario único

### Manejo de Errores

- Si un correo falla, el sistema continúa con los demás
- Se registra en logs cuántos correos fueron exitosos/fallidos
- La actualización del activo NO se revierte si fallan las notificaciones

## Reportes y Análisis

### Ejemplo: Reporte Mensual

```sql
SELECT 
  to_char(changed_at, 'YYYY-MM') as mes,
  to_location_name as sede_destino,
  COUNT(*) as num_cambios,
  COUNT(DISTINCT asset_id) as activos_unicos
FROM asset_location_changes
GROUP BY mes, sede_destino
ORDER BY mes DESC, num_cambios DESC;
```

### Ejemplo: Análisis por Usuario

```sql
SELECT 
  changed_by_name as usuario,
  changed_by_email as email,
  COUNT(*) as cambios_realizados,
  COUNT(DISTINCT asset_id) as activos_movidos
FROM asset_location_changes
GROUP BY usuario, email
ORDER BY cambios_realizados DESC;
```

### Ejemplo: Flujo Entre Sedes

```sql
SELECT 
  from_location_name as origen,
  to_location_name as destino,
  COUNT(*) as movimientos
FROM asset_location_changes
WHERE from_location_name IS NOT NULL
GROUP BY origen, destino
ORDER BY movimientos DESC;
```

## Troubleshooting

### Error: "LOCATION_CHANGE_REQUIRES_REASON"

**Causa**: El trigger no encontró una razón válida en el contexto.

**Solución**: 
- En la aplicación: Verificar que el modal de justificación funciona correctamente
- En SQL: Ejecutar `set_config` antes del UPDATE

### Las notificaciones no llegan

**Verificar**:
1. Configuración SMTP en `.env.local`:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=tu-email@gmail.com
   SMTP_PASSWORD=tu-app-password
   ```
2. Que los usuarios tengan email válido en `auth.users`
3. Logs del servidor para errores de envío

### No puedo ver la auditoría

**Verificar RLS**:
```sql
-- Como admin
SELECT * FROM asset_location_changes;

-- Como supervisor
-- Solo verás cambios donde from_location_id o to_location_id 
-- coincida con tus sedes asignadas en user_locations
```

## Mantenimiento

### Limpieza de Registros Antiguos (Opcional)

```sql
-- Archivar registros de más de 2 años
CREATE TABLE asset_location_changes_archive AS
SELECT * FROM asset_location_changes
WHERE changed_at < NOW() - INTERVAL '2 years';

-- Eliminar de la tabla principal
DELETE FROM asset_location_changes
WHERE changed_at < NOW() - INTERVAL '2 years';
```

### Índices para Performance

Ya incluidos en la migración:
- `idx_asset_location_changes_asset` - búsquedas por activo
- `idx_asset_location_changes_from` - filtros por sede origen
- `idx_asset_location_changes_to` - filtros por sede destino
- `idx_asset_location_changes_date` - ordenamiento por fecha
- `idx_asset_location_changes_user` - filtros por usuario

## Casos de Uso

### 1. Reasignación por Traslado de Empleado
```
Activo: LAP-042 (Laptop Dell)
Origen: EGDLS - Guadalajara
Destino: EMTY - Monterrey
Razón: "Traslado definitivo del usuario Juanito Pérez a sucursal Monterrey efectivo 15-Ene-2026"
```

### 2. Reparación en Otra Sede
```
Activo: PRN-008 (Impresora HP)
Origen: EQRO - Querétaro
Destino: EGDLS - Guadalajara
Razón: "Envío a taller especializado en Guadalajara para reparación de placa madre, retorno estimado en 2 semanas"
```

### 3. Redistribución de Inventario
```
Activo: MON-025 (Monitor LG 27")
Origen: EMTY - Monterrey
Destino: EQRO - Querétaro
Razón: "Balanceo de inventario, EMTY tiene excedente y EQRO tiene faltante por nueva apertura de área"
```

## API Reference

### Server Action: updateAssetWithLocationChange

```typescript
import { updateAssetWithLocationChange } from '@/app/(app)/admin/assets/[id]/actions'

const result = await updateAssetWithLocationChange(
  assetId: string,
  updateData: AssetUpdateData,
  locationChangeReason?: string
)

// Returns: { success: boolean, data?: Asset, error?: string }
```

### API Endpoint: POST /api/assets/location-change-notify

```typescript
POST /api/assets/location-change-notify
Content-Type: application/json

{
  "assetId": "uuid",
  "assetTag": "LAP-042",
  "fromLocationId": "uuid",
  "toLocationId": "uuid",
  "reason": "Justificación del cambio..."
}

// Response:
{
  "success": true,
  "message": "Notificaciones enviadas: 5 exitosas, 0 fallidas",
  "recipientCount": 5,
  "successCount": 5,
  "failureCount": 0
}
```

## Dependencias

- ✅ `migration-assets-location-control.sql` debe estar aplicada
- ✅ Tabla `locations` con sedes activas
- ✅ Tabla `user_locations` con asignaciones de usuarios
- ✅ Configuración SMTP para envío de correos
- ✅ Usuarios con emails válidos

## Changelog

### v1.0.0 (2026-01-02)
- ✅ Implementación inicial
- ✅ Tabla de auditoría
- ✅ Trigger de validación
- ✅ Funciones de consulta
- ✅ RLS policies
- ✅ Vista de reportes
- ✅ Modal de confirmación en UI
- ✅ Notificaciones por correo
- ✅ Server actions para integración

---

**Nota**: Este sistema es crítico para la trazabilidad y control de activos. No modificar o deshabilitar sin aprobación explícita.
