/**
 * Cliente de Telegram Bot API
 * Maneja la comunicación básica con Telegram
 */

const TELEGRAM_API_BASE = 'https://api.telegram.org'

function getBotToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const trimmed = token?.trim()
  return trimmed ? trimmed : undefined
}

interface TelegramMessageOptions {
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2'
  reply_markup?: Record<string, unknown>
  disable_notification?: boolean
}

interface TelegramSendMessageResponse {
  ok: boolean
  result?: {
    message_id: number
    chat: { id: number }
    text: string
    date: number
  }
  error_code?: number
  description?: string
}

/**
 * Envía un mensaje a Telegram
 * @param chatId ID del chat o usuario
 * @param message Texto del mensaje
 * @param options Opciones adicionales (parse_mode, etc.)
 */
export async function sendTelegramMessage(
  chatId: string | number,
  message: string,
  options: TelegramMessageOptions = {}
): Promise<TelegramSendMessageResponse> {
  const botToken = getBotToken()

  if (!botToken) {
    console.warn('[Telegram] Bot token no configurado (TELEGRAM_BOT_TOKEN)')
    return { ok: false, description: 'TELEGRAM_BOT_TOKEN not set' }
  }

  try {
    const url = `${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`

    const payload = {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...options,
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data: TelegramSendMessageResponse = await response.json()

    if (data.ok) {
      console.log(`[Telegram] ✓ Mensaje enviado a ${chatId}`)
    } else {
      console.error(`[Telegram] ✗ Error ${data.error_code}: ${data.description}`)
    }

    return data
  } catch (error) {
    console.error('[Telegram] Error enviando mensaje:', error)
    return {
      ok: false,
      description: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Valida si un token de Telegram es válido
 */
export async function validateTelegramToken(): Promise<boolean> {
  const botToken = getBotToken()
  if (!botToken) return false

  try {
    const url = `${TELEGRAM_API_BASE}/bot${botToken}/getMe`
    const response = await fetch(url)
    const data = await response.json()
    return data.ok === true
  } catch {
    return false
  }
}

/**
 * Obtiene información del bot
 */
export async function getTelegramBotInfo() {
  const botToken = getBotToken()
  if (!botToken) return null

  try {
    const url = `${TELEGRAM_API_BASE}/bot${botToken}/getMe`
    const response = await fetch(url)
    return await response.json()
  } catch (error) {
    console.error('[Telegram] Error obteniendo info del bot:', error)
    return null
  }
}
