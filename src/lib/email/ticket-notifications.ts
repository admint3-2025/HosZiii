import { sendMail } from './mailer'
import {
  ticketCreatedEmailTemplate,
  ticketAssignedEmailTemplate,
  ticketAssignedToRequesterEmailTemplate,
  ticketStatusChangedEmailTemplate,
  ticketClosedEmailTemplate,
  ticketEscalatedEmailTemplate,
  ticketLocationStaffNotificationTemplate,
} from './templates'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import {
  fetchTicketAssetCategory,
  getServiceLabelForTicketCategory,
  inferTicketAssetCategory,
  recipientMatchesTicketCategory,
} from '@/lib/tickets/ticket-asset-category'

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

type AssetEmailInfo = {
  assetTag: string
  assetType?: string | null
  brand?: string | null
  model?: string | null
  serialNumber?: string | null
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
    const assetInfo = await fetchTicketAssetInfo(supabase, data.ticketId)
    const ticketAssetCategory = inferTicketAssetCategory(assetInfo?.assetType)
    const serviceLabel = getServiceLabelForTicketCategory(ticketAssetCategory)
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
      serviceLabel,
      assetTag: assetInfo?.assetTag,
      assetType: assetInfo?.assetType || undefined,
      assetBrand: assetInfo?.brand || undefined,
      assetModel: assetInfo?.model || undefined,
      assetSerial: assetInfo?.serialNumber || undefined,
    })

    console.log('[notifyTicketCreated] Enviando email a:', requester.user.email)
    await sendMail({
      to: requester.user.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    })

    console.log(`[notifyTicketCreated] ✓ Notificación enviada exitosamente a ${requester.user.email}`)
    
    // NUEVO: Notificar a supervisores y técnicos de la misma sede
    await notifyLocationStaff(data)
  } catch (error) {
    console.error('[notifyTicketCreated] ✗ Error enviando notificación:', error)
    // No lanzar error para no bloquear la creación del ticket
  }
}

