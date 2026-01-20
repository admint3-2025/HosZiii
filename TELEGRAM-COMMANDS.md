# 💻 TELEGRAM - Comandos para Copiar y Pegar

> Todo lo que necesitas copiar exactamente para que funcione

---

## 🔧 PASO 1: Variables de Entorno

### Agregar a `.env.local`

Abre este archivo:
```
.env.local
```

Agrega esta línea al FINAL:

```bash
TELEGRAM_BOT_TOKEN=TU_TOKEN_AQUI
```

**Reemplaza `TU_TOKEN_AQUI` con el token que te dio BotFather**

Ejemplo completo:
```bash
TELEGRAM_BOT_TOKEN=7123456789:ABCxyz123456789ABCxyz123456789ABC
```

Guarda: `Ctrl+S`

---

## 🗄️ PASO 2: Migración SQL

### Copiar archivo completo

```
Archivo: supabase/migration-telegram-integration.sql
Todo el contenido → Ctrl+A, Ctrl+C
```

### Ir a Supabase

1. https://supabase.com/dashboard
2. Tu proyecto
3. SQL Editor (izquierda)
4. New Query (botón azul arriba)
5. Pegar: `Ctrl+V`
6. Ejecutar: `Ctrl+Enter`

---

## 🧪 PASO 3: Test Rápido

### Ver si todo funciona

En terminal, copia y pega:

```bash
cd /home/jmosorioe/Documentos/ZIII-Hos
bash test-telegram.sh
```

Deberías ver:
```
✅ Todos los archivos existen
✅ Documentación completa
```

---

## 👤 PASO 4: Obtener Chat ID

### En navegador, abre esta URL

Reemplaza el token con el TUYO:

```
https://api.telegram.org/bot7123456789:ABCxyz123456789ABCxyz123456789ABC/getUpdates
```

Busca en la respuesta:
```json
"id": 987654321
```

Copia ese número.

---

## 🔗 PASO 5: Vincular Chat ID

### En terminal, ejecuta este comando

Reemplaza:
- `987654321` → Tu Chat ID
- El token también debe ser el tuyo (después de `bot`)

```bash
curl -X POST http://localhost:3000/api/telegram/link \
  -H "Authorization: Bearer test" \
  -H "Content-Type: application/json" \
  -d '{"chat_id": "987654321"}'
```

Deberías ver:
```json
{"ok": true, "message": "Chat vinculado exitosamente"}
```

---

## ✅ PASO 6: Verificar Vinculación

### En terminal, ejecuta:

```bash
curl -X GET http://localhost:3000/api/telegram/status \
  -H "Authorization: Bearer test"
```

Deberías ver:
```json
{"ok": true, "linked": true, "chat_id": "4321"}
```

---

## 📨 PASO 7: Enviar Notificación de Prueba

### Método 1: Via TypeScript

Crea archivo `test-notification.ts`:

```typescript
import { sendMultiChannelNotification } from '@/lib/notifications/multi-channel'

async function test() {
  const result = await sendMultiChannelNotification({
    userId: 'TU_USER_ID_AQUI',
    type: 'generic',
    title: '🧪 Prueba de Telegram',
    message: 'Si ves esto en Telegram, ¡FUNCIONA! ✅',
    emailBody: '<h1>Prueba</h1><p>Notificación de prueba</p>',
    telegramTemplate: {
      title: '🧪 Prueba',
      message: 'Si ves esto en Telegram, ¡FUNCIONA! ✅'
    }
  })
  
  console.log('Resultado:', result)
}

test()
```

Ejecuta:
```bash
npm run dev
# En otra terminal:
npx ts-node test-notification.ts
```

### Método 2: Disparar un evento real

Completa una inspección RRHH con ítems críticos → Debería llegar notificación

---

## 🔄 PASO 8: Refactorizar Notificación Existente

### Abre archivo

```
src/app/api/inspections/complete-and-notify/route.ts
```

### Busca esta sección (línea ~220)

```typescript
// 9. Enviar correos a todos los admins
const emailPromises = emailRecipients
  .filter(admin => admin.email)
  .map(admin => sendMail({...}))

await Promise.all(emailPromises)

// 10. Crear notificaciones push
const notifications = pushRecipients.map(admin => ({...}))
await supabaseAdmin.from('notifications').insert(notifications)
```

### Reemplaza con esto

