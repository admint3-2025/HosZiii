# 🚀 TELEGRAM - INICIO RÁPIDO (Paso a Paso)

**Tiempo total: 20 minutos**

---

## 📋 ÍNDICE RÁPIDO

```
Paso 1: Crear Bot en Telegram              (5 min)
Paso 2: Configurar Variables de Entorno    (2 min)
Paso 3: Ejecutar Migración SQL             (5 min)
Paso 4: Obtener tu Chat ID                 (3 min)
Paso 5: Test de Vinculación                (2 min)
Paso 6: Listo ✅
```

---

## ✅ PASO 1: Crear Bot en Telegram (5 minutos)

### 1.1 Abre Telegram

- En navegador: https://web.telegram.org
- O en app móvil/desktop

### 1.2 Busca @BotFather

En el buscador escribe: `@BotFather`

Haz clic en el resultado de abajo (verificado con ✓)

### 1.3 Envía el comando /newbot

Escribe en el chat: `/newbot`

El bot va a preguntar:

```
Alright, a new bot. How are we going to call it? 
Please choose a name for your bot.
```

### 1.4 Elige un nombre

Escribe cualquier nombre. Ejemplo:

```
ZIII-Hos Notifications
```

Presiona Enter.

### 1.5 Elige un username

El bot te pregunta:

```
Good. Now let's choose a username for your bot. 
It must end in `bot`. For example, TetrisBot or tetris_bot.
```

Escribe algo único. Ejemplo:

```
ziii_hos_notifications_bot
```

Presiona Enter.

### 1.6 ¡LISTO! Copia el Token

El bot responde:

```
Done! Congratulations on your new bot. 
You'll find it at t.me/ziii_hos_notifications_bot. 

You can now add a description, about section and profile 
picture for your bot, see /help for a list of commands.

Use this token to access the HTTP API:
7123456789:ABCxyz123456789ABCxyz123456789ABC
```

**👉 COPIA TODO EL TOKEN (la parte larga después de "Use this token to access...")**

```
Ejemplo:
7123456789:ABCxyz123456789ABCxyz123456789ABC
```

Guárdalo en lugar seguro (Notepad, Notes, etc.)

---

## 🔧 PASO 2: Configurar Variables de Entorno (2 minutos)

### 2.1 Abre tu archivo `.env.local`

En VS Code:

```
Archivo → Abrir Archivo
Buscar: .env.local
```

O en terminal:

```bash
code .env.local
```

### 2.2 Agrega esta línea al final

```bash
TELEGRAM_BOT_TOKEN=7123456789:ABCxyz123456789ABCxyz123456789ABC
```

Reemplaza con TU token (el que copiaste en Paso 1.6)

### 2.3 Guarda el archivo

```
Ctrl+S (Windows/Linux)
Cmd+S (Mac)
```

### 2.4 Reinicia el servidor

En terminal donde corre `npm run dev`:

```
Presiona: Ctrl+C
Luego: npm run dev
```

Espera hasta ver: `✓ Ready in XXXms`

---

## 🗄️ PASO 3: Ejecutar Migración SQL (5 minutos)

### 3.1 Abre Supabase Dashboard

Ve a: https://supabase.com/dashboard

Selecciona tu proyecto

### 3.2 Ve a SQL Editor

En la izquierda:

```
SQL Editor
```

Haz clic en "New Query" (arriba)

### 3.3 Copia el SQL

Abre este archivo en tu proyecto:

```
supabase/migration-telegram-integration.sql
```

Copia TODO el contenido (Ctrl+A, Ctrl+C)

### 3.4 Pega en Supabase

En el editor que abriste en 3.2:

```
Pega: Ctrl+V
```

### 3.5 Ejecuta

Haz clic en el botón azul "RUN" (arriba a la derecha)

O presiona: `Ctrl+Enter`

### 3.6 Verifica

Deberías ver:

```
Success: Migration executed successfully
0 rows affected
```

Sin errores rojos ✓

---

## 👤 PASO 4: Obtener tu Chat ID (3 minutos)

### 4.1 Envía /start al bot

En Telegram:

```
Busca: @ziii_hos_notifications_bot
(el que creaste en Paso 1.5)
```

Envía: `/start`

El bot responde con un mensaje de bienvenida.

### 4.2 Obtén tu Chat ID

En navegador, ve a esta URL:

```
https://api.telegram.org/bot7123456789:ABCxyz123456789ABCxyz123456789ABC/getUpdates
```

Reemplaza `7123456789:ABCxyz123456789ABCxyz123456789ABC` con TU token

### 4.3 Busca tu Chat ID

En la página que se abre, busca:

```json
{
  "ok": true,
  "result": [
    {
      "update_id": 123456789,
      "message": {
        "message_id": 1,
        "from": {
          "id": 987654321,   ← ESTE ES TU CHAT_ID
          "first_name": "Tu Nombre",
          ...
        }
```

**👉 Copia el número en "id": (ej: 987654321)**

Anótalo.

---

## 🧪 PASO 5: Test de Vinculación (2 minutos)

### 5.1 Abre Terminal

```bash
# En tu proyecto
cd /home/jmosorioe/Documentos/ZIII-Hos
```

### 5.2 Ejecuta el test

```bash
bash test-telegram.sh
```

