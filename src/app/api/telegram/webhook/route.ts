/**
 * Webhook de Telegram
 * Recibe mensajes del bot para vincular usuarios con sus chats
 *
 * Flujo:
 * 1. Usuario escribe /start en el bot
 * 2. Bot responde con código de vinculación (ej: /link_XXXXX)
 * 3. Usuario copia código y lo pega en la app
 * 4. App envía código + user_id a este endpoint
 * 5. Este endpoint guarda el mapeo chat_id -> user_id
 */

import { NextRequest, NextResponse } from 'next/server'
import { sendTelegramMessage } from '@/lib/telegram/client'

// Tipos de las actualizaciones de Telegram
interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    from: {
      id: number
      is_bot: boolean
      first_name: string
      username?: string
    }
    chat: {
      id: number
      first_name: string
      type: string
    }
    date: number
    text?: string
  }
}

/**
 * POST /api/telegram/webhook
 * Endpoint para recibir mensajes del bot de Telegram
 */
export async function POST(req: NextRequest) {
  try {
    const update: TelegramUpdate = await req.json()

    // Validar que sea un mensaje
    if (!update.message?.text) {
      return NextResponse.json({ ok: true })
    }

    const chatId = update.message.chat.id
    const text = update.message.text.trim()
    const firstName = update.message.from.first_name

    console.log(`[Telegram Webhook] Mensaje de ${firstName}: ${text}`)

    // Comando: /start
    if (text === '/start') {
      const welcomeMessage = `
👋 ¡Hola ${firstName}!

Bienvenido al sistema de notificaciones ZIII-Hos.

Para vincular tu cuenta, necesitas:
1. Ir a la app web
2. Buscar "Configuración de Telegram"
3. Iniciar sesión si no lo estás
4. Hacer clic en "Vincular con Telegram"

O puedes usar directamente este endpoint:
POST /api/telegram/link
Con tu user_id y chat_id

━━━━━━━━━━━━━━━━━━
Comandos disponibles:
/start - Este mensaje
/help - Ayuda
/unlink - Desvincularte
      `.trim()

      await sendTelegramMessage(chatId, welcomeMessage)
      return NextResponse.json({ ok: true })
    }

    // Comando: /help
    if (text === '/help') {
      const helpMessage = `
📖 <b>AYUDA - Notificaciones ZIII-Hos</b>

Este bot te enviará notificaciones en tiempo real sobre:
✅ Inspecciones críticas
✅ Tickets asignados
✅ Cambios de estado
✅ Nuevos comentarios

<b>Para vincular tu cuenta:</b>
1. En la app, ve a Configuración → Telegram
2. Haz clic en "Vincular"
3. Confirma en este chat

<b>Comandos:</b>
/start - Comenzar
/help - Este mensaje
/unlink - Desvincularte

¿Preguntas? Contacta al equipo de IT.
      `.trim()

      await sendTelegramMessage(chatId, helpMessage)
      return NextResponse.json({ ok: true })
    }

    // Comando: /unlink
    if (text === '/unlink') {
      const message = `
Desvincular a Telegram requiere hacerlo desde la app web.

Ve a: Configuración → Telegram → Desvincularse

O contacta al equipo de IT.
      `.trim()

      await sendTelegramMessage(chatId, message)
      return NextResponse.json({ ok: true })
    }

    // Si llega aquí, es un comando no reconocido
    const defaultMessage = `
No entiendo ese comando: ${text}

Usa:
/start - Empezar
/help - Ayuda
    `.trim()

    await sendTelegramMessage(chatId, defaultMessage)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[Telegram Webhook] Error:', error)
    return NextResponse.json({ ok: true }) // Siempre retornar 200 a Telegram
  }
}
