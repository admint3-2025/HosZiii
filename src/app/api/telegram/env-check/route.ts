/**
 * GET /api/telegram/env-check
 * Diagnóstico rápido (solo dev): confirma si el servidor ve TELEGRAM_BOT_TOKEN.
 */

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const token = process.env.TELEGRAM_BOT_TOKEN

  return NextResponse.json({
    ok: true,
    node_env: process.env.NODE_ENV,
    has_telegram_bot_token: Boolean(token),
    telegram_bot_token_length: token ? token.length : 0,
  })
}
