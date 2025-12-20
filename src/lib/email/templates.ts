export function passwordRecoveryEmailTemplate(params: {
  appName: string
  actionUrl: string
  supportHint?: string
}) {
  const { appName, actionUrl, supportHint } = params

  const subject = `${appName} — Restablecer contraseña`

  const text = [
    `Solicitud de restablecimiento de contraseña`,
    ``,
    `Abre este enlace para definir una nueva contraseña:`,
    actionUrl,
    ``,
    `Si no solicitaste esto, ignora este correo.`,
    supportHint ? `\n${supportHint}` : '',
  ].join('\n')

  const html = `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin:0; padding:0; background-color:#f9fafb;">
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background:#f9fafb; padding:40px 20px;">
      <!-- Logo / Header -->
      <div style="max-width:600px; margin:0 auto 24px auto; text-align:center;">
        <img src="https://integrational3.com.mx/logorigen/ZIII%20logo.png" alt="ZIII Helpdesk" width="180" height="120" style="display:block; margin:0 auto; height:120px; width:auto; max-width:100%;" />
      </div>

      <!-- Main Card -->
      <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:16px; box-shadow:0 4px 6px rgba(0,0,0,0.07); overflow:hidden;">
        
        <!-- Header -->
        <div style="background:linear-gradient(135deg, #1e40af 0%, #4f46e5 100%); padding:24px 24px 16px 24px;">
          <div style="background:rgba(255,255,255,0.15); backdrop-filter:blur(10px); border-radius:12px; padding:12px; text-align:center; border:1px solid rgba(255,255,255,0.2);">
            <div style="font-size:36px; margin-bottom:6px;">🔐</div>
            <h2 style="margin:0; font-size:20px; font-weight:700; color:#ffffff;">Restablecer contraseña</h2>
          </div>
        </div>

        <!-- Content -->
        <div style="padding:32px;">
          <p style="margin:0 0 24px 0; font-size:15px; color:#374151; line-height:1.6;">
            Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong style="color:#111827;">${escapeHtml(appName)}</strong>.
          </p>

          <!-- CTA Button -->
          <div style="text-align:center; margin:32px 0;">
            <a href="${escapeAttr(actionUrl)}"
               style="display:inline-block; background:linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color:#ffffff; text-decoration:none; padding:14px 32px; border-radius:12px; font-size:16px; font-weight:600; box-shadow:0 4px 12px rgba(79, 70, 229, 0.3); transition:transform 0.2s;">
              Actualizar contraseña
            </a>
          </div>

          <!-- Alternative Link -->
          <div style="margin:24px 0; padding:16px; background:#f9fafb; border-radius:10px; border:1px solid #e5e7eb;">
            <p style="margin:0 0 8px 0; font-size:12px; color:#6b7280; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">
              ¿El botón no funciona?
            </p>
            <p style="margin:0; font-size:12px; color:#111827; word-break:break-all; line-height:1.5;">
              <a href="${escapeAttr(actionUrl)}" style="color:#4f46e5; text-decoration:none;">${escapeHtml(actionUrl)}</a>
            </p>
          </div>

          <!-- Security Notice -->
          <div style="margin-top:24px; padding:14px; background:#fef3c7; border-left:4px solid #f59e0b; border-radius:8px;">
            <p style="margin:0; font-size:13px; color:#92400e; line-height:1.5;">
              <strong>⚠️ Nota de seguridad:</strong> Si no solicitaste este cambio, tu cuenta podría estar en riesgo. Ignora este correo y contacta al soporte inmediatamente.
            </p>
          </div>

          ${supportHint ? `
          <p style="margin-top:20px; margin-bottom:0; font-size:13px; color:#6b7280; line-height:1.5;">
            ${escapeHtml(supportHint)}
          </p>
          ` : ''}
        </div>

      </div>

      <!-- Footer -->
      <div style="max-width:600px; margin:24px auto 0 auto; text-align:center;">
        <p style="margin:0 0 8px 0; font-size:12px; color:#9ca3af;">
          Este correo fue enviado automáticamente por <strong>ZIII Helpdesk</strong>
        </p>
        <p style="margin:0; font-size:11px; color:#d1d5db;">
          No respondas a este mensaje · Sistema de Mesa de Ayuda ITIL
        </p>
      </div>
    </div>
  </body>
  </html>
  `

  return { subject, html, text }
}