```typescript
// 9-10. Enviar notificaciones por 3 canales
import { sendMultiChannelNotification } from '@/lib/notifications/multi-channel'
import { TELEGRAM_TEMPLATES } from '@/lib/telegram'

const telegramData = {
  department: inspection.department,
  propertyCode: inspection.property_code,
  propertyName: inspection.property_name,
  criticalCount: criticalItems.length,
  threshold: CRITICAL_THRESHOLD,
}

await Promise.all(
  pushRecipients.map(admin =>
    sendMultiChannelNotification({
      userId: admin.id,
      type: 'inspection_critical',
      title: `🚨 Inspección crítica en ${inspection.property_code}`,
      message: `Se detectaron ${criticalItems.length} ítems críticos en ${inspection.department}`,
      emailBody: emailTemplate.html,
      telegramTemplate: TELEGRAM_TEMPLATES.inspection_critical(telegramData),
      link: `/inspections/rrhh/${inspectionId}`,
    })
  )
)
```

---

## 🎯 Checklist Rápido

Copia y pega esto en orden:

### 1. Agregar variable de entorno
```bash
# Editar .env.local
# Agregar: TELEGRAM_BOT_TOKEN=...
```

### 2. Ejecutar migración SQL
```sql
-- Copiar contenido de: supabase/migration-telegram-integration.sql
-- Ir a Supabase SQL Editor
-- Pegar y ejecutar (Ctrl+Enter)
```

### 3. Test básico
```bash
bash test-telegram.sh
```

### 4. Obtener chat ID
```
https://api.telegram.org/bot{TU_TOKEN}/getUpdates
```

### 5. Vincular
```bash
curl -X POST http://localhost:3000/api/telegram/link \
  -H "Authorization: Bearer test" \
  -H "Content-Type: application/json" \
  -d '{"chat_id": "TU_CHAT_ID"}'
```

### 6. Verificar
```bash
curl -X GET http://localhost:3000/api/telegram/status \
  -H "Authorization: Bearer test"
```

---

## 🚨 Errores Comunes y Soluciones

### Error: "TELEGRAM_BOT_TOKEN not set"

**Solución:**
```bash
# Verifica
cat .env.local | grep TELEGRAM_BOT_TOKEN

# Si no ves nada, no fue agregado
# Agrega la línea manualmente en .env.local
# Reinicia: npm run dev
```

---

### Error: "Chat not found"

**Solución:**
```bash
# 1. Abre en navegador:
https://api.telegram.org/bot{TU_TOKEN}/getUpdates

# 2. Copia el CHAT_ID exacto del JSON
# 3. Intenta vincular de nuevo
curl -X POST http://localhost:3000/api/telegram/link \
  -H "Authorization: Bearer test" \
  -H "Content-Type: application/json" \
  -d '{"chat_id": "CHAT_ID_EXACTO"}'
```

---

### Error: "Migration failed"

**Solución:**
```sql
-- En Supabase SQL Editor:
-- 1. Verifica si la tabla existe
SELECT * FROM user_telegram_chat_ids LIMIT 1;

-- 2. Si no existe, copia DE NUEVO el migration completo
-- 3. Ejecuta nuevamente
```

---

## ✅ Verificación Final

Ejecuta todos estos comandos y verifica que ves ✅:

```bash
# 1. Test suite
bash test-telegram.sh
# Esperas: ✅ Todos los archivos existen

# 2. Status (no vinculado aún)
curl -X GET http://localhost:3000/api/telegram/status \
  -H "Authorization: Bearer test"
# Esperas: "linked": false

# 3. Vincular
curl -X POST http://localhost:3000/api/telegram/link \
  -H "Authorization: Bearer test" \
  -H "Content-Type: application/json" \
  -d '{"chat_id": "TU_CHAT_ID"}'
# Esperas: "ok": true

# 4. Status (vinculado)
curl -X GET http://localhost:3000/api/telegram/status \
  -H "Authorization: Bearer test"
# Esperas: "linked": true

# 5. Verificar en BD
# En Supabase SQL Editor:
SELECT COUNT(*) FROM user_telegram_chat_ids;
# Esperas: 1
```

**Si todo es ✅ → ¡FUNCIONANDO!** 🎉

---

**Versión:** 1.0  
**Fecha:** 20 enero 2026  
**Tiempo:** 20 minutos total
