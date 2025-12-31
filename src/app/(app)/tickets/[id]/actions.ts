'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isAllowedTransition } from '@/lib/tickets/workflow'
import { 
  notifyTicketAssigned, 
  notifyTicketStatusChanged, 
  notifyTicketClosed,
  notifyTicketEscalated
} from '@/lib/email/ticket-notifications'

type UpdateTicketStatusInput = {
  ticketId: string
  currentStatus: string
  nextStatus: string
  assignedAgentId?: string | null
  resolution?: string
  attachments?: File[]
}

export async function updateTicketStatus(input: UpdateTicketStatusInput) {
  const supabase = await createSupabaseServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autenticado' }
  }

  // Verificar que el usuario sea agente, supervisor o admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['agent_l1', 'agent_l2', 'supervisor', 'admin'].includes(profile.role)) {
    return { error: 'No tienes permisos para cambiar el estado del ticket' }
  }

  // Validate transition
  if (!isAllowedTransition(input.currentStatus, input.nextStatus)) {
    return { error: 'Transición de estado no permitida por el flujo' }
  }

  if (input.nextStatus === 'ASSIGNED' && !input.assignedAgentId) {
    return { error: 'Selecciona un agente para asignar el ticket' }
  }

  // Validar resolución al cerrar
  if (input.nextStatus === 'CLOSED') {
    if (!input.resolution || input.resolution.trim().length < 20) {
      return { error: 'La resolución es obligatoria y debe tener al menos 20 caracteres' }
    }
  }

  // Get ticket details for notifications
  const { data: ticket } = await supabase
    .from('tickets')
    .select('id, ticket_number, title, priority, requester_id, assigned_agent_id')
    .eq('id', input.ticketId)
    .single()

  if (!ticket) {
    return { error: 'Ticket no encontrado' }
  }

  // Prepare update payload
  const updatePayload: any = { status: input.nextStatus }
  if (input.nextStatus === 'ASSIGNED' && input.assignedAgentId) {
    updatePayload.assigned_agent_id = input.assignedAgentId
  }
  if (input.nextStatus === 'CLOSED') {
    updatePayload.closed_at = new Date().toISOString()
    updatePayload.closed_by = user.id
    updatePayload.resolution = input.resolution
  }

  // Update ticket
  const { error: updateErr } = await supabase
    .from('tickets')
    .update(updatePayload)
    .eq('id', input.ticketId)

  if (updateErr) {
    return { error: updateErr.message }
  }

  // Insert status history
  const { error: historyErr } = await supabase
    .from('ticket_status_history')
    .insert({
      ticket_id: input.ticketId,
      from_status: input.currentStatus,
      to_status: input.nextStatus,
      actor_id: user.id,
      note: input.nextStatus === 'CLOSED' && input.resolution ? `Resolución: ${input.resolution}` : null,
    })

  if (historyErr) {
    console.error('Error insertando historial de estado:', historyErr)
  }

  // Si se cierra el ticket, agregar comentario con la resolución y adjuntos
  if (input.nextStatus === 'CLOSED' && input.resolution) {
    // Crear comentario de resolución
    const { data: commentData, error: commentErr } = await supabase
      .from('ticket_comments')
      .insert({
        ticket_id: input.ticketId,
        author_id: user.id,
        body: `🔒 **Ticket cerrado**\n\n**Resolución:**\n${input.resolution}`,
        visibility: 'public',
      })
      .select()
      .single()

    if (commentErr) {
      console.error('Error agregando comentario de resolución:', commentErr)
    }

    // Subir adjuntos si los hay
    if (input.attachments && input.attachments.length > 0 && commentData) {
      for (const file of input.attachments) {
        try {
          // Generar nombre único (misma lógica que uploadTicketAttachment)
          const timestamp = Date.now()
          const randomStr = Math.random().toString(36).substring(2, 8)
          const fileExt = file.name.split('.').pop()
          const storagePath = `${input.ticketId}/${timestamp}-${randomStr}.${fileExt}`

          // Subir a storage
          const { error: uploadErr } = await supabase.storage
            .from('ticket-attachments')
            .upload(storagePath, file, {
              cacheControl: '3600',
              upsert: false,
            })

          if (uploadErr) {
            console.error('Error subiendo adjunto:', uploadErr)
            continue
          }

          // Registrar en la tabla ticket_attachments
          const { error: attachErr } = await supabase
            .from('ticket_attachments')
            .insert({
              ticket_id: input.ticketId,
              comment_id: commentData.id,
              file_name: file.name,
              file_size: file.size,
              file_type: file.type,
              storage_path: storagePath,
              uploaded_by: user.id,
            })

          if (attachErr) {
            console.error('Error registrando adjunto en BD:', attachErr)
          }
        } catch (err) {
          console.error('Error procesando adjunto:', err)
        }
      }
    }
  }

  // Send notifications
  const notificationData = {
    ticketId: ticket.id,
    ticketNumber: ticket.ticket_number,
    title: ticket.title,
    priority: ticket.priority,
    requesterId: ticket.requester_id,
    oldStatus: input.currentStatus,
    newStatus: input.nextStatus,
    assignedAgentId: input.assignedAgentId || ticket.assigned_agent_id,
    actorId: user.id,
    resolution: input.resolution,
  }

  try {
    // If assigned, send assignment notification
    if (input.nextStatus === 'ASSIGNED' && input.assignedAgentId) {
      console.log('[Ticket Assigned] Enviando notificación para ticket:', ticket.ticket_number)
      await notifyTicketAssigned(notificationData)
      console.log('[Ticket Assigned] ✓ Notificación enviada')
    }

    // If closed, send closure notification
    if (input.nextStatus === 'CLOSED') {
      console.log('[Ticket Closed] Enviando notificación para ticket:', ticket.ticket_number)
      await notifyTicketClosed({ ...notificationData, resolution: input.resolution })
      console.log('[Ticket Closed] ✓ Notificación enviada')
    } else if (input.nextStatus !== 'ASSIGNED') {
      // For other status changes, send status change notification
      console.log('[Ticket Status Changed] Enviando notificación para ticket:', ticket.ticket_number)
      await notifyTicketStatusChanged(notificationData)
      console.log('[Ticket Status Changed] ✓ Notificación enviada')
    }
  } catch (err) {
    console.error('[Ticket Notification] ✗ Error enviando notificación:', err)
  }

  return { success: true }
}

