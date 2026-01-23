# 🤖 Diagrama de Arquitectura - Integración Telegram

## 1. Flujo General de Notificaciones

```
┌─────────────────────────────────────────────────────────────────────┐
│                         EVENTO                                      │
│                 (Inspección crítica, Ticket, etc.)                  │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
        ┌────────────────────────────────────────────┐
        │   sendMultiChannelNotification(payload)    │
        │                                            │
        │  - Valida usuario                          │
        │  - Prepara templates                       │
        │  - Inicia 3 canales en paralelo            │
        └────────────────────────────────────────────┘
                 │              │              │
       ┌─────────┴──────┬──────┴──────┬───────┴─────────┐
       │                │             │                 │
       ▼                ▼             ▼                 ▼
    ┌──────┐        ┌──────┐     ┌────────┐      ┌───────────┐
    │ EMAIL│        │ PUSH │     │TELEGRAM│      │  ERROR    │
    │(SMTP)│        │(REALTIME)  │(BOT API)      │ HANDLING  │
    └──────┘        └──────┘     └────────┘      └───────────┘
       │                │             │                │
       ▼                ▼             ▼                ▼
    Gmail/         In-App        Telegram        Log + Report
    Outlook      Notification     Message
       │                │             │
       └────────────────┼─────────────┘
                        │
                        ▼
            ┌─────────────────────────┐
            │   NotificationResult    │
            │  {                      │
            │    success: true/false  │
            │    channels: {          │
            │      email: {...}       │
            │      push: {...}        │
            │      telegram: {...}    │
            │    }                    │
            │  }                      │
            └─────────────────────────┘
```

---

## 2. Flujo de Vinculación Telegram

### A. Desde Bot (/start)

```
┌─────────────────┐
│  Usuario envía  │
│     /start      │
│   al bot en     │
│    Telegram     │
└────────┬────────┘
         │
         ▼
    ┌─────────────────────────────┐
    │ Bot responde con:           │
    │ "Para vincular, ve a:       │
    │  Settings > Telegram"       │
    └─────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│   Usuario abre app web          │
│   Settings > Telegram           │
│   Botón: "Vincular"             │
└────────┬────────────────────────┘
         │
         ▼
    ┌───────────────────────────────────────┐
    │ App obtiene chat_id del usuario       │
    │ (Telegram expone en los mensajes)     │
    └────────┬────────────────────────────────┘
             │
             ▼
    ┌──────────────────────────────────────────────┐
    │ POST /api/telegram/link                      │
    │ {                                            │
    │   chat_id: "987654321",                      │
    │   device_name: "Mi Telegram"                 │
    │ }                                            │
    └────────┬───────────────────────────────────────┘
             │
             ▼
    ┌──────────────────────────────────────────────┐
    │ saveTelegramChatId(userId, chatId)           │
    │                                              │
    │ INSERT INTO user_telegram_chat_ids {         │
    │   user_id,                                   │
    │   telegram_chat_id,                          │
    │   is_active: true                            │
    │ }                                            │
    └────────┬───────────────────────────────────────┘
             │
             ▼
    ┌──────────────────────────────────────────────┐
    │ sendTelegramMessage(chat_id,                 │
    │   "✅ ¡Vinculación exitosa!")                │
    └────────┬───────────────────────────────────────┘
             │
             ▼
    ┌──────────────────────────────────┐
    │ Usuario ve confirmación ✅       │
    │ en Telegram                      │
    │                                  │
    │ ✅ ¡Vinculación exitosa!         │
    │ Ahora recibirás notificaciones   │
    └──────────────────────────────────┘
```

### B. Estructura de BD

