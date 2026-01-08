# Flujo de Autorización para Baja de Activos

## Resumen

Se implementó un sistema de aprobación para dar de baja activos que incluye:

1. **Solicitud de baja** con motivo obligatorio (mínimo 20 caracteres)
2. **Notificaciones por correo** a: responsable del activo, supervisores de la sede, y administradores
3. **Panel de aprobación** para administradores
4. **Historial completo** de todo el proceso en `asset_changes`

## Flujo

```
Usuario solicita baja → Correo a Admin/Supervisor/Responsable → Admin revisa → Aprueba/Rechaza → Notificación final
```

## Archivos Creados/Modificados

### SQL Migration
- `supabase/migration-asset-disposal-workflow.sql` - Tabla y funciones RPC

### Server Actions
- `src/app/(app)/admin/assets/disposal-actions.ts` - Lógica de negocio y emails

### Componentes UI
- `src/app/(app)/admin/assets/[id]/ui/DisposalRequestModal.tsx` - Modal para solicitar baja
- `src/app/(app)/admin/assets/ui/DisposalApprovalPanel.tsx` - Panel de aprobación (admins)

### Páginas Modificadas
- `src/app/(app)/admin/assets/page.tsx` - Muestra panel de solicitudes pendientes
- `src/app/(app)/admin/assets/[id]/page.tsx` - Obtiene solicitud pendiente
- `src/app/(app)/admin/assets/[id]/ui/AssetDetailView.tsx` - Botón "Solicitar Baja" y banner

## Aplicar Migración SQL

Ejecutar en Supabase SQL Editor:

```sql
-- Copiar y pegar el contenido completo de:
-- supabase/migration-asset-disposal-workflow.sql
```

## Tabla: asset_disposal_requests

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | PK |
| asset_id | uuid | Activo relacionado |
| requested_by | uuid | Usuario que solicita |
| requested_at | timestamptz | Fecha/hora de solicitud |
| reason | text | Motivo de la solicitud |
| status | enum | pending / approved / rejected |
| reviewed_by | uuid | Admin que revisó |
| reviewed_at | timestamptz | Fecha de revisión |
| review_notes | text | Notas de aprobación/rechazo |
| asset_snapshot | jsonb | Estado del activo al momento de solicitar |
| notification_sent_at | timestamptz | Cuándo se enviaron notificaciones |

## Funciones RPC

1. `create_disposal_request(p_asset_id, p_reason)` - Crear solicitud
2. `approve_disposal_request(p_request_id, p_notes)` - Aprobar y ejecutar baja
3. `reject_disposal_request(p_request_id, p_notes)` - Rechazar solicitud

## Notificaciones por Email

### Al crear solicitud:
- **Destinatarios**: Admins, supervisores de la sede, responsable del activo
- **Contenido**: Datos del activo, motivo, solicitante, historial reciente (últimos 10 cambios)

### Al aprobar:
- **Destinatarios**: Mismos que al crear
- **Contenido**: Confirmación de aprobación, quién aprobó, notas

### Al rechazar:
- **Destinatario**: Solo el solicitante
- **Contenido**: Notificación de rechazo con motivo

## Permisos

- **Crear solicitud**: admin, supervisor, usuarios con `can_manage_assets`
- **Aprobar/Rechazar**: Solo admin
- **Ver solicitudes pendientes**: admin, supervisor (las suyas)

## Historial en asset_changes

Se registran:
- `disposal_approved` - Cuando se aprueba la baja
- `disposal_rejected` - Cuando se rechaza la solicitud

Todo queda trazable con usuario, fecha/hora y motivos.
