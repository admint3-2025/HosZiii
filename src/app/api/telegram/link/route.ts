/**
 * Endpoints de Telegram
 * - POST /api/telegram/link - Vincular usuario con Telegram
 * - POST /api/telegram/unlink - Desvincularse
 * - GET /api/telegram/status - Ver estado de vinculación
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { sendTelegramMessage } from '@/lib/telegram/client'

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

    console.log(`[Telegram Link] Vinculando usuario ${user.id} con chat ${chat_id}`)

    // Guardar el chat_id (usando RLS del usuario autenticado)
    const { error: upsertError } = await supabase
      .from('user_telegram_chat_ids')
      .upsert(
        {
          user_id: user.id,
          telegram_chat_id: String(chat_id),
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
    await sendTelegramMessage(
      chat_id,
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