Deberías ver:

```
✅ Todos los archivos existen
✅ Documentación completa
⚠️  TELEGRAM_BOT_TOKEN configurado
✅ test suite completado
```

### 5.3 Prueba el endpoint

En otra terminal:

```bash
curl -X GET http://localhost:3000/api/telegram/status \
  -H "Authorization: Bearer test"
```

Deberías ver:

```json
{
  "ok": true,
  "linked": false,
  "chat_id": null
}
```

Si ves esto ✅ **tu setup está correcto**

---

## ✅ PASO 6: Vinculación Completa

### 6.1 Vincula tu Chat ID

En terminal:

```bash
curl -X POST http://localhost:3000/api/telegram/link \
  -H "Authorization: Bearer test" \
  -H "Content-Type: application/json" \
  -d '{"chat_id": "987654321"}'
```

Reemplaza `987654321` con tu Chat ID (del Paso 4.3)

Deberías ver:

```json
{
  "ok": true,
  "message": "Chat vinculado exitosamente"
}
```

Y **en Telegram** deberías recibir un mensaje:

```
✅ ¡Vinculación exitosa!

Tu cuenta está conectada al sistema...
```

### 6.2 Verifica la vinculación

```bash
curl -X GET http://localhost:3000/api/telegram/status \
  -H "Authorization: Bearer test"
```

Deberías ver:

```json
{
  "ok": true,
  "linked": true,
  "chat_id": "4321"
}
```

**¡LISTO! 🎉**

---

## 🎯 RESUMEN - LO QUE HICISTE

| Paso | Qué | Resultado |
|------|-----|-----------|
| 1 | Crear bot | Token API obtenido ✓ |
| 2 | Configurar env | `TELEGRAM_BOT_TOKEN` agregado ✓ |
| 3 | Migración SQL | Tabla creada en Supabase ✓ |
| 4 | Chat ID | Tu número de chat obtenido ✓ |
| 5 | Test | Endpoints funcionan ✓ |
| 6 | Vinculación | Usuario ↔ Telegram conectado ✓ |

---

## 🚀 PRÓXIMO PASO

Ahora tus notificaciones irán **automáticamente a Telegram**.

### Para refactorizar una notificación existente:

**Abre:** `src/app/api/inspections/complete-and-notify/route.ts`

**Reemplaza:**
```typescript
// Viejo: enviar email + push por separado
```

**Con:**
```typescript
import { sendMultiChannelNotification } from '@/lib/notifications/multi-channel'

await sendMultiChannelNotification({
  userId: admin.id,
  type: 'inspection_critical',
  title: '🚨 Inspección Crítica',
  message: 'Se detectaron 3 ítems críticos',
  emailBody: emailTemplate.html,
  telegramTemplate: {
    title: '🚨 Inspección Crítica',
    message: 'Se detectaron 3 ítems críticos'
  },
  link: '/inspections/123'
})
```

**Resultado:** Notificación llega a los 3 canales:
- 📧 Email
- 🔔 In-app
- 📱 Telegram

---

## ❓ ERRORES COMUNES

### ❌ "TELEGRAM_BOT_TOKEN not set"

**Solución:**
```bash
# Verifica que está en .env.local
cat .env.local | grep TELEGRAM_BOT_TOKEN

# Debe mostrar:
# TELEGRAM_BOT_TOKEN=7123456789:ABC...

# Si no lo ves, agrégalo (Paso 2)
# Reinicia: npm run dev
```

---

### ❌ "getUpdates retorna vacío"

**Solución:**
1. Abre https://web.telegram.org
2. Busca tu bot
3. Envía `/start` nuevamente
4. Intenta de nuevo

---

### ❌ "Chat ID incorrecto"

**Solución:**
```bash
# Abre la URL en navegador NUEVAMENTE
https://api.telegram.org/bot7123456789:ABC.../getUpdates

# Asegúrate de que:
# 1. El token es correcto (cópialo de nuevo)
# 2. Acabas de enviar /start al bot
# 3. En la respuesta busca exactamente "id":
```

---

### ❌ "Vinculación no funciona"

**Debug:**
```bash
# 1. Verifica que el servidor está corriendo
npm run dev

# 2. Verifica logs
# Deberías ver: [Telegram] ✓ Chat_id guardado...

# 3. Verifica la BD
# En Supabase SQL Editor:
SELECT * FROM user_telegram_chat_ids;
# Debe mostrar 1 fila
```

---

## 📞 SOPORTE

Si algo no funciona:

1. Ejecuta: `bash test-telegram.sh`
2. Busca ❌ en la salida
3. Revisa la sección "ERRORES COMUNES" arriba
4. Si persiste, revisa: [TELEGRAM-VALIDATION-CHECKLIST.md](TELEGRAM-VALIDATION-CHECKLIST.md)

---

## ✨ Listo para Usar

```
✅ Bot creado
✅ Token configurado
✅ Migración ejecutada
✅ Chat ID vinculado
✅ Tests pasados
✅ Telegram funcionando

= PRODUCCIÓN LISTA
```

Ahora puedes empezar a refactorizar notificaciones para usar los 3 canales 🎉

---

**Fecha:** 20 de enero de 2026  
**Tiempo total:** ~20 minutos  
**Dificultad:** Fácil ✓
