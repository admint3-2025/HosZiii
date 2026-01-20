/**
 * Servicios de Telegram
 * Lógica de negocio para integración Telegram
 */

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { sendTelegramMessage } from './client'
import { formatTelegramMessage, type TelegramNotificationTemplate } from './templates'

/**
 * Obtiene el chat_id de Telegram de un usuario
 * Escalable a Opción 2: permitirá múltiples chat_ids por usuario
 */
export async function getUserTelegramChatId(userId: string): Promise<string | null> {
  try {
    const supabase = createSupabaseAdminClient()

    const { data, error } = await supabase
      .from('user_telegram_chat_ids')
      .select('telegram_chat_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    if (error) {
      console.warn(`[Telegram] No chat_id encontrado para usuario ${userId}`)
      return null
    }

    return data?.telegram_chat_id || null
  } catch (error) {
    console.error('[Telegram] Error obteniendo chat_id:', error)
    return null
  }
}

/**
 * Obtiene todos los chat_ids de Telegram de un usuario
 * Base para Opción 2
 */
export async function getUserTelegramChatIds(userId: string): Promise<string[]> {
  try {
    const supabase = createSupabaseAdminClient()

    const { data, error } = await supabase
      .from('user_telegram_chat_ids')
      .select('telegram_chat_id')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (error) {
      console.warn(`[Telegram] Error obteniendo chat_ids para ${userId}:`, error)
      return []
    }

    return data?.map(d => d.telegram_chat_id) || []
  } catch (error) {
    console.error('[Telegram] Error obteniendo chat_ids:', error)
    return []
  }
}

/**
 * Guarda o actualiza el chat_id de Telegram para un usuario
 * Escalable: permite múltiples dispositivos en Opción 2
 */
export async function saveTelegramChatId(
  userId: string,
  chatId: string,
  deviceName?: string
): Promise<boolean> {
  try {
    const supabase = createSupabaseAdminClient()

    // En Opción 2: soportar múltiples chat_ids
    // Por ahora (Opción 1): reemplazar el anterior

    const { error } = await supabase
      .from('user_telegram_chat_ids')
      .upsert(
        {
          user_id: userId,
          telegram_chat_id: chatId,
          device_name: deviceName || 'Telegram Bot',
          is_active: true,
          linked_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      )

    if (error) {
      console.error('[Telegram] Error guardando chat_id:', error)
      return false
    }

    console.log(`[Telegram] ✓ Chat_id guardado para usuario ${userId}`)
    return true
  } catch (error) {
    console.error('[Telegram] Error guardando chat_id:', error)
    return false
  }
}

/**
 * Desvincula el chat de Telegram de un usuario
 */
export async function unlinkTelegramChat(userId: string): Promise<boolean> {
  try {
    const supabase = createSupabaseAdminClient()

    const { error } = await supabase
      .from('user_telegram_chat_ids')
      .update({ is_active: false })
      .eq('user_id', userId)

    if (error) {
      console.error('[Telegram] Error desvinculando:', error)
      return false
    }

    console.log(`[Telegram] ✓ Chat desvinculado para usuario ${userId}`)
    return true
  } catch (error) {
    console.error('[Telegram] Error desvinculando:', error)
    return false
  }
}

/**
 * Envía notificación a Telegram si el usuario la tiene vinculada
 * Escalable a Opción 2: soportará preferencias de usuario
 */
export async function sendTelegramNotification(
  userId: string,
  template: TelegramNotificationTemplate
): Promise<boolean> {
  try {
    // Obtener chat_id del usuario
    const chatId = await getUserTelegramChatId(userId)

    if (!chatId) {
      console.log(`[Telegram] Usuario ${userId} no tiene Telegram vinculado`)
      return false
    }

    // Formatear mensaje
    const formattedMessage = formatTelegramMessage(template)

    // Enviar a Telegram
    const result = await sendTelegramMessage(chatId, formattedMessage)

    return result.ok || false
  } catch (error) {
    console.error('[Telegram] Error enviando notificación:', error)
    return false
  }
}

/**
 * Envía notificación a múltiples usuarios (escalable para Opción 2)
 */
export async function sendBulkTelegramNotifications(
  userIds: string[],
  template: { title: string; message: string }
): Promise<{ success: number; failed: number }> {
  const results = await Promise.allSettled(
    userIds.map(userId => sendTelegramNotification(userId, template))
  )

  const success = results.filter(r => r.status === 'fulfilled' && r.value).length
  const failed = results.length - success

  console.log(`[Telegram] Bulk send: ${success} éxito, ${failed} fallos`)

  return { success, failed }
}