```
┌─────────────────────────────────────────────────────────┐
│         user_telegram_chat_ids                          │
├─────────────────────────────────────────────────────────┤
│ id (UUID PK)                                            │
│ user_id (FK → auth.users)                              │
│ telegram_chat_id (TEXT) - ID único del chat            │
│ device_name (TEXT) - Ej: "Mi iPhone"                   │
│ is_active (BOOLEAN) - true/false                       │
│ linked_at (TIMESTAMPTZ) - Cuándo se vinculó            │
│ last_used_at (TIMESTAMPTZ) - Última notificación       │
│ created_at, updated_at                                 │
├─────────────────────────────────────────────────────────┤
│ UNIQUE(user_id) WHERE is_active = true                 │
│ → 1 chat_id activo por usuario (Opción 1)              │
│ → En Opción 2: permite múltiples                       │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Envío de Notificación Multi-Canal

```
┌──────────────────────────────────────────────────────────┐
│  await sendMultiChannelNotification({                    │
│    userId: "admin-123",                                 │
│    type: "inspection_critical",                         │
│    title: "🚨 Inspección Crítica",                       │
│    message: "Se detectaron 3 ítems críticos",           │
│    emailBody: "<h1>...</h1>",                           │
│    telegramTemplate: { title, message },                │
│    link: "/inspections/456"                             │
│  })                                                      │
└────────────────────────────┬───────────────────────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
            ▼                ▼                ▼
      ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
      │  EMAIL       │ │  PUSH IN-APP │ │  TELEGRAM    │
      └──────────────┘ └──────────────┘ └──────────────┘
            │                │                │
            │    1. Obtener  │    1. Obtener
            │    usuario →   │    chat_id
            │    supabase    │
            │                │    2. Validar
            │    2. sendMail │    que existe
            │                │
            │    3. Esperar  │    3. Formatear
            │    respuesta   │    mensaje HTML
            │                │
            │                │    4. sendTelegramMessage()
            │                │
            │    INSERT      │    5. Esperar
            │    notifications│    respuesta
            │    (Supabase)  │
            │                │
            │    Esperar     │
            │    INSERT OK   │
            │                │
      ┌─────┴─────────┬──────┴────────┬──────┘
      │               │               │
      ▼               ▼               ▼
   Email         Push        Telegram
  enviado      in-app       enviado
   ✅          ✅             ✅
      │               │               │
      └───────────────┼───────────────┘
                      │
                      ▼
          ┌─────────────────────────┐
          │  NotificationResult     │
          │  {                      │
          │    success: true,       │
          │    channels: {          │
          │      email: {sent: true}│
          │      push: {sent: true} │
          │      telegram: {sent:..}│
          │    }                    │
          │  }                      │
          └─────────────────────────┘
```

---

## 4. Arquitectura de Carpetas

```
ZIII-Hos/
│
├── src/
│   ├── lib/
│   │   ├── telegram/                    ← NUEVO MÓDULO
│   │   │   ├── client.ts               (Telegram API calls)
│   │   │   ├── templates.ts            (Formatos de mensajes)
│   │   │   ├── service.ts              (Lógica de negocio)
│   │   │   └── index.ts                (Exportar todo)
│   │   │
│   │   ├── notifications/
│   │   │   └── multi-channel.ts         ← NUEVA (Core system)
│   │   │
│   │   ├── email/
│   │   │   ├── mailer.ts               (EXISTENTE - usar como está)
│   │   │   └── templates.ts            (EXISTENTE - usar)
│   │   │
│   │   ├── supabase/
│   │   │   ├── server.ts               (EXISTENTE)
│   │   │   └── admin.ts                (EXISTENTE)
│   │   │
│   │   └── ...
│   │
│   └── app/
│       └── api/
│           ├── inspections/
│           │   └── complete-and-notify/
│           │       └── route.ts        (REFACTORIZAR)
│           │
│           ├── telegram/               ← NUEVOS ENDPOINTS
│           │   ├── webhook/route.ts    (Recibir bot)
│           │   ├── link/route.ts       (Vincular)
│           │   ├── unlink/route.ts     (Desvincularse)
│           │   └── status/route.ts     (Estado)
│           │
│           └── ...
│
├── supabase/
│   ├── migration-telegram-integration.sql    ← NUEVA
│   ├── migration-inspections-notifications.sql (EXISTENTE)
│   └── ...
│
├── docs/
│   ├── TELEGRAM-INTEGRATION-SETUP.md         ← NUEVO (Setup)
│   ├── TELEGRAM-EXAMPLES.md                  ← NUEVO (Ejemplos)
│   ├── TELEGRAM-ROADMAP.md                   ← NUEVO (Plan)
│   ├── TELEGRAM-VALIDATION-CHECKLIST.md      ← NUEVO (Testing)
│   ├── TELEGRAM-SUMMARY.md                   ← NUEVO (Resumen)
│   ├── TELEGRAM-ARCHITECTURE.md              ← ESTE ARCHIVO
│   └── ...
│
└── .env.local
    TELEGRAM_BOT_TOKEN=...                    ← AGREGAR
