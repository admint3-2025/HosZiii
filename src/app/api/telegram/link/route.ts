/**
 * Endpoints de Telegram
 * - POST /api/telegram/link - Vincular usuario con Telegram
 * - POST /api/telegram/unlink - Desvincularse
 * - GET /api/telegram/status - Ver estado de vinculación
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { sendTelegramMessage } from '@/lib/telegram/client'

function isValidChatId(value: unknown): value is string {
  if (typeof value !== 'string' && typeof value !== 'number') return false
  const s = String(value).trim()
  return /^-?\d+$/.test(s)
}

/**
 * POST /api/telegram/link
 * Vincula el usuario actual con su chat_id de Telegram
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const { chat_id, device_name } = body

    if (!chat_id) {
      return NextResponse.json(
        { error: 'chat_id es requerido' },
        { status: 400 }
      )
    }

    if (!isValidChatId(chat_id)) {
      return NextResponse.json(
        { error: 'chat_id inválido. Debe ser numérico (ej: 123456789 o -1001234567890).' },
        { status: 400 }
      )
    }

    const chatIdNormalized = String(chat_id).trim()

    console.log(`[Telegram Link] Vinculando usuario ${user.id} con chat ${chatIdNormalized}`)

    // Guardar el chat_id (usando RLS del usuario autenticado)
    const { error: upsertError } = await supabase
      .from('user_telegram_chat_ids')
      .upsert(
        {
          user_id: user.id,
          telegram_chat_id: chatIdNormalized,
          device_name: device_name || 'Telegram',
          is_active: true,
          linked_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

    if (upsertError) {
      console.error('[Telegram Link] Error guardando chat_id:', upsertError)
      return NextResponse.json(
        { error: 'Error guardando chat_id' },
        { status: 500 }
      )
    }

    // Enviar mensaje de confirmación al usuario en Telegram
    const result = await sendTelegramMessage(
      chatIdNormalized,
      `
✅ <b>¡Vinculación exitosa!</b>

Tu cuenta está conectada al sistema de notificaciones ZIII-Hos.

Ahora recibirás notificaciones aquí sobre:
🚨 Inspecciones críticas
📋 Tickets de mantenimiento
💬 Comentarios en tickets
↩️ Cambios de estado

Usa la app para desconectarte cuando lo necesites.
      `.trim()
    )

    if (!result.ok) {
      // Rollback: no dejar guardado un chat_id inválido/inaccesible
      await supabase.from('user_telegram_chat_ids').delete().eq('user_id', user.id)

      const base = result.description || 'No se pudo enviar mensaje a Telegram'

      if (result.error_code === 400 && /chat not found/i.test(base)) {
        return NextResponse.json(
          {
            error:
              'Telegram: chat_id no encontrado o inaccesible para el bot.\n\n' +
              'Qué hacer:\n' +
              '1) Abre el bot en Telegram y envía /start desde ese chat.\n' +
              '2) Si es un grupo: agrega el bot al grupo y envía /start (o menciona al bot).\n' +
              '3) Asegúrate de usar el chat_id correcto (en grupos suele ser negativo).',
            telegram_error_code: result.error_code,
            telegram_description: base,
          },
          { status: 400 }
        )
      }

      return NextResponse.json(
        {
          error: `Telegram error: ${base}`,
          telegram_error_code: result.error_code,
          telegram_description: base,
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      ok: true,
      message: 'Chat vinculado exitosamente',
    })
  } catch (error) {
    console.error('[Telegram Link] Error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
