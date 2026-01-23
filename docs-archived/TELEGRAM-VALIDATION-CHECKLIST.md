# 🤖 Telegram Integration - Validation Checklist

> Guía paso a paso para validar que todo funciona correctamente

---

## ✅ Pre-Requisitos

- [ ] Node.js 18+ instalado
- [ ] Next.js project funcionando (`npm run dev` sin errores)
- [ ] Supabase project activo
- [ ] Acceso a Telegram (créate cuenta si no tienes)

---

## 🔧 Fase 1: Configuración Inicial

### 1.1 Crear Bot en Telegram

**Tiempo estimado:** 5 minutos

#### Pasos:
1. Abre Telegram (app o web)
2. En el buscador escribe: `@BotFather`
3. Haz clic en el resultado
4. Escribe: `/newbot`
5. Sigue las instrucciones:
   - **Nombre del bot:** Ej. `ZIII-Hos Notifications`
   - **Username:** Ej. `ziii_hos_notifications_bot`

#### Resultado esperado:
```
Congratulations on your new bot. You'll find it at 
t.me/ziii_hos_notifications_bot. 

You can now add a description, about section and profile 
picture for your bot, see /help for a list of commands.

Use this token to access the HTTP API:
5123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi
```

- [ ] **Copia el Token y guárdalo en lugar seguro**

---

### 1.2 Configurar Variables de Entorno

**Tiempo estimado:** 2 minutos

#### En `.env.local`:

```bash
# Agregar estas líneas al final
TELEGRAM_BOT_TOKEN=5123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi
```

#### Verificación:
```bash
# Terminal 1: Ver logs
npm run dev

# Terminal 2: Buscar si se carga el token
grep -r "TELEGRAM_BOT_TOKEN" src/lib/telegram/
```

Resultado esperado: Sin errores en logs

- [ ] Token agregado correctamente
- [ ] No hay errores en `npm run dev`

---

### 1.3 Ejecutar Migración SQL

**Tiempo estimado:** 5 minutos

#### En Supabase Dashboard:

1. Ve a tu proyecto en https://supabase.com/dashboard
2. SQL Editor → Nuevo query
3. Copia TODO el contenido de:
   ```
   supabase/migration-telegram-integration.sql
   ```
4. Pega en el editor
5. Haz clic en "Run" (o Ctrl+Enter)

#### Resultado esperado:
```
Success: Migration executed successfully

0 rows
```

#### Verificación:
```sql
-- En Supabase SQL Editor: Ver la tabla creada
SELECT * FROM user_telegram_chat_ids;
-- Debe retornar: 0 rows (tabla vacía, es normal)
```

- [ ] Migración ejecutada sin errores
- [ ] Tabla `user_telegram_chat_ids` existe

---

## 🧪 Fase 2: Pruebas de API

### 2.1 Test: Status sin vincular

**Propósito:** Verificar que el endpoint funciona

#### Pasos:
1. Obtén tu `USER_ID` desde Supabase:
   - Dashboard → SQL Editor → New query
   - ```sql
     SELECT id FROM auth.users LIMIT 1;
     ```
   - Copia el `id`

2. En terminal:
   ```bash
   # Obtén un token de acceso (temporal para pruebas)
   # O usa curl con header básico
   
   curl -X GET http://localhost:3000/api/telegram/status \
     -H "Authorization: Bearer test_token_aqui"
   ```

   > **Nota:** En desarrollo, el endpoint puede requerir autenticación real.

#### Resultado esperado:
```json
{
  "ok": true,
  "linked": false,
  "chat_id": null
}
```

- [ ] Endpoint responde sin errores
- [ ] `linked: false` (no vinculado aún)

---

### 2.2 Test: Obtener tu Chat ID de Telegram

**Propósito:** Necesitas tu `chat_id` para las pruebas

#### Pasos:
1. En Telegram, envía un mensaje a tu bot:
   - Busca `@ziii_hos_notifications_bot`
   - Envía: `/start`

2. El bot debe responder con bienvenida

