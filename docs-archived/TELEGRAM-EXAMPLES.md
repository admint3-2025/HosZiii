/**
 * Ejemplo de Refactorización - Inspecciones Críticas con Telegram
 * 
 * ANTES: Código disperso (email + push)
 * DESPUÉS: Sistema centralizado (email + push + telegram)
 * 
 * Este archivo documenta cómo refactorizar notificaciones existentes
 * para usar sendMultiChannelNotification()
 */

// ============================================================================
// ANTERIOR (Sin Telegram)
// ============================================================================

/*
export async function notifyInspectionCritical_OLD(data: InspectionData) {
  const supabase = createSupabaseAdminClient()
  
  // 1. Obtener admins
  const { data: admins } = await supabase.rpc('get_admin_emails')
  
  // 2. Enviar correos
  const emailPromises = admins.map(admin =>
    sendMail({
      to: admin.email,
      subject: '🚨 Inspección Crítica',
      html: emailTemplate(data)
    })
  )
  await Promise.all(emailPromises)
  
  // 3. Crear notificaciones push
  const notifications = admins.map(admin => ({
    user_id: admin.id,
    type: 'inspection_critical',
    title: '🚨 Inspección crítica...',
    message: 'Se detectaron...',
    is_read: false
  }))
  await supabase
    .from('notifications')
    .insert(notifications)
}
*/

// ============================================================================
// REFACTORIZADO (Con Telegram)
// ============================================================================

import { sendMultiChannelNotification } from '@/lib/notifications/multi-channel'
import { TELEGRAM_TEMPLATES } from '@/lib/telegram'
import { criticalInspectionAlertTemplate } from '@/lib/email/templates'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

interface InspectionData {
  id: string
  department: string
  property_code: string
  property_name: string
  critical_items: any[]
  average_score: number
}

export async function notifyInspectionCritical(data: InspectionData) {
  const supabase = createSupabaseAdminClient()
  const CRITICAL_THRESHOLD = 8

  // 1. Obtener admins (SIN CAMBIOS)
  const { data: admins } = await supabase.rpc('get_admin_emails')
  
  if (!admins?.length) {
    console.log('[notifyInspectionCritical] No admins found')
    return
  }

  // 2. Preparar templates (NUEVO)
  const emailTemplate = criticalInspectionAlertTemplate({
    department: data.department,
    property_code: data.property_code,
    property_name: data.property_name,
    criticalItems: data.critical_items,
    averageScore: data.average_score,
    threshold: CRITICAL_THRESHOLD
  })

  const telegramData = {
    department: data.department,
    propertyCode: data.property_code,
    propertyName: data.property_name,
    criticalCount: data.critical_items.length,
    threshold: CRITICAL_THRESHOLD,
  }

  // 3. Enviar a cada admin por todos los canales (SIMPLIFICADO)
  const sendPromises = admins.map(admin =>
    sendMultiChannelNotification({
      userId: admin.id,
      type: 'inspection_critical',
      title: `🚨 Inspección crítica en ${data.property_code}`,
      message: `Se detectaron ${data.critical_items.length} ítems críticos (< ${CRITICAL_THRESHOLD}/10) en ${data.department}`,
      emailBody: emailTemplate.html,
      telegramTemplate: TELEGRAM_TEMPLATES.inspection_critical(telegramData),
      link: `/inspections/rrhh/${data.id}`,
      // NOTA: Por defecto envía por email + push + telegram
      // En Opción 2 aquí se insertarían preferencias del usuario
    })
  )

  const results = await Promise.allSettled(sendPromises)

  // 4. Log de resultados (MEJORADO)
  const successful = results.filter(r => r.status === 'fulfilled').length
  const failed = results.length - successful

  console.log(`[notifyInspectionCritical] ✅ ${successful}/${admins.length} notificaciones enviadas por todos los canales`)
  
  return {
    adminsNotified: successful,
    failed,
  }
}

// ============================================================================
// COMPARATIVA
// ============================================================================

/*
ANTES (sin Telegram):
- 15 líneas de código (email + push)
- Duplicación de lógica
- Difícil agregar nuevos canales
- Log disperso

DESPUÉS (con Telegram):
- 30 líneas de código pero ESTRUCTURADO
- Todo en 1 función sendMultiChannelNotification()
- Fácil agregar nuevos canales (solo extender multi-channel.ts)
- Escalable a Opción 2 (preferencias de usuario)
*/

// ============================================================================
// CASOS DE USO - OTROS TIPOS DE NOTIFICACIONES
// ============================================================================

/**
 * Ejemplo 2: Notificación de Ticket Asignado
 */
export async function notifyTicketAssigned(data: {
  ticketId: string
  ticketNumber: string
  title: string
  assignedTo: string
  assignedAgentId: string
  priority: number
}) {
  await sendMultiChannelNotification({
    userId: data.assignedAgentId,
    type: 'ticket_assigned',
    title: `📋 Ticket #${data.ticketNumber} asignado a ti`,
    message: `${data.title} - Prioridad: ${data.priority}`,
    telegramTemplate: TELEGRAM_TEMPLATES.ticket_assigned({
      ticketNumber: data.ticketNumber,
      title: data.title,
      assignedTo: data.assignedTo,
    }),
    link: `/mantenimiento/tickets/${data.ticketId}`,
    // Sin emailBody = no envía email
  })
}

/**
 * Ejemplo 3: Bulk notification (mismo mensaje a múltiples usuarios)
 */
export async function notifyAllAdminsInspectionComplete(data: {
  inspectionId: string
  department: string
  shortSummary: string
}) {
  const supabase = createSupabaseAdminClient()
  
  // Obtener todos los admins
  const { data: admins } = await supabase.rpc('get_admin_emails')
  const adminIds = admins?.map(a => a.id) || []

  if (!adminIds.length) return

  // Usar función de bulk (escalable)
  const { sendNotificationToBulk } = await import('@/lib/notifications/multi-channel')
  
  const result = await sendNotificationToBulk(
    adminIds,
    {
      type: 'inspection_critical',
      title: '✅ Inspección completada',
      message: `${data.department}: ${data.shortSummary}`,
      link: `/inspections/rrhh/${data.inspectionId}`,
    }
  )

  console.log(`Bulk sent: ${result.successful.length} éxito, ${result.failed.length} fallos`)
}

// ============================================================================
// ROADMAP - ESCALABILIDAD A OPCIÓN 2
// ============================================================================

/*

OPCIÓN 2 - Cambios necesarios:

1. Agregar tabla de preferencias:
```sql
CREATE TABLE notification_preferences (
  user_id UUID (FK)
  notification_type TEXT
  channels JSONB -- {email: bool, push: bool, telegram: bool}
  PRIMARY KEY (user_id, notification_type)
)
```

2. Actualizar sendMultiChannelNotification():
```typescript
export async function sendMultiChannelNotification(
  payload: NotificationPayload
): Promise<NotificationResult> {
  // Leer preferencias antes de enviar
  const prefs = await getNotificationPreferences(
    payload.userId,
    payload.type
  )
  
  // Usar preferencias del usuario, no defaults
  const channels = prefs?.channels || DEFAULT_CHANNELS
  // ... rest del código
}
```

3. Crear interfaz web para preferencias:
- Settings > Notificaciones
- Checkboxes por tipo: Email | Push | Telegram
- Múltiples dispositivos Telegram

4. Migración: Crear preferencias por defecto para todos los usuarios

*/
