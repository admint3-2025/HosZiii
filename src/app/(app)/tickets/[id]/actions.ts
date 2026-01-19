'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { isAllowedTransition } from '@/lib/tickets/workflow'
import { 
  notifyTicketAssigned, 
  notifyTicketStatusChanged, 
  notifyTicketClosed,
  notifyTicketEscalated
} from '@/lib/email/ticket-notifications'
import { sendMail } from '@/lib/email/mailer'
import { ticketInvestigationEmailTemplate } from '@/lib/email/templates'
import { STATUS_LABELS } from '@/lib/tickets/workflow'
import { PRIORITY_LABELS } from '@/lib/tickets/priority'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import {
  fetchTicketAssetCategory,
  recipientMatchesTicketCategory,
} from '@/lib/tickets/ticket-asset-category'

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
      
      // Detectar si el ticket califica para base de conocimientos
      try {
        console.log('[KB] Evaluando ticket para base de conocimientos:', ticket.ticket_number)
        const { data: kbResult, error: kbError } = await supabase
          .rpc('detect_kb_candidate_from_ticket', { ticket_id_param: input.ticketId })
        
        if (kbError) {
          console.error('[KB] ✗ Error al evaluar candidato:', kbError)
        } else if (kbResult === true) {
          console.log('[KB] ✓ Ticket agregado a KB pendiente de revisión')
        } else {
          console.log('[KB] ℹ Ticket no cumple criterios para KB')
        }
      } catch (kbErr) {
        console.error('[KB] ✗ Error inesperado:', kbErr)
      }
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

type AssignAssetInput = {
  ticketId: string
  assetIdentifier: string
}

export async function assignTicketAsset(input: AssignAssetInput) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'supervisor'].includes(profile.role)) {
    return { error: 'Solo admin o supervisor pueden editar el ticket' }
  }

  const value = (input.assetIdentifier || '').trim()
  if (!value) return { error: 'Proporciona el asset tag o ID' }

  const isUuid = value.includes('-') && value.length >= 32

  // Intentar primero en assets_it (tabla nueva)
  const assetQueryIT = supabase
    .from('assets_it')
    .select('id, asset_code, deleted_at')
    .is('deleted_at', null)
    .limit(1)

  const { data: assetIT, error: assetITErr } = isUuid
    ? await assetQueryIT.eq('id', value).single()
    : await assetQueryIT.ilike('asset_code', value).single()

  let finalAsset: { id: string; asset_tag?: string; asset_code?: string } | null = null
  
  if (assetIT) {
    // Mapear asset_code a asset_tag para compatibilidad
    finalAsset = { id: assetIT.id, asset_tag: (assetIT as any).asset_code }
  } else {
    // Fallback a tabla legacy assets
    const assetQuery = supabase
      .from('assets')
      .select('id, asset_tag, deleted_at')
      .is('deleted_at', null)
      .limit(1)

    const { data: asset, error: assetErr } = isUuid
      ? await assetQuery.eq('id', value).single()
      : await assetQuery.ilike('asset_tag', value).single()

    if (asset) {
      finalAsset = asset
    }
  }

  if (!finalAsset) {
    return { error: 'Activo no encontrado o está dado de baja' }
  }

  const { error: updateErr } = await supabase
    .from('tickets')
    .update({ asset_id: finalAsset.id })
    .eq('id', input.ticketId)

  if (updateErr) return { error: updateErr.message }

  await revalidatePath(`/tickets/${input.ticketId}`)
  return { success: true, asset_tag: finalAsset.asset_tag }
}

export async function assignTicketAssetAction(formData: FormData) {
  const ticketId = String(formData.get('ticketId') || '')
  const assetIdentifier = String(formData.get('assetIdentifier') || '')
  return assignTicketAsset({ ticketId, assetIdentifier })
}

