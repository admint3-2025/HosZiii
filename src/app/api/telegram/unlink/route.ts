/**
 * POST /api/telegram/unlink
 * Desvincula el usuario actual de Telegram
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

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

    console.log(`[Telegram Unlink] Desvinculando usuario ${user.id}`)

    const { error: updateError } = await supabase
      .from('user_telegram_chat_ids')
      .update({ is_active: false })
      .eq('user_id', user.id)

    if (updateError) {
      console.error('[Telegram Unlink] Error desvinculando:', updateError)
      return NextResponse.json(
        { error: 'Error desvinculando' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      message: 'Desvinculación exitosa',
    })
  } catch (error) {
    console.error('[Telegram Unlink] Error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