export function ticketCreatedEmailTemplate(params: {
  ticketNumber: string
  title: string
  description: string
  priority: string
  category: string
  ticketUrl: string
  requesterName: string
}) {
  const { ticketNumber, title, description, priority, category, ticketUrl, requesterName } = params

  const subject = `Ticket #${ticketNumber} creado exitosamente`

  const text = [
    `Nuevo ticket creado`,
    ``,
    `Ticket: #${ticketNumber}`,
    `Solicitante: ${requesterName}`,
    `Título: ${title}`,
    `Categoría: ${category}`,
    `Prioridad: ${priority}`,
    ``,
    `Descripción:`,
    description,
    ``,
    `Ver ticket completo:`,
    ticketUrl,
  ].join('\n')

  const html = `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin:0; padding:0; background-color:#f9fafb;">
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background:#f9fafb; padding:40px 20px;">
      
      <!-- Logo / Header -->
      <div style="max-width:600px; margin:0 auto 24px auto; text-align:center;">
        <img src="https://integrational3.com.mx/logorigen/ZIII%20logo.png" alt="ZIII Helpdesk" width="180" height="120" style="display:block; margin:0 auto; height:120px; width:auto; max-width:100%;" />
      </div>

      <!-- Main Card -->
      <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:16px; box-shadow:0 4px 6px rgba(0,0,0,0.07); overflow:hidden;">
        
        <!-- Header Gradient -->
        <div style="background:linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding:24px 24px 16px 24px;">
          <div style="background:rgba(255,255,255,0.15); backdrop-filter:blur(10px); border-radius:12px; padding:12px; text-align:center; border:1px solid rgba(255,255,255,0.2);">
            <div style="font-size:36px; margin-bottom:6px;">📨</div>
            <h2 style="margin:0; font-size:20px; font-weight:700; color:#ffffff;">Ticket Creado</h2>
            <p style="margin:6px 0 0 0; font-size:13px; color:rgba(255,255,255,0.9);">Hemos recibido tu solicitud de soporte</p>
          </div>
        </div>

        <!-- Content -->
        <div style="padding:32px;">
          
          <!-- Greeting -->
          <p style="margin:0 0 24px 0; font-size:15px; color:#374151; line-height:1.6;">
            Hola <strong style="color:#111827;">${escapeHtml(requesterName)}</strong>,
          </p>
          <p style="margin:0 0 24px 0; font-size:15px; color:#374151; line-height:1.6;">
            Tu ticket ha sido creado exitosamente. Nuestro equipo de soporte lo revisará y te contactará pronto.
          </p>

          <!-- Ticket Number Badge -->
          <div style="margin-bottom:24px; padding:20px; background:linear-gradient(135deg, #ede9fe 0%, #e0e7ff 100%); border-radius:12px; text-align:center; border:2px solid #c7d2fe;">
            <div style="font-size:12px; color:#6366f1; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">Número de Ticket</div>
            <div style="font-size:32px; color:#4f46e5; font-weight:800; letter-spacing:-1px;">#${escapeHtml(ticketNumber)}</div>
          </div>

          <!-- Details Grid -->
          <div style="margin-bottom:24px;">
            <!-- Title -->
            <div style="margin-bottom:16px; padding-bottom:16px; border-bottom:1px solid #e5e7eb;">
              <div style="font-size:11px; color:#6b7280; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-bottom:6px;">Título del ticket</div>
              <div style="font-size:16px; color:#111827; font-weight:600; line-height:1.4;">${escapeHtml(title)}</div>
            </div>

            <!-- Category & Priority -->
            <div style="display:table; width:100%; margin-bottom:16px;">
              <div style="display:table-cell; width:50%; padding-right:12px;">
                <div style="font-size:11px; color:#6b7280; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-bottom:6px;">Categoría</div>
                <div style="font-size:14px; color:#111827; font-weight:500;">${escapeHtml(category)}</div>
              </div>
              <div style="display:table-cell; width:50%; padding-left:12px; border-left:1px solid #e5e7eb;">
                <div style="font-size:11px; color:#6b7280; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-bottom:6px;">Prioridad</div>
                <div style="display:inline-block; padding:4px 12px; background:#fef2f2; color:#dc2626; font-size:13px; font-weight:700; border-radius:6px;">${escapeHtml(priority)}</div>
              </div>
            </div>

            <!-- Description -->
            <div style="padding:16px; background:#f9fafb; border-radius:10px; border:1px solid #e5e7eb;">
              <div style="font-size:11px; color:#6b7280; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-bottom:8px;">Descripción</div>
              <div style="font-size:14px; color:#374151; line-height:1.6; white-space:pre-wrap;">${escapeHtml(description)}</div>
            </div>
          </div>

          <!-- CTA Button -->
          <div style="text-align:center; margin:32px 0 24px 0;">
            <a href="${escapeAttr(ticketUrl)}"
               style="display:inline-block; background:linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color:#ffffff; text-decoration:none; padding:14px 32px; border-radius:12px; font-size:16px; font-weight:600; box-shadow:0 4px 12px rgba(79, 70, 229, 0.3);">
              Ver Ticket Completo →
            </a>
          </div>

          <!-- Info Box -->
          <div style="margin-top:24px; padding:16px; background:#dbeafe; border-left:4px solid #3b82f6; border-radius:8px;">
            <p style="margin:0; font-size:13px; color:#1e40af; line-height:1.5;">
              <strong>💡 Consejo:</strong> Guarda este correo para tu referencia. Puedes usar el número de ticket para consultar el estado de tu solicitud en cualquier momento.
            </p>
          </div>

        </div>
      </div>

      <!-- Footer -->
      <div style="max-width:600px; margin:24px auto 0 auto; text-align:center;">
        <p style="margin:0 0 8px 0; font-size:12px; color:#9ca3af;">
          Enviado por <strong>ZIII Helpdesk</strong> · Mesa de Ayuda ITIL
        </p>
        <p style="margin:0; font-size:11px; color:#d1d5db;">
          Este es un mensaje automático, por favor no respondas a este correo
        </p>
      </div>
    </div>
  </body>
  </html>
  `

  return { subject, html, text }
}