export async function escalateTicket(ticketId: string, currentLevel: number, assignToAgentId?: string) {
  if (currentLevel === 2) {
    return { error: 'El ticket ya está en Nivel 2' }
  }

  if (!assignToAgentId) {
    return { error: 'Debe seleccionar un técnico nivel 2, supervisor o administrador' }
  }

  const supabase = await createSupabaseServerClient()
  const adminClient = createSupabaseAdminClient()
  
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
    .select('id, ticket_number, title, priority, requester_id, assigned_agent_id, locations(name, code)')
    .eq('id', ticketId)
    .single()

  if (!ticket) {
    return { error: 'Ticket no encontrado' }
  }

  // Buscar quién solicitó el escalamiento (en los comentarios)
  let previousAgentId = ticket.assigned_agent_id
  
  // Si no hay agente asignado, buscar en los comentarios quién solicitó el escalamiento
  if (!previousAgentId) {
    console.log('[escalateTicket] No hay assigned_agent_id, buscando en comentarios...')
    const { data: escalationComment } = await supabase
      .from('ticket_comments')
      .select('author_id')
      .eq('ticket_id', ticketId)
      .ilike('body', '%🔔 **Solicitud de escalamiento a Nivel 2**%')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (escalationComment) {
      previousAgentId = escalationComment.author_id
      console.log('[escalateTicket] Encontrado solicitante en comentarios:', previousAgentId)
    }
  }
  
  console.log('[escalateTicket] previousAgentId final:', previousAgentId)

  const ticketCategory = await fetchTicketAssetCategory(adminClient as any, ticketId)

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

  // Obtener perfil del supervisor que escaló
  const { data: supervisorProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  // Obtener perfil del nuevo agente asignado
  const { data: newAgentProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', assignToAgentId)
    .single()

  // Agregar comentario de escalamiento aprobado
  const locationCode = (ticket.locations as any)?.code || ''
  const locationName = (ticket.locations as any)?.name || ''
  await supabase.from('ticket_comments').insert({
    ticket_id: ticketId,
    author_id: user.id,
    body: `✅ **Escalamiento aprobado a Nivel 2**\n\n**Escalado por:** ${supervisorProfile?.full_name || 'Supervisor'}\n**Asignado a:** ${newAgentProfile?.full_name || 'Técnico L2'}\n**Sede:** ${locationCode} - ${locationName}\n\n_El ticket ha sido escalado exitosamente._`,
    visibility: 'public',
  })

  // Notificar al técnico L1 anterior si existe
  if (previousAgentId) {
    console.log('[escalateTicket] Notificando al técnico L1:', previousAgentId)
    try {
      const { data: prevProfile } = await adminClient
        .from('profiles')
        .select('role, asset_category')
        .eq('id', previousAgentId)
        .single()

      const canNotify = recipientMatchesTicketCategory({
        recipientAssetCategory: (prevProfile as any)?.asset_category,
        ticketCategory,
        recipientRole: (prevProfile as any)?.role,
      })

      if (!canNotify) {
        console.log('[escalateTicket] Omitiendo notificación: categoría de ticket no coincide con el receptor')
        return { success: true }
      }
      
      // Obtener email del técnico L1
      const { data: authUser } = await adminClient.auth.admin.getUserById(previousAgentId)
      console.log('[escalateTicket] AuthUser obtenido:', authUser.user?.email)
      
      if (authUser.user?.email) {
        // Crear notificación push
        console.log('[escalateTicket] Creando notificación push...')
        const { error: notifError } = await supabase.from('notifications').insert({
          user_id: previousAgentId,
          type: 'TICKET_ESCALATED',
          title: `✅ Escalamiento aprobado - Ticket #${ticket.ticket_number}`,
          message: `${supervisorProfile?.full_name || 'El supervisor'} ha aprobado tu solicitud de escalamiento. El ticket ha sido escalado a Nivel 2 y asignado a ${newAgentProfile?.full_name || 'un técnico L2'}.`,
          ticket_id: ticketId,
          ticket_number: ticket.ticket_number,
          actor_id: user.id,
        })
        
        if (notifError) {
          console.error('[escalateTicket] Error creando notificación:', notifError)
        } else {
          console.log('[escalateTicket] ✓ Notificación push creada')
        }

        // Enviar email
        console.log('[escalateTicket] Enviando email...')
        const { sendMail } = await import('@/lib/email/mailer')
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const ticketUrl = `${baseUrl}/tickets/${ticketId}`

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
                
                <div style="background:linear-gradient(135deg, #10b981 0%, #059669 100%); padding:24px;">
                  <div style="background:rgba(255,255,255,0.15); border-radius:12px; padding:12px; text-align:center; border:1px solid rgba(255,255,255,0.2);">
                    <div style="font-size:36px; margin-bottom:6px;">✅</div>
                    <h2 style="margin:0; font-size:20px; font-weight:700; color:#ffffff;">Escalamiento Aprobado</h2>
                  </div>
                </div>

                <div style="padding:32px;">
                  <p style="margin:0 0 24px 0; font-size:15px; color:#374151;">
                    Hola,
                  </p>
                  <p style="margin:0 0 24px 0; font-size:15px; color:#374151;">
                    <strong>${supervisorProfile?.full_name || 'El supervisor'}</strong> ha aprobado tu solicitud de escalamiento.
                  </p>

                  <div style="margin-bottom:24px; text-align:center;">
                    <div style="display:inline-block; padding:8px 20px; background:#d1fae5; border:2px solid #10b981; border-radius:20px;">
                      <span style="font-size:12px; color:#065f46; font-weight:700;">📍 ${locationCode} - ${locationName}</span>
                    </div>
                  </div>

                  <div style="padding:20px; background:#d1fae5; border-radius:12px; margin-bottom:24px; border:2px solid #10b981;">
                    <div style="font-size:12px; color:#065f46; font-weight:700; margin-bottom:8px;">TICKET ESCALADO</div>
                    <div style="font-size:32px; color:#059669; font-weight:800;">#${ticket.ticket_number}</div>
                  </div>

                  <div style="margin-bottom:24px;">
                    <div style="padding-bottom:16px; border-bottom:1px solid #e5e7eb;">
                      <div style="font-size:11px; color:#6b7280; text-transform:uppercase; font-weight:700; margin-bottom:6px;">Título</div>
                      <div style="font-size:16px; color:#111827; font-weight:600;">${ticket.title}</div>
                    </div>
                  </div>

                  <div style="padding:16px; background:#d1fae5; border-radius:10px; border:1px solid #10b981; margin-bottom:24px;">
                    <div style="font-size:11px; color:#065f46; text-transform:uppercase; font-weight:700; margin-bottom:8px;">Asignado a</div>
                    <div style="font-size:14px; color:#047857; line-height:1.6;">${newAgentProfile?.full_name || 'Técnico Nivel 2'}</div>
                  </div>

                  <div style="text-align:center; margin:32px 0 24px 0;">
                    <a href="${ticketUrl}" style="display:inline-block; background:#10b981; color:#ffffff; text-decoration:none; padding:14px 32px; border-radius:12px; font-size:16px; font-weight:600;">
                      Ver Ticket →
                    </a>
                  </div>

                  <div style="padding:16px; background:#d1fae5; border-left:4px solid #10b981; border-radius:8px;">
                    <p style="margin:0; font-size:13px; color:#065f46;">
                      <strong>✅ Escalamiento completado:</strong> El ticket ha sido escalado exitosamente a Nivel 2.
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
          subject: `✅ Escalamiento aprobado - Ticket #${ticket.ticket_number} [${locationCode}]`,
          html,
          text: `Escalamiento aprobado\n\n${supervisorProfile?.full_name || 'El supervisor'} ha aprobado tu solicitud de escalamiento para el ticket #${ticket.ticket_number}.\n\nEl ticket ha sido escalado a Nivel 2 y asignado a ${newAgentProfile?.full_name || 'un técnico L2'}.\n\nVer ticket: ${ticketUrl}`,
        })

        console.log(`[escalateTicket] ✓ Email enviado al técnico L1: ${authUser.user.email}`)
      } else {
        console.log('[escalateTicket] No se encontró email para el técnico L1')
      }
    } catch (err) {
      console.error('[escalateTicket] Error notificando al técnico L1:', err)
    }
  } else {
    console.log('[escalateTicket] No hay previousAgentId, no se notificará')
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
  const adminClient = createSupabaseAdminClient()
  
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
    .select('id, full_name, role, asset_category')
    .eq('location_id', profile.location_id)
    .eq('role', 'supervisor')

  if (!supervisors || supervisors.length === 0) {
    return { error: 'No se encontró ningún supervisor en tu sede' }
  }

  try {
    console.log('[requestEscalation] Iniciando solicitud...')

    const { createSupabaseAdminClient } = await import('@/lib/supabase/admin')
    const adminClient = createSupabaseAdminClient()
    const ticketCategory = await fetchTicketAssetCategory(adminClient as any, ticketId)
    
    // Registrar comentario en el ticket (auditoría)
    const { error: commentError } = await supabase.from('ticket_comments').insert({
      ticket_id: ticketId,
      author_id: user.id,
      body: `🔔 **Solicitud de escalamiento a Nivel 2**\n\n**Motivo:** ${reason}\n\n*El técnico ${profile.full_name || 'L1'} ha solicitado la aprobación del supervisor para escalar este ticket a Nivel 2.*`,
      visibility: 'public', // Visible para todos para trazabilidad
    })

    if (commentError) {
      console.error('[requestEscalation] Error creando comentario:', commentError)
      throw new Error('Error registrando la solicitud en el ticket')
    }

    console.log('[requestEscalation] Comentario creado exitosamente')

    // Enviar notificación a cada supervisor de la sede
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const ticketUrl = `${baseUrl}/tickets/${ticketId}`
    const locationName = (ticket.locations as any)?.name || 'la sede'
    const locationCode = (ticket.locations as any)?.code || ''

    console.log(`[requestEscalation] Notificando a ${supervisors.length} supervisor(es)...`)

    for (const supervisor of supervisors) {
      console.log(`[requestEscalation] Procesando supervisor ${supervisor.full_name}...`)

      const canNotify = recipientMatchesTicketCategory({
        recipientAssetCategory: (supervisor as any).asset_category,
        ticketCategory,
        recipientRole: (supervisor as any).role,
      })

      if (!canNotify) {
        console.log('[requestEscalation] Omitiendo notificación: categoría de ticket no coincide con el receptor')
        continue
      }
      
      // Obtener email del supervisor
      const { data: authUser } = await adminClient.auth.admin.getUserById(supervisor.id)
      
      if (!authUser.user?.email) {
        console.log(`[requestEscalation] Supervisor ${supervisor.full_name} sin email, omitiendo...`)
        continue
      }

      // Crear notificación push en la base de datos
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: supervisor.id,
        type: 'TICKET_ESCALATED', // Usar tipo válido del enum
        title: `🔔 Solicitud de escalamiento en ${locationCode}`,
        message: `${profile.full_name || 'Un técnico'} solicita escalar el ticket #${ticket.ticket_number}: "${ticket.title}". Motivo: ${reason}`,
        ticket_id: ticketId,
        ticket_number: ticket.ticket_number,
        actor_id: user.id,
      })

      if (notifError) {
        console.error('[requestEscalation] Error creando notificación:', notifError)
        // Continuar con el siguiente supervisor
      } else {
        console.log(`[requestEscalation] Notificación push creada para ${supervisor.full_name}`)
      }

      // Enviar email
      console.log(`[requestEscalation] Enviando email a ${authUser.user.email}...`)
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
      
      console.log(`[requestEscalation] Email enviado exitosamente a ${supervisor.full_name}`)
    }

    console.log('[requestEscalation] Proceso completado exitosamente')
    return { success: true, message: 'Solicitud enviada al supervisor de tu sede' }
  } catch (error: any) {
    console.error('[requestEscalation] Error:', error)
    return { error: 'Error enviando la solicitud: ' + error.message }
  }
}

