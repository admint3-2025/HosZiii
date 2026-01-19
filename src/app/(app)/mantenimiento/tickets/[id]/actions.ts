'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { notifyMaintenanceTicketComment, notifyMaintenanceTicketStatusChanged } from '@/lib/email/maintenance-ticket-notifications'
import { revalidatePath } from 'next/cache'

/**
 * Agrega un comentario a un ticket de mantenimiento y envía notificaciones (SOLO PUSH)
 */
export async function addMaintenanceTicketComment(data: {
  ticketId: string
  body: string
  visibility: 'public' | 'internal'
}) {
  console.log('=== [addMaintenanceTicketComment] INICIO ===')
  console.log('[addMaintenanceTicketComment] Datos:', data)
  
  try {
    const supabase = await createSupabaseServerClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.log('[addMaintenanceTicketComment] ✗ Usuario no autenticado')
      return { error: 'No autenticado' }
    }
    
    console.log('[addMaintenanceTicketComment] Usuario:', user.id)
    
    // Obtener ticket number, requester, assigned_agent
    console.log('[addMaintenanceTicketComment] Obteniendo datos del ticket...')
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets_maintenance')
      .select('ticket_number, title, requester_id, assigned_to')
      .eq('id', data.ticketId)
      .single()
    
    if (ticketError || !ticket) {
      console.log('[addMaintenanceTicketComment] ✗ Ticket no encontrado:', ticketError)
      return { error: 'Ticket no encontrado' }
    }
    
    console.log('[addMaintenanceTicketComment] Ticket encontrado:', {
      ticket_number: ticket.ticket_number,
      requester_id: ticket.requester_id,
      assigned_to: ticket.assigned_to
    })
    
    // Crear el comentario
    console.log('[addMaintenanceTicketComment] Creando comentario en BD...')
    const { data: comment, error: commentError } = await supabase
      .from('maintenance_ticket_comments')
      .insert({
        ticket_id: data.ticketId,
        body: data.body,
        visibility: data.visibility,
        author_id: user.id,
      })
      .select()
      .single()
    
    if (commentError) {
      console.log('[addMaintenanceTicketComment] ✗ Error creando comentario:', commentError)
      return { error: commentError.message }
    }
    
    console.log('[addMaintenanceTicketComment] ✓ Comentario creado:', comment.id)
    
    // Enviar notificaciones (SOLO PUSH, NO EMAIL) - no bloquear si falla
    try {
      console.log('[addMaintenanceTicketComment] Enviando notificaciones...')
      await notifyMaintenanceTicketComment({
        ticketId: data.ticketId,
        ticketNumber: String(ticket.ticket_number),
        title: ticket.title,
        commentBody: data.body,
        commentVisibility: data.visibility,
        authorId: user.id,
        requesterId: ticket.requester_id,
        assignedAgentId: ticket.assigned_to || undefined,
      })
      console.log('[addMaintenanceTicketComment] ✓ Notificaciones enviadas')
    } catch (notifError) {
      console.error('[addMaintenanceTicketComment] ✗ Error enviando notificaciones:', notifError)
      // No retornar error, el comentario ya se creó exitosamente
    }
    
    revalidatePath(`/mantenimiento/tickets/${data.ticketId}`)
    
    return { success: true, comment }
  } catch (err: any) {
    console.error('[addMaintenanceTicketComment] Error:', err)
    return { error: err.message || 'Error al agregar comentario' }
  }
}

/**
 * Cambia el estado de un ticket de mantenimiento y envía notificaciones (PUSH + EMAIL)
 */
export async function updateMaintenanceTicketStatus(data: {
  ticketId: string
  newStatus: string
}) {
  try {
    const supabase = await createSupabaseServerClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { error: 'No autenticado' }
    }
    
    // Obtener estado actual
    const { data: ticket, error: fetchError } = await supabase
      .from('tickets_maintenance')
      .select('status, ticket_number, title, requester_id, assigned_to')
      .eq('id', data.ticketId)
      .single()
    
    if (fetchError || !ticket) {
      return { error: 'Ticket no encontrado' }
    }
    
    const oldStatus = ticket.status
    
    if (oldStatus === data.newStatus) {
      return { error: 'El ticket ya tiene ese estado' }
    }
    
    // Actualizar estado
    const { error: updateError } = await supabase
      .from('tickets_maintenance')
      .update({ 
        status: data.newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.ticketId)
    
    if (updateError) {
      return { error: updateError.message }
    }
    
    // Obtener información de la ubicación para notificaciones
    const { data: ticketWithLocation } = await supabase
      .from('tickets_maintenance')
      .select('location_id, locations(name, code)')
      .eq('id', data.ticketId)
      .single()
    
    const locationName = (ticketWithLocation?.locations as any)?.name
    const locationCode = (ticketWithLocation?.locations as any)?.code
    
    // Enviar notificaciones (PUSH + EMAIL)
    await notifyMaintenanceTicketStatusChanged({
      ticketId: data.ticketId,
      ticketNumber: String(ticket.ticket_number),
      title: ticket.title,
      requesterId: ticket.requester_id,
      oldStatus,
      newStatus: data.newStatus,
      assignedAgentId: ticket.assigned_to || undefined,
      actorId: user.id,
      locationName,
      locationCode,
    })
    
    revalidatePath(`/mantenimiento/tickets/${data.ticketId}`)
    
    return { success: true }
  } catch (err: any) {
    console.error('[updateMaintenanceTicketStatus] Error:', err)
    return { error: err.message || 'Error al actualizar estado' }
  }
}