export function ticketAssignedEmailTemplate(params: {
  ticketNumber: string
  title: string
  priority: string
  assignedTo: string
  assignedBy: string
  ticketUrl: string
}) {
  const { ticketNumber, title, priority, assignedTo, assignedBy, ticketUrl } = params

  const subject = `🎯 Ticket #${ticketNumber} asignado a ti`

  const text = [
    `Ticket asignado`,
    ``,
    `Se te ha asignado el ticket #${ticketNumber}`,
    `Título: ${title}`,
    `Prioridad: ${priority}`,
    `Asignado por: ${assignedBy}`,
    ``,
    `Ver ticket:`,
    ticketUrl,
  ].join('\n')

  const html = `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin:0; padding:0; background-color:#f9fafb;">
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background:#f9fafb; padding:40px 20px;">
      
      <div style="max-width:600px; margin:0 auto 24px auto; text-align:center;">
        <img src="https://integrational3.com.mx/logorigen/ZIII%20logo.png" alt="ZIII Helpdesk" width="180" height="120" style="display:block; margin:0 auto; height:120px; width:auto; max-width:100%;" />
      </div>

      <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:16px; box-shadow:0 4px 6px rgba(0,0,0,0.07); overflow:hidden;">
        
        <div style="background:linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); padding:24px 24px 16px 24px;">
          <div style="background:rgba(255,255,255,0.15); backdrop-filter:blur(10px); border-radius:12px; padding:12px; text-align:center; border:1px solid rgba(255,255,255,0.2);">
            <div style="font-size:36px; margin-bottom:6px;">🎯</div>
            <h2 style="margin:0; font-size:20px; font-weight:700; color:#ffffff;">Ticket Asignado</h2>
            <p style="margin:8px 0 0 0; font-size:14px; color:rgba(255,255,255,0.9);">Un nuevo ticket requiere tu atención</p>
          </div>
        </div>

        <div style="padding:32px;">
          <p style="margin:0 0 24px 0; font-size:15px; color:#374151; line-height:1.6;">
            Hola <strong style="color:#111827;">${escapeHtml(assignedTo)}</strong>,
          </p>
          <p style="margin:0 0 24px 0; font-size:15px; color:#374151; line-height:1.6;">
            Se te ha asignado un nuevo ticket que requiere tu gestión. Por favor, revísalo y toma las acciones necesarias.
          </p>

          <div style="margin-bottom:24px; padding:20px; background:linear-gradient(135deg, #ecfeff 0%, #cffafe 100%); border-radius:12px; text-align:center; border:2px solid #a5f3fc;">
            <div style="font-size:12px; color:#0891b2; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">Ticket Asignado</div>
            <div style="font-size:32px; color:#0e7490; font-weight:800; letter-spacing:-1px;">#${escapeHtml(ticketNumber)}</div>
          </div>

          <div style="margin-bottom:24px;">
            <div style="margin-bottom:16px; padding-bottom:16px; border-bottom:1px solid #e5e7eb;">
              <div style="font-size:11px; color:#6b7280; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-bottom:6px;">Título del ticket</div>
              <div style="font-size:16px; color:#111827; font-weight:600; line-height:1.4;">${escapeHtml(title)}</div>
            </div>

            <div style="display:table; width:100%; margin-bottom:16px;">
              <div style="display:table-cell; width:50%; padding-right:12px;">
                <div style="font-size:11px; color:#6b7280; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-bottom:6px;">Prioridad</div>
                <div style="display:inline-block; padding:4px 12px; background:#fef2f2; color:#dc2626; font-size:13px; font-weight:700; border-radius:6px;">${escapeHtml(priority)}</div>
              </div>
              <div style="display:table-cell; width:50%; padding-left:12px; border-left:1px solid #e5e7eb;">
                <div style="font-size:11px; color:#6b7280; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-bottom:6px;">Asignado por</div>
                <div style="font-size:14px; color:#111827; font-weight:500;">${escapeHtml(assignedBy)}</div>
              </div>
            </div>
          </div>

          <div style="text-align:center; margin:32px 0 24px 0;">
            <a href="${escapeAttr(ticketUrl)}"
               style="display:inline-block; background:linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); color:#ffffff; text-decoration:none; padding:14px 32px; border-radius:12px; font-size:16px; font-weight:600; box-shadow:0 4px 12px rgba(8, 145, 178, 0.3);">
              Gestionar Ticket →
            </a>
          </div>

          <div style="margin-top:24px; padding:16px; background:#fef3c7; border-left:4px solid #f59e0b; border-radius:8px;">
            <p style="margin:0; font-size:13px; color:#92400e; line-height:1.5;">
              <strong>⏱️ Recordatorio:</strong> Revisa los SLA y tiempos de respuesta asociados a la prioridad de este ticket.
            </p>
          </div>
        </div>
      </div>

      <div style="max-width:600px; margin:24px auto 0 auto; text-align:center;">
        <p style="margin:0 0 8px 0; font-size:12px; color:#9ca3af;">
          Enviado por <strong>ZIII Helpdesk</strong> · Mesa de Ayuda ITIL
        </p>
        <p style="margin:0; font-size:11px; color:#d1d5db;">
          Este es un mensaje automático, por favor no respondas a este correo
        </p>
      </div>
    </div>
  </body>
  </html>
  `

  return { subject, html, text }
}