/**
 * Enviar información completa del ticket por correo electrónico
 * Solo admin y supervisores pueden usar esta función
 */
type SendTicketEmailInput = {
  ticketId: string
  recipientEmail: string
  recipientName: string
  reason?: string
}

export async function sendTicketByEmail(input: SendTicketEmailInput) {
  try {
    const supabase = await createSupabaseServerClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { error: 'No autenticado' }
    }

    // Verificar que el usuario sea admin o supervisor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name, location_id')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'supervisor'].includes(profile.role)) {
      return { error: 'Solo administradores y supervisores pueden enviar tickets por correo' }
    }

    // Obtener información completa del ticket
    // Admin puede ver todos los tickets, supervisores solo de su sede
    let ticketQuery = supabase
      .from('tickets')
      .select('*, locations (name, code)')
      .eq('id', input.ticketId)

    // Si no es admin, filtrar por ubicación
    if (profile.role !== 'admin' && profile.location_id) {
      ticketQuery = ticketQuery.eq('location_id', profile.location_id)
    }

    const { data: ticket, error: ticketError } = await ticketQuery.single()

    if (ticketError || !ticket) {
      console.error('[sendTicketByEmail] Error obteniendo ticket:', ticketError)
      return { error: 'Ticket no encontrado o sin permisos para acceder' }
    }

    // Obtener información del activo (si existe)
    const { data: asset } = ticket.asset_id
      ? await supabase
          .from('assets')
          .select('asset_tag, asset_type, brand, model, serial_number')
          .eq('id', ticket.asset_id)
          .single()
      : { data: null }

    // Obtener nombres de usuarios desde profiles
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', ticket.requester_id)
      .single()

    const { data: agentProfile } = ticket.assigned_agent_id ? await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', ticket.assigned_agent_id)
      .single() : { data: null }

    // Obtener información de quién cerró el ticket
    const { data: closedByProfile } = ticket.closed_by ? await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', ticket.closed_by)
      .single() : { data: null }

    // Obtener historial de estados
    const { data: statusHistory } = await supabase
      .from('ticket_status_history')
      .select('from_status, to_status, created_at, note, actor_id')
      .eq('ticket_id', input.ticketId)
      .order('created_at', { ascending: true })

    // Obtener nombres de actores del historial
    const actorIds = [...new Set((statusHistory || []).map((h: any) => h.actor_id).filter(Boolean))]
    const actorProfiles = new Map()
    for (const actorId of actorIds) {
      const { data: actor } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', actorId)
        .single()
      if (actor) actorProfiles.set(actor.id, actor.full_name)
    }

    // Formatear historial de estados
    const formattedHistory = (statusHistory || []).map((h: any) => ({
      fromStatus: h.from_status ? STATUS_LABELS[h.from_status] || h.from_status : 'Inicio',
      toStatus: STATUS_LABELS[h.to_status] || h.to_status,
      actor: actorProfiles.get(h.actor_id) || 'Sistema',
      date: new Date(h.created_at).toLocaleString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      note: h.note,
    }))

    // Obtener comentarios del ticket
    const { data: comments } = await supabase
      .from('ticket_comments')
      .select('id, body, visibility, created_at, author_id')
      .eq('ticket_id', input.ticketId)
      .order('created_at', { ascending: true })

    // Obtener nombres de autores de comentarios
    const authorIds = [...new Set((comments || []).map((c: any) => c.author_id).filter(Boolean))]
    const authorProfiles = new Map()
    for (const authorId of authorIds) {
      const { data: author } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', authorId)
        .single()
      if (author) authorProfiles.set(author.id, author.full_name)
    }

    // Calcular días abierto
    const createdDate = new Date(ticket.created_at)
    const now = new Date()
    const daysOpen = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))

    // Preparar comentarios para el template
    const formattedComments = (comments || []).map((c: any) => ({
      author: authorProfiles.get(c.author_id) || 'Usuario',
      content: c.body,
      date: new Date(c.created_at).toLocaleString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      isInternal: c.visibility === 'internal',
    }))

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const ticketUrl = `${baseUrl}/tickets/${ticket.id}`

    // Generar template de email
    const template = ticketInvestigationEmailTemplate({
      recipientName: input.recipientName,
      ticketNumber: ticket.ticket_number,
      title: ticket.title,
      description: ticket.description || 'Sin descripción',
      priority: PRIORITY_LABELS[ticket.priority] || 'Media',
      category: ticket.category,
      status: STATUS_LABELS[ticket.status] || ticket.status,
      locationName: (ticket.locations as any)?.name || 'Sin sede',
      locationCode: (ticket.locations as any)?.code || '-',
       assetTag: asset?.asset_tag || undefined,
       assetType: asset?.asset_type || undefined,
       assetBrand: asset?.brand || undefined,
       assetModel: asset?.model || undefined,
       assetSerial: asset?.serial_number || undefined,
      requesterName: requesterProfile?.full_name || 'Desconocido',
      assignedAgentName: agentProfile?.full_name || null,
      createdAt: new Date(ticket.created_at).toLocaleString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      updatedAt: new Date(ticket.updated_at).toLocaleString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      closedAt: ticket.closed_at ? new Date(ticket.closed_at).toLocaleString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) : null,
      closedBy: closedByProfile?.full_name || null,
      resolution: ticket.resolution || null,
      supportLevel: ticket.support_level,
      daysOpen,
      commentsCount: comments?.length || 0,
      comments: formattedComments,
      statusHistory: formattedHistory,
      ticketUrl,
      senderName: profile.full_name || 'Sistema',
      reason: input.reason,
    })

    // Enviar correo
    await sendMail({
      to: input.recipientEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    })

    // Registrar en auditoría (comentario interno)
    await supabase.from('ticket_comments').insert({
      ticket_id: input.ticketId,
      author_id: user.id,
      body: `📧 Información del ticket enviada por correo a: ${input.recipientEmail} (${input.recipientName})${input.reason ? `\nMotivo: ${input.reason}` : ''}`,
      visibility: 'internal',
    })

    return { success: true, message: `Correo enviado exitosamente a ${input.recipientEmail}` }
  } catch (error: any) {
    console.error('[sendTicketByEmail] Error:', error)
    return { error: 'Error enviando el correo: ' + error.message }
  }
}
