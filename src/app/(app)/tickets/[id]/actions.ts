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