export function ticketStatusChangedEmailTemplate(params: {
  ticketNumber: string
  title: string
  oldStatus: string
  newStatus: string
  changedBy: string
  ticketUrl: string
  recipientName: string
}) {
  const { ticketNumber, title, oldStatus, newStatus, changedBy, ticketUrl, recipientName } = params

  const subject = `🔄 Actualización Ticket #${ticketNumber}`

  const text = [
    `Estado del ticket actualizado`,
    ``,
    `Ticket: #${ticketNumber}`,
    `Título: ${title}`,
    `Estado anterior: ${oldStatus}`,
    `Nuevo estado: ${newStatus}`,
    `Actualizado por: ${changedBy}`,
    ``,
    `Ver ticket:`,
    ticketUrl,
  ].join('\n')

  const html = `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin:0; padding:0; background-color:#f9fafb;">
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background:#f9fafb; padding:40px 20px;">
      
      <div style="max-width:600px; margin:0 auto 24px auto; text-align:center;">
        <img src="https://integrational3.com.mx/logorigen/ZIII%20logo.png" alt="ZIII Helpdesk" width="180" height="120" style="display:block; margin:0 auto; height:120px; width:auto; max-width:100%;" />
      </div>

      <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:16px; box-shadow:0 4px 6px rgba(0,0,0,0.07); overflow:hidden;">
        
        <div style="background:linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%); padding:24px 24px 16px 24px;">
          <div style="background:rgba(255,255,255,0.15); backdrop-filter:blur(10px); border-radius:12px; padding:12px; text-align:center; border:1px solid rgba(255,255,255,0.2);">
            <div style="font-size:36px; margin-bottom:6px;">🔄</div>
            <h2 style="margin:0; font-size:20px; font-weight:700; color:#ffffff;">Estado Actualizado</h2>
            <p style="margin:8px 0 0 0; font-size:14px; color:rgba(255,255,255,0.9);">El estado de tu ticket ha cambiado</p>
          </div>
        </div>

        <div style="padding:32px;">
          <p style="margin:0 0 24px 0; font-size:15px; color:#374151; line-height:1.6;">
            Hola <strong style="color:#111827;">${escapeHtml(recipientName)}</strong>,
          </p>
          <p style="margin:0 0 24px 0; font-size:15px; color:#374151; line-height:1.6;">
            Tu ticket ha sido actualizado con un nuevo estado.
          </p>

          <div style="margin-bottom:24px; padding:20px; background:linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); border-radius:12px; text-align:center; border:2px solid #e9d5ff;">
            <div style="font-size:12px; color:#8b5cf6; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">Ticket</div>
            <div style="font-size:32px; color:#7c3aed; font-weight:800; letter-spacing:-1px;">#${escapeHtml(ticketNumber)}</div>
          </div>

          <div style="margin-bottom:24px;">
            <div style="margin-bottom:16px; padding-bottom:16px; border-bottom:1px solid #e5e7eb;">
              <div style="font-size:11px; color:#6b7280; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-bottom:6px;">Título del ticket</div>
              <div style="font-size:16px; color:#111827; font-weight:600; line-height:1.4;">${escapeHtml(title)}</div>
            </div>

            <div style="margin-bottom:20px; padding:16px; background:#f8fafc; border-radius:12px; border:1px solid #e2e8f0;">
              <div style="text-align:center; margin-bottom:12px;">
                <div style="font-size:12px; color:#64748b; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-bottom:8px;">Cambio de Estado</div>
              </div>
              <div style="display:flex; align-items:center; justify-content:center; gap:16px;">
                <div style="flex:1; text-align:center;">
                  <div style="display:inline-block; padding:8px 16px; background:#fef2f2; color:#dc2626; font-size:14px; font-weight:700; border-radius:8px; border:1px solid #fecaca;">
                    ${escapeHtml(oldStatus)}
                  </div>
                </div>
                <div style="font-size:24px; color:#8b5cf6;">→</div>
                <div style="flex:1; text-align:center;">
                  <div style="display:inline-block; padding:8px 16px; background:#dcfce7; color:#16a34a; font-size:14px; font-weight:700; border-radius:8px; border:1px solid #bbf7d0;">
                    ${escapeHtml(newStatus)}
                  </div>
                </div>
              </div>
            </div>

            <div style="padding-bottom:16px;">
              <div style="font-size:11px; color:#6b7280; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-bottom:6px;">Actualizado por</div>
              <div style="font-size:14px; color:#111827; font-weight:500;">${escapeHtml(changedBy)}</div>
            </div>
          </div>
          ${resolution ? `
          <div style="margin-bottom:24px; padding:20px; background:linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius:12px; border:2px solid #86efac;">
            <div style="font-size:11px; color:#16a34a; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-bottom:10px; display:flex; align-items:center; gap:6px;">
              <span style="font-size:16px;">✅</span>
              <span>Resolución</span>
            </div>
            <div style="font-size:14px; color:#166534; line-height:1.6; white-space:pre-wrap;">${escapeHtml(resolution)}</div>
          </div>
          ` : ''}
          <div style="text-align:center; margin:32px 0 24px 0;">
            <a href="${escapeAttr(ticketUrl)}"
               style="display:inline-block; background:linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%); color:#ffffff; text-decoration:none; padding:14px 32px; border-radius:12px; font-size:16px; font-weight:600; box-shadow:0 4px 12px rgba(139, 92, 246, 0.3);">
              Ver Detalles del Ticket →
            </a>
          </div>

          <div style="margin-top:24px; padding:16px; background:#eff6ff; border-left:4px solid #3b82f6; border-radius:8px;">
            <p style="margin:0; font-size:13px; color:#1e3a8a; line-height:1.5;">
              <strong>💬 Tip:</strong> Puedes revisar el historial completo de cambios en la sección de auditoría del ticket.
            </p>
          </div>
        </div>
      </div>

      <div style="max-width:600px; margin:24px auto 0 auto; text-align:center;">
        <p style="margin:0 0 8px 0; font-size:12px; color:#9ca3af;">
          Enviado por <strong>ZIII Helpdesk</strong> · Mesa de Ayuda ITIL
        </p>
        <p style="margin:0; font-size:11px; color:#d1d5db;">
          Este es un mensaje automático, por favor no respondas a este correo
        </p>
      </div>
    </div>
  </body>
  </html>
  `

  return { subject, html, text }
}

