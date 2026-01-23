# 🚀 Telegram Integration - Implementation Roadmap

> **Estado:** Opción 1 COMPLETADA + Base para Opción 2
>
> **Fecha:** 20 de enero de 2026
>
> **Arquitecto:** Sistema escalable multi-canal de notificaciones

---

## 📋 Resumen Ejecutivo

### ¿Qué se implementó?

Una arquitectura centralizada que envía notificaciones simultáneamente por **3 canales**:

1. **📧 Email** - Via SMTP
2. **🔔 Push In-app** - Via Supabase Realtime
3. **📱 Telegram** - Via Bot API

### ¿Cómo funciona?

```
Evento (inspección crítica)
    ↓
sendMultiChannelNotification()
    ├─ Obtener usuario
    ├─ Enviar Email ✓
    ├─ Crear Push (Supabase) ✓
    └─ Enviar Telegram ✓
    ↓
Todos reciben = consistencia
```

### ¿Por qué 3 canales?

- **Email:** Historial, garantizado
- **Push:** Inmediato, en-app
- **Telegram:** Móvil, notificación del SO

---

## 📦 Archivos Creados

### Módulo Telegram (`src/lib/telegram/`)

| Archivo | Propósito |
|---------|-----------|
| `client.ts` | Comunicación con Telegram Bot API |
| `templates.ts` | Formatos HTML optimizados para Telegram |
| `service.ts` | Lógica de negocio (vincular/enviar) |
| `index.ts` | Exportaciones |

### Sistema Multi-Canal

| Archivo | Propósito |
|---------|-----------|
| `src/lib/notifications/multi-channel.ts` | **Core:** Enviar por 3 canales |

### Endpoints API

| Ruta | Método | Propósito |
|------|--------|-----------|
| `/api/telegram/webhook` | POST | Recibir mensajes del bot |
| `/api/telegram/link` | POST | Vincular usuario con Telegram |
| `/api/telegram/unlink` | POST | Desvincularse |
| `/api/telegram/status` | GET | Ver estado de vinculación |

### Base de Datos

| Archivo | Propósito |
|---------|-----------|
| `supabase/migration-telegram-integration.sql` | Tabla `user_telegram_chat_ids` |

### Documentación

| Archivo | Propósito |
|---------|-----------|
| `TELEGRAM-INTEGRATION-SETUP.md` | Guía de configuración |
| `TELEGRAM-EXAMPLES.md` | Ejemplos de uso + refactorización |
| `TELEGRAM-ROADMAP.md` | **Este archivo** |

---

## 🎯 Plan de Implementación (Pasos)

### Fase 1: Setup (1-2 horas)

#### 1.1 Crear Bot en Telegram
- [ ] Abrir Telegram
- [ ] Buscar `@BotFather`
- [ ] `/newbot` y seguir pasos
- [ ] Guardar Token API

#### 1.2 Variables de Entorno
- [ ] Agregar `TELEGRAM_BOT_TOKEN=...` a `.env.local`
- [ ] Agregar `TELEGRAM_WEBHOOK_URL=...` (prod)

#### 1.3 Migración SQL
- [ ] Copiar `supabase/migration-telegram-integration.sql`
- [ ] Ejecutar en Supabase Dashboard
- [ ] Verificar tabla creada

**Checklist:** `npm run dev` y no hay errores ✓

---

### Fase 2: Pruebas Básicas (30 min)

#### 2.1 Test Status
```bash
curl -X GET http://localhost:3000/api/telegram/status \
  -H "Authorization: Bearer $USER_TOKEN"
```

Esperado: `{"ok": true, "linked": false}`

#### 2.2 Test Link
```bash
curl -X POST http://localhost:3000/api/telegram/link \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"chat_id": "YOUR_CHAT_ID"}'
```

Esperado: Mensaje de confirmación en Telegram

#### 2.3 Test Status Again
```bash
curl -X GET http://localhost:3000/api/telegram/status \
  -H "Authorization: Bearer $USER_TOKEN"
```

Esperado: `{"ok": true, "linked": true, "chat_id": "XXXX"}`

**Checklist:** Todo funciona ✓

---

### Fase 3: Refactorizar Notificaciones Existentes (2-4 horas)

#### 3.1 Inspecciones Críticas
- [ ] Abrir `src/app/api/inspections/complete-and-notify/route.ts`
- [ ] Reemplazar código de notificaciones con `sendMultiChannelNotification()`
- [ ] Ver ejemplo en `TELEGRAM-EXAMPLES.md`

