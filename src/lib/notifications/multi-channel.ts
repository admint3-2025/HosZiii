/**
 * Sistema centralizado de notificaciones (Opción 1)
 * Envía simultáneamente a:
 * - Email (SMTP)
 * - Supabase (Push in-app)
 * - Telegram (Bot API)
 *
 * Escalable a Opción 2 con:
 * - Preferencias de usuario por tipo de notificación
 * - Múltiples canales por usuario
 * - Control granular de eventos
 */

import { sendMail } from '../email/mailer'
import { sendTelegramNotification } from '@/lib/telegram'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export type NotificationType =
  | 'inspection_critical'
  | 'ticket_created'
  | 'ticket_assigned'
  | 'ticket_status_changed'
  | 'ticket_comment'
  | 'maintenance_ticket_created'
  | 'maintenance_ticket_assigned'
  | 'generic'

export interface NotificationChannels {
  email?: boolean
  push?: boolean // In-app push (Supabase)
  telegram?: boolean
}

export interface NotificationPayload {
  userId: string
  type: NotificationType
  title: string
  message: string
  emailBody?: string // HTML para email
  telegramTemplate?: { title: string; message: string }
  channels?: NotificationChannels // Override de canales (Opción 2)
  // Datos opcionales para la BD
  relatedId?: string // ticket_id, inspection_id, etc.
  link?: string // URL a la que redirige
}

export interface NotificationResult {
  success: boolean
  channels: {
    email?: { sent: boolean; error?: string }
    push?: { sent: boolean; error?: string }
    telegram?: { sent: boolean; error?: string }
  }
}

/**
 * Envía una notificación por múltiples canales
 * Sistema centralizado reutilizable en toda la app
 */
export async function sendMultiChannelNotification(
  payload: NotificationPayload
): Promise<NotificationResult> {
  const result: NotificationResult = {
    success: false,
    channels: {},
  }

  // Por defecto (Opción 1): enviar por todos los canales
  const channels: Required<NotificationChannels> = {
    email: payload.channels?.email ?? true,
    push: payload.channels?.push ?? true,
    telegram: payload.channels?.telegram ?? true,
  }

  console.log(`[Notifications] 📤 Enviando "${payload.title}" al usuario ${payload.userId}`)

  try {
    // 1. Enviar Email
    if (channels.email && payload.emailBody) {
      try {
        const { data: user } = await createSupabaseAdminClient()
          .auth.admin.getUserById(payload.userId)

        if (user.user?.email) {
          await sendMail({
            to: user.user.email,
            subject: `${payload.title}`,
            html: payload.emailBody,
          })

          result.channels.email = { sent: true }
          console.log(`[Notifications] ✓ Email enviado a ${user.user.email}`)
        }
      } catch (error) {
        result.channels.email = {
          sent: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
        console.error('[Notifications] ✗ Error enviando email:', error)
      }
    }

    // 2. Enviar Push in-app (Supabase Realtime)
    if (channels.push) {
      try {
        await createSupabaseAdminClient()
          .from('notifications')
          .insert({
            user_id: payload.userId,
            type: payload.type,
            title: payload.title,
            message: payload.message,
            ticket_id: payload.relatedId,
            is_read: false,
            link: payload.link,
          })

        result.channels.push = { sent: true }
        console.log(`[Notifications] ✓ Push in-app enviado`)
      } catch (error) {
        result.channels.push = {
          sent: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
        console.error('[Notifications] ✗ Error enviando push:', error)
      }
    }

    // 3. Enviar Telegram
    if (channels.telegram) {
      const telegramTemplate = payload.telegramTemplate || {
        title: payload.title,
        message: payload.message,
      }

      const sent = await sendTelegramNotification(
        payload.userId,
        telegramTemplate
      )

      result.channels.telegram = {
        sent,
        error: sent ? undefined : 'User not linked or API error',
      }
    }

    // Determinar éxito general
    result.success =
      (result.channels.email?.sent || !channels.email) &&
      (result.channels.push?.sent || !channels.push) &&
      (result.channels.telegram?.sent || !channels.telegram)

    console.log(`[Notifications] ${result.success ? '✅' : '⚠️'} Resultado:`, result.channels)

    return result
  } catch (error) {
    console.error('[Notifications] Error crítico:', error)
    result.success = false
    return result
  }
}

/**
 * Envía notificación a múltiples usuarios
 * Escalable para alertas en masa (Opción 2)
 */
export async function sendNotificationToBulk(
  userIds: string[],
  payload: Omit<NotificationPayload, 'userId'>
): Promise<{ successful: string[]; failed: string[] }> {
  const results = await Promise.allSettled(
    userIds.map(userId =>
      sendMultiChannelNotification({
        ...payload,
        userId,
      })
    )
  )

  const successful: string[] = []
  const failed: string[] = []

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value.success) {
      successful.push(userIds[index])
    } else {
      failed.push(userIds[index])
    }
  })

  console.log(
    `[Notifications] Bulk send: ${successful.length} éxito, ${failed.length} fallos`
  )

  return { successful, failed }
}
