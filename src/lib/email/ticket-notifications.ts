import { sendMail } from './mailer'
import {
  ticketCreatedEmailTemplate,
  ticketAssignedEmailTemplate,
  ticketStatusChangedEmailTemplate,
  ticketClosedEmailTemplate,
  ticketEscalatedEmailTemplate,
} from './templates'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

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

type TicketNotificationData = {
  ticketId: string
  ticketNumber: string
  title: string
  description?: string
  priority?: number
  category?: string
  requesterId: string
  oldStatus?: string
  newStatus?: string
  assignedAgentId?: string | null
  actorId?: string
  resolution?: string
}

/**
 * Notifica al solicitante que su ticket ha sido creado
 */
export async function notifyTicketCreated(data: TicketNotificationData) {
  console.log('[notifyTicketCreated] Iniciando notificación para ticket #' + data.ticketNumber)
  console.log('[notifyTicketCreated] RequesterId:', data.requesterId)
  
  try {
    const supabase = createSupabaseAdminClient()
    
    // Obtener email del solicitante
    console.log('[notifyTicketCreated] Obteniendo usuario por ID...')
    const { data: requester, error: userError } = await supabase.auth.admin.getUserById(data.requesterId)
    
    if (userError) {
      console.error('[notifyTicketCreated] Error obteniendo usuario:', userError)
      return
    }
    
    console.log('[notifyTicketCreated] Usuario obtenido:', requester.user?.email)
    
    if (!requester.user?.email) {
      console.error('[notifyTicketCreated] Usuario sin email registrado')
      return
    }

    // Obtener nombre del solicitante
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', data.requesterId)
      .single()

    const requesterName = requesterProfile?.full_name || requester.user.email
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const ticketUrl = `${baseUrl}/tickets/${data.ticketId}`

    console.log('[notifyTicketCreated] Generando template de email...')
    const template = ticketCreatedEmailTemplate({
      ticketNumber: data.ticketNumber,
      title: data.title,
      description: data.description || '',
      priority: PRIORITY_LABELS[data.priority || 3] || 'Media',
      category: data.category || 'Sin categoría',
      ticketUrl,
      requesterName,
    })

    console.log('[notifyTicketCreated] Enviando email a:', requester.user.email)
    await sendMail({
      to: requester.user.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    })

    console.log(`[notifyTicketCreated] ✓ Notificación enviada exitosamente a ${requester.user.email}`)
  } catch (error) {
    console.error('[notifyTicketCreated] ✗ Error enviando notificación:', error)
    // No lanzar error para no bloquear la creación del ticket
  }
}

/**
 * Notifica al agente asignado y al solicitante sobre la asignación
 */