```

---

## 5. Flujo de Datos End-to-End

```
USUARIO EN APP
    │
    ▼
┌───────────────────────┐
│ Completa Inspección   │
│ con ítems críticos    │
└────────┬──────────────┘
         │
         ▼
┌────────────────────────────────┐
│ POST /api/inspections/complete │
│ complete-and-notify/route.ts   │
└────────┬───────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────────┐
    │ Obtener admins                           │
    │ supabase.rpc('get_admin_emails')         │
    │ → [admin1, admin2, admin3]               │
    └────────┬─────────────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────────────┐
    │ Para cada admin:                         │
    │ sendMultiChannelNotification()           │
    └────────┬────────────────────────────────┘
             │
    ┌────────┴───────┬─────────────┬──────────┐
    │                │             │          │
    ▼                ▼             ▼          ▼
┌──────────┐   ┌──────────┐  ┌──────────┐  ┌──────────┐
│ EMAIL    │   │  PUSH    │  │TELEGRAM  │  │  RESULT  │
│          │   │          │  │          │  │          │
│1. Get    │   │1. Get    │  │1. Get    │  │ Logging  │
│  user    │   │  user_id │  │  chat_id │  │          │
│  email   │   │          │  │          │  │ Return   │
│          │   │2. Insert │  │2. Send   │  │ status   │
│2. Send  │   │  to DB   │  │  via API │  │          │
│  via    │   │          │  │          │  │ Success  │
│  SMTP   │   │3. Realtime│  │3. Log    │  │ or       │
│          │   │  Update  │  │  result  │  │ partial  │
│3. Log    │   │          │  │          │  │          │
│  result  │   │4. Return │  │4. Return │  │ Return   │
└──────────┘   └──────────┘  └──────────┘  └──────────┘
    │                │             │          │
    └────────────────┼─────────────┴──────────┘
                     │
                     ▼
            ┌────────────────────┐
            │ NotificationResult │
            │                    │
            │ {                  │
            │   success: true,   │
            │   channels: {      │
            │     email: sent    │
            │     push: sent     │
            │     telegram: sent │
            │   }                │
            │ }                  │
            └────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
     ADMIN 1     ADMIN 2      ADMIN 3
     ✉️ 📱 📲     ✉️ 📱 📲      ✉️ 📱 📲
     
     (Email)    (Push)       (Telegram)
```

---

## 6. Escalabilidad - Opción 1 a Opción 2

### Opción 1 (Actual)

```
Usuario → 1 Chat ID activo → 3 canales fijos
                ↓
        ✉️ Email
        🔔 Push in-app
        📱 Telegram (si vinculado)
        
Característica: Por defecto todos los canales
Tabla: user_telegram_chat_ids (1 por usuario)
Preferencias: No existen
```

### Opción 2 (Futura)

```
Usuario → Múltiples Chat IDs → Preferencias por evento
              ↓                      ↓
        (Móvil, PC, Tablet)    Qué enviar dónde
        
        ┌────────────┬────────────┬────────────┐
        ▼            ▼            ▼            ▼
    Email?      Push?       Telegram?     Frecuencia?
    Diario      Real-time   Urgentes      Por hora
    
Característica: Control total del usuario
Tabla: notification_preferences (M2M con eventos)
Preferencias: Por tipo de evento
Beneficio: Mayor flexibilidad, menos spam
```

### Cambio de Código Mínimo

```
ANTES (Opción 1):
    await sendMultiChannelNotification({ ... })
    
DESPUÉS (Opción 2):
    const prefs = await getNotificationPreferences(userId, type)
    const channels = prefs?.channels || DEFAULT
    await sendMultiChannelNotification({ 
        ..., 
        channels  // ← Solo agregar esta línea
    })