export async function escalateTicket(ticketId: string, currentLevel: number, assignToAgentId?: string) {
  if (currentLevel === 2) {
    return { error: 'El ticket ya está en Nivel 2' }
  }

  if (!assignToAgentId) {
    return { error: 'Debe seleccionar un técnico nivel 2, supervisor o administrador' }
  }

  const supabase = await createSupabaseServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autenticado' }
  }

  // Verificar que el usuario sea agente, supervisor o admin
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userProfile || !['agent_l1', 'agent_l2', 'supervisor', 'admin'].includes(userProfile.role)) {
    return { error: 'No tienes permisos para escalar tickets' }
  }

  // Verificar que el agente seleccionado tenga rol adecuado
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', assignToAgentId)
    .single()

  if (!profile || !['agent_l2', 'supervisor', 'admin'].includes(profile.role)) {
    return { error: 'El agente seleccionado no tiene permisos de nivel 2' }
  }

  // Obtener datos del ticket para notificaciones
  const { data: ticket } = await supabase
    .from('tickets')
    .select('id, ticket_number, title, priority, requester_id')
    .eq('id', ticketId)
    .single()

  if (!ticket) {
    return { error: 'Ticket no encontrado' }
  }

  const { error } = await supabase
    .from('tickets')
    .update({ 
      support_level: 2,
      assigned_agent_id: assignToAgentId,
      status: 'ASSIGNED'
    })
    .eq('id', ticketId)

  if (error) {
    return { error: error.message }
  }

  // Enviar notificaciones de escalamiento
  try {
    console.log('[Ticket Escalated] Enviando notificación para ticket:', ticket.ticket_number)
    await notifyTicketEscalated({
      ticketId: ticket.id,
      ticketNumber: ticket.ticket_number,
      title: ticket.title,
      priority: ticket.priority,
      requesterId: ticket.requester_id,
      assignedAgentId: assignToAgentId,
      actorId: user.id,
    })
    console.log('[Ticket Escalated] ✓ Notificación enviada')
  } catch (err) {
    console.error('[Ticket Escalated] ✗ Error enviando notificación:', err)
  }

  return { success: true }
}

