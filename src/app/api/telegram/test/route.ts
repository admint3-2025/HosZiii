/**
 * POST /api/telegram/test
 * Envía un mensaje de prueba al Telegram vinculado del usuario autenticado.
 *
 * Reglas:
 * - Dev: cualquier usuario autenticado puede probar.
 * - Producción: solo usuarios con rol admin.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { sendTelegramMessage } from '@/lib/telegram/client'

export const runtime = 'nodejs'

export async function POST(_req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // En producción, limitar a admin
    if (process.env.NODE_ENV === 'production') {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) {
        console.error('[Telegram Test] Error leyendo perfil:', profileError)
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
      }

      if (profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Solo admin' }, { status: 403 })
      }
    }

    const { data, error } = await supabase
      .from('user_telegram_chat_ids')
      .select('telegram_chat_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (error) {
      console.error('[Telegram Test] Error consultando chat_id:', error)
      return NextResponse.json({ error: 'Error consultando chat_id' }, { status: 500 })
    }

    const chatId = data?.telegram_chat_id
    if (!chatId) {
      return NextResponse.json({ error: 'Usuario no vinculado a Telegram' }, { status: 400 })
    }

    const now = new Date()
    const text = `✅ <b>Prueba Telegram OK</b>\n\nUsuario: <code>${user.id}</code>\nHora: <code>${now.toISOString()}</code>`

    const result = await sendTelegramMessage(chatId, text)

    if (!result.ok) {
      const botToken = process.env.TELEGRAM_BOT_TOKEN
      return NextResponse.json(
        {
          error: result.description || 'Error enviando a Telegram',
          telegram_error_code: result.error_code,
          ...(process.env.NODE_ENV !== 'production'
            ? {
                debug: {
                  has_telegram_bot_token: Boolean(botToken && botToken.trim()),
                  telegram_bot_token_length: botToken ? botToken.trim().length : 0,
                },
              }
            : {}),
        },
        { status: 502 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Telegram Test] Error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
