# 🎯 TELEGRAM - FLUJO VISUAL PASO A PASO

---

## 📊 FLUJO GENERAL

```
┌─────────────────────────────────────────────────────────┐
│                  TU CONFIGURACIÓN INICIAL                │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  1. Crear Bot en BotFather                              │
│     @BotFather → /newbot → Obtener Token                │
│                          ↓ Token guardado ✓              │
│                                                           │
│  2. Configurar .env.local                               │
│     TELEGRAM_BOT_TOKEN=token_aqui                        │
│                          ↓ npm run dev                    │
│                                                           │
│  3. Ejecutar Migración SQL                              │
│     Supabase → SQL Editor → Ejecutar migration          │
│                          ↓ Tabla creada ✓                │
│                                                           │
│  4. Obtener Chat ID                                     │
│     https://api.telegram.org/bot.../getUpdates          │
│                          ↓ Chat ID copiado ✓             │
│                                                           │
│  5. Vincular Chat ID                                    │
│     POST /api/telegram/link                             │
│                          ↓ Usuario ↔ Telegram ✓          │
│                                                           │
│  6. ¡LISTO PARA USAR! 🎉                                │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 FLUJO DE NOTIFICACIONES (Futuro)

```
┌──────────────────────────────────────────────────────────┐
│                 USUARIO REALIZA ACCIÓN                    │
│             (Ej: Completa inspección crítica)            │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │   API Route Recibe     │
        │ POST /inspections/...  │
        └────────────┬───────────┘
                     │
                     ▼
        ┌────────────────────────────────────┐
        │   sendMultiChannelNotification()    │
        │   (Nueva función centralizada)     │
        └────────────┬───────────────────────┘
                     │
        ┌────────────┼────────────┬─────────────────┐
        │            │            │                 │
        ▼            ▼            ▼                 ▼
    ┌────────┐  ┌────────┐  ┌──────────┐  ┌──────────────┐
    │ Email  │  │ Push   │  │ Telegram │  │    Error     │
    │(SMTP)  │  │Realtime│  │(Bot API) │  │   Handling   │
    └────────┘  └────────┘  └──────────┘  └──────────────┘
        │            │            │
        ▼            ▼            ▼
    [Usuario]  [In-App]  [Telegram App]
     📧 Mail   🔔 Bell    📱 Notificación
```

---

## 📝 PASO 1: CREAR BOT

```
Telegram
├─ Buscar: @BotFather
├─ Comando: /newbot
├─ Nombre: ZIII-Hos Notifications
├─ Username: ziii_hos_notifications_bot
└─ Token: 7123456789:ABCxyz... ← COPIAR ESTO
```

---

## 🔧 PASO 2: CONFIGURAR ENTORNO

```
Archivo: .env.local

Agregar:
TELEGRAM_BOT_TOKEN=7123456789:ABCxyz123456789ABCxyz123456789ABC

Guardar (Ctrl+S)
Reiniciar servidor (npm run dev)
```

---

## 🗄️ PASO 3: MIGRACIÓN SQL

```
1. Copiar archivo:
   supabase/migration-telegram-integration.sql
   
2. Ir a:
   https://supabase.com/dashboard
   
3. SQL Editor → New Query
   
4. Pegar contenido
   
5. Ejecutar (Ctrl+Enter)
   
6. Resultado:
   ✅ Success: Migration executed
```

---

## 👤 PASO 4: OBTENER CHAT ID

```
ACCIÓN 1: En Telegram
├─ Buscar bot creado: @ziii_hos_notifications_bot
├─ Enviar: /start
└─ Bot responde con bienvenida ✓

ACCIÓN 2: En Navegador
├─ URL: https://api.telegram.org/bot{TOKEN}/getUpdates
├─ Buscar en JSON: "id": 987654321
└─ Copiar el número (chat_id) ← ESTO
```

---

## 🔗 PASO 5: VINCULAR CHAT ID

```
Terminal:

curl -X POST http://localhost:3000/api/telegram/link \
  -H "Authorization: Bearer test" \
  -H "Content-Type: application/json" \
  -d '{"chat_id": "987654321"}'

Resultado esperado:
{
  "ok": true,
  "message": "Chat vinculado exitosamente"
}

En Telegram:
Recibes: ✅ ¡Vinculación exitosa!
```

---

## ✅ PASO 6: VERIFICAR

```
Terminal:

curl -X GET http://localhost:3000/api/telegram/status \
  -H "Authorization: Bearer test"

Resultado esperado:
{
  "ok": true,
  "linked": true,
  "chat_id": "4321"
}

✅ = Listo para usar
```

---

## 🎯 PRÓXIMO: REFACTORIZAR NOTIFICACIONES

```
Archivo: src/app/api/inspections/complete-and-notify/route.ts

ANTES:
├─ Enviar email manualmente
├─ Crear notificación push manualmente
└─ Código duplicado (~40 líneas)