async function fetchTicketAssetInfo(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  ticketId: string,
): Promise<AssetEmailInfo | null> {
  try {
    const { data: ticket } = await supabase
      .from('tickets')
      .select('asset_id')
      .eq('id', ticketId)
      .single()

    if (!ticket?.asset_id) return null

    const { data: asset, error } = await supabase
      .from('assets')
      .select('asset_tag, asset_type, brand, model, serial_number')
      .eq('id', ticket.asset_id)
      .single()

    if (error || !asset) {
      console.error('[ticket-notifications] Error obteniendo activo para ticket', ticketId, error)
      return null
    }

    if (!asset.asset_tag) return null

    return {
      assetTag: asset.asset_tag,
      assetType: asset.asset_type,
      brand: asset.brand,
      model: asset.model,
      serialNumber: asset.serial_number,
    }
  } catch (err) {
    console.error('[ticket-notifications] Excepción obteniendo activo para ticket', ticketId, err)
    return null
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
    const assetInfo = await fetchTicketAssetInfo(supabase, data.ticketId)
    const serviceLabel = getServiceLabelForTicketCategory(inferTicketAssetCategory(assetInfo?.assetType))
    const serviceLabel = getServiceLabelForTicketCategory(inferTicketAssetCategory(assetInfo?.assetType))

    const template = ticketAssignedEmailTemplate({
      ticketNumber: data.ticketNumber,
      title: data.title,
      priority: PRIORITY_LABELS[data.priority || 3] || 'Media',
      assignedTo: agentName,
      assignedBy,
      ticketUrl,
      serviceLabel,
      assetTag: assetInfo?.assetTag,
      assetType: assetInfo?.assetType || undefined,
      assetBrand: assetInfo?.brand || undefined,
      assetModel: assetInfo?.model || undefined,
      assetSerial: assetInfo?.serialNumber || undefined,
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

      // Usar template específico para el solicitante
      const requesterTemplate = ticketAssignedToRequesterEmailTemplate({
        ticketNumber: data.ticketNumber,
        title: data.title,
        priority: PRIORITY_LABELS[data.priority || 3] || 'Media',
        assignedAgentName: agentName,
        ticketUrl,
        requesterName,
        serviceLabel,
        assetTag: assetInfo?.assetTag,
        assetType: assetInfo?.assetType || undefined,
        assetBrand: assetInfo?.brand || undefined,
        assetModel: assetInfo?.model || undefined,
        assetSerial: assetInfo?.serialNumber || undefined,
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
    const assetInfo = await fetchTicketAssetInfo(supabase, data.ticketId)

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
        serviceLabel,
        assetTag: assetInfo?.assetTag,
        assetType: assetInfo?.assetType || undefined,
        assetBrand: assetInfo?.brand || undefined,
        assetModel: assetInfo?.model || undefined,
        assetSerial: assetInfo?.serialNumber || undefined,
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
          serviceLabel,
          assetTag: assetInfo?.assetTag,
          assetType: assetInfo?.assetType || undefined,
          assetBrand: assetInfo?.brand || undefined,
          assetModel: assetInfo?.model || undefined,
          assetSerial: assetInfo?.serialNumber || undefined,
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
    
    // NUEVO: Notificar a supervisores y técnicos de la misma sede
    await notifyLocationStaff(data)
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
    const assetInfo = await fetchTicketAssetInfo(supabase, data.ticketId)
    const serviceLabel = getServiceLabelForTicketCategory(inferTicketAssetCategory(assetInfo?.assetType))

    const template = ticketClosedEmailTemplate({
      ticketNumber: data.ticketNumber,
      title: data.title,
      closedBy,
      ticketUrl,
      recipientName: requesterName,
      resolution: data.resolution,
      serviceLabel,
      assetTag: assetInfo?.assetTag,
      assetType: assetInfo?.assetType || undefined,
      assetBrand: assetInfo?.brand || undefined,
      assetModel: assetInfo?.model || undefined,
      assetSerial: assetInfo?.serialNumber || undefined,
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

    // Obtener información del activo asociado
    const assetInfo = await fetchTicketAssetInfo(supabase, data.ticketId)
    const serviceLabel = getServiceLabelForTicketCategory(inferTicketAssetCategory(assetInfo?.assetType))

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
        serviceLabel,
        assetTag: assetInfo?.assetTag,
        assetType: assetInfo?.assetType || undefined,
        assetBrand: assetInfo?.brand || undefined,
        assetModel: assetInfo?.model || undefined,
        assetSerial: assetInfo?.serialNumber || undefined,
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
        serviceLabel,
        assetTag: assetInfo?.assetTag,
        assetType: assetInfo?.assetType || undefined,
        assetBrand: assetInfo?.brand || undefined,
        assetModel: assetInfo?.model || undefined,
        assetSerial: assetInfo?.serialNumber || undefined,
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

/**
 * Notifica a supervisores y técnicos de la misma sede sobre un ticket nuevo o actualizado
 */
export async function notifyLocationStaff(data: TicketNotificationData) {
  console.log('[notifyLocationStaff] Iniciando notificación a personal de la sede para ticket #' + data.ticketNumber)
  
  try {
    const supabase = createSupabaseAdminClient()
    
    // Obtener el location_id del ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('location_id, locations(name, code)')
      .eq('id', data.ticketId)
      .single()
    
    if (ticketError || !ticket?.location_id) {
      console.log('[notifyLocationStaff] Ticket sin ubicación asignada, omitiendo notificación de sede')
      return
    }
    
    const locationId = ticket.location_id
    const locationName = (ticket.locations as any)?.name || 'la sede'
    const locationCode = (ticket.locations as any)?.code || ''
    
    console.log(`[notifyLocationStaff] Ubicación del ticket: ${locationName} (${locationCode})`)
    console.log(`[notifyLocationStaff] Location ID: ${locationId}`)
    console.log(`[notifyLocationStaff] Actor ID a excluir: ${data.actorId || 'ninguno'}`)

    const ticketCategory = await fetchTicketAssetCategory(supabase as any, data.ticketId)
    const serviceLabel = getServiceLabelForTicketCategory(ticketCategory)
    
    // Obtener todos los supervisores y técnicos de esa ubicación
    let query = supabase
      .from('profiles')
      .select('id, full_name, role, asset_category')
      .eq('location_id', locationId)
      .in('role', ['agent_l1', 'agent_l2', 'supervisor'])
    
    // Excluir al actor solo si existe
    if (data.actorId) {
      query = query.neq('id', data.actorId)
    }
    
    const { data: staffProfiles, error: staffError } = await query
    
    if (staffError) {
      console.error('[notifyLocationStaff] Error obteniendo personal:', staffError)
      return
    }
    
    const filteredStaffProfiles = (staffProfiles || []).filter((staff: any) =>
      recipientMatchesTicketCategory({
        recipientAssetCategory: staff.asset_category,
        ticketCategory,
        recipientRole: staff.role,
      }),
    )

    console.log(`[notifyLocationStaff] Personal encontrado en la base de datos: ${staffProfiles?.length || 0}`)
    console.log(`[notifyLocationStaff] Personal permitido por categoría: ${filteredStaffProfiles.length}`)
    
    if (filteredStaffProfiles.length === 0) {
      console.log('[notifyLocationStaff] No se encontró personal de la sede para notificar')
      return
    }
    
    console.log(`[notifyLocationStaff] Se notificará a ${filteredStaffProfiles.length} miembro(s) del personal`)
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const ticketUrl = `${baseUrl}/tickets/${data.ticketId}`
    
    // Obtener quien generó el ticket/cambio
    let actorName = 'Sistema'
    if (data.actorId) {
      const { data: actorProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', data.actorId)
        .single()
      actorName = actorProfile?.full_name || 'Usuario'
    }
    
    const isUpdate = !!data.oldStatus

    const assetInfo = await fetchTicketAssetInfo(supabase, data.ticketId)
    
    // Enviar notificación a cada miembro del personal
    for (const staff of filteredStaffProfiles as any[]) {
      try {
        // Obtener email del auth
        const { data: authUser } = await supabase.auth.admin.getUserById(staff.id)
        
        if (!authUser.user?.email) {
          console.log(`[notifyLocationStaff] Usuario ${staff.id} sin email, omitiendo`)
          continue
        }
        
        const staffName = staff.full_name || authUser.user.email
        
        // Usar el template del sistema
        const template = ticketLocationStaffNotificationTemplate({
          ticketNumber: data.ticketNumber,
          title: data.title,
          description: data.description,
          priority: PRIORITY_LABELS[data.priority || 3] || 'Media',
          category: data.category,
          locationName,
          locationCode,
          actorName,
          staffName,
          ticketUrl,
          isUpdate,
          oldStatus: data.oldStatus ? STATUS_LABELS[data.oldStatus] : undefined,
          newStatus: data.newStatus ? STATUS_LABELS[data.newStatus] : undefined,
          serviceLabel,
          assetTag: assetInfo?.assetTag,
          assetType: assetInfo?.assetType || undefined,
          assetBrand: assetInfo?.brand || undefined,
          assetModel: assetInfo?.model || undefined,
          assetSerial: assetInfo?.serialNumber || undefined,
        })
        
        await sendMail({
          to: authUser.user.email,
          subject: template.subject,
          html: template.html,
          text: template.text,
        })
        
        console.log(`[notifyLocationStaff] ✓ Notificación enviada a ${authUser.user.email} (${staffName})`)
      } catch (err) {
        console.error(`[notifyLocationStaff] Error enviando notificación a ${staff.id}:`, err)
        // Continuar con el siguiente
      }
    }
    
    console.log(`[notifyLocationStaff] ✓ Proceso de notificación de sede completado para ticket #${data.ticketNumber}`)
  } catch (error) {
    console.error('[notifyLocationStaff] Error en notificación de personal de sede:', error)
    // No lanzar error para no bloquear otras operaciones
  }
}
