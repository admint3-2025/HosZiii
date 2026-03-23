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
  requestAI?: boolean
  userRole?: string
}) {
  console.log('=== [addMaintenanceTicketComment] INICIO ===')
  
  try {
    const supabase = await createSupabaseServerClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autenticado' }
    
    // Obtener ticket con datos necesarios para notificaciones y AI
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets_maintenance')
      .select('ticket_number, title, requester_id, assigned_to, description, status, created_at, locations(name, code)')
      .eq('id', data.ticketId)
      .single()
    
    if (ticketError || !ticket) return { error: 'Ticket no encontrado' }
    
    // Crear el comentario
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
    
    if (commentError) return { error: commentError.message }

    // Notificaciones y triage AI en background (no bloquear)
    try {
      await notifyMaintenanceTicketComment({
        ticketId: data.ticketId,
        ticketNumber: String(ticket.ticket_number),
        title: ticket.title,
        commentBody: data.body,
        commentVisibility: data.visibility,
        authorId: user.id,
        requesterId: ticket.requester_id,
        assignedAgentId: (ticket.assigned_to as string | null) || undefined,
      })
    } catch (notifError) {
      console.error('[addMaintenanceTicketComment] Error en notificaciones:', notifError)
    }

    // Triage AI:
    // • Si quien comenta es el solicitante → primer respondiente automático (público, lenguaje simple)
    // • Si el técnico pide Apoyo IA explícitamente → sugerencia técnica (interna)
    const isCommentByRequester = user.id === ticket.requester_id
    const shouldRunAI = process.env.AI_TRIAGE_ENABLED === 'true' && (isCommentByRequester || data.requestAI === true)

    if (shouldRunAI) {
      try {
        const { getTicketTriage } = await import('@/lib/ai/openrouter')
        const locName = (ticket.locations as any)?.name || ''
        const locCode = (ticket.locations as any)?.code || ''
        const effectiveRole = isCommentByRequester ? 'requester' : (data.userRole || 'maintenance_tech')

        // Obtener historial de comentarios recientes (con timestamps para verificación temporal)
        const { data: recentComments } = await supabase
          .from('maintenance_ticket_comments')
          .select('body, author_id, created_at')
          .eq('ticket_id', data.ticketId)
          .neq('id', comment.id)
          .not('body', 'like', '🔒 **Ticket cerrado**%')
          .order('created_at', { ascending: true })
          .limit(10)

        const conversationHistory = (recentComments || [])
          .filter(c => c.body)
          .map(c => ({
            role: (c.body!.startsWith('🤖') ? 'assistant' : 'user') as 'user' | 'assistant',
            content: c.body!,
            timestamp: c.created_at ?? undefined,
          }))

        const triage = await getTicketTriage({
          ticketCode: `MNT-${String(ticket.ticket_number).padStart(5, '0')}`,
          title: ticket.title,
          description: (ticket.description as string | null) || '',
          status: ticket.status as string,
          location: locCode ? `${locCode} - ${locName}` : locName,
          userRole: effectiveRole,
          conversationHistory,
          ticketCreatedAt: (ticket.created_at as string | null) ?? undefined,
          currentCommentAt: (comment as any).created_at ?? undefined,
        }, data.body)

        if (triage) {
          const escalateNote = triage.shouldEscalate ? '\n\n⚠️ **Recomendación:** Considera escalar este ticket.' : ''
          const confidenceLabel = { high: 'alta', medium: 'media', low: 'baja' }[triage.confidence]
          const aiVisibility = isCommentByRequester ? 'public' : 'internal'
          const aiLabel = isCommentByRequester ? '🤖 **Asistente ZIII**' : '🤖 **Apoyo IA**'
          await supabase.from('maintenance_ticket_comments').insert({
            ticket_id: data.ticketId,
            body: `${aiLabel} (confianza ${confidenceLabel}):\n\n${triage.suggestedReply}${escalateNote}`,
            visibility: aiVisibility,
            author_id: user.id,
          })
        }
      } catch (aiErr) {
        console.error('[addMaintenanceTicketComment] Error en triage AI:', aiErr)
      }
    }
    
    revalidatePath(`/mantenimiento/tickets/${data.ticketId}`)
    return { success: true, comment }
  } catch (err: any) {
    console.error('[addMaintenanceTicketComment] Error:', err)
    return { error: err.message || 'Error al agregar comentario' }
  }
}

/**
 * Escala un ticket de mantenimiento a nivel superior (si se implementa escalamiento en el futuro)
 */
export async function escalateMaintenanceTicket(data: {
  ticketId: string
  newLevel: number
  assignToAgentId: string
  escalatedBy: string
}) {
  try {
    const supabase = await createSupabaseServerClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { error: 'No autenticado' }
    }

    // Actualizar nivel de soporte y agente asignado
    const { error: updateError } = await supabase
      .from('tickets_maintenance')
      .update({ 
        support_level: data.newLevel,
        assigned_to: data.assignToAgentId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.ticketId)
    
    if (updateError) {
      return { error: updateError.message }
    }

    // Obtener datos del ticket y ubicación
    const { data: ticket } = await supabase
      .from('tickets_maintenance')
      .select('ticket_number, title, location_id, locations(name, code)')
      .eq('id', data.ticketId)
      .single()

    // Obtener nombre del nuevo agente
    const { data: newAgentProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', data.assignToAgentId)
      .single()

    const locationCode = (ticket?.locations as any)?.code || ''
    const locationName = (ticket?.locations as any)?.name || ''

    // Crear comentario automático de escalamiento
    const { error: commentError } = await supabase
      .from('maintenance_ticket_comments')
      .insert({
        ticket_id: data.ticketId,
        author_id: user.id,
        body: `✅ **Escalamiento aprobado a Nivel ${data.newLevel}**\n\n**Escalado por:** ${data.escalatedBy}\n**Asignado a:** ${newAgentProfile?.full_name || 'Técnico'}\n**Sede:** ${locationCode} - ${locationName}\n\n_El ticket ha sido escalado exitosamente._`,
        visibility: 'public',
      })

    if (commentError) {
      console.error('Error creando comentario de escalamiento:', commentError)
    }

    revalidatePath(`/mantenimiento/tickets/${data.ticketId}`)
    
    return { success: true }
  } catch (err: any) {
    console.error('[escalateMaintenanceTicket] Error:', err)
    return { error: err.message || 'Error al escalar ticket' }
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
