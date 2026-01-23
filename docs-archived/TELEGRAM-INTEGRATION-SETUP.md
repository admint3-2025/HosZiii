# 🤖 Integración con Telegram - Guía de Configuración

## Estado: Opción 1 implementada (Escalable a Opción 2)

Sistema centralizado que envía notificaciones simultáneamente a:
- 📧 Email (SMTP)
- 🔔 Push in-app (Supabase Realtime)
- 📱 Telegram (Bot API)

---

## ⚙️ Configuración Inicial

### 1. Crear Bot en Telegram

1. Abre Telegram
2. Busca `@BotFather`
3. Escribe `/newbot`
4. Sigue los pasos:
   - Nombre: ej. "ZIII-Hos Notifications"
   - Username: ej. "ziii_hos_notifications_bot"
5. **Guarda el Token API** que recibes

### 2. Configurar Variables de Entorno

Agrega a tu `.env.local`:

```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Webhook (para que el bot reciba mensajes)
TELEGRAM_WEBHOOK_URL=https://tu-dominio.com/api/telegram/webhook
```

### 3. Ejecutar Migración SQL

```bash
# En Supabase Dashboard:
# SQL Editor > Copiar contenido de supabase/migration-telegram-integration.sql
```

Esto crea la tabla `user_telegram_chat_ids` que mapea usuarios con chat_ids.

---

## 🔗 Flujos de Vinculación

### Flujo A: Link desde Bot (Simple)

```
Usuario escribe /start en bot
    ↓
Bot responde con instrucciones
    ↓
Usuario ve link de vinculación en app
    ↓
Usuario hace clic → POST /api/telegram/link
    ↓
Chat guardado en BD
```

### Flujo B: Link desde App (Recomendado - Opción 2)

Para implementar: permitir botón "Vincular Telegram" que abre:
```
https://t.me/your_bot_username?start=user_id_aqui
```

---

## 📝 Endpoints Disponibles

### POST `/api/telegram/webhook`
Recibe mensajes del bot. Maneja comandos:
- `/start` - Información de bienvenida
- `/help` - Ayuda
- `/unlink` - Desvincularse (desde app)

### POST `/api/telegram/link`
Vincula usuario con chat_id

**Headers:**
```json
{
  "Authorization": "Bearer token_aqui"
}
```

**Body:**
```json
{
  "chat_id": "1234567890",
  "device_name": "Mi Telegram (opcional)"
}
```

**Respuesta:**
```json
{
  "ok": true,
  "message": "Chat vinculado exitosamente"
}
```

### POST `/api/telegram/unlink`
Desvincula usuario

**Headers:**
```json
{
  "Authorization": "Bearer token_aqui"
}
```

**Respuesta:**
```json
{
  "ok": true,
  "message": "Desvinculación exitosa"
}
```

### GET `/api/telegram/status`
Ver estado de vinculación

**Headers:**
```json
{
  "Authorization": "Bearer token_aqui"
}
```

**Respuesta:**
```json
{
  "ok": true,
  "linked": true,
  "chat_id": "7890"  // Solo últimos 4 dígitos
}
```

---

## 🚀 Usando el Sistema de Notificaciones Centralizado

### Ejemplo: Notificación de Inspección Crítica

**Antes (sin Telegram):**
```typescript
// Correo + Push in-app
const admins = await getAdmins()
for (const admin of admins) {
  await sendMail({ ... })
  await createNotification({ ... })
}
```

**Ahora (con Telegram - Opción 1):**
```typescript
import { sendMultiChannelNotification } from '@/lib/notifications/multi-channel'
import { TELEGRAM_TEMPLATES } from '@/lib/telegram'

// Solo 1 línea por usuario:
await sendMultiChannelNotification({
  userId: admin.id,
  type: 'inspection_critical',
  title: '🚨 Inspección Crítica',
  message: 'Se detectaron 3 ítems críticos...',
  emailBody: emailHtmlTemplate,
  telegramTemplate: TELEGRAM_TEMPLATES.inspection_critical({
    department: 'RRHH',
    propertyCode: 'PROP-001',
    propertyName: 'Sede Central',
    criticalCount: 3,
    threshold: 8,
  }),
})
```

