import { sendMail } from './mailer'
import {
  ticketCreatedEmailTemplate,
  ticketLocationStaffNotificationTemplate,
  ticketStatusChangedEmailTemplate,
} from './templates'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { extractMaintenanceTicketSequence } from '@/lib/tickets/code'
import { sendTelegramNotification, TELEGRAM_TEMPLATES } from '@/lib/telegram'

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Nuevo',
  ASSIGNED: 'Asignado',
  IN_PROGRESS: 'En progreso',
  NEEDS_INFO: 'Requiere información',
  WAITING_THIRD_PARTY: 'Esperando tercero',
  RESOLVED: 'Resuelto',
  CLOSED: 'Cerrado',
}

const PRIORITY_LABELS: Record<number, string> = {
  1: 'Baja',
  2: 'Media',
  3: 'Alta',
  4: 'Crítica',
  5: 'Urgente',
}

type MaintenanceTicketNotificationData = {
  ticketId: string
  ticketNumber: string
  title: string
  description?: string
  priority?: number
  category?: string
  requesterId: string
  actorId?: string
  oldStatus?: string
  newStatus?: string
  assignedAgentId?: string | null
  locationName?: string
  locationCode?: string
  createdAt?: string
  assignedToName?: string
}

type MaintenanceCommentNotificationData = {
  ticketId: string
  ticketNumber: string
  title: string
  commentBody: string
  commentVisibility: 'public' | 'internal'
  authorId: string
  requesterId: string
  assignedAgentId?: string | null
}

/**
 * Notifica al solicitante Y a los supervisores/técnicos de mantenimiento de la sede
 */