export function ticketClosedEmailTemplate(params: {
  ticketNumber: string
  title: string
  closedBy: string
  ticketUrl: string
  recipientName: string
  resolution?: string
}) {
  const { ticketNumber, title, closedBy, ticketUrl, recipientName, resolution } = params

  const subject = `✅ Ticket #${ticketNumber} cerrado`

  const text = [
    `Ticket cerrado`,
    ``,
    `Tu ticket #${ticketNumber} ha sido cerrado.`,
    `Título: ${title}`,
    `Cerrado por: ${closedBy}`,
    ``,
    `Gracias por usar nuestro sistema de soporte.`,
    ``,
    `Ver ticket:`,
    ticketUrl,
  ].join('\n')

  const html = `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin:0; padding:0; background-color:#f9fafb;">
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background:#f9fafb; padding:40px 20px;">
      
      <div style="max-width:600px; margin:0 auto 24px auto; text-align:center;">
        <img src="https://integrational3.com.mx/logorigen/ZIII%20logo.png" alt="ZIII Helpdesk" width="180" height="120" style="display:block; margin:0 auto; height:120px; width:auto; max-width:100%;" />
      </div>

      <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:16px; box-shadow:0 4px 6px rgba(0,0,0,0.07); overflow:hidden;">
        
        <div style="background:linear-gradient(135deg, #059669 0%, #10b981 100%); padding:24px 24px 16px 24px;">
          <div style="background:rgba(255,255,255,0.15); backdrop-filter:blur(10px); border-radius:12px; padding:12px; text-align:center; border:1px solid rgba(255,255,255,0.2);">
            <div style="font-size:36px; margin-bottom:6px;">✅</div>
            <h2 style="margin:0; font-size:20px; font-weight:700; color:#ffffff;">Ticket Cerrado</h2>
            <p style="margin:8px 0 0 0; font-size:14px; color:rgba(255,255,255,0.9);">Tu solicitud ha sido completada exitosamente</p>
          </div>
        </div>

        <div style="padding:32px;">
          <p style="margin:0 0 24px 0; font-size:15px; color:#374151; line-height:1.6;">
            Hola <strong style="color:#111827;">${escapeHtml(recipientName)}</strong>,
          </p>
          <p style="margin:0 0 24px 0; font-size:15px; color:#374151; line-height:1.6;">
            Nos complace informarte que tu ticket ha sido resuelto y cerrado correctamente.
          </p>

          <div style="margin-bottom:24px; padding:20px; background:linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius:12px; text-align:center; border:2px solid #a7f3d0;">
            <div style="font-size:12px; color:#059669; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">Ticket Resuelto</div>
            <div style="font-size:32px; color:#047857; font-weight:800; letter-spacing:-1px;">#${escapeHtml(ticketNumber)}</div>
          </div>

          <div style="margin-bottom:24px;">
            <div style="margin-bottom:16px; padding-bottom:16px; border-bottom:1px solid #e5e7eb;">
              <div style="font-size:11px; color:#6b7280; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-bottom:6px;">Título del ticket</div>
              <div style="font-size:16px; color:#111827; font-weight:600; line-height:1.4;">${escapeHtml(title)}</div>
            </div>

            <div style="padding-bottom:16px;">
              <div style="font-size:11px; color:#6b7280; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-bottom:6px;">Cerrado por</div>
              <div style="font-size:14px; color:#111827; font-weight:500;">${escapeHtml(closedBy)}</div>
            </div>
          </div>

          ${resolution ? `
          <div style="margin-bottom:24px; padding:20px; background:linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius:12px; border:2px solid #86efac;">
            <div style="font-size:11px; color:#16a34a; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-bottom:10px; display:flex; align-items:center; gap:6px;">
              <span style="font-size:16px;">✅</span>
              <span>Resolución</span>
            </div>
            <div style="font-size:14px; color:#166534; line-height:1.6; white-space:pre-wrap;">${escapeHtml(resolution)}</div>
          </div>
          ` : ''}

          <div style="text-align:center; margin:32px 0 24px 0;">
            <a href="${escapeAttr(ticketUrl)}"
               style="display:inline-block; background:linear-gradient(135deg, #059669 0%, #10b981 100%); color:#ffffff; text-decoration:none; padding:14px 32px; border-radius:12px; font-size:16px; font-weight:600; box-shadow:0 4px 12px rgba(5, 150, 105, 0.3);">
              Ver Historial Completo →
            </a>
          </div>

          <div style="margin-top:24px; padding:16px; background:#fef9c3; border-left:4px solid #eab308; border-radius:8px;">
            <p style="margin:0; font-size:13px; color:#713f12; line-height:1.5;">
              <strong>⭐ Feedback:</strong> ¿Estás satisfecho con la resolución? Tu opinión nos ayuda a mejorar nuestro servicio.
            </p>
          </div>
        </div>
      </div>

      <div style="max-width:600px; margin:24px auto 0 auto; text-align:center;">
        <p style="margin:0 0 8px 0; font-size:12px; color:#9ca3af;">
          Enviado por <strong>ZIII Helpdesk</strong> · Mesa de Ayuda ITIL
        </p>
        <p style="margin:0; font-size:11px; color:#d1d5db;">
          Este es un mensaje automático, por favor no respondas a este correo
        </p>
      </div>
    </div>
  </body>
  </html>
  `

  return { subject, html, text }
}