export async function reopenTicket(ticketId: string, reason: string) {
  if (!reason || reason.trim().length < 10) {
    return { error: 'Debe proporcionar un motivo de reapertura (mínimo 10 caracteres)' }
  }

  const supabase = await createSupabaseServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autenticado' }
  }

  // Verificar que el usuario sea agente, supervisor o admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['agent_l1', 'agent_l2', 'supervisor', 'admin'].includes(profile.role)) {
    return { error: 'No tienes permisos para reabrir tickets' }
  }

  // Obtener datos del ticket
  const { data: ticket } = await supabase
    .from('tickets')
    .select('id, ticket_number, title, priority, status, requester_id, assigned_agent_id')
    .eq('id', ticketId)
    .single()

  if (!ticket) {
    return { error: 'Ticket no encontrado' }
  }

  if (ticket.status !== 'CLOSED') {
    return { error: 'Solo se pueden reabrir tickets cerrados' }
  }

  // Reabrir el ticket y asignar al agente actual
  const { error: updateErr } = await supabase
    .from('tickets')
    .update({ 
      status: 'IN_PROGRESS',
      assigned_agent_id: user.id,
      closed_at: null,
      closed_by: null,
    })
    .eq('id', ticketId)

  if (updateErr) {
    return { error: updateErr.message }
  }

  // Insertar historial de estado
  const { error: historyErr } = await supabase
    .from('ticket_status_history')
    .insert({
      ticket_id: ticketId,
      from_status: 'CLOSED',
      to_status: 'IN_PROGRESS',
      actor_id: user.id,
      note: `Ticket reabierto. Motivo: ${reason.trim()}`,
    })

  if (historyErr) {
    console.error('Error insertando historial de reapertura:', historyErr)
  }

  // Agregar comentario de reapertura
  const { error: commentErr } = await supabase
    .from('ticket_comments')
    .insert({
      ticket_id: ticketId,
      author_id: user.id,
      body: `🔓 **Ticket reabierto**\n\n**Motivo:**\n${reason.trim()}`,
      visibility: 'internal',
    })

  if (commentErr) {
    console.error('Error agregando comentario de reapertura:', commentErr)
  }

  // Enviar notificación de cambio de estado
  try {
    console.log('[Ticket Reopened] Enviando notificación para ticket:', ticket.ticket_number)
    await notifyTicketStatusChanged({
      ticketId: ticket.id,
      ticketNumber: ticket.ticket_number,
      title: ticket.title,
      priority: ticket.priority,
      requesterId: ticket.requester_id,
      oldStatus: 'CLOSED',
      newStatus: 'IN_PROGRESS',
      assignedAgentId: user.id,
      actorId: user.id,
    })
    console.log('[Ticket Reopened] ✓ Notificación enviada')
  } catch (err) {
    console.error('[Ticket Reopened] ✗ Error enviando notificación:', err)
  }

  return { success: true }
}

