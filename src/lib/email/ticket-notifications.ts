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
import { getCategoryPathLabel } from '@/lib/categories/path'
import { sendTelegramNotification, TELEGRAM_TEMPLATES } from '@/lib/telegram'
import { formatTicketCode } from '@/lib/tickets/code'
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
  1: 'Crítica',
  2: 'Alta',
  3: 'Media',
  4: 'Baja',
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

async function getITTicketTelegramContext(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  ticketId: string,
  fallbackTicketNumber: string,
): Promise<{ ticketCode: string; locationLabel: string }> {
  try {
    const { data } = await supabase
      .from('tickets')
      .select('ticket_number, created_at, locations(name, code)')
      .eq('id', ticketId)
      .maybeSingle()

    const ticketNumber = (data as any)?.ticket_number ?? fallbackTicketNumber
    const createdAt = (data as any)?.created_at ?? null
    const ticketCode = formatTicketCode({ ticket_number: ticketNumber, created_at: createdAt })

    const locName = ((data as any)?.locations as any)?.name || 'Sin sede'
    const locCode = ((data as any)?.locations as any)?.code || ''
    const locationLabel = locCode ? `${locCode} - ${locName}` : locName

    return { ticketCode, locationLabel }
  } catch (err) {
    console.error('[getITTicketTelegramContext] Error:', err)
    return { ticketCode: String(fallbackTicketNumber), locationLabel: 'Sin sede' }
  }
}

/**
 * Fetches full ticket context (location, category, description, priority, dates)
 * for enriching email templates with complete information.
 */
type TicketFullContext = {
  locationName?: string
  locationCode?: string
  category?: string
  description?: string
  priority?: string
  createdAt?: string
  closedAt?: string
}

