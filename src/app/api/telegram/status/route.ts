/**
 * GET /api/telegram/status
 * Ver estado de vinculación con Telegram
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
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

    const { data, error } = await supabase
      .from('user_telegram_chat_ids')
      .select('telegram_chat_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (error) {
      console.error('[Telegram Status] Error consultando BD:', error)
      return NextResponse.json(
        { error: 'Error consultando estado' },
        { status: 500 }
      )
    }

    const chatId = data?.telegram_chat_id ?? null

    return NextResponse.json({
      ok: true,
      linked: !!chatId,
      chat_id: chatId ? chatId.slice(-4) : null, // Mostrar solo últimos 4 dígitos por seguridad
    })
  } catch (error) {
    console.error('[Telegram Status] Error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
