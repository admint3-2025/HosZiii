/**
 * Servicio de envío de push notifications vía Expo Push API.
 * Se usa desde multi-channel.ts como canal adicional.
 *
 * Documentación: https://docs.expo.dev/push-notifications/sending-notifications/
 */

import { createSupabaseAdminClient } from '@/lib/supabase/admin'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

interface ExpoPushMessage {
  to: string
  title: string
  body: string
  data?: Record<string, unknown>
  sound?: 'default' | null
  channelId?: string
  priority?: 'default' | 'normal' | 'high'
  badge?: number
}

interface ExpoPushResult {
  sent: boolean
  error?: string
  receipts?: number
}

/**
 * Obtiene los Expo Push Tokens activos de un usuario desde Supabase.
 */
async function getUserPushTokens(userId: string): Promise<string[]> {
  const supabase = createSupabaseAdminClient()

  const { data, error } = await supabase.rpc('get_user_push_tokens', {
    p_user_id: userId,
  })

  if (error) {
    console.error('[ExpoPush] Error obteniendo tokens:', error.message)
    return []
  }

  return (data as { token: string }[] | null)?.map((r) => r.token) ?? []
}

/**
 * Envía push notification a un usuario usando sus tokens registrados.
 */
export async function sendExpoPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<ExpoPushResult> {
  const tokens = await getUserPushTokens(userId)

  if (tokens.length === 0) {
    return { sent: false, error: 'No push tokens registered' }
  }

  const messages: ExpoPushMessage[] = tokens.map((token) => ({
    to: token,
    title,
    body,
    data,
    sound: 'default',
    channelId: 'tickets',
    priority: 'high',
  }))

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(messages),
    })

    if (!response.ok) {
      const text = await response.text()
      return { sent: false, error: `Expo API error: ${response.status} ${text}` }
    }

    const result = await response.json()
    console.log(`[ExpoPush] ✓ Enviado a ${tokens.length} dispositivo(s)`)
    return { sent: true, receipts: tokens.length }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[ExpoPush] ✗ Error:', msg)
    return { sent: false, error: msg }
  }
}

/**
 * Envía push notification a múltiples usuarios.
 */
export async function sendExpoPushToMany(
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<{ sent: number; failed: number }> {
  const results = await Promise.allSettled(
    userIds.map((uid) => sendExpoPushNotification(uid, title, body, data))
  )

  let sent = 0
  let failed = 0

  for (const r of results) {
    if (r.status === 'fulfilled' && r.value.sent) sent++
    else failed++
  }

  return { sent, failed }
}
