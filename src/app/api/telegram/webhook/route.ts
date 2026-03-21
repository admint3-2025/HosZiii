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
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { formatTicketCode } from '@/lib/tickets/code'
import { getTicketTriage, isAIEnabled } from '@/lib/ai/openrouter'

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
/info <codigo> - Análisis IA del ticket

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

    // Comando: /info <codigo_ticket>
    if (text.startsWith('/info')) {
      const parts = text.split(/\s+/)
      const ticketCodeArg = parts[1]?.trim().toUpperCase()

      if (!ticketCodeArg) {
        await sendTelegramMessage(chatId, '❌ Uso: /info <codigo>\nEjemplo: /info 20260321-0001')
        return NextResponse.json({ ok: true })
      }

      if (!isAIEnabled()) {
        await sendTelegramMessage(chatId, '⚠️ El módulo de análisis IA no está habilitado en este momento.')
        return NextResponse.json({ ok: true })
      }

      try {
        const adminClient = createSupabaseAdminClient()

        // Resolver usuario por chat_id
        const { data: chatLink } = await adminClient
          .from('user_telegram_chat_ids')
          .select('user_id')
          .eq('telegram_chat_id', String(chatId))
          .eq('is_active', true)
          .maybeSingle()

        if (!chatLink) {
          await sendTelegramMessage(chatId, '❌ Tu cuenta no está vinculada. Ve a la app web y vincula tu Telegram primero.')
          return NextResponse.json({ ok: true })
        }

        // Buscar ticket por código — extraer sequence del código YYYYMMDD-XXXX
        const seqMatch = ticketCodeArg.match(/-(\d+)$/)
        const sequence = seqMatch ? parseInt(seqMatch[1], 10) : parseInt(ticketCodeArg, 10)

        if (!sequence || isNaN(sequence)) {
          await sendTelegramMessage(chatId, '❌ Formato inválido. Usa: /info 20260320-0001')
          return NextResponse.json({ ok: true })
        }

        const { data: ticket } = await adminClient
          .from('tickets')
          .select('id, ticket_number, title, description, status, priority, category_id, created_at, resolution, closed_at, closed_by, locations(name, code)')
          .eq('ticket_number', sequence)
          .maybeSingle()

        if (!ticket) {
          await sendTelegramMessage(chatId, `❌ Ticket <code>${ticketCodeArg}</code> no encontrado.`)
          return NextResponse.json({ ok: true })
        }

        // Si el ticket está cerrado, buscar nombre de quien lo cerró
        let closedByName: string | null = null
        if (ticket.status === 'CLOSED' && ticket.closed_by) {
          const { data: closedByProfile } = await adminClient
            .from('profiles')
            .select('full_name')
            .eq('id', ticket.closed_by)
            .maybeSingle()
          closedByName = closedByProfile?.full_name || null
        }

        await sendTelegramMessage(chatId, `⏳ Analizando ticket <code>${ticketCodeArg}</code>...`)

        const locName = (ticket.locations as any)?.name || ''
        const locCode = (ticket.locations as any)?.code || ''
        const ticketCode = formatTicketCode({ ticket_number: ticket.ticket_number, created_at: ticket.created_at ?? null })

        const triage = await getTicketTriage({
          ticketCode,
          title: ticket.title,
          description: ticket.description || 'Sin descripción',
          status: ticket.status,
          location: locCode ? `${locCode} - ${locName}` : locName,
        })

        if (!triage) {
          await sendTelegramMessage(chatId, '⚠️ No se pudo generar el análisis. Intenta más tarde.')
          return NextResponse.json({ ok: true })
        }

        const confidenceEmoji = { high: '🟢', medium: '🟡', low: '🔴' }[triage.confidence]
        const confidenceLabel = { high: 'alta', medium: 'media', low: 'baja' }[triage.confidence]
        const escalateNote = triage.shouldEscalate ? '\n\n⚠️ <b>Se recomienda escalar este ticket.</b>' : ''

        const statusLabels: Record<string, string> = {
          OPEN: '🟠 Abierto',
          IN_PROGRESS: '🔵 En progreso',
          RESOLVED: '🟣 Resuelto',
          CLOSED: '✅ Cerrado',
          PENDING: '⏸️ Pendiente',
          ESCALATED: '🔺 Escalado',
        }
        const statusLabel = statusLabels[ticket.status] ?? ticket.status
        const locationLine = (locCode || locName) ? `\n📍 <b>Sede:</b> ${locCode ? `${locCode} - ${locName}` : locName}` : ''

        // Bloque de resolución para tickets cerrados
        let resolutionBlock = ''
        if (ticket.status === 'CLOSED' && (ticket as any).resolution) {
          const resText = ((ticket as any).resolution as string).replace(/\*\*/g, '').replace(/\*\s*/g, '').trim()
          const preview = resText.slice(0, 500) + (resText.length > 500 ? '…' : '')
          resolutionBlock = `\n\n🔒 <b>Resolución:</b>\n${preview}`
          if (closedByName) resolutionBlock += `\n<i>Cerrado por: ${closedByName}</i>`
        }

        const triageMsg = `🤖 <b>Análisis IA — ${ticketCode}</b>\n<i>${ticket.title}</i>\n\n📋 <b>Estado:</b> ${statusLabel}${locationLine}${resolutionBlock}\n\n${confidenceEmoji} Confianza: <b>${confidenceLabel}</b>\n\n<b>Sugerencia:</b>\n${triage.suggestedReply}${escalateNote}`
        await sendTelegramMessage(chatId, triageMsg)
      } catch (err) {
        console.error('[Telegram /info] Error:', err)
        await sendTelegramMessage(chatId, '❌ Error al procesar el análisis. Intenta más tarde.')
      }

      return NextResponse.json({ ok: true })
    }

    // Si llega aquí, es un comando no reconocido
    const defaultMessage = `
No entiendo ese comando: ${text}

Usa:
/start - Empezar
/help - Ayuda
/info &lt;codigo&gt; - Análisis IA de un ticket
    `.trim()

    await sendTelegramMessage(chatId, defaultMessage)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[Telegram Webhook] Error:', error)
    return NextResponse.json({ ok: true }) // Siempre retornar 200 a Telegram
  }
}