**Antes:**
```typescript
// 40 líneas: email + push separados
```

**Después:**
```typescript
// 3 líneas: todo junto
await sendMultiChannelNotification({...})
```

#### 3.2 Tickets de Mantenimiento
- [ ] `src/lib/email/maintenance-ticket-notifications.ts`
- [ ] Refactorizar `notifyMaintenanceTicketCreated()`
- [ ] Refactorizar `notifyMaintenanceTicketComment()`

#### 3.3 Otros eventos
- [ ] Tickets asignados
- [ ] Cambios de estado
- [ ] Comentarios en tickets

**Checklist:** Todas las notificaciones envían por 3 canales ✓

---

### Fase 4: UI para Vincular Telegram (1-2 horas)

#### 4.1 Crear componente
```bash
src/components/TelegramSettings.tsx
```

Features:
- [ ] Botón "Vincular Telegram"
- [ ] Estado: "Vinculado ✓" o "No vinculado"
- [ ] Botón "Desvincularse"

#### 4.2 Integrar en Settings
- [ ] Agregar a página de configuración
- [ ] Ubicación: Settings > Notificaciones > Telegram

#### 4.3 Flujo de vinculación
```
Usuario hace click en "Vincular"
    ↓
Abre bot de Telegram (t.me/tu_bot)
    ↓
Bot responde con instrucciones
    ↓
Usuario obtiene chat_id
    ↓
Copia y pega en app
    ↓
POST /api/telegram/link
    ↓
✅ "¡Vinculado exitosamente!"
```

---

## 🔄 Escalabilidad a Opción 2

### Cambios Necesarios

#### 1. Tabla de Preferencias
```sql
CREATE TABLE notification_preferences (
  user_id UUID (FK)
  notification_type TEXT
  channels JSONB
  UNIQUE(user_id, notification_type)
)
```

#### 2. Actualizar Lógica
```typescript
export async function sendMultiChannelNotification(
  payload: NotificationPayload
) {
  // CAMBIO: Leer preferencias primero
  const prefs = await getNotificationPreferences(
    payload.userId,
    payload.type
  )
  
  const channels = prefs?.channels || DEFAULT_CHANNELS
  
  // Usar channels para decidir qué enviar
  if (channels.email) { await sendEmail(...) }
  if (channels.push) { await sendPush(...) }
  if (channels.telegram) { await sendTelegram(...) }
}
```

#### 3. Múltiples Dispositivos Telegram
```sql
-- Remover UNIQUE(user_id) WHERE is_active
-- Agregar UNIQUE(user_id, device_name) para soportar múltiples
```

#### 4. Interfaz Web
- Agregar Settings > Notificaciones
- Checkboxes por tipo: Email | Push | Telegram
- Gestionar dispositivos Telegram

---

## 💡 Ejemplos Prácticos

### Ejemplo 1: Notificación Simple
```typescript
import { sendMultiChannelNotification } from '@/lib/notifications/multi-channel'

await sendMultiChannelNotification({
  userId: 'admin-id',
  type: 'inspection_critical',
  title: '🚨 Inspección Crítica',
  message: 'Se detectaron 3 ítems críticos',
  emailBody: '<h1>Inspección Crítica</h1>...',
  telegramTemplate: {
    title: '🚨 Inspección Crítica',
    message: 'Se detectaron 3 ítems críticos'
  },
  link: '/inspections/123'
})
```

**Resultado:**
- ✉️ Email enviado
- 🔔 Notificación in-app
- 📱 Mensaje en Telegram (si está vinculado)

### Ejemplo 2: Bulk Send
```typescript
import { sendNotificationToBulk } from '@/lib/notifications/multi-channel'

const adminIds = ['admin1', 'admin2', 'admin3']

const result = await sendNotificationToBulk(adminIds, {
  type: 'inspection_critical',
  title: '🚨 Alerta General',
  message: 'Se completó la inspección',
  // Nota: Sin emailBody, no envía email
})

console.log(`${result.successful.length} exitosos, ${result.failed.length} fallos`)
```

---

## 🧪 Testing

### Test Manual
1. Vincular usuario con Telegram
2. Disparar evento (ej: crear inspección crítica)
3. Verificar que llegó email ✓
4. Verificar que apareció en notificaciones in-app ✓
5. Verificar que llegó mensaje en Telegram ✓

### Test Automatizado (Próximo)
```bash
npm run test -- telegram.integration.test.ts
```