export async function notifyMaintenanceTicketCreated(data: MaintenanceTicketNotificationData) {
  console.log('[notifyMaintenanceTicketCreated] Iniciando notificación para ticket #' + data.ticketNumber)
  
  try {
    const supabase = createSupabaseAdminClient()
    
    // 1. Notificar al solicitante
    const { data: requester, error: userError } = await supabase.auth.admin.getUserById(data.requesterId)
    
    if (userError) {
      console.error('[notifyMaintenanceTicketCreated] Error obteniendo usuario:', userError)
    } else if (requester.user?.email) {
      const { data: requesterProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', data.requesterId)
        .single()

      const requesterName = requesterProfile?.full_name || requester.user.email
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const ticketUrl = `${baseUrl}/mantenimiento/tickets/${data.ticketId}`

      // Formato de fecha legible
      const createdDate = data.createdAt ? new Date(data.createdAt).toLocaleString('es-MX', {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone: 'America/Mexico_City'
      }) : undefined

      const template = ticketCreatedEmailTemplate({
        ticketNumber: data.ticketNumber,
        title: data.title,
        description: data.description || '',
        priority: PRIORITY_LABELS[data.priority || 3] || 'Media',
        category: data.category || 'Sin categoría',
        ticketUrl,
        requesterName,
        serviceLabel: 'Mantenimiento',
        locationName: data.locationName,
        locationCode: data.locationCode,
        createdAt: createdDate,
        assignedTo: data.assignedToName,
        expectedResponseTime: data.priority === 1 ? '4-8 horas' : data.priority === 2 ? '12-24 horas' : '24-48 horas',
      })

      await sendMail({
        to: requester.user.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      })

      console.log(`[notifyMaintenanceTicketCreated] ✓ Email enviado al solicitante: ${requester.user.email}`)
      
      // Notificación in-app al solicitante
      await supabase
        .from('notifications')
        .insert({
          user_id: data.requesterId,
          type: 'TICKET_CREATED',
          title: `[Mantenimiento] Solicitud #${data.ticketNumber} creada`,
          message: `Tu solicitud de mantenimiento "${data.title}" ha sido registrada.`,
          ticket_id: data.ticketId,
           ticket_number: extractMaintenanceTicketSequence(data.ticketNumber),
          actor_id: data.actorId,
          is_read: false,
        })

      // Telegram solicitante
      try {
        const t = TELEGRAM_TEMPLATES.ticket_created({
          ticketNumber: data.ticketNumber,
          title: data.title,
          priority: PRIORITY_LABELS[data.priority || 3] || 'Media',
          locationName: data.locationCode
            ? `${data.locationCode} - ${data.locationName || 'la sede'}`
            : (data.locationName || 'la sede'),
          serviceLabel: 'Mantenimiento',
          detailUrl: ticketUrl,
          moduleLabel: 'Mantenimiento',
        })
        await sendTelegramNotification(data.requesterId, t)
      } catch (err) {
        console.error('[notifyMaintenanceTicketCreated] ✗ Error enviando Telegram al solicitante:', err)
      }
    }

    // 2. Notificar a supervisores/técnicos de MANTENIMIENTO de la sede
    await notifyMaintenanceLocationStaff(data)

  } catch (error) {
    console.error('[notifyMaintenanceTicketCreated] ✗ Error enviando notificación:', error)
  }
}

/**
 * Notifica a supervisores y técnicos de MANTENIMIENTO de la misma sede del ticket
 */
async function notifyMaintenanceLocationStaff(data: MaintenanceTicketNotificationData) {
  console.log('[notifyMaintenanceLocationStaff] Iniciando notificación a personal de mantenimiento')
  
  try {
    const supabase = createSupabaseAdminClient()
    
    // Obtener el location_id del ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets_maintenance')
      .select('location_id, locations(name, code)')
      .eq('id', data.ticketId)
      .single()
    
    if (ticketError || !ticket?.location_id) {
      console.log('[notifyMaintenanceLocationStaff] Ticket sin ubicación, omitiendo')
      return
    }
    
    const locationId = ticket.location_id
    const locationName = (ticket.locations as any)?.name || 'la sede'
    const locationCode = (ticket.locations as any)?.code || ''
    
    console.log(`[notifyMaintenanceLocationStaff] Ubicación: ${locationName} (${locationCode})`)

    // Obtener supervisores/técnicos de MANTENIMIENTO en esa sede
    // Buscar en profiles.location_id Y en user_locations
    const { data: staffByProfile } = await supabase
      .from('profiles')
      .select('id, full_name, role, asset_category')
      .eq('location_id', locationId)
      .in('role', ['agent_l1', 'agent_l2', 'supervisor'])
      .eq('asset_category', 'MAINTENANCE')
    
    const { data: userLocations } = await supabase
      .from('user_locations')
      .select('user_id')
      .eq('location_id', locationId)
    
    const userIdsFromUserLocations = (userLocations || []).map(ul => ul.user_id)
    
    // Si hay user_ids de user_locations, buscar sus perfiles de MANTENIMIENTO
    let staffByUserLocations: any[] = []
    if (userIdsFromUserLocations.length > 0) {
      const { data: staffData } = await supabase
        .from('profiles')
        .select('id, full_name, role, asset_category')
        .in('id', userIdsFromUserLocations)
        .in('role', ['agent_l1', 'agent_l2', 'supervisor'])
        .eq('asset_category', 'MAINTENANCE')
      
      staffByUserLocations = staffData || []
    }
    
    // Combinar y dedupli car por ID
    const allStaff = [...(staffByProfile || []), ...staffByUserLocations]
    const uniqueStaff = Array.from(new Map(allStaff.map(s => [s.id, s])).values())
    
    // Excluir al actor (quien creó el ticket)
    const filteredStaff = data.actorId 
      ? uniqueStaff.filter(s => s.id !== data.actorId)
      : uniqueStaff
    
    console.log(`[notifyMaintenanceLocationStaff] Personal de mantenimiento encontrado: ${filteredStaff.length}`)
    
    if (filteredStaff.length === 0) {
      console.log('[notifyMaintenanceLocationStaff] No hay personal de mantenimiento para notificar')
      return
    }
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const ticketUrl = `${baseUrl}/mantenimiento/tickets/${data.ticketId}`
    
    // Obtener nombre del actor
    let actorName = 'Sistema'
    if (data.actorId) {
      const { data: actorProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', data.actorId)
        .single()
      actorName = actorProfile?.full_name || 'Usuario'
    }
    
    // Enviar notificaciones a cada miembro del personal
    for (const staff of filteredStaff) {
      try {
        // Evitar duplicación: no enviar notificación push si el staff es el mismo solicitante
        const isRequester = staff.id === data.requesterId
        
        // Email
        const { data: authUser } = await supabase.auth.admin.getUserById(staff.id)
        
        if (authUser.user?.email) {
          const staffName = staff.full_name || authUser.user.email
          
          const template = ticketLocationStaffNotificationTemplate({
            ticketNumber: data.ticketNumber,
            title: data.title,
            description: data.description || '',
            priority: PRIORITY_LABELS[data.priority || 3] || 'Media',
            category: data.category || 'Sin categoría',
            locationName,
            locationCode,
            actorName,
            ticketUrl,
            staffName,
            serviceLabel: 'Mantenimiento',
            isUpdate: false,
          })

          await sendMail({
            to: authUser.user.email,
            subject: template.subject,
            html: template.html,
            text: template.text,
          })

          console.log(`[notifyMaintenanceLocationStaff] ✓ Email enviado a: ${authUser.user.email}`)
        }
        
        // Notificación in-app (siempre, incluso si es el solicitante)
        // Si es el solicitante, usar mensaje personalizado
        const pushTitle = isRequester
          ? `[Mantenimiento] Solicitud #${data.ticketNumber} creada`
          : `[Mantenimiento] Nueva solicitud #${data.ticketNumber} en ${locationCode}`
        
        const pushMessage = isRequester
          ? `Tu solicitud de mantenimiento "${data.title}" ha sido registrada.`
          : `${actorName} creó una solicitud: "${data.title}"`
        
        await supabase
          .from('notifications')
          .insert({
            user_id: staff.id,
            type: 'TICKET_CREATED',
            title: pushTitle,
            message: pushMessage,
            ticket_id: data.ticketId,
             ticket_number: extractMaintenanceTicketSequence(data.ticketNumber),
            actor_id: data.actorId,
            is_read: false,
          })
        
        console.log(`[notifyMaintenanceLocationStaff] ✓ Notificación in-app enviada a: ${staff.full_name} (${isRequester ? 'solicitante' : 'staff'})`)

        // Telegram staff
        try {
          const t = TELEGRAM_TEMPLATES.ticket_created({
            ticketNumber: data.ticketNumber,
            title: data.title,
            priority: PRIORITY_LABELS[data.priority || 3] || 'Media',
            locationName: locationCode ? `${locationCode} - ${locationName}` : locationName,
            serviceLabel: 'Mantenimiento',
            detailUrl: ticketUrl,
            moduleLabel: 'Mantenimiento',
          })
          await sendTelegramNotification(staff.id, t)
        } catch (err) {
          console.error(`[notifyMaintenanceLocationStaff] Error enviando Telegram a ${staff.id}:`, err)
        }
        
      } catch (err) {
        console.error(`[notifyMaintenanceLocationStaff] Error notificando a ${staff.id}:`, err)
      }
    }
    
    console.log(`[notifyMaintenanceLocationStaff] ✓ Proceso completado. ${filteredStaff.length} notificaciones enviadas`)
    
  } catch (error) {
    console.error('[notifyMaintenanceLocationStaff] ✗ Error:', error)
  }
}

/**
 * Notifica a los involucrados sobre un nuevo comentario (SOLO PUSH, NO EMAIL)
 * Involucrados = solicitante + agente asignado (si existe y es diferente)
 */
export async function notifyMaintenanceTicketComment(data: MaintenanceCommentNotificationData) {
  console.log('[notifyMaintenanceTicketComment] Iniciando notificaciones para comentario en ticket #' + data.ticketNumber)
  console.log('[notifyMaintenanceTicketComment] Datos:', {
    ticketId: data.ticketId,
    authorId: data.authorId,
    requesterId: data.requesterId,
    assignedAgentId: data.assignedAgentId,
    visibility: data.commentVisibility,
  })
  
  try {
    const supabase = createSupabaseAdminClient()

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const ticketUrl = `${baseUrl}/mantenimiento/tickets/${data.ticketId}`

    // Obtener nombre del autor
    const { data: authorProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', data.authorId)
      .single()
    
    const authorName = authorProfile?.full_name || 'Usuario'
    console.log('[notifyMaintenanceTicketComment] Autor:', authorName)
    
    // Lista de personas a notificar
    const recipientIds = new Set<string>()
    
    // SIEMPRE agregar solicitante (incluso si es el autor - para que vea confirmación)
    if (data.requesterId) {
      recipientIds.add(data.requesterId)
      console.log('[notifyMaintenanceTicketComment] + Solicitante (SIEMPRE):', data.requesterId)
    }
    
    // Agregar agente asignado si existe y es diferente al autor
    if (data.assignedAgentId && data.assignedAgentId !== data.authorId) {
      recipientIds.add(data.assignedAgentId)
      console.log('[notifyMaintenanceTicketComment] + Agente asignado:', data.assignedAgentId)
    }
    
    // SIEMPRE agregar supervisores/técnicos de MANTENIMIENTO de la sede (tanto públicos como internos)
    // Para comentarios internos: todos los técnicos
    // Para comentarios públicos: también todos los técnicos (para que estén al tanto)
    if (true) {
      const { data: ticket } = await supabase
        .from('tickets_maintenance')
        .select('location_id')
        .eq('id', data.ticketId)
        .single()
      
      if (ticket?.location_id) {
        const { data: staffByProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('location_id', ticket.location_id)
          .in('role', ['agent_l1', 'agent_l2', 'supervisor'])
          .eq('asset_category', 'MAINTENANCE')
        
        const { data: userLocations } = await supabase
          .from('user_locations')
          .select('user_id')
          .eq('location_id', ticket.location_id)
        
        const userIdsFromUserLocations = (userLocations || []).map((ul: { user_id: string }) => ul.user_id)
        
        if (userIdsFromUserLocations.length > 0) {
          const { data: staffByUserLocations } = await supabase
            .from('profiles')
            .select('id')
            .in('id', userIdsFromUserLocations)
            .in('role', ['agent_l1', 'agent_l2', 'supervisor'])
            .eq('asset_category', 'MAINTENANCE')
          
          staffByUserLocations?.forEach((s: { id: string }) => {
            if (s.id !== data.authorId) recipientIds.add(s.id)
          })
        }
        
        staffByProfile?.forEach((s: { id: string }) => {
          if (s.id !== data.authorId) recipientIds.add(s.id)
        })
      }
    }
    
    if (recipientIds.size === 0) {
      console.log('[notifyMaintenanceTicketComment] ⚠️ No hay destinatarios para notificar (autor es el único involucrado)')
      return
    }
    
    console.log(`[notifyMaintenanceTicketComment] Enviando notificaciones a ${recipientIds.size} destinatario(s):`, Array.from(recipientIds))
    
    // Crear notificaciones in-app (NO email)
    const notifications = Array.from(recipientIds).map(userId => ({
      user_id: userId,
      type: 'TICKET_COMMENT_ADDED' as const,
      title: `[Mantenimiento] Nuevo comentario en #${data.ticketNumber}`,
      message: `${authorName} comentó: "${data.commentBody.substring(0, 100)}${data.commentBody.length > 100 ? '...' : ''}"`,
      ticket_id: data.ticketId,
      ticket_number: extractMaintenanceTicketSequence(data.ticketNumber),
      actor_id: data.authorId,
      is_read: false,
    }))
    
    console.log('[notifyMaintenanceTicketComment] Insertando en tabla notifications...')
    
    const { error: notifError } = await supabase
      .from('notifications')
      .insert(notifications)
    
    if (notifError) {
      console.error('[notifyMaintenanceTicketComment] ✗ Error creando notificaciones:', notifError)
      throw notifError
    } else {
      console.log(`[notifyMaintenanceTicketComment] ✓ ${notifications.length} notificaciones push creadas exitosamente`)
    }

    // Telegram a los mismos destinatarios
    try {
      const preview = data.commentBody.replace(/\s+/g, ' ').trim().slice(0, 140)
      const vis = data.commentVisibility === 'internal' ? ' (interno)' : ''
      const t = TELEGRAM_TEMPLATES.ticket_comment({
        ticketNumber: data.ticketNumber,
        title: data.title,
        authorName,
        commentPreview: `${preview}${data.commentBody.length > 140 ? '…' : ''}${vis}`,
        detailUrl: ticketUrl,
        moduleLabel: 'Mantenimiento',
      })
      await Promise.allSettled(
        Array.from(recipientIds).map(userId =>
          sendTelegramNotification(userId, t)
        )
      )
    } catch (err) {
      console.error('[notifyMaintenanceTicketComment] ✗ Error enviando Telegram:', err)
    }
    
  } catch (error) {
    console.error('[notifyMaintenanceTicketComment] ✗ Error:', error)
  }
}

/**
 * Notifica cambios de estado (PUSH + EMAIL)
 * Notifica al solicitante y al agente asignado (si existe)
 */
export async function notifyMaintenanceTicketStatusChanged(data: MaintenanceTicketNotificationData) {
  if (!data.oldStatus || !data.newStatus || data.oldStatus === data.newStatus) return

  console.log('[notifyMaintenanceTicketStatusChanged] Notificando cambio de estado:', data.oldStatus, '→', data.newStatus)

  try {
    const supabase = createSupabaseAdminClient()
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const ticketUrl = `${baseUrl}/mantenimiento/tickets/${data.ticketId}`

    // Obtener quien hizo el cambio
    let changedBy = 'Sistema'
    if (data.actorId) {
      const { data: actorProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', data.actorId)
        .single()
      changedBy = actorProfile?.full_name || 'Sistema'
    }

    // Notificar al solicitante (EMAIL + PUSH)
    const { data: requester } = await supabase.auth.admin.getUserById(data.requesterId)
    if (requester.user?.email) {
      const { data: requesterProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', data.requesterId)
        .single()

      const requesterName = requesterProfile?.full_name || requester.user.email

      // Formato de fecha legible
      const changedDate = new Date().toLocaleString('es-MX', {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone: 'America/Mexico_City'
      })

      // EMAIL
      const template = ticketStatusChangedEmailTemplate({
        ticketNumber: data.ticketNumber,
        title: data.title,
        oldStatus: STATUS_LABELS[data.oldStatus] || data.oldStatus,
        newStatus: STATUS_LABELS[data.newStatus] || data.newStatus,
        changedBy,
        ticketUrl,
        recipientName: requesterName,
        serviceLabel: 'Mantenimiento',
        locationName: data.locationName,
        locationCode: data.locationCode,
        changedAt: changedDate,
      })

      await sendMail({
        to: requester.user.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      })

      console.log(`[notifyMaintenanceTicketStatusChanged] ✓ Email enviado a solicitante: ${requester.user.email}`)
      
      // PUSH
      await supabase
        .from('notifications')
        .insert({
          user_id: data.requesterId,
          type: 'TICKET_STATUS_CHANGED',
          title: `[Mantenimiento] Cambio de estado en #${data.ticketNumber}`,
          message: `Tu solicitud cambió de "${STATUS_LABELS[data.oldStatus] || data.oldStatus}" a "${STATUS_LABELS[data.newStatus] || data.newStatus}"`,
          ticket_id: data.ticketId,
           ticket_number: extractMaintenanceTicketSequence(data.ticketNumber),
          actor_id: data.actorId,
          is_read: false,
        })

      // Telegram solicitante
      try {
        const t = TELEGRAM_TEMPLATES.ticket_status_changed({
          ticketNumber: data.ticketNumber,
          title: data.title,
          oldStatus: STATUS_LABELS[data.oldStatus] || data.oldStatus,
          newStatus: STATUS_LABELS[data.newStatus] || data.newStatus,
          changedBy,
          detailUrl: ticketUrl,
          moduleLabel: 'Mantenimiento',
        })
        await sendTelegramNotification(data.requesterId, t)
      } catch (err) {
        console.error('[notifyMaintenanceTicketStatusChanged] ✗ Error enviando Telegram a solicitante:', err)
      }
    }

    // Si hay agente asignado y es diferente al solicitante, notificarle también (EMAIL + PUSH)
    if (data.assignedAgentId && data.assignedAgentId !== data.requesterId) {
      const { data: agent } = await supabase.auth.admin.getUserById(data.assignedAgentId)
      if (agent.user?.email) {
        const { data: agentProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', data.assignedAgentId)
          .single()

        const agentName = agentProfile?.full_name || agent.user.email

        // Formato de fecha legible
        const changedDate = new Date().toLocaleString('es-MX', {
          dateStyle: 'full',
          timeStyle: 'short',
          timeZone: 'America/Mexico_City'
        })

        // EMAIL
        const template = ticketStatusChangedEmailTemplate({
          ticketNumber: data.ticketNumber,
          title: data.title,
          oldStatus: STATUS_LABELS[data.oldStatus] || data.oldStatus,
          newStatus: STATUS_LABELS[data.newStatus] || data.newStatus,
          changedBy,
          ticketUrl,
          recipientName: agentName,
          serviceLabel: 'Mantenimiento',
          locationName: data.locationName,
          locationCode: data.locationCode,
          changedAt: changedDate,
        })

        await sendMail({
          to: agent.user.email,
          subject: template.subject,
          html: template.html,
          text: template.text,
        })

        console.log(`[notifyMaintenanceTicketStatusChanged] ✓ Email enviado a agente: ${agent.user.email}`)
        
        // PUSH
        await supabase
          .from('notifications')
          .insert({
            user_id: data.assignedAgentId,
            type: 'TICKET_STATUS_CHANGED',
            title: `[Mantenimiento] Cambio de estado en #${data.ticketNumber}`,
            message: `El ticket cambió de "${STATUS_LABELS[data.oldStatus] || data.oldStatus}" a "${STATUS_LABELS[data.newStatus] || data.newStatus}"`,
            ticket_id: data.ticketId,
             ticket_number: extractMaintenanceTicketSequence(data.ticketNumber),
            actor_id: data.actorId,
            is_read: false,
          })

        // Telegram agente
        try {
          const t = TELEGRAM_TEMPLATES.ticket_status_changed({
            ticketNumber: data.ticketNumber,
            title: data.title,
            oldStatus: STATUS_LABELS[data.oldStatus] || data.oldStatus,
            newStatus: STATUS_LABELS[data.newStatus] || data.newStatus,
            changedBy,
            detailUrl: ticketUrl,
            moduleLabel: 'Mantenimiento',
          })
          await sendTelegramNotification(data.assignedAgentId, t)
        } catch (err) {
          console.error('[notifyMaintenanceTicketStatusChanged] ✗ Error enviando Telegram a agente:', err)
        }
      }
    }
    
    console.log('[notifyMaintenanceTicketStatusChanged] ✓ Notificaciones completadas')

  } catch (error) {
    console.error('[notifyMaintenanceTicketStatusChanged] ✗ Error:', error)
  }
}