export function ticketEscalatedEmailTemplate(params: {
  ticketNumber: string
  title: string
  priority: string
  escalatedBy: string
  specialistName: string
  ticketUrl: string
  isSpecialist: boolean
}) {
  const { ticketNumber, title, priority, escalatedBy, specialistName, ticketUrl, isSpecialist } = params

  const subject = `🔺 Ticket #${ticketNumber} escalado a Nivel 2 — ZIII Helpdesk`

  const text = [
    `Ticket #${ticketNumber} escalado a Nivel 2`,
    ``,
    `Título: ${title}`,
    `Prioridad: ${priority}`,
    `Escalado por: ${escalatedBy}`,
    `Asignado a: ${specialistName}`,
    ``,
    isSpecialist
      ? 'Has sido asignado como especialista de nivel 2 para este ticket.'
      : 'Tu ticket ha sido escalado a un especialista de nivel 2 para una atención más especializada.',
    ``,
    `Ver detalles: ${ticketUrl}`,
  ].join('\n')

  const html = `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin:0; padding:0; background-color:#f9fafb;">
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background:#f9fafb; padding:40px 20px;">
      <div style="max-width:600px; margin:0 auto 24px auto; text-align:center;">
        <img src="https://integrational3.com.mx/logorigen/ZIII%20logo.png" alt="ZIII Helpdesk" width="180" height="120" style="display:block; margin:0 auto; height:120px; width:auto; max-width:100%;" />
      </div>

      <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:16px; box-shadow:0 4px 6px rgba(0,0,0,0.07); overflow:hidden;">
        
        <div style="background:linear-gradient(135deg, #ea580c 0%, #f97316 100%); padding:24px 24px 16px 24px;">
          <div style="background:rgba(255,255,255,0.15); backdrop-filter:blur(10px); border-radius:12px; padding:12px; text-align:center; border:1px solid rgba(255,255,255,0.2);">
            <div style="font-size:36px; margin-bottom:6px;">🔺</div>
            <h2 style="margin:0; font-size:20px; font-weight:700; color:#ffffff;">
              ${isSpecialist ? 'Ticket Asignado (Nivel 2)' : 'Ticket Escalado a Nivel 2'}
            </h2>
            <p style="margin:6px 0 0 0; font-size:13px; color:rgba(255,255,255,0.9); font-weight:500;">
              Ticket #${escapeHtml(ticketNumber)}
            </p>
          </div>
        </div>

        <div style="padding:32px;">
          ${isSpecialist ? `
          <div style="margin-bottom:24px; padding:18px; background:linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius:12px; border:2px solid #fbbf24;">
            <p style="margin:0; font-size:14px; color:#78350f; line-height:1.6;">
              <strong>⚡ Atención especialista:</strong> Este ticket ha sido escalado a nivel 2 y requiere tu experiencia técnica para su resolución.
            </p>
          </div>
          ` : `
          <div style="margin-bottom:24px; padding:18px; background:linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-radius:12px; border:2px solid #60a5fa;">
            <p style="margin:0; font-size:14px; color:#1e3a8a; line-height:1.6;">
              <strong>📢 Actualización:</strong> Tu ticket ha sido escalado a un especialista de nivel 2 para recibir atención más especializada.
            </p>
          </div>
          `}

          <div style="margin-bottom:20px;">
            <div style="font-size:11px; color:#6b7280; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-bottom:6px;">
              Título del Ticket
            </div>
            <div style="font-size:16px; color:#111827; font-weight:600; line-height:1.4;">
              ${escapeHtml(title)}
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:24px;">
            <div style="padding:16px; background:linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius:10px; border:1px solid #fbbf24;">
              <div style="font-size:10px; color:#78350f; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-bottom:6px;">
                Prioridad
              </div>
              <div style="font-size:14px; color:#111827; font-weight:600;">${escapeHtml(priority)}</div>
            </div>

            <div style="padding:16px; background:linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%); border-radius:10px; border:1px solid #f472b6;">
              <div style="font-size:10px; color:#831843; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-bottom:6px;">
                Nivel de Soporte
              </div>
              <div style="font-size:14px; color:#111827; font-weight:600;">Nivel 2 (Especializado)</div>
            </div>
          </div>

          <div style="margin-bottom:20px; padding:18px; background:#f9fafb; border-radius:10px; border:1px solid #e5e7eb;">
            <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:12px;">
              <div>
                <div style="font-size:11px; color:#6b7280; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-bottom:6px;">
                  Escalado por
                </div>
                <div style="font-size:14px; color:#111827; font-weight:500;">${escapeHtml(escalatedBy)}</div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:11px; color:#6b7280; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-bottom:6px;">
                  Especialista Asignado
                </div>
                <div style="font-size:14px; color:#111827; font-weight:500;">${escapeHtml(specialistName)}</div>
              </div>
            </div>
          </div>

          <div style="text-align:center; margin:32px 0 24px 0;">
            <a href="${escapeAttr(ticketUrl)}"
               style="display:inline-block; background:linear-gradient(135deg, #ea580c 0%, #f97316 100%); color:#ffffff; text-decoration:none; padding:14px 32px; border-radius:12px; font-size:16px; font-weight:600; box-shadow:0 4px 12px rgba(234, 88, 12, 0.3);">
              ${isSpecialist ? 'Atender Ticket →' : 'Ver Ticket →'}
            </a>
          </div>

          ${isSpecialist ? `
          <div style="margin-top:24px; padding:16px; background:#fef2f2; border-left:4px solid #ef4444; border-radius:8px;">
            <p style="margin:0; font-size:13px; color:#7f1d1d; line-height:1.5;">
              <strong>⚠️ Recordatorio:</strong> Como especialista L2, este ticket requiere tu experiencia. Por favor revísalo a la brevedad posible.
            </p>
          </div>
          ` : `
          <div style="margin-top:24px; padding:16px; background:#f0f9ff; border-left:4px solid #3b82f6; border-radius:8px;">
            <p style="margin:0; font-size:13px; color:#1e3a8a; line-height:1.5;">
              <strong>ℹ️ Información:</strong> Un especialista de nivel 2 ha sido asignado a tu caso. Recibirás actualizaciones sobre el progreso.
            </p>
          </div>
          `}
        </div>
      </div>

      <div style="max-width:600px; margin:24px auto 0 auto; text-align:center;">
        <p style="margin:0 0 8px 0; font-size:12px; color:#9ca3af;">
          Enviado por <strong>ZIII Helpdesk</strong> · Mesa de Ayuda ITIL
        </p>
        <p style="margin:0; font-size:11px; color:#d1d5db;">
          Este es un mensaje automático, por favor no respondas a este correo
        </p>
      </div>
    </div>
  </body>
  </html>
  `

  return { subject, html, text }
}

function escapeHtml(value: string | null | undefined) {
  if (!value) return ''
  const str = String(value)
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function escapeAttr(value: string | null | undefined) {
  // Good-enough for URLs
  return escapeHtml(value)
}