Tests:
- [ ] Vincular chat_id
- [ ] Enviar notificación simple
- [ ] Bulk send
- [ ] Error handling

---

## 🔐 Seguridad

### ✅ Implementado
- [ ] RLS en tabla `user_telegram_chat_ids`
- [ ] Validación de usuario en endpoints
- [ ] No exponer chat_id completo
- [ ] HTTPS en webhooks

### 📋 Próximo
- [ ] Rate limiting en webhooks
- [ ] Encripción de chat_id en BD
- [ ] Audit log de vinculaciones

---

## 📊 Monitoreo

### Logs a Buscar
```
[Telegram] ✓ Mensaje enviado a {chat_id}
[Telegram] ✗ Error {error_code}: {description}
[Notifications] Bulk send: X éxito, Y fallos
```

### Métricas Recomendadas
- Mensajes enviados/día
- Tasa de error por canal
- Usuarios vinculados
- Tiempo de entrega

---

## ❓ FAQ

### ¿Qué pasa si el usuario no está vinculado?

**Respuesta:** El mensaje NO se envía. Los otros canales (email, push) SÍ se envían.

```typescript
// En sendTelegramNotification():
if (!chatId) {
  console.log('Usuario no tiene Telegram vinculado')
  return false // No hay error crítico
}
```

### ¿Puedo deshabilitar Telegram para ciertos eventos?

**Respuesta SÍ - Opción 2:** Tabla de preferencias

**Para Opción 1:** Por ahora se envía por defecto

### ¿El webhook recibe todas las notificaciones?

**Respuesta:** No. El webhook SOLO recibe mensajes que el usuario envíe al bot (ej: `/start`, `/help`).

Los mensajes del bot AL usuario se envían directo via API, no por webhook.

### ¿Es obligatorio vincular Telegram?

**Respuesta:** No. Las notificaciones siguen llegando por email + push.

Telegram es OPCIONAL para usuarios que lo quieran.

---

## 📞 Soporte

### Troubleshooting

**P: El bot no responde**
- Verifica `TELEGRAM_BOT_TOKEN` en `.env.local`
- Reinicia servidor: `npm run dev`

**P: Los mensajes no se entregan**
- Verifica con `GET /api/telegram/status`
- Debe retornar `linked: true`

**P: Error en webhook**
- Busca `[Telegram Webhook]` en logs
- Verifica que URL es accesible desde internet

---

## ✅ Checklist Final

### Fase 1 ✓
- [x] Módulo Telegram creado
- [x] Sistema multi-canal implementado
- [x] Endpoints creados
- [x] Migración SQL creada
- [x] Documentación completa

### Fase 2 (Próximo)
- [ ] Setup inicial (Bot + env vars)
- [ ] Pruebas básicas
- [ ] Refactorizar notificaciones existentes

### Fase 3 (Optional)
- [ ] UI para vincular Telegram
- [ ] Preferencias de usuario

### Fase 4 (Futuro)
- [ ] Comandos interactivos en Telegram
- [ ] Dashboard de notificaciones
- [ ] Analytics

---

## 📈 Estadísticas Esperadas (en 1 mes)

- **Usuarios vinculados:** 60-70% de admins
- **Mensajes/día:** 100-200
- **Tasa de entrega:** >99%
- **Reducción de clic-throughs:** -30% (más rápido)

---

## 🎓 Notas de Diseño

### Por qué 3 canales?

1. **Email**: Historial, auditoría, garantizado
2. **Push in-app**: Inmediato, contexto visual
3. **Telegram**: Móvil, notificación del SO

**Resultado:** Usuario siempre se entera.

### Por qué escalable a Opción 2?

1. **Preferencias:** Algunos quieren solo Telegram
2. **Múltiples devices:** Múltiples teléfonos
3. **Control granular:** Por tipo de evento

---

## 🚀 Inicio Rápido

### 5 minutos
1. Crear bot en BotFather
2. Agregar `TELEGRAM_BOT_TOKEN` a `.env.local`
3. Ejecutar migración SQL

### Prueba primer envío
```typescript
import { sendMultiChannelNotification } from '@/lib/notifications/multi-channel'

await sendMultiChannelNotification({
  userId: 'tu-user-id',
  type: 'generic',
  title: 'Prueba',
  message: 'Si ves esto, ¡funciona!',
})
```

---

**Documento creado:** 20 de enero de 2026
**Próxima revisión:** Después de Fase 2
**Mantenedor:** Equipo de desarrollo