async function fetchTicketFullContext(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  ticketId: string,
  dataOverrides?: { description?: string; priority?: number; category?: string },
): Promise<TicketFullContext> {
  try {
    const { data: ticket } = await supabase
      .from('tickets')
      .select('description, priority, category_id, created_at, closed_at, locations(name, code)')
      .eq('id', ticketId)
      .maybeSingle()

    if (!ticket) return {}

    const loc = (ticket as any)?.locations as any
    const priorityVal = dataOverrides?.priority ?? ticket.priority
    const priorityLabel = priorityVal ? (PRIORITY_LABELS[priorityVal] || String(priorityVal)) : undefined

    // Resolve category name from category_id
    let categoryLabel: string | undefined = dataOverrides?.category
    if (!categoryLabel && ticket.category_id) {
      try {
        const { data: cats } = await supabase.from('categories').select('id, name, parent_id')
        categoryLabel = getCategoryPathLabel(cats ?? [], ticket.category_id) || undefined
      } catch { /* ignore */ }
    }

    // Format date nicely
    const formatDate = (iso: string | null) => {
      if (!iso) return undefined
      try {
        return new Date(iso).toLocaleString('es-MX', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          hour: 'numeric', minute: '2-digit', hour12: true,
        })
      } catch { return iso }
    }

    return {
      locationName: loc?.name || undefined,
      locationCode: loc?.code || undefined,
      category: categoryLabel,
      description: dataOverrides?.description || ticket.description || undefined,
      priority: priorityLabel,
      createdAt: formatDate(ticket.created_at),
      closedAt: formatDate(ticket.closed_at),
    }
  } catch (err) {
    console.error('[fetchTicketFullContext] Error:', err)
    return {}
  }
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

    const telegramCtx = await getITTicketTelegramContext(supabase, data.ticketId, data.ticketNumber)

    console.log('[notifyTicketCreated] Generando template de email...')
    const template = ticketCreatedEmailTemplate({
      ticketNumber: telegramCtx.ticketCode,
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

    // Telegram (si está vinculado)
    try {
      const t = TELEGRAM_TEMPLATES.ticket_created({
        ticketNumber: telegramCtx.ticketCode,
        title: data.title,
        priority: PRIORITY_LABELS[data.priority || 3] || 'Media',
        locationName: telegramCtx.locationLabel,
        serviceLabel,
        detailUrl: ticketUrl,
        moduleLabel: 'Helpdesk IT',
      })
      await sendTelegramNotification(data.requesterId, t)
    } catch (err) {
      console.error('[notifyTicketCreated] ✗ Error enviando Telegram:', err)
    }
    
    // Notificar a supervisores y técnicos de la misma sede (incluirá al solicitante si es staff)
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

    const telegramCtx = await getITTicketTelegramContext(supabase, data.ticketId, data.ticketNumber)
    const ctx = await fetchTicketFullContext(supabase, data.ticketId, data)

    // Obtener requester name para mostrarlo al agente
    const { data: requesterProfileForAgent } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', data.requesterId)
      .single()
    const requesterNameForAgent = requesterProfileForAgent?.full_name || undefined

    const template = ticketAssignedEmailTemplate({
      ticketNumber: telegramCtx.ticketCode,
      title: data.title,
      priority: PRIORITY_LABELS[data.priority || 3] || 'Media',
      assignedTo: agentName,
      assignedBy,
      ticketUrl,
      serviceLabel,
      locationName: ctx.locationName,
      locationCode: ctx.locationCode,
      category: ctx.category,
      description: ctx.description,
      requesterName: requesterNameForAgent,
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

    // Telegram al agente (si está vinculado)
    try {
      const t = TELEGRAM_TEMPLATES.ticket_assigned({
        ticketNumber: telegramCtx.ticketCode,
        title: data.title,
        assignedTo: agentName,
        priority: PRIORITY_LABELS[data.priority || 3] || 'Media',
        locationName: telegramCtx.locationLabel,
        serviceLabel,
        detailUrl: ticketUrl,
        moduleLabel: 'Helpdesk IT',
      })
      await sendTelegramNotification(data.assignedAgentId, t)
    } catch (err) {
      console.error('[notifyTicketAssigned] ✗ Error enviando Telegram al agente:', err)
    }

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
        ticketNumber: telegramCtx.ticketCode,
        title: data.title,
        priority: PRIORITY_LABELS[data.priority || 3] || 'Media',
        assignedAgentName: agentName,
        ticketUrl,
        requesterName,
        serviceLabel,
        locationName: ctx.locationName,
        locationCode: ctx.locationCode,
        category: ctx.category,
        description: ctx.description,
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

      // Telegram al solicitante (si está vinculado)
      try {
        const t = TELEGRAM_TEMPLATES.ticket_assigned({
          ticketNumber: telegramCtx.ticketCode,
          title: data.title,
          assignedTo: agentName,
          priority: PRIORITY_LABELS[data.priority || 3] || 'Media',
          locationName: telegramCtx.locationLabel,
          serviceLabel,
          detailUrl: ticketUrl,
          moduleLabel: 'Helpdesk IT',
        })
        await sendTelegramNotification(data.requesterId, t)
      } catch (err) {
        console.error('[notifyTicketAssigned] ✗ Error enviando Telegram al solicitante:', err)
      }
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

    const telegramCtx = await getITTicketTelegramContext(supabase, data.ticketId, data.ticketNumber)
    const assetInfo = await fetchTicketAssetInfo(supabase, data.ticketId)
    const serviceLabel = getServiceLabelForTicketCategory(inferTicketAssetCategory(assetInfo?.assetType))
    const ctx = await fetchTicketFullContext(supabase, data.ticketId, data)

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
        ticketNumber: telegramCtx.ticketCode,
        title: data.title,
        oldStatus: STATUS_LABELS[data.oldStatus] || data.oldStatus,
        newStatus: STATUS_LABELS[data.newStatus] || data.newStatus,
        changedBy,
        ticketUrl,
        recipientName: requesterName,
        serviceLabel,
        locationName: ctx.locationName,
        locationCode: ctx.locationCode,
        category: ctx.category,
        priority: ctx.priority,
        description: ctx.description,
        changedAt: ctx.closedAt || ctx.createdAt,
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

      // Telegram solicitante
      try {
        const t = TELEGRAM_TEMPLATES.ticket_status_changed({
          ticketNumber: telegramCtx.ticketCode,
          title: data.title,
          oldStatus: STATUS_LABELS[data.oldStatus] || data.oldStatus,
          newStatus: STATUS_LABELS[data.newStatus] || data.newStatus,
          changedBy,
          detailUrl: ticketUrl,
          moduleLabel: 'Helpdesk IT',
        })
        await sendTelegramNotification(data.requesterId, t)
      } catch (err) {
        console.error('[notifyTicketStatusChanged] ✗ Error enviando Telegram al solicitante:', err)
      }
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
          ticketNumber: telegramCtx.ticketCode,
          title: data.title,
          oldStatus: STATUS_LABELS[data.oldStatus] || data.oldStatus,
          newStatus: STATUS_LABELS[data.newStatus] || data.newStatus,
          changedBy,
          ticketUrl,
          recipientName: agentName,
          serviceLabel,
          locationName: ctx.locationName,
          locationCode: ctx.locationCode,
          category: ctx.category,
          priority: ctx.priority,
          description: ctx.description,
          changedAt: ctx.closedAt || ctx.createdAt,
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

        // Telegram agente
        try {
          const t = TELEGRAM_TEMPLATES.ticket_status_changed({
            ticketNumber: telegramCtx.ticketCode,
            title: data.title,
            oldStatus: STATUS_LABELS[data.oldStatus] || data.oldStatus,
            newStatus: STATUS_LABELS[data.newStatus] || data.newStatus,
            changedBy,
            detailUrl: ticketUrl,
            moduleLabel: 'Helpdesk IT',
          })
          await sendTelegramNotification(data.assignedAgentId, t)
        } catch (err) {
          console.error('[notifyTicketStatusChanged] ✗ Error enviando Telegram al agente:', err)
        }
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
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const ticketUrl = `${baseUrl}/tickets/${data.ticketId}`

    const telegramCtx = await getITTicketTelegramContext(supabase, data.ticketId, data.ticketNumber)

    const assetInfo = await fetchTicketAssetInfo(supabase, data.ticketId)
    const serviceLabel = getServiceLabelForTicketCategory(inferTicketAssetCategory(assetInfo?.assetType))
    const ctx = await fetchTicketFullContext(supabase, data.ticketId, data)

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

    const template = ticketClosedEmailTemplate({
      ticketNumber: telegramCtx.ticketCode,
      title: data.title,
      closedBy,
      ticketUrl,
      recipientName: requesterName,
      resolution: data.resolution,
      serviceLabel,
      locationName: ctx.locationName,
      locationCode: ctx.locationCode,
      category: ctx.category,
      priority: ctx.priority,
      description: ctx.description,
      createdAt: ctx.createdAt,
      closedAt: ctx.closedAt,
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

    // PUSH in-app (solicitante)
    try {
      await supabase.from('notifications').insert({
        user_id: data.requesterId,
        type: 'TICKET_CLOSED',
        title: `✅ Ticket #${telegramCtx.ticketCode} cerrado`,
        message: `Tu ticket "${data.title}" fue cerrado por ${closedBy}.`,
        ticket_id: data.ticketId,
        ticket_number: telegramCtx.ticketCode,
        actor_id: data.actorId,
        is_read: false,
      })
    } catch (err) {
      console.error('[notifyTicketClosed] ✗ Error creando push (solicitante):', err)
    }

    // Telegram solicitante
    try {
      const resolutionPreview = (data.resolution || '').replace(/\s+/g, ' ').trim().slice(0, 160)
      const t = TELEGRAM_TEMPLATES.generic({
        title: 'Ticket cerrado',
        message:
          `✅ <b>Ticket cerrado</b>\n\n` +
          `<b>Código:</b> <code>${telegramCtx.ticketCode}</code>\n` +
          `<b>Título:</b> ${data.title}\n` +
          `<b>Sede:</b> ${telegramCtx.locationLabel}\n` +
          `<b>Cerrado por:</b> ${closedBy}` +
          (resolutionPreview ? `\n\n<b>Resolución:</b> ${resolutionPreview}${(data.resolution || '').length > 160 ? '…' : ''}` : '') +
          `\n\n🔎 <a href="${ticketUrl}"><b>Revisar ticket</b></a>`,
      })
      await sendTelegramNotification(data.requesterId, t)
    } catch (err) {
      console.error('[notifyTicketClosed] ✗ Error enviando Telegram:', err)
    }

    // Notificar también al agente asignado (si existe y es diferente)
    if (data.assignedAgentId && data.assignedAgentId !== data.requesterId) {
      try {
        const { data: agent } = await supabase.auth.admin.getUserById(data.assignedAgentId)
        const agentEmail = agent.user?.email

        const { data: agentProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', data.assignedAgentId)
          .single()

        const agentName = agentProfile?.full_name || agentEmail || 'Agente'

        // EMAIL agente
        if (agentEmail) {
          const templateAgent = ticketClosedEmailTemplate({
            ticketNumber: telegramCtx.ticketCode,
            title: data.title,
            closedBy,
            ticketUrl,
            recipientName: agentName,
            resolution: data.resolution,
            serviceLabel,
            locationName: ctx.locationName,
            locationCode: ctx.locationCode,
            category: ctx.category,
            priority: ctx.priority,
            description: ctx.description,
            createdAt: ctx.createdAt,
            closedAt: ctx.closedAt,
            assetTag: assetInfo?.assetTag,
            assetType: assetInfo?.assetType || undefined,
            assetBrand: assetInfo?.brand || undefined,
            assetModel: assetInfo?.model || undefined,
            assetSerial: assetInfo?.serialNumber || undefined,
          })

          await sendMail({
            to: agentEmail,
            subject: templateAgent.subject,
            html: templateAgent.html,
            text: templateAgent.text,
          })

          console.log(`✓ Notificación de cierre enviada al agente ${agentEmail} para ticket #${data.ticketNumber}`)
        }

        // PUSH agente
        try {
          await supabase.from('notifications').insert({
            user_id: data.assignedAgentId,
            type: 'TICKET_CLOSED',
            title: `✅ Ticket #${telegramCtx.ticketCode} cerrado`,
            message: `El ticket "${data.title}" fue cerrado por ${closedBy}.`,
            ticket_id: data.ticketId,
            ticket_number: telegramCtx.ticketCode,
            actor_id: data.actorId,
            is_read: false,
          })
        } catch (err) {
          console.error('[notifyTicketClosed] ✗ Error creando push (agente):', err)
        }

        // Telegram agente
        try {
          const resolutionPreview = (data.resolution || '').replace(/\s+/g, ' ').trim().slice(0, 160)
          const t = TELEGRAM_TEMPLATES.generic({
            title: 'Ticket cerrado',
            message:
              `✅ <b>Ticket cerrado</b>\n\n` +
              `<b>Código:</b> <code>${telegramCtx.ticketCode}</code>\n` +
              `<b>Título:</b> ${data.title}\n` +
              `<b>Sede:</b> ${telegramCtx.locationLabel}\n` +
              `<b>Cerrado por:</b> ${closedBy}` +
              (resolutionPreview ? `\n\n<b>Resolución:</b> ${resolutionPreview}${(data.resolution || '').length > 160 ? '…' : ''}` : '') +
              `\n\n🔎 <a href="${ticketUrl}"><b>Revisar ticket</b></a>`,
          })
          await sendTelegramNotification(data.assignedAgentId, t)
        } catch (err) {
          console.error('[notifyTicketClosed] ✗ Error enviando Telegram (agente):', err)
        }
      } catch (err) {
        console.error('[notifyTicketClosed] ✗ Error notificando agente asignado:', err)
      }
    }
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

    const telegramCtx = await getITTicketTelegramContext(supabase, data.ticketId, data.ticketNumber)

    // Obtener información del activo asociado
    const assetInfo = await fetchTicketAssetInfo(supabase, data.ticketId)
    const serviceLabel = getServiceLabelForTicketCategory(inferTicketAssetCategory(assetInfo?.assetType))
    const ctx = await fetchTicketFullContext(supabase, data.ticketId, data)

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
        ticketNumber: telegramCtx.ticketCode,
        title: data.title,
        priority: PRIORITY_LABELS[data.priority || 3] || 'Media',
        escalatedBy,
        specialistName,
        ticketUrl,
        isSpecialist: true,
        serviceLabel,
        locationName: ctx.locationName,
        locationCode: ctx.locationCode,
        category: ctx.category,
        description: ctx.description,
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

      // Telegram especialista
      try {
        const t = TELEGRAM_TEMPLATES.generic({
          title: 'Ticket escalado a Nivel 2',
          message:
            `⬆️ <b>Escalamiento a Nivel 2</b>\n\n` +
            `<b>Código:</b> <code>${telegramCtx.ticketCode}</code>\n` +
            `<b>Título:</b> ${data.title}\n` +
            `<b>Por:</b> ${escalatedBy}` +
            `\n\n🔎 <a href="${ticketUrl}"><b>Revisar ticket</b></a>`,
        })
        await sendTelegramNotification(data.assignedAgentId, t)
      } catch (err) {
        console.error('[notifyTicketEscalated] ✗ Error enviando Telegram al especialista:', err)
      }
    }

    // Notificar al solicitante
    const { data: requester } = await supabase.auth.admin.getUserById(data.requesterId)
    if (requester.user?.email && requester.user.email !== specialist.user?.email) {
      const { data: specialistProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', data.assignedAgentId)
        .single()

      const specialistName = specialistProfile?.full_name || 'Especialista'

      const templateRequester = ticketEscalatedEmailTemplate({
        ticketNumber: telegramCtx.ticketCode,
        title: data.title,
        priority: PRIORITY_LABELS[data.priority || 3] || 'Media',
        escalatedBy,
        specialistName,
        ticketUrl,
        isSpecialist: false,
        serviceLabel,
        locationName: ctx.locationName,
        locationCode: ctx.locationCode,
        category: ctx.category,
        description: ctx.description,
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

      // Telegram solicitante
      try {
        const t = TELEGRAM_TEMPLATES.generic({
          title: 'Ticket escalado a Nivel 2',
          message:
            `⬆️ <b>Tu ticket fue escalado</b>\n\n` +
            `<b>Código:</b> <code>${telegramCtx.ticketCode}</code>\n` +
            `<b>Título:</b> ${data.title}\n` +
            `<b>Por:</b> ${escalatedBy}` +
            `\n\n🔎 <a href="${ticketUrl}"><b>Revisar ticket</b></a>`,
        })
        await sendTelegramNotification(data.requesterId, t)
      } catch (err) {
        console.error('[notifyTicketEscalated] ✗ Error enviando Telegram al solicitante:', err)
      }
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
    // Buscar en profiles.location_id Y en user_locations (multi-sede)
    let query = supabase
      .from('profiles')
      .select('id, full_name, role, asset_category, hub_visible_modules')
      .eq('location_id', locationId)
      .in('role', ['agent_l1', 'agent_l2', 'supervisor'])
    
    // Excluir al actor solo si existe
    if (data.actorId) {
      query = query.neq('id', data.actorId)
    }
    
    const { data: staffByProfile, error: staffError } = await query
    
    if (staffError) {
      console.error('[notifyLocationStaff] Error obteniendo personal:', staffError)
      return
    }

    // También buscar por user_locations (multi-sede)
    const { data: userLocations } = await supabase
      .from('user_locations')
      .select('user_id')
      .eq('location_id', locationId)

    const userIdsFromUserLocations = (userLocations || []).map((ul: any) => ul.user_id)
    
    let staffByUserLocations: any[] = []
    if (userIdsFromUserLocations.length > 0) {
      let ulQuery = supabase
        .from('profiles')
        .select('id, full_name, role, asset_category, hub_visible_modules')
        .in('id', userIdsFromUserLocations)
        .in('role', ['agent_l1', 'agent_l2', 'supervisor'])
      
      if (data.actorId) {
        ulQuery = ulQuery.neq('id', data.actorId)
      }
      
      const { data: staffData } = await ulQuery
      staffByUserLocations = staffData || []
    }

    // Combinar y deduplicar por ID
    const allStaff = [...(staffByProfile || []), ...staffByUserLocations]
    const uniqueStaff = Array.from(new Map(allStaff.map((s: any) => [s.id, s])).values())
    
    const filteredStaffProfiles = uniqueStaff.filter((staff: any) =>
      recipientMatchesTicketCategory({
        recipientAssetCategory: staff.asset_category,
        ticketCategory,
        recipientRole: staff.role,
        recipientHubModules: staff.hub_visible_modules,
      }),
    )

    console.log(`[notifyLocationStaff] Personal encontrado (profiles + user_locations): ${uniqueStaff.length}`)
    console.log(`[notifyLocationStaff] Personal permitido por categoría: ${filteredStaffProfiles.length}`)
    
    if (filteredStaffProfiles.length === 0) {
      console.log('[notifyLocationStaff] No se encontró personal de la sede para notificar')
      return
    }
    
    console.log(`[notifyLocationStaff] Se notificará a ${filteredStaffProfiles.length} miembro(s) del personal`)
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const ticketUrl = `${baseUrl}/tickets/${data.ticketId}`

    const telegramCtx = await getITTicketTelegramContext(supabase, data.ticketId, data.ticketNumber)
    
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
        // Evitar duplicación: no enviar notificación push si el staff es el mismo solicitante
        const isRequester = staff.id === data.requesterId
        
        // Obtener email del auth
        const { data: authUser } = await supabase.auth.admin.getUserById(staff.id)
        
        if (!authUser.user?.email) {
          console.log(`[notifyLocationStaff] Usuario ${staff.id} sin email, omitiendo`)
          continue
        }
        
        const staffName = staff.full_name || authUser.user.email
        
        // Usar el template del sistema
        const template = ticketLocationStaffNotificationTemplate({
          ticketNumber: telegramCtx.ticketCode,
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

        // Notificación in-app (siempre, incluso si es el solicitante)
        // Si es el solicitante, usar mensaje personalizado
        try {
          const pushTitle = isRequester 
            ? `[IT] Solicitud #${telegramCtx.ticketCode} creada`
            : `[IT] Nueva solicitud #${telegramCtx.ticketCode} en ${locationCode || locationName}`
          
          const pushMessage = isRequester
            ? `Tu solicitud de soporte IT "${data.title}" ha sido registrada.`
            : `${actorName} creó una solicitud: "${data.title}"`
          
          await supabase.from('notifications').insert({
            user_id: staff.id,
            type: 'TICKET_CREATED',
            title: pushTitle,
            message: pushMessage,
            ticket_id: data.ticketId,
            ticket_number: telegramCtx.ticketCode,
            actor_id: data.actorId,
            is_read: false,
          })
          console.log(`[notifyLocationStaff] ✓ Notificación push enviada a ${isRequester ? 'solicitante' : 'staff'} ${staff.id}`)
        } catch (err) {
          console.error(`[notifyLocationStaff] ✗ Error creando push para ${staff.id}:`, err)
        }

        // Telegram (si está vinculado)
        try {
          const telegramTemplate = isUpdate
            ? TELEGRAM_TEMPLATES.ticket_status_changed({
                ticketNumber: telegramCtx.ticketCode,
                title: data.title,
                oldStatus: data.oldStatus ? (STATUS_LABELS[data.oldStatus] || data.oldStatus) : '',
                newStatus: data.newStatus ? (STATUS_LABELS[data.newStatus] || data.newStatus) : '',
                changedBy: actorName,
                detailUrl: ticketUrl,
                moduleLabel: 'Helpdesk IT',
              })
            : TELEGRAM_TEMPLATES.ticket_created({
                ticketNumber: telegramCtx.ticketCode,
                title: data.title,
                priority: PRIORITY_LABELS[data.priority || 3] || 'Media',
                locationName: locationCode ? `${locationCode} - ${locationName}` : locationName,
                serviceLabel,
                detailUrl: ticketUrl,
                moduleLabel: 'Helpdesk IT',
              })

          await sendTelegramNotification(staff.id, telegramTemplate)
        } catch (err) {
          console.error(`[notifyLocationStaff] Error enviando Telegram a ${staff.id}:`, err)
        }
      } catch (err) {
        console.error(`[notifyLocationStaff] Error enviando notificación a ${staff.id}:`, err)
        // Continuar con el siguiente
      }
    }
    
    console.log(`[notifyLocationStaff] ✓ Proceso de notificación de sede completado para ticket #${telegramCtx.ticketCode}`)
  } catch (error) {
    console.error('[notifyLocationStaff] Error en notificación de personal de sede:', error)
    // No lanzar error para no bloquear otras operaciones
  }
}