```

---

## 7. Endpoints API

```
┌─────────────────────────────────────────────────────────┐
│                  TELEGRAM ENDPOINTS                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 1. WEBHOOK (Recibir mensajes del bot)                  │
│    POST /api/telegram/webhook                          │
│    ↓                                                    │
│    - /start → Enviar bienvenida                         │
│    - /help → Enviar ayuda                              │
│    - /unlink → Instrucciones                            │
│                                                         │
│ 2. VINCULAR (Usuario → Telegram)                        │
│    POST /api/telegram/link                             │
│    Body: { chat_id, device_name }                       │
│    ↓                                                    │
│    - Guardar en BD                                      │
│    - Enviar confirmación                                │
│    - Return: { ok, message }                            │
│                                                         │
│ 3. DESVINCULARSE                                        │
│    POST /api/telegram/unlink                           │
│    Headers: { Authorization: Bearer token }             │
│    ↓                                                    │
│    - Marcar como inactivo                               │
│    - Return: { ok, message }                            │
│                                                         │
│ 4. ESTADO                                               │
│    GET /api/telegram/status                            │
│    Headers: { Authorization: Bearer token }             │
│    ↓                                                    │
│    - Consultar BD                                       │
│    - Return: { linked, chat_id (parcial) }              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 8. RLS (Row Level Security)

```
user_telegram_chat_ids:

┌────────────────────────────────────────────────────────┐
│  Tabla: user_telegram_chat_ids                         │
├────────────────────────────────────────────────────────┤
│                                                        │
│  POLICY 1: SELECT own notifications                    │
│    Users can view own telegram chat ids               │
│    USING: auth.uid() = user_id                        │
│                                                        │
│  POLICY 2: UPDATE own                                  │
│    Users can update own telegram chat ids             │
│    USING: auth.uid() = user_id                        │
│                                                        │
│  POLICY 3: INSERT own                                  │
│    Users can insert their own telegram chat ids       │
│    WITH CHECK: auth.uid() = user_id                   │
│                                                        │
│  POLICY 4: System management                          │
│    System can manage telegram chat ids                │
│    (service_role bypasses RLS)                        │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 9. Error Handling

```
sendMultiChannelNotification()
    │
    ├─ EMAIL
    │  ├─ ✅ Enviado: result.channels.email.sent = true
    │  ├─ ❌ Error: result.channels.email.error = "SMTP error"
    │  └─ ⚠️  Sin email: log warning pero continuar
    │
    ├─ PUSH IN-APP
    │  ├─ ✅ Insertado: result.channels.push.sent = true
    │  ├─ ❌ Error: result.channels.push.error = "DB error"
    │  └─ ⚠️  Error no es fatal
    │
    └─ TELEGRAM
       ├─ ✅ Enviado: result.channels.telegram.sent = true
       ├─ ❌ No vinculado: log info, no es error
       ├─ ❌ API error: result.channels.telegram.error = "..."
       └─ ⚠️  Error no es fatal

RESULTADO:
    success = (email || !emailRequired) 
           && (push || !pushRequired) 
           && (telegram || !telegramRequired)
           
Conclusión: Fallo parcial es aceptable ✅
```

---

## 10. Seguridad - Flujo Completo

```
┌─────────────────────────────────────────────────────────────┐
│                    SEGURIDAD                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 1. AUTENTICACIÓN                                            │
│    POST /api/telegram/link                                 │
│    ├─ Header: Authorization: Bearer {token}               │
│    ├─ Validar token con Supabase                          │
│    ├─ Obtener user_id                                      │
│    └─ Solo ese usuario puede vincular                      │
│                                                             │
│ 2. ENCRIPTACIÓN EN TRÁNSITO                                 │
│    ├─ HTTPS obligatorio                                    │
│    ├─ Telegram Bot API usa HTTPS                           │
│    └─ No se expone chat_id en logs                         │
│                                                             │
│ 3. ENCRIPTACIÓN EN BD                                       │
│    ├─ Supabase encripta en reposo                          │
│    ├─ RLS evita lecturas no autorizadas                    │
│    └─ Service role puede acceder con permisos             │
│                                                             │
│ 4. VALIDACIÓN DE ENTRADA                                    │
│    ├─ chat_id debe ser string numérico                     │
│    ├─ user_id debe ser UUID válido                         │
│    └─ device_name limitado a X caracteres                  │
│                                                             │
│ 5. RATE LIMITING                                            │
│    ├─ [FUTURO] Limitar vincular por IP                     │
│    ├─ [FUTURO] Limitar mensajes por usuario/hora           │
│    └─ [FUTURO] Detectar abuso                              │
│                                                             │
│ 6. AUDIT LOG                                                │
│    ├─ [FUTURO] Registrar vinculaciones                     │
│    ├─ [FUTURO] Registrar envíos                            │
│    └─ [FUTURO] Alertar de actividad sospechosa             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

**Documento creado:** 20 enero 2026  
**Versión:** 1.0  
**Status:** Completo y listo para usar