3. Para obtener tu `chat_id`, abre esta URL en navegador:
   ```
   https://api.telegram.org/bot{TOKEN}/getUpdates
   ```
   
   Reemplaza `{TOKEN}` con tu `TELEGRAM_BOT_TOKEN`

4. Busca en el JSON:
   ```json
   {
     "ok": true,
     "result": [
       {
         "update_id": 123456789,
         "message": {
           "message_id": 1,
           "from": {
             "id": 987654321,  ← ESTE ES TU CHAT_ID
             "first_name": "Tu nombre"
           }
         }
       }
     ]
   }
   ```

- [ ] Encontraste tu `CHAT_ID`

---

### 2.3 Test: Vincular Chat ID

**Propósito:** Guardar mapeo usuario ↔ Telegram

#### Pasos:
1. En terminal:
   ```bash
   curl -X POST http://localhost:3000/api/telegram/link \
     -H "Authorization: Bearer test_token" \
     -H "Content-Type: application/json" \
     -d '{
       "chat_id": "987654321",
       "device_name": "Mi Telegram"
     }'
   ```

2. En Telegram, deberías recibir:
   ```
   ✅ ¡Vinculación exitosa!
   
   Tu cuenta está conectada al sistema...
   ```

#### Resultado esperado:
```json
{
  "ok": true,
  "message": "Chat vinculado exitosamente"
}
```

- [ ] Vincular fue exitoso
- [ ] Recibiste mensaje de confirmación en Telegram

---

### 2.4 Test: Status - Vinculado

**Propósito:** Verificar que quedó guardado

#### Pasos:
```bash
curl -X GET http://localhost:3000/api/telegram/status \
  -H "Authorization: Bearer test_token"
```

#### Resultado esperado:
```json
{
  "ok": true,
  "linked": true,
  "chat_id": "4321"
}
```

- [ ] `linked: true` 
- [ ] `chat_id` muestra últimos 4 dígitos

---

## 📨 Fase 3: Enviar Notificación de Prueba

### 3.1 Test: Envío de Notificación Multi-Canal

**Propósito:** Verificar que los 3 canales funcionan

#### Pasos:

1. Crea archivo temporal de prueba:
   ```bash
   touch test-notification.ts
   ```

2. Pega este código:
   ```typescript
   import { sendMultiChannelNotification } from '@/lib/notifications/multi-channel'
   
   const result = await sendMultiChannelNotification({
     userId: 'tu-user-id', // Reemplaza
     type: 'generic',
     title: '🧪 Prueba de Notificación',
     message: 'Si ves esto en los 3 lugares, ¡FUNCIONA! ✅',
     emailBody: '<h1>Prueba</h1><p>Si recibes este email, funciona!</p>',
     telegramTemplate: {
       title: '🧪 Prueba',
       message: 'Si ves esto en Telegram, funciona!'
     },
     link: '/inspections'
   })
   
   console.log('Resultado:', result)
   ```

3. Ejecuta (desde directorio del proyecto):
   ```bash
   npm run dev
   # En otra terminal:
   node -r ts-node/register test-notification.ts
   ```

#### Resultado esperado:

**En consola:**
```
[Notifications] 📤 Enviando "🧪 Prueba de Notificación" al usuario...
[Notifications] ✓ Email enviado a user@example.com
[Notifications] ✓ Push in-app enviado
[Notifications] ✓ Telegram enviado
[Notifications] ✅ Resultado: { success: true, channels: { email: { sent: true }, ... } }
```

**En tu bandeja de email:**
- [ ] Recibirás email con asunto: `🧪 Prueba de Notificación`

**En la app (Bell icon):**
- [ ] Aparecerá nueva notificación en la campana

**En Telegram:**
- [ ] Recibirás mensaje: `🧪 Prueba - Si ves esto...`

---

## 🔄 Fase 4: Integración con Notificaciones Reales

### 4.1 Refactorizar Inspección Crítica

**Propósito:** Usar el nuevo sistema en código real

#### Antes (actual):
```typescript
// src/app/api/inspections/complete-and-notify/route.ts
// ~40 líneas combinando email + push
```

