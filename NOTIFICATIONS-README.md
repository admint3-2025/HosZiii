# 🔔 Sistema de Notificaciones In-App

Sistema de notificaciones en tiempo real con Supabase Realtime para mantener a los usuarios informados sobre cambios en tickets.

## Características

### ✅ Notificaciones Automáticas
El sistema genera notificaciones automáticamente para:
- **Nuevo ticket creado**: Notifica a supervisores y admins
- **Ticket asignado**: Notifica al agente y al solicitante
- **Estado cambiado**: Notifica al solicitante y al agente asignado
- **Nuevo comentario**: Notifica a todos los participantes del ticket
- **Ticket resuelto/cerrado**: Notificaciones especiales

### 🔄 Tiempo Real con Supabase Realtime
- Las notificaciones aparecen instantáneamente sin recargar la página
- Contador de notificaciones no leídas actualizado en tiempo real
- Soporte para notificaciones del navegador (si el usuario lo permite)

### 🎨 UI/UX
- **Badge animado** con contador de notificaciones no leídas
- **Panel dropdown** elegante con scroll y diseño responsive
- **Iconos contextuales** según el tipo de notificación
- **Timestamps relativos** (Hace 5 min, Hace 2 h, etc.)
- **Enlaces directos** a los tickets relacionados

### 🔐 Seguridad
- Row Level Security (RLS) habilitado
- Los usuarios solo ven sus propias notificaciones
- Triggers con permisos `SECURITY DEFINER`

## Instalación

### 1. Ejecutar la migración en Supabase

Abre tu proyecto en Supabase Dashboard:
https://supabase.com/dashboard/project/[TU_PROJECT_ID]/editor

Ve a **SQL Editor** y ejecuta el contenido de:
```
supabase/migration-add-notifications.sql
```

Si tu operación separa personal **IT vs MAINTENANCE** (columna `profiles.asset_category`), ejecuta después:
```
supabase/migration-filter-notifications-by-asset-category.sql
```

O usa el script de ayuda:
```powershell
.\scripts\apply-notifications-migration.ps1
```

### 2. Reiniciar el servidor de desarrollo

```bash
npm run dev
```

### 3. Verificar

- Deberías ver el ícono de campana 🔔 en el header
- Crea un ticket de prueba y verifica que lleguen notificaciones
- Asigna un ticket y verifica que el agente reciba notificación

## Tipos de Notificaciones

| Tipo | Icono | Descripción | Destinatarios |
|------|-------|-------------|---------------|
| `TICKET_CREATED` | 📨 | Nuevo ticket creado | Supervisores, Admins |
| `TICKET_ASSIGNED` | 🎯 | Ticket asignado | Agente asignado, Solicitante |
| `TICKET_STATUS_CHANGED` | 🔄 | Estado actualizado | Solicitante, Agente |
| `TICKET_COMMENT_ADDED` | 💬 | Nuevo comentario | Participantes del ticket |
| `TICKET_RESOLVED` | ✅ | Ticket resuelto | Solicitante |
| `TICKET_CLOSED` | 🔒 | Ticket cerrado | Solicitante |
| `TICKET_ESCALATED` | ⚠️ | Ticket escalado | Supervisores |

## Estructura de Base de Datos

### Tabla `notifications`

```sql
- id: uuid (PK)
- user_id: uuid (FK -> auth.users)
- type: notification_type (enum)
- title: text
- message: text
- ticket_id: uuid (FK -> tickets)
- ticket_number: bigint
- actor_id: uuid (FK -> auth.users) - Usuario que generó la acción
- is_read: boolean
- created_at: timestamptz
- read_at: timestamptz
```

### Triggers Automáticos

1. **trg_notify_ticket_created**: Se ejecuta al crear un ticket
2. **trg_notify_ticket_assigned**: Se ejecuta al asignar un agente
3. **trg_notify_ticket_status_changed**: Se ejecuta al cambiar el estado
4. **trg_notify_comment_added**: Se ejecuta al agregar un comentario

## API del Componente

### NotificationBell

```tsx
<NotificationBell />
```

**Props**: Ninguno (obtiene el usuario del contexto de Supabase)

**Features**:
- Auto-carga notificaciones al montar
- Suscripción a cambios en tiempo real
- Solicita permisos para notificaciones del navegador
- Marca como leídas individualmente o todas a la vez
- Cierra automáticamente al hacer clic en un enlace

## Personalización

### Agregar nuevo tipo de notificación

1. Agregar valor al enum en la migración:
```sql
alter type notification_type add value 'MI_NUEVO_TIPO';
```

2. Crear trigger o llamar manualmente:
```sql
insert into notifications (user_id, type, title, message, ticket_id)
values (
  'user-id-aqui',
  'MI_NUEVO_TIPO',
  'Título',
  'Mensaje descriptivo',
  'ticket-id-aqui'
);
```

3. Agregar icono en `NotificationBell.tsx`:
```tsx
case 'MI_NUEVO_TIPO':
  return '🆕'
```

### Desactivar notificaciones del navegador

Eliminar este bloque en `NotificationBell.tsx`:
```tsx
useEffect(() => {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}, [])
```

## Troubleshooting

### Las notificaciones no aparecen en tiempo real

1. Verifica que Realtime esté habilitado en tu proyecto de Supabase
2. Verifica que la tabla `notifications` esté en la publicación:
```sql
select * from pg_publication_tables where pubname = 'supabase_realtime';
```

### Error: "permission denied for table notifications"

Verifica que las políticas RLS estén creadas:
```sql
select * from pg_policies where tablename = 'notifications';
```

### El contador no se actualiza

- Abre la consola del navegador y verifica errores
- Verifica que el usuario tenga sesión activa
- Verifica que las notificaciones tengan el `user_id` correcto

## Próximas Mejoras Sugeridas

- [ ] Página dedicada de historial de notificaciones
- [ ] Filtros por tipo de notificación
- [ ] Configuración de preferencias (qué notificaciones recibir)
- [ ] Notificaciones por email (además de in-app)
- [ ] Sonido al recibir notificación
- [ ] Agrupar notificaciones similares
- [ ] Notificaciones push (PWA)

## Soporte

Para dudas o problemas, contacta al equipo de desarrollo.