export async function softDeleteTicket(ticketId: string, reason: string) {
  if (!reason || !reason.trim()) {
    return { error: 'Debe proporcionar un motivo de eliminación' }
  }

  const supabase = await createSupabaseServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autenticado' }
  }

  // Verificar que el usuario sea agente, supervisor o admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['agent_l1', 'agent_l2', 'supervisor', 'admin'].includes(profile.role)) {
    return { error: 'No tienes permisos para eliminar tickets' }
  }

  const now = new Date().toISOString()

  const { error } = await supabase
    .from('tickets')
    .update({ 
      deleted_at: now, 
      deleted_by: user.id, 
      deleted_reason: reason.trim() 
    })
    .eq('id', ticketId)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

/**
 * Solicitar escalamiento (solo para técnicos L1)
 * Notifica al supervisor de la misma sede
 */
export async function requestEscalation(ticketId: string, reason: string) {
  const supabase = await createSupabaseServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autenticado' }
  }

  // Verificar que el usuario sea técnico L1
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, location_id, full_name')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'agent_l1') {
    return { error: 'Solo los técnicos de nivel 1 pueden solicitar escalamiento' }
  }

  // Obtener información del ticket
  const { data: ticket } = await supabase
    .from('tickets')
    .select('ticket_number, title, priority, support_level, location_id, locations(name, code)')
    .eq('id', ticketId)
    .single()

  if (!ticket) {
    return { error: 'Ticket no encontrado' }
  }

  if (ticket.support_level !== 1) {
    return { error: 'El ticket ya está escalado' }
  }

  // Buscar supervisores de la misma sede
  const { data: supervisors } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('location_id', profile.location_id)
    .eq('role', 'supervisor')

  if (!supervisors || supervisors.length === 0) {
    return { error: 'No se encontró ningún supervisor en tu sede' }
  }

  // Enviar notificación a cada supervisor de la sede
  try {
    const { createSupabaseAdminClient } = await import('@/lib/supabase/admin')
    const adminClient = createSupabaseAdminClient()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const ticketUrl = `${baseUrl}/tickets/${ticketId}`
    const locationName = (ticket.locations as any)?.name || 'la sede'
    const locationCode = (ticket.locations as any)?.code || ''

    for (const supervisor of supervisors) {
      // Obtener email del supervisor
      const { data: authUser } = await adminClient.auth.admin.getUserById(supervisor.id)
      
      if (!authUser.user?.email) continue

      // Crear notificación en la base de datos
      await supabase.from('notifications').insert({
        user_id: supervisor.id,
        type: 'escalation_request',
        title: `🔔 Solicitud de escalamiento en ${locationCode}`,
        message: `${profile.full_name || 'Un técnico'} solicita escalar el ticket #${ticket.ticket_number}: "${ticket.title}". Motivo: ${reason}`,
        ticket_id: ticketId,
        ticket_number: ticket.ticket_number,
        actor_id: user.id,
      })

      // Enviar email
      const { sendMail } = await import('@/lib/email/mailer')
      
      const html = `
        <!DOCTYPE html>
        <html lang="es">
        <head><meta charset="UTF-8"></head>
        <body style="margin:0; padding:0; background-color:#f9fafb;">
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#f9fafb; padding:40px 20px;">
            
            <div style="max-width:600px; margin:0 auto 24px auto; text-align:center;">
              <img src="https://integrational3.com.mx/logorigen/ZIII%20logo.png" alt="ZIII Helpdesk" width="180" height="120" style="display:block; margin:0 auto;" />
            </div>

            <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:16px; box-shadow:0 4px 6px rgba(0,0,0,0.07); overflow:hidden;">
              
              <div style="background:linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding:24px;">
                <div style="background:rgba(255,255,255,0.15); border-radius:12px; padding:12px; text-align:center; border:1px solid rgba(255,255,255,0.2);">
                  <div style="font-size:36px; margin-bottom:6px;">🔔</div>
                  <h2 style="margin:0; font-size:20px; font-weight:700; color:#ffffff;">Solicitud de Escalamiento</h2>
                </div>
              </div>

              <div style="padding:32px;">
                <p style="margin:0 0 24px 0; font-size:15px; color:#374151;">
                  Hola <strong>${supervisor.full_name || 'Supervisor'}</strong>,
                </p>
                <p style="margin:0 0 24px 0; font-size:15px; color:#374151;">
                  <strong>${profile.full_name || 'Un técnico L1'}</strong> de tu sede solicita tu aprobación para escalar el siguiente ticket a Nivel 2:
                </p>

                <div style="margin-bottom:24px; text-align:center;">
                  <div style="display:inline-block; padding:8px 20px; background:#fef3c7; border:2px solid #fbbf24; border-radius:20px;">
                    <span style="font-size:12px; color:#78350f; font-weight:700;">📍 ${locationCode} - ${locationName}</span>
                  </div>
                </div>

                <div style="padding:20px; background:#fef3c7; border-radius:12px; margin-bottom:24px; border:2px solid #fb923c;">
                  <div style="font-size:12px; color:#c2410c; font-weight:700; margin-bottom:8px;">TICKET</div>
                  <div style="font-size:32px; color:#ea580c; font-weight:800;">#${ticket.ticket_number}</div>
                </div>

                <div style="margin-bottom:24px;">
                  <div style="padding-bottom:16px; border-bottom:1px solid #e5e7eb;">
                    <div style="font-size:11px; color:#6b7280; text-transform:uppercase; font-weight:700; margin-bottom:6px;">Título</div>
                    <div style="font-size:16px; color:#111827; font-weight:600;">${ticket.title}</div>
                  </div>
                </div>

                <div style="padding:16px; background:#fef3c7; border-radius:10px; border:1px solid #fbbf24; margin-bottom:24px;">
                  <div style="font-size:11px; color:#78350f; text-transform:uppercase; font-weight:700; margin-bottom:8px;">Motivo del escalamiento</div>
                  <div style="font-size:14px; color:#92400e; line-height:1.6;">${reason}</div>
                </div>

                <div style="text-align:center; margin:32px 0 24px 0;">
                  <a href="${ticketUrl}" style="display:inline-block; background:#f59e0b; color:#ffffff; text-decoration:none; padding:14px 32px; border-radius:12px; font-size:16px; font-weight:600;">
                    Revisar y Escalar →
                  </a>
                </div>

                <div style="padding:16px; background:#fef3c7; border-left:4px solid #f59e0b; border-radius:8px;">
                  <p style="margin:0; font-size:13px; color:#92400e;">
                    <strong>⚡ Acción requerida:</strong> Como supervisor, puedes revisar el ticket y proceder con el escalamiento a Nivel 2 si lo consideras necesario.
                  </p>
                </div>
              </div>
            </div>

            <div style="max-width:600px; margin:24px auto 0 auto; text-align:center;">
              <p style="margin:0 0 8px 0; font-size:12px; color:#9ca3af;">ZIII Helpdesk · Mesa de Ayuda ITIL</p>
              <p style="margin:0; font-size:11px; color:#d1d5db;">Este es un mensaje automático, no respondas</p>
            </div>
          </div>
        </body>
        </html>
      `

      await sendMail({
        to: authUser.user.email,
        subject: `🔔 Solicitud de escalamiento - Ticket #${ticket.ticket_number} [${locationCode}]`,
        html,
        text: `Solicitud de escalamiento\n\nHola ${supervisor.full_name || 'Supervisor'},\n\n${profile.full_name || 'Un técnico L1'} solicita escalar el ticket #${ticket.ticket_number}: "${ticket.title}"\n\nMotivo: ${reason}\n\nVer ticket: ${ticketUrl}`,
      })
    }

    return { success: true, message: 'Solicitud enviada al supervisor de tu sede' }
  } catch (error: any) {
    console.error('[requestEscalation] Error:', error)
    return { error: 'Error enviando la solicitud: ' + error.message }
  }
}