#### Después (refactorizado):
```typescript
import { sendMultiChannelNotification } from '@/lib/notifications/multi-channel'

// Para cada admin:
await sendMultiChannelNotification({
  userId: admin.id,
  type: 'inspection_critical',
  title: '🚨 Inspección crítica...',
  message: '...',
  emailBody: emailTemplate.html,
  telegramTemplate: TELEGRAM_TEMPLATES.inspection_critical({...}),
  link: '/inspections/rrhh/' + inspectionId
})
```

#### Test manual:
1. Ve a la app
2. Completa una inspección RRHH con ítems críticos
3. Verifica que recibes notificación en los 3 canales

- [ ] Email recibido ✓
- [ ] Notificación in-app ✓
- [ ] Mensaje Telegram ✓

---

## 🚫 Troubleshooting

### ❌ Error: `TELEGRAM_BOT_TOKEN not set`

**Causa:** Variable de entorno no configurada

**Solución:**
```bash
# 1. Verifica que está en .env.local
cat .env.local | grep TELEGRAM_BOT_TOKEN

# 2. Reinicia servidor
npm run dev

# 3. Verifica en logs
grep -i telegram logs
```

---

### ❌ Error: `Chat not found: 123456789`

**Causa:** Chat ID incorrecto o el bot no tiene acceso

**Solución:**
```bash
# 1. Verifica tu chat_id (Fase 2.2)
# 2. Asegúrate de que enviaste /start al bot
# 3. Prueba manualmente con curl:

curl -X POST https://api.telegram.org/bot{TOKEN}/sendMessage \
  -H "Content-Type: application/json" \
  -d '{"chat_id": "123456789", "text": "Test"}'
```

---

### ❌ Email no llega

**Causa:** SMTP no configurado

**Solución:**
```bash
# Verifica variables SMTP en .env.local
cat .env.local | grep SMTP

# Revisa los logs del servidor:
npm run dev
# Busca [sendMail] o [SMTP]
```

---

### ❌ Push in-app no aparece

**Causa:** Realtime no habilitado o RLS bloqueando

**Solución:**
```sql
-- En Supabase SQL Editor:

-- 1. Verificar que tabla está en Realtime
SELECT * FROM pg_publication_tables 
WHERE tablename = 'notifications';

-- 2. Si no aparece, agregar:
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- 3. Verificar RLS
SELECT * FROM pg_policies WHERE tablename = 'notifications';
```

---

## 📋 Checklist Final

### Fase 1: Setup
- [ ] Bot creado en BotFather
- [ ] Token guardado
- [ ] Env var configurada
- [ ] Migración ejecutada
- [ ] `npm run dev` sin errores

### Fase 2: APIs
- [ ] Status devuelve `linked: false`
- [ ] Chat ID obtenido
- [ ] Link fue exitoso
- [ ] Status devuelve `linked: true`
- [ ] Mensaje de confirmación en Telegram

### Fase 3: Notificación
- [ ] Email recibido
- [ ] Notificación in-app aparece
- [ ] Mensaje en Telegram llega

### Fase 4: Real
- [ ] Inspección crítica envía por 3 canales
- [ ] Sin errores en logs
- [ ] Todo funciona en producción

---

## 🎉 ¡Listo!

Si todas las casillas están marcadas, **Telegram está completamente integrado** y funcionando.

### Próximos pasos:
1. Refactorizar otras notificaciones
2. Crear UI para vincular/desvincular
3. Implementar Opción 2 (preferencias)

---

## 📞 Soporte

Si algo no funciona:

1. Revisa los logs: `npm run dev`
2. Busca mensajes `[Telegram]`
3. Revisa el troubleshooting arriba
4. Verifica que todas las Fase 1 están ✓

**Logs importantes:**
```
[Telegram] ✓ Mensaje enviado a {chat_id}
[Telegram] ✗ Error
[Notifications] 📤 Enviando
[Notifications] ✅ Resultado
```

---

Versión: 1.0
Fecha: 20 enero 2026
Última actualización: Hoy