export async function notifyTicketAssigned(data: TicketNotificationData) {
  if (!data.assignedAgentId) return

  try {
    const supabase = createSupabaseAdminClient()
    
    // Obtener datos del agente asignado
    const { data: agent } = await supabase.auth.admin.getUserById(data.assignedAgentId)
    if (!agent.user?.email) return

    const { data: agentProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', data.assignedAgentId)
      .single()

    const agentName = agentProfile?.full_name || agent.user.email

    // Obtener datos de quien asignó
    let assignedBy = 'Sistema'
    if (data.actorId) {
      const { data: actorProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', data.actorId)
        .single()
      assignedBy = actorProfile?.full_name || 'Sistema'
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const ticketUrl = `${baseUrl}/tickets/${data.ticketId}`

    const template = ticketAssignedEmailTemplate({
      ticketNumber: data.ticketNumber,
      title: data.title,
      priority: PRIORITY_LABELS[data.priority || 3] || 'Media',
      assignedTo: agentName,
      assignedBy,
      ticketUrl,
    })

    // Enviar notificación al agente
    await sendMail({
      to: agent.user.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    })

    console.log(`✓ Notificación de asignación enviada a ${agent.user.email} para ticket #${data.ticketNumber}`)

    // También notificar al solicitante que su ticket fue asignado
    const { data: requester } = await supabase.auth.admin.getUserById(data.requesterId)
    if (requester.user?.email && requester.user.email !== agent.user.email) {
      const { data: requesterProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', data.requesterId)
        .single()

      const requesterName = requesterProfile?.full_name || requester.user.email

      // Usar template profesional para el solicitante también
      const requesterTemplate = ticketAssignedEmailTemplate({
        ticketNumber: data.ticketNumber,
        title: data.title,
        priority: PRIORITY_LABELS[data.priority || 3] || 'Media',
        assignedTo: agentName,
        assignedBy,
        ticketUrl,
      })

      await sendMail({
        to: requester.user.email,
        subject: requesterTemplate.subject,
        html: requesterTemplate.html,
        text: requesterTemplate.text,
      })

      console.log(`✓ Notificación de asignación enviada al solicitante ${requester.user.email}`)
    }
  } catch (error) {
    console.error('Error enviando notificación de asignación:', error)
  }
}

/**
 * Notifica cambios de estado al solicitante y al agente (si existe)
 */
export async function notifyTicketStatusChanged(data: TicketNotificationData) {
  if (!data.oldStatus || !data.newStatus || data.oldStatus === data.newStatus) return

  try {
    const supabase = createSupabaseAdminClient()
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const ticketUrl = `${baseUrl}/tickets/${data.ticketId}`

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

    // Notificar al solicitante
    const { data: requester } = await supabase.auth.admin.getUserById(data.requesterId)
    if (requester.user?.email) {
      const { data: requesterProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', data.requesterId)
        .single()

      const requesterName = requesterProfile?.full_name || requester.user.email

      const template = ticketStatusChangedEmailTemplate({
        ticketNumber: data.ticketNumber,
        title: data.title,
        oldStatus: STATUS_LABELS[data.oldStatus] || data.oldStatus,
        newStatus: STATUS_LABELS[data.newStatus] || data.newStatus,
        changedBy,
        ticketUrl,
        recipientName: requesterName,
      })

      await sendMail({
        to: requester.user.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      })

      console.log(`✓ Notificación de cambio de estado enviada a solicitante para ticket #${data.ticketNumber}`)
    }

    // Si hay agente asignado y es diferente al solicitante, notificarle también
    if (data.assignedAgentId && data.assignedAgentId !== data.requesterId) {
      const { data: agent } = await supabase.auth.admin.getUserById(data.assignedAgentId)
      if (agent.user?.email) {
        const { data: agentProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', data.assignedAgentId)
          .single()

        const agentName = agentProfile?.full_name || agent.user.email

        const template = ticketStatusChangedEmailTemplate({
          ticketNumber: data.ticketNumber,
          title: data.title,
          oldStatus: STATUS_LABELS[data.oldStatus] || data.oldStatus,
          newStatus: STATUS_LABELS[data.newStatus] || data.newStatus,
          changedBy,
          ticketUrl,
          recipientName: agentName,
        })

        await sendMail({
          to: agent.user.email,
          subject: template.subject,
          html: template.html,
          text: template.text,
        })

        console.log(`✓ Notificación de cambio de estado enviada a agente para ticket #${data.ticketNumber}`)
      }
    }
  } catch (error) {
    console.error('Error enviando notificación de cambio de estado:', error)
  }
}

/**
 * Notifica el cierre del ticket al solicitante
 */
export async function notifyTicketClosed(data: TicketNotificationData) {
  try {
    const supabase = createSupabaseAdminClient()
    
    // Obtener email del solicitante
    const { data: requester } = await supabase.auth.admin.getUserById(data.requesterId)
    if (!requester.user?.email) return

    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', data.requesterId)
      .single()

    const requesterName = requesterProfile?.full_name || requester.user.email

    // Obtener quien cerró el ticket
    let closedBy = 'Sistema'
    if (data.actorId) {
      const { data: actorProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', data.actorId)
        .single()
      closedBy = actorProfile?.full_name || 'Sistema'
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const ticketUrl = `${baseUrl}/tickets/${data.ticketId}`

    const template = ticketClosedEmailTemplate({
      ticketNumber: data.ticketNumber,
      title: data.title,
      closedBy,
      ticketUrl,
      recipientName: requesterName,
      resolution: data.resolution,
    })

    await sendMail({
      to: requester.user.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    })

    console.log(`✓ Notificación de cierre enviada a ${requester.user.email} para ticket #${data.ticketNumber}`)
  } catch (error) {
    console.error('Error enviando notificación de cierre:', error)
  }
}

/**
 * Notifica el escalamiento a Nivel 2 al solicitante y al especialista L2 asignado
 */
export async function notifyTicketEscalated(data: TicketNotificationData) {
  if (!data.assignedAgentId) return

  try {
    const supabase = createSupabaseAdminClient()
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const ticketUrl = `${baseUrl}/tickets/${data.ticketId}`

    // Obtener quien escaló
    let escalatedBy = 'Sistema'
    if (data.actorId) {
      const { data: actorProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', data.actorId)
        .single()
      escalatedBy = actorProfile?.full_name || 'Sistema'
    }

    // Obtener datos del especialista L2 asignado
    const { data: specialist } = await supabase.auth.admin.getUserById(data.assignedAgentId)
    if (specialist.user?.email) {
      const { data: specialistProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', data.assignedAgentId)
        .single()

      const specialistName = specialistProfile?.full_name || specialist.user.email

      const templateSpecialist = ticketEscalatedEmailTemplate({
        ticketNumber: data.ticketNumber,
        title: data.title,
        priority: PRIORITY_LABELS[data.priority || 3] || 'Media',
        escalatedBy,
        specialistName,
        ticketUrl,
        isSpecialist: true,
      })

      await sendMail({
        to: specialist.user.email,
        subject: templateSpecialist.subject,
        html: templateSpecialist.html,
        text: templateSpecialist.text,
      })

      console.log(`✓ Notificación de escalamiento enviada al especialista L2 ${specialist.user.email} para ticket #${data.ticketNumber}`)
    }

    // Notificar al solicitante
    const { data: requester } = await supabase.auth.admin.getUserById(data.requesterId)
    if (requester.user?.email && requester.user.email !== specialist.user?.email) {
      const { data: requesterProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', data.requesterId)
        .single()

      const requesterName = requesterProfile?.full_name || requester.user.email

      const { data: specialistProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', data.assignedAgentId)
        .single()

      const specialistName = specialistProfile?.full_name || 'Especialista'

      const templateRequester = ticketEscalatedEmailTemplate({
        ticketNumber: data.ticketNumber,
        title: data.title,
        priority: PRIORITY_LABELS[data.priority || 3] || 'Media',
        escalatedBy,
        specialistName,
        ticketUrl,
        isSpecialist: false,
      })

      await sendMail({
        to: requester.user.email,
        subject: templateRequester.subject,
        html: templateRequester.html,
        text: templateRequester.text,
      })

      console.log(`✓ Notificación de escalamiento enviada al solicitante ${requester.user.email} para ticket #${data.ticketNumber}`)
    }
  } catch (error) {
    console.error('Error enviando notificación de escalamiento:', error)
  }
}