### Resultado: ✅ Simultáneamente:
1. Email enviado
2. Notificación push in-app
3. Mensaje en Telegram (si está vinculado)

---

## 📊 Estructura de BD

### Tabla: `user_telegram_chat_ids`

```sql
id                  UUID (PK)
user_id             UUID (FK -> auth.users)
telegram_chat_id    TEXT          -- ID del chat en Telegram
device_name         TEXT          -- Nombre del dispositivo
is_active           BOOLEAN       -- Si está activo
linked_at           TIMESTAMPTZ   -- Cuándo se vinculó
last_used_at        TIMESTAMPTZ   -- Último mensaje recibido
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
```

**Restricciones:**
- Un usuario solo puede tener 1 chat_id activo (Opción 1)
- En Opción 2: permitir múltiples chat_ids para diferentes dispositivos

---

## 🔄 Escalabilidad a Opción 2

### Cambios necesarios:

1. **Preferencias de usuario** (nueva tabla):
```sql
CREATE TABLE notification_preferences (
  user_id UUID (FK)
  notification_type TEXT
  channels JSON -- {'email': true, 'telegram': true, 'push': true}
)
```

2. **Múltiples chat_ids por usuario**:
```sql
-- Remover UNIQUE constraint en user_telegram_chat_ids
-- Agregar (user_id, device_name) como composite key
```

3. **Control granular** en `sendMultiChannelNotification()`:
```typescript
// Leer preferencias del usuario antes de enviar
const prefs = await getNotificationPreferences(userId, notificationType)
const channels = prefs?.channels || DEFAULT_CHANNELS
```

4. **Interfaz web** para:
   - Ver dispositivos vinculados
   - Cambiar preferencias por tipo
   - Gestionar múltiples chats

---

## ✅ Checklist de Implementación

- [ ] Crear bot en BotFather
- [ ] Agregar `TELEGRAM_BOT_TOKEN` a `.env.local`
- [ ] Ejecutar migración SQL en Supabase
- [ ] Probar `/api/telegram/status` (debe retornar `linked: false`)
- [ ] Probar `/api/telegram/link` (vincular chat_id)
- [ ] Probar `/api/telegram/unlink` (desvincularse)
- [ ] Refactorizar una notificación existente para usar `sendMultiChannelNotification()`
- [ ] Probar que llegan por los 3 canales (email, push, telegram)

---

## 🐛 Troubleshooting

### El bot no responde a `/start`

**Causa:** Webhook no está configurado

**Solución:** 
```bash
# Hacer POST a Telegram API
curl -X POST https://api.telegram.org/bot{TOKEN}/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://tu-dominio.com/api/telegram/webhook"}'
```

### Los mensajes no se envían

**Checks:**
1. ¿El usuario tiene chat_id guardado? 
   - `GET /api/telegram/status` debe retornar `linked: true`

2. ¿El `TELEGRAM_BOT_TOKEN` es correcto?
   - Revisa en `.env.local`

3. ¿Hay errores en logs?
   - Busca `[Telegram]` en la consola del servidor

### Error: `TELEGRAM_BOT_TOKEN not set`

- Agrega a `.env.local` y reinicia servidor
- Verifica que no hay espacios: `TELEGRAM_BOT_TOKEN=abc123` ✅

---

## 📚 Referencias

- [Telegram Bot API Docs](https://core.telegram.org/bots/api)
- [Webhooks vs Polling](https://core.telegram.org/bots/webhooks)
- [BotFather Documentation](https://core.telegram.org/bots#botfather)

---

## 🔐 Seguridad

- ✅ Usar `SECURITY DEFINER` en funciones RLS
- ✅ Validar `user_id` en cada endpoint
- ✅ No exponer chat_id completo (solo últimos 4 dígitos)
- ✅ Encriptar chat_id en tránsito (HTTPS obligatorio)
- ✅ Rate limiting en webhooks (implementar)

---

## 📈 Próximas Fases

**Fase 1 (Actual):** Opción 1 - Notificaciones por 3 canales ✅
**Fase 2:** Opción 2 - Preferencias de usuario + múltiples devices
**Fase 3:** Dashboard de notificaciones en Telegram
**Fase 4:** Comandos interactivos en Telegram (aprobar, rechazar, etc.)