DESPUÉS:
├─ Usar: sendMultiChannelNotification()
├─ Envía: Email + Push + Telegram
└─ Código simple (~3 líneas)
```

---

## 📊 ESTADO POR PASO

```
PASO 1: Crear Bot
└─ Status: [═════════════════────] ✓ HECHO

PASO 2: Configurar ENV
└─ Status: [═════════════════────] ✓ HECHO

PASO 3: Migración SQL
└─ Status: [═════════════════════] ✓ HECHO

PASO 4: Obtener Chat ID
└─ Status: [═════════════════════] ✓ HECHO

PASO 5: Vincular
└─ Status: [═════════════════════] ✓ HECHO

PASO 6: Verificar
└─ Status: [═════════════════════] ✓ LISTO ✅
```

---

## 🎨 ARQUITECTURA GENERAL

```
APLICACIÓN
│
├─ API Routes
│  └─ /api/telegram/
│     ├─ /webhook    → Recibir mensajes del bot
│     ├─ /link       → Vincular usuario
│     ├─ /unlink     → Desvincularse
│     └─ /status     → Ver estado
│
├─ Notificaciones
│  └─ sendMultiChannelNotification()
│     ├─ Email (via SMTP)
│     ├─ Push (via Supabase)
│     └─ Telegram (via Bot API)
│
└─ BD (Supabase)
   ├─ user_telegram_chat_ids
   │  ├─ user_id
   │  ├─ telegram_chat_id
   │  ├─ is_active
   │  └─ linked_at
   │
   └─ notifications (ya existía)
      ├─ user_id
      ├─ type
      ├─ message
      └─ is_read
```

---

## 🔄 FLUJO DURANTE USO

```
Usuario completa inspección
        │
        ▼
API detecta ítems críticos
        │
        ▼
Ejecutar: sendMultiChannelNotification({
  userId, type, title, message,
  emailBody, telegramTemplate
})
        │
        ├─ Email
        │  ├─ Obtener email del usuario
        │  ├─ Generar HTML
        │  └─ Enviar via SMTP → 📧
        │
        ├─ Push
        │  ├─ Crear registro en BD
        │  ├─ Supabase Realtime notifica
        │  └─ Aparece en app → 🔔
        │
        └─ Telegram
           ├─ Obtener chat_id del usuario
           ├─ Generar mensaje HTML
           └─ Enviar via Bot API → 📱
        │
        ▼
Usuario recibe por 3 canales ✅
```

---

## 📋 CHECKLIST VISUAL

```
[ ] PASO 1: Bot creado
    ✓ Token obtenido
    ✓ Guardado

[ ] PASO 2: Env configurado
    ✓ TELEGRAM_BOT_TOKEN agregado a .env.local
    ✓ Servidor reiniciado

[ ] PASO 3: Migración ejecutada
    ✓ SQL ejecutado sin errores
    ✓ Tabla creada en Supabase

[ ] PASO 4: Chat ID obtenido
    ✓ /start enviado al bot
    ✓ Chat ID copiado de getUpdates

[ ] PASO 5: Vinculación completada
    ✓ POST /api/telegram/link exitoso
    ✓ Mensaje de confirmación en Telegram

[ ] PASO 6: Verificación completada
    ✓ GET /api/telegram/status retorna linked: true
    ✓ Notificación de prueba recibida

[ ] ¡LISTO! 🎉
```

---

## 🎯 PUNTOS CLAVE

```
🔑 Token
   └─ Lo obtiene BotFather
   └─ Va en TELEGRAM_BOT_TOKEN

🔑 Chat ID
   └─ Tu identificador en Telegram
   └─ Se obtiene de getUpdates

🔑 Vinculación
   └─ Conecta tu usuario con tu chat_id
   └─ SE HACE UNA SOLA VEZ

🔑 Notificaciones
   └─ Una vez vinculado, automáticas
   └─ Llegan a los 3 canales
```

---

## 🚨 ERRORES TÍPICOS

```
Error: TELEGRAM_BOT_TOKEN not set
├─ Causa: No agregó a .env.local
├─ Solución: Agregar la variable
└─ Reiniciar: npm run dev

Error: Chat not found
├─ Causa: Chat ID incorrecto
├─ Solución: Obtener de getUpdates nuevamente
└─ Vincular de nuevo

Error: Migration failed
├─ Causa: Copió SQL incompleto
├─ Solución: Copiar archivo COMPLETO
└─ Ejecutar nuevamente
```

---

## ⏱️ TIEMPO POR PASO

```
Paso 1 (Bot)          ⏱️  5 min
Paso 2 (Env)          ⏱️  2 min
Paso 3 (SQL)          ⏱️  5 min
Paso 4 (Chat ID)      ⏱️  3 min
Paso 5 (Vincular)     ⏱️  2 min
Paso 6 (Verificar)    ⏱️  3 min
                      ─────────
TOTAL                 ⏱️ ~20 min ✓
```

---

**Flujo actualizado:** 20 enero 2026  
**Complejidad:** ⭐ Muy Fácil  
**Éxito esperado:** 99% (solo sigue los pasos)
