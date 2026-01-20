/**
 * Templates de mensajes para Telegram
 * Formatos HTML optimizados para Telegram
 */

export interface TelegramNotificationTemplate {
  title: string
  message: string
  icon?: string
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function renderDetailLink(detailUrl?: string, label: string = 'Ver detalle'): string {
  if (!detailUrl) return ''
  const safeUrl = escapeHtml(detailUrl)
  const safeLabel = escapeHtml(label)
  // Telegram HTML no soporta botones aquí; usamos link destacado.
  return `\n\n🔎 <a href="${safeUrl}"><b>${safeLabel}</b></a>`
}

export const TELEGRAM_TEMPLATES = {
  // Inspecciones críticas
  inspection_critical: (data: {
    department: string
    propertyCode: string
    propertyName: string
    criticalCount: number
    threshold: number
  }): TelegramNotificationTemplate => ({
    icon: '🚨',
    title: 'Inspección Crítica',
    message: `
<b>ALERTA DE INSPECCIÓN CRÍTICA</b>

<b>Departamento:</b> ${escapeHtml(data.department)}
<b>Código:</b> ${escapeHtml(data.propertyCode)}
<b>Sede:</b> ${escapeHtml(data.propertyName)}

<b>Ítems críticos encontrados:</b> ${data.criticalCount}
(Calificación &lt; ${data.threshold}/10)

⚠️ <i>Requiere revisión inmediata</i>
    `.trim(),
  }),

  // Ticket creado
  ticket_created: (data: {
    ticketNumber: string
    title: string
    priority: string
    locationName: string
    serviceLabel?: string
    detailUrl?: string
    moduleLabel?: string
  }): TelegramNotificationTemplate => ({
    icon: '📋',
    title: 'Nuevo Ticket',
    message: `
<b>NUEVO TICKET</b>${data.moduleLabel ? `\n<i>${escapeHtml(data.moduleLabel)}</i>` : ''}

<b>Código:</b> <code>${escapeHtml(data.ticketNumber)}</code>
<b>Título:</b> ${escapeHtml(data.title)}
<b>Prioridad:</b> ${escapeHtml(data.priority)}
<b>Sede:</b> ${escapeHtml(data.locationName)}
${data.serviceLabel ? `<b>Servicio:</b> ${escapeHtml(data.serviceLabel)}` : ''}

${renderDetailLink(data.detailUrl, 'Revisar ticket')}
    `.trim(),
  }),

  // Ticket asignado
  ticket_assigned: (data: {
    ticketNumber: string
    title: string
    assignedTo: string
    priority?: string
    locationName?: string
    serviceLabel?: string
    detailUrl?: string
    moduleLabel?: string
  }): TelegramNotificationTemplate => ({
    icon: '👤',
    title: 'Ticket Asignado',
    message: `
<b>TICKET ASIGNADO</b>${data.moduleLabel ? `\n<i>${escapeHtml(data.moduleLabel)}</i>` : ''}

<b>Código:</b> <code>${escapeHtml(data.ticketNumber)}</code>
<b>Título:</b> ${escapeHtml(data.title)}
<b>Asignado a:</b> ${escapeHtml(data.assignedTo)}
${data.priority ? `<b>Prioridad:</b> ${escapeHtml(data.priority)}` : ''}
${data.locationName ? `<b>Sede:</b> ${escapeHtml(data.locationName)}` : ''}
${data.serviceLabel ? `<b>Servicio:</b> ${escapeHtml(data.serviceLabel)}` : ''}

${renderDetailLink(data.detailUrl, 'Revisar ticket')}
    `.trim(),
  }),

  // Cambio de estado
  ticket_status_changed: (data: {
    ticketNumber: string
    title: string
    oldStatus: string
    newStatus: string
    changedBy?: string
    detailUrl?: string
    moduleLabel?: string
  }): TelegramNotificationTemplate => ({
    icon: '↩️',
    title: 'Cambio de Estado',
    message: `
<b>CAMBIO DE ESTADO</b>${data.moduleLabel ? `\n<i>${escapeHtml(data.moduleLabel)}</i>` : ''}

<b>Código:</b> <code>${escapeHtml(data.ticketNumber)}</code>
<b>Título:</b> ${escapeHtml(data.title)}
<b>De:</b> ${escapeHtml(data.oldStatus)}
<b>A:</b> ${escapeHtml(data.newStatus)}
${data.changedBy ? `<b>Por:</b> ${escapeHtml(data.changedBy)}` : ''}
${renderDetailLink(data.detailUrl, 'Revisar ticket')}
    `.trim(),
  }),

  // Nuevo comentario
  ticket_comment: (data: {
    ticketNumber: string
    title: string
    authorName: string
    commentPreview: string
    detailUrl?: string
    moduleLabel?: string
  }): TelegramNotificationTemplate => ({
    icon: '💬',
    title: 'Nuevo Comentario',
    message: `
<b>NUEVO COMENTARIO</b>${data.moduleLabel ? `\n<i>${escapeHtml(data.moduleLabel)}</i>` : ''}

<b>Código:</b> <code>${escapeHtml(data.ticketNumber)}</code>
<b>Título:</b> ${escapeHtml(data.title)}
<b>Por:</b> ${escapeHtml(data.authorName)}

<i>"${escapeHtml(data.commentPreview)}"</i>

${renderDetailLink(data.detailUrl, 'Revisar ticket')}
    `.trim(),
  }),

  // Solicitud de escalamiento (L1 -> Supervisor)
  ticket_escalation_requested: (data: {
    ticketNumber: string
    title: string
    requestedBy: string
    reason: string
    locationName?: string
    detailUrl?: string
    moduleLabel?: string
  }): TelegramNotificationTemplate => ({
    icon: '🔔',
    title: 'Solicitud de escalamiento',
    message: `
<b>SOLICITUD DE ESCALAMIENTO</b>${data.moduleLabel ? `\n<i>${escapeHtml(data.moduleLabel)}</i>` : ''}

<b>Código:</b> <code>${escapeHtml(data.ticketNumber)}</code>
<b>Título:</b> ${escapeHtml(data.title)}
<b>Solicita:</b> ${escapeHtml(data.requestedBy)}
${data.locationName ? `<b>Sede:</b> ${escapeHtml(data.locationName)}` : ''}

<b>Motivo:</b> ${escapeHtml(data.reason)}

${renderDetailLink(data.detailUrl, 'Revisar ticket')}
    `.trim(),
  }),

  // Escalamiento aprobado (Supervisor -> L1)
  ticket_escalation_approved: (data: {
    ticketNumber: string
    title: string
    approvedBy: string
    assignedTo: string
    detailUrl?: string
    moduleLabel?: string
  }): TelegramNotificationTemplate => ({
    icon: '✅',
    title: 'Escalamiento aprobado',
    message: `
<b>ESCALAMIENTO APROBADO</b>${data.moduleLabel ? `\n<i>${escapeHtml(data.moduleLabel)}</i>` : ''}

<b>Código:</b> <code>${escapeHtml(data.ticketNumber)}</code>
<b>Título:</b> ${escapeHtml(data.title)}
<b>Aprobó:</b> ${escapeHtml(data.approvedBy)}
<b>Asignado a:</b> ${escapeHtml(data.assignedTo)}

${renderDetailLink(data.detailUrl, 'Revisar ticket')}
    `.trim(),
  }),

  // Genérico (fallback)
  generic: (data: { title: string; message: string }): TelegramNotificationTemplate => ({
    icon: '📬',
    title: data.title,
    message: data.message,
  }),
}

/**
 * Genera un mensaje formateado para Telegram
 */
export function formatTelegramMessage(template: TelegramNotificationTemplate): string {
  const icon = template.icon ?? '📬'

  return `${icon} <b>ZIII HoS</b>

${template.message}

━━━━━━━━━━━━━━━━━━━━━
<i>Notificación automática</i>`
}
