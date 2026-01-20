export function passwordResetRequestEmailTemplate(params: {
  appName: string
  requestingUserName: string
  requestingUserEmail: string
  adminPanelUrl: string
}) {
  const { appName, requestingUserName, requestingUserEmail, adminPanelUrl } = params

  const subject = `${appName} — Solicitud de restablecimiento de contraseña`

  const text = [
    `Solicitud de restablecimiento de contraseña`,
    ``,
    `Usuario: ${requestingUserName} (${requestingUserEmail})`,
    ``,
    `Ha solicitado restablecer su contraseña. Por favor, genera una contraseña temporal desde el panel de administración:`,
    adminPanelUrl,
    ``,
    `Tiempo máximo de respuesta: 2 horas`,
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
        <img src="https://systemach-sas.com/logo_ziii/ZIII%20logo.png" alt="ZIII HoS" width="180" height="120" style="display:block; margin:0 auto; height:120px; width:auto; max-width:100%;" />
      </div>

      <!-- Main Card -->
      <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:16px; box-shadow:0 4px 6px rgba(0,0,0,0.07); overflow:hidden;">
        
        <!-- Header -->
        <div style="background:linear-gradient(135deg, #dc2626 0%, #f59e0b 100%); padding:24px 24px 16px 24px;">
          <div style="background:rgba(255,255,255,0.15); backdrop-filter:blur(10px); border-radius:12px; padding:12px; text-align:center; border:1px solid rgba(255,255,255,0.2);">
            <div style="font-size:36px; margin-bottom:6px;">🔔</div>
            <h2 style="margin:0; font-size:20px; font-weight:700; color:#ffffff;">Solicitud de restablecimiento</h2>
          </div>
        </div>

        <!-- Content -->
        <div style="padding:32px;">
          <p style="margin:0 0 24px 0; font-size:15px; color:#374151; line-height:1.6;">
            Un usuario ha solicitado restablecer su contraseña en <strong style="color:#111827;">${escapeHtml(appName)}</strong>.
          </p>

          <!-- User Info Box -->
          <div style="margin:24px 0; padding:20px; background:#fef3c7; border-radius:12px; border-l-4 border-amber-500;">
            <div style="margin-bottom:12px;">
              <p style="margin:0 0 4px 0; font-size:12px; color:#92400e; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">
                Usuario solicitante
              </p>
              <p style="margin:0; font-size:16px; color:#111827; font-weight:700;">
                ${escapeHtml(requestingUserName)}
              </p>
            </div>
            <div>
              <p style="margin:0 0 4px 0; font-size:12px; color:#92400e; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">
                Email
              </p>
              <p style="margin:0; font-size:14px; color:#111827; font-family:'Courier New', monospace;">
                ${escapeHtml(requestingUserEmail)}
              </p>
            </div>
          </div>

          <!-- Action Required -->
          <div style="margin:24px 0; padding:16px; background:#dbeafe; border-left:4px solid #3b82f6; border-radius:8px;">
            <p style="margin:0 0 8px 0; font-size:13px; color:#1e3a8a; font-weight:700;">
              ⏰ ACCIÓN REQUERIDA
            </p>
            <p style="margin:0; font-size:13px; color:#1e40af; line-height:1.5;">
              Por favor, genera una contraseña temporal para este usuario desde el panel de administración en un máximo de 2 horas.
            </p>
          </div>

          <!-- CTA Button -->
          <div style="text-align:center; margin:32px 0;">
            <a href="${escapeAttr(adminPanelUrl)}"
               style="display:inline-block; background:linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color:#ffffff; text-decoration:none; padding:14px 32px; border-radius:12px; font-size:16px; font-weight:600; box-shadow:0 4px 12px rgba(79, 70, 229, 0.3); transition:transform 0.2s;">
              Ir al Panel de Administración
            </a>
          </div>

          <!-- Instructions -->
          <div style="margin-top:24px; padding:14px; background:#f9fafb; border-radius:8px; border:1px solid #e5e7eb;">
            <p style="margin:0 0 8px 0; font-size:13px; color:#374151; font-weight:600;">
              Pasos para generar contraseña temporal:
            </p>
            <ol style="margin:0; padding-left:20px; font-size:13px; color:#6b7280; line-height:1.8;">
              <li>Accede al panel de administración</li>
              <li>Ve a la sección "Usuarios"</li>
              <li>Busca al usuario: ${escapeHtml(requestingUserEmail)}</li>
              <li>Haz clic en "Editar" y luego en "Enviar reset password"</li>
              <li>La contraseña temporal se generará y enviará automáticamente</li>
            </ol>
          </div>
        </div>

      </div>

      <!-- Footer -->
      <div style="max-width:600px; margin:24px auto 0 auto; text-align:center;">
        <p style="margin:0 0 8px 0; font-size:12px; color:#9ca3af;">
          Este correo fue enviado automáticamente por <strong>ZIII HoS</strong>
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

export function temporaryPasswordEmailTemplate(params: {
  appName: string
  userName: string
  userEmail: string
  temporaryPassword: string
  loginUrl: string
}) {
  const { appName, userName, userEmail, temporaryPassword, loginUrl } = params

  const subject = `${appName} — Contraseña temporal generada`

  const text = [
    `Contraseña temporal para ${appName}`,
    ``,
    `Hola ${userName},`,
    ``,
    `Se ha generado una contraseña temporal para tu cuenta.`,
    ``,
    `Email: ${userEmail}`,
    `Contraseña temporal: ${temporaryPassword}`,
    ``,
    `Inicia sesión en: ${loginUrl}`,
    ``,
    `IMPORTANTE: Por seguridad, te recomendamos encarecidamente cambiar esta contraseña temporal después de iniciar sesión. No dejes la contraseña que se te asignó de forma automática.`,
    ``,
    `Si no solicitaste este cambio, contacta al administrador del sistema inmediatamente.`,
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
        <img src="https://systemach-sas.com/logo_ziii/ZIII%20logo.png" alt="ZIII HoS" width="180" height="120" style="display:block; margin:0 auto; height:120px; width:auto; max-width:100%;" />
      </div>

      <!-- Main Card -->
      <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:16px; box-shadow:0 4px 6px rgba(0,0,0,0.07); overflow:hidden;">
        
        <!-- Header -->
        <div style="background:linear-gradient(135deg, #1e40af 0%, #4f46e5 100%); padding:24px 24px 16px 24px;">
          <div style="background:rgba(255,255,255,0.15); backdrop-filter:blur(10px); border-radius:12px; padding:12px; text-align:center; border:1px solid rgba(255,255,255,0.2);">
            <div style="font-size:36px; margin-bottom:6px;">🔐</div>
            <h2 style="margin:0; font-size:20px; font-weight:700; color:#ffffff;">Contraseña temporal</h2>
          </div>
        </div>

        <!-- Content -->
        <div style="padding:32px;">
          <p style="margin:0 0 24px 0; font-size:15px; color:#374151; line-height:1.6;">
            Hola <strong style="color:#111827;">${escapeHtml(userName)}</strong>,
          </p>

          <p style="margin:0 0 24px 0; font-size:15px; color:#374151; line-height:1.6;">
            Se ha generado una contraseña temporal para tu cuenta en <strong style="color:#111827;">${escapeHtml(appName)}</strong>.
          </p>

          <!-- Credentials Box -->
          <div style="margin:24px 0; padding:20px; background:#f9fafb; border-radius:12px; border:2px solid #e5e7eb;">
            <div style="margin-bottom:16px;">
              <p style="margin:0 0 6px 0; font-size:12px; color:#6b7280; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">
                Email
              </p>
              <p style="margin:0; font-size:14px; color:#111827; font-family:'Courier New', monospace; background:#ffffff; padding:10px; border-radius:6px; border:1px solid #e5e7eb;">
                ${escapeHtml(userEmail)}
              </p>
            </div>
            <div>
              <p style="margin:0 0 6px 0; font-size:12px; color:#6b7280; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">
                Contraseña temporal
              </p>
              <p style="margin:0; font-size:16px; color:#111827; font-family:'Courier New', monospace; background:#ffffff; padding:12px; border-radius:6px; border:1px solid #e5e7eb; font-weight:700; letter-spacing:1px; text-align:center;">
                ${escapeHtml(temporaryPassword)}
              </p>
            </div>
          </div>

          <!-- CTA Button -->
          <div style="text-align:center; margin:32px 0;">
            <a href="${escapeAttr(loginUrl)}"
               style="display:inline-block; background:linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color:#ffffff; text-decoration:none; padding:14px 32px; border-radius:12px; font-size:16px; font-weight:600; box-shadow:0 4px 12px rgba(79, 70, 229, 0.3); transition:transform 0.2s;">
              Iniciar sesión
            </a>
          </div>

          <!-- Important Notice -->
          <div style="margin-top:24px; padding:16px; background:#fef3c7; border-left:4px solid #f59e0b; border-radius:8px;">
            <p style="margin:0 0 8px 0; font-size:13px; color:#92400e; font-weight:700;">
              ⚠️ IMPORTANTE - ACCIÓN RECOMENDADA
            </p>
            <p style="margin:0; font-size:13px; color:#92400e; line-height:1.5;">
              Por seguridad, te recomendamos encarecidamente que cambies esta contraseña temporal después de iniciar sesión. No dejes la contraseña que se te asignó de forma automática. Elige una contraseña segura que solo tú conozcas.
            </p>
          </div>

          <!-- Security Notice -->
          <div style="margin-top:16px; padding:14px; background:#fef2f2; border-left:4px solid #ef4444; border-radius:8px;">
            <p style="margin:0; font-size:13px; color:#991b1b; line-height:1.5;">
              <strong>🔒 Nota de seguridad:</strong> Si no solicitaste este cambio, contacta al administrador del sistema inmediatamente. Tu cuenta podría estar en riesgo.
            </p>
          </div>
        </div>

      </div>

      <!-- Footer -->
      <div style="max-width:600px; margin:24px auto 0 auto; text-align:center;">
        <p style="margin:0 0 8px 0; font-size:12px; color:#9ca3af;">
          Este correo fue enviado automáticamente por <strong>ZIII HoS</strong>
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
        <img src="https://systemach-sas.com/logo_ziii/ZIII%20logo.png" alt="ZIII HoS" width="180" height="120" style="display:block; margin:0 auto; height:120px; width:auto; max-width:100%;" />
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
          Este correo fue enviado automáticamente por <strong>ZIII HoS</strong>
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
  serviceLabel?: string
  locationName?: string
  locationCode?: string
  createdAt?: string
  assignedTo?: string
  expectedResponseTime?: string
  assetTag?: string
  assetType?: string
  assetBrand?: string
  assetModel?: string
  assetSerial?: string
}) {
  const {
    ticketNumber,
    title,
    description,
    priority,
    category,
    ticketUrl,
    requesterName,
    serviceLabel: serviceLabelParam,
    locationName,
    locationCode,
    createdAt,
    assignedTo,
    expectedResponseTime,
    assetTag,
    assetType,
    assetBrand,
    assetModel,
    assetSerial,
  } = params

  const serviceLabel = serviceLabelParam || 'Mesa de Ayuda ITIL'
  const displayExpectedResponse = expectedResponseTime || '24-48 horas según prioridad'

  const subject = `Ticket #${ticketNumber} creado exitosamente`

  const textLines: string[] = [
    `Nuevo ticket creado`,
    ``,
    `Ticket: #${ticketNumber}`,
    `Solicitante: ${requesterName}`,
    `Título: ${title}`,
    `Categoría: ${category}`,
    `Prioridad: ${priority}`,
  ]

  if (assetTag) {
    textLines.push(
      ``,
      `ACTIVO REPORTADO`,
      `Etiqueta: ${assetTag}`,
      assetType ? `Tipo: ${assetType}` : '',
      assetBrand || assetModel ? `Marca/Modelo: ${[assetBrand, assetModel].filter(Boolean).join(' ')}` : '',
      assetSerial ? `Serie: ${assetSerial}` : '',
    )
  }

  textLines.push(
    ``,
    `Descripción:`,
    description,
    ``,
    `Ver ticket completo:`,
    ticketUrl,
  )

  const text = textLines.filter(Boolean).join('\n')

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
        <img src="https://systemach-sas.com/logo_ziii/ZIII%20logo.png" alt="ZIII HoS" width="180" height="120" style="display:block; margin:0 auto; height:120px; width:auto; max-width:100%;" />
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

            ${locationName ? `
            <!-- Location -->
            <div style="margin-bottom:16px; padding:12px; background:#fef3c7; border-radius:8px; border:1px solid #fbbf24;">
              <div style="font-size:11px; color:#92400e; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-bottom:4px; display:flex; align-items:center; gap:6px;">
                <span style="font-size:14px;">📍</span>
                <span>Sede</span>
              </div>
              <div style="font-size:14px; color:#111827; font-weight:600;">${escapeHtml(locationCode || '')} - ${escapeHtml(locationName)}</div>
            </div>
            ` : ''}

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

            ${createdAt ? `
            <!-- Creation Date -->
            <div style="margin-bottom:16px; padding:12px; background:#f3f4f6; border-radius:8px;">
              <div style="font-size:11px; color:#6b7280; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-bottom:4px;">📅 Fecha de creación</div>
              <div style="font-size:14px; color:#111827; font-weight:500;">${escapeHtml(createdAt)}</div>
            </div>
            ` : ''}

            ${assignedTo ? `
            <!-- Assigned To -->
            <div style="margin-bottom:16px; padding:12px; background:#dbeafe; border-radius:8px; border:1px solid #93c5fd;">
              <div style="font-size:11px; color:#1e40af; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-bottom:4px;">👤 Asignado a</div>
              <div style="font-size:14px; color:#111827; font-weight:600;">${escapeHtml(assignedTo)}</div>
            </div>
            ` : ''}

            ${assetTag ? `
            <!-- Asset Info -->
            <div style="margin-bottom:16px; padding:16px; background:#ecfeff; border-radius:10px; border:1px solid #bae6fd;">
              <div style="font-size:11px; color:#0369a1; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
                <span style="font-size:16px;">💻</span>
                <span>Activo reportado</span>
              </div>
              <div style="font-size:14px; color:#0f172a; line-height:1.5;">
                <div style="font-weight:600;">Etiqueta: ${escapeHtml(assetTag)}</div>
                ${assetType ? `<div style="margin-top:2px;">Tipo: ${escapeHtml(assetType)}</div>` : ''}
                ${(assetBrand || assetModel) ? `<div style="margin-top:2px;">Marca/Modelo: ${escapeHtml([assetBrand, assetModel].filter(Boolean).join(' '))}</div>` : ''}
                ${assetSerial ? `<div style="margin-top:2px;">Serie: ${escapeHtml(assetSerial)}</div>` : ''}
              </div>
            </div>
            ` : ''}

            <!-- Description -->
            <div style="padding:16px; background:#f9fafb; border-radius:10px; border:1px solid #e5e7eb;">
              <div style="font-size:11px; color:#6b7280; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-bottom:8px;">Descripción</div>
              <div style="font-size:14px; color:#374151; line-height:1.6; white-space:pre-wrap;">${escapeHtml(description)}</div>
            </div>
          </div>

          <!-- Expected Response Time -->
          <div style="margin-bottom:24px; padding:16px; background:#f0fdf4; border-left:4px solid #22c55e; border-radius:8px;">
            <p style="margin:0 0 8px 0; font-size:13px; color:#166534; font-weight:700;">
              ⏱️ TIEMPO DE RESPUESTA ESPERADO
            </p>
            <p style="margin:0; font-size:13px; color:#166534; line-height:1.5;">
              ${escapeHtml(displayExpectedResponse)}. Te mantendremos informado del progreso de tu solicitud.
            </p>
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
              <strong>💡 Consejo:</strong> Guarda este correo para tu referencia. Puedes usar el número de ticket <strong>#${escapeHtml(ticketNumber)}</strong> para consultar el estado de tu solicitud en cualquier momento.
            </p>
          </div>

        </div>
      </div>

      <!-- Footer -->
      <div style="max-width:600px; margin:24px auto 0 auto; text-align:center;">
        <p style="margin:0 0 8px 0; font-size:12px; color:#9ca3af;">
          Enviado por <strong>ZIII HoS</strong> · ${escapeHtml(serviceLabel)}
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

export function ticketAssignedToRequesterEmailTemplate(params: {
  ticketNumber: string
  title: string
  priority: string
  assignedAgentName: string
  ticketUrl: string
  requesterName: string
  serviceLabel?: string
  assetTag?: string
  assetType?: string
  assetBrand?: string
  assetModel?: string
  assetSerial?: string
}) {
  const {
    ticketNumber,
    title,
    priority,
    assignedAgentName,
    ticketUrl,
    requesterName,
    serviceLabel: serviceLabelParam,
    assetTag,
    assetType,
    assetBrand,
    assetModel,
    assetSerial,
  } = params

  const serviceLabel = serviceLabelParam || 'Mesa de Ayuda ITIL'

  const subject = `✅ Tu ticket #${ticketNumber} ha sido asignado`

  const textLines: string[] = [
    `Actualización de tu ticket`,
    ``,
    `Ticket: #${ticketNumber}`,
    `Título: ${title}`,
    `Prioridad: ${priority}`,
    `Asignado a: ${assignedAgentName}`,
  ]

  if (assetTag) {
    textLines.push(
      ``,
      `ACTIVO REPORTADO`,
      `Etiqueta: ${assetTag}`,
      assetType ? `Tipo: ${assetType}` : '',
      assetBrand || assetModel ? `Marca/Modelo: ${[assetBrand, assetModel].filter(Boolean).join(' ')}` : '',
      assetSerial ? `Serie: ${assetSerial}` : '',
    )
  }

  textLines.push(
    ``,
    `Tu ticket está siendo atendido por nuestro equipo de soporte.`,
    ``,
    `Ver ticket:`,
    ticketUrl,
  )

  const text = textLines.filter(Boolean).join('\n')

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
        <img src="https://systemach-sas.com/logo_ziii/ZIII%20logo.png" alt="ZIII Helpdesk" width="180" height="120" style="display:block; margin:0 auto; height:120px; width:auto; max-width:100%;" />
      </div>

      <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:16px; box-shadow:0 4px 6px rgba(0,0,0,0.07); overflow:hidden;">
        
        <div style="background:linear-gradient(135deg, #10b981 0%, #34d399 100%); padding:24px 24px 16px 24px;">
          <div style="background:rgba(255,255,255,0.15); backdrop-filter:blur(10px); border-radius:12px; padding:12px; text-align:center; border:1px solid rgba(255,255,255,0.2);">
            <div style="font-size:36px; margin-bottom:6px;">✅</div>
            <h2 style="margin:0; font-size:20px; font-weight:700; color:#ffffff;">Ticket Asignado</h2>
            <p style="margin:8px 0 0 0; font-size:14px; color:rgba(255,255,255,0.9);">Tu solicitud está siendo atendida</p>
          </div>
        </div>

        <div style="padding:32px;">
          <p style="margin:0 0 24px 0; font-size:15px; color:#374151; line-height:1.6;">
            Hola <strong style="color:#111827;">${escapeHtml(requesterName)}</strong>,
          </p>
          <p style="margin:0 0 24px 0; font-size:15px; color:#374151; line-height:1.6;">
            Tu ticket ha sido asignado a un miembro de nuestro equipo técnico y está siendo atendido.
          </p>

          <div style="margin-bottom:24px; padding:20px; background:linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-radius:12px; text-align:center; border:2px solid #6ee7b7;">
            <div style="font-size:12px; color:#059669; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">Ticket en Proceso</div>
            <div style="font-size:32px; color:#047857; font-weight:800; letter-spacing:-1px;">#${escapeHtml(ticketNumber)}</div>
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
                <div style="font-size:11px; color:#6b7280; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-bottom:6px;">Responsable</div>
                <div style="font-size:14px; color:#111827; font-weight:500;">${escapeHtml(assignedAgentName)}</div>
              </div>
            </div>
          </div>

            ${assetTag ? `
            <div style="margin-bottom:16px; padding:16px; background:#ecfeff; border-radius:10px; border:1px solid #bae6fd;">
              <div style="font-size:11px; color:#0369a1; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
                <span style="font-size:16px;">💻</span>
                <span>Activo reportado</span>
              </div>
              <div style="font-size:14px; color:#0f172a; line-height:1.5;">
                <div style="font-weight:600;">Etiqueta: ${escapeHtml(assetTag)}</div>
                ${assetType ? `<div style="margin-top:2px;">Tipo: ${escapeHtml(assetType)}</div>` : ''}
                ${(assetBrand || assetModel) ? `<div style="margin-top:2px;">Marca/Modelo: ${escapeHtml([assetBrand, assetModel].filter(Boolean).join(' '))}</div>` : ''}
                ${assetSerial ? `<div style="margin-top:2px;">Serie: ${escapeHtml(assetSerial)}</div>` : ''}
              </div>
            </div>
            ` : ''}

          <div style="text-align:center; margin:32px 0 24px 0;">
            <a href="${escapeAttr(ticketUrl)}"
               style="display:inline-block; background:linear-gradient(135deg, #10b981 0%, #34d399 100%); color:#ffffff; text-decoration:none; padding:14px 32px; border-radius:12px; font-size:16px; font-weight:600; box-shadow:0 4px 12px rgba(16, 185, 129, 0.3);">
              Ver Estado del Ticket →
            </a>
          </div>

          <div style="margin-top:24px; padding:16px; background:#dbeafe; border-left:4px solid #3b82f6; border-radius:8px;">
            <p style="margin:0; font-size:13px; color:#1e40af; line-height:1.5;">
              <strong>📞 Información:</strong> El técnico asignado se pondrá en contacto contigo si necesita información adicional. Te mantendremos informado de cualquier actualización.
            </p>
          </div>
        </div>
      </div>

      <div style="max-width:600px; margin:24px auto 0 auto; text-align:center;">
        <p style="margin:0 0 8px 0; font-size:12px; color:#9ca3af;">
          Enviado por <strong>ZIII Helpdesk</strong> · ${escapeHtml(serviceLabel)}
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
  serviceLabel?: string
  assetTag?: string
  assetType?: string
  assetBrand?: string
  assetModel?: string
  assetSerial?: string
}) {
  const {
    ticketNumber,
    title,
    priority,
    assignedTo,
    assignedBy,
    ticketUrl,
    serviceLabel: serviceLabelParam,
    assetTag,
    assetType,
    assetBrand,
    assetModel,
    assetSerial,
  } = params

  const serviceLabel = serviceLabelParam || 'Mesa de Ayuda ITIL'

  const subject = `🎯 Ticket #${ticketNumber} asignado a ti`

  const textLines: string[] = [
    `Ticket asignado`,
    ``,
    `Se te ha asignado el ticket #${ticketNumber}`,
    `Título: ${title}`,
    `Prioridad: ${priority}`,
    `Asignado por: ${assignedBy}`,
  ]

  if (assetTag) {
    textLines.push(
      ``,
      `ACTIVO REPORTADO`,
      `Etiqueta: ${assetTag}`,
      assetType ? `Tipo: ${assetType}` : '',
      assetBrand || assetModel ? `Marca/Modelo: ${[assetBrand, assetModel].filter(Boolean).join(' ')}` : '',
      assetSerial ? `Serie: ${assetSerial}` : '',
    )
  }

  textLines.push(
    ``,
    `Ver ticket:`,
    ticketUrl,
  )

  const text = textLines.filter(Boolean).join('\n')

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
        <img src="https://systemach-sas.com/logo_ziii/ZIII%20logo.png" alt="ZIII Helpdesk" width="180" height="120" style="display:block; margin:0 auto; height:120px; width:auto; max-width:100%;" />
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

            ${assetTag ? `
            <div style="margin-bottom:16px; padding:16px; background:#ecfeff; border-radius:10px; border:1px solid #bae6fd;">
              <div style="font-size:11px; color:#0369a1; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
                <span style="font-size:16px;">💻</span>
                <span>Activo reportado</span>
              </div>
              <div style="font-size:14px; color:#0f172a; line-height:1.5;">
                <div style="font-weight:600;">Etiqueta: ${escapeHtml(assetTag)}</div>
                ${assetType ? `<div style=\"margin-top:2px;\">Tipo: ${escapeHtml(assetType)}</div>` : ''}
                ${(assetBrand || assetModel) ? `<div style=\"margin-top:2px;\">Marca/Modelo: ${escapeHtml([assetBrand, assetModel].filter(Boolean).join(' '))}</div>` : ''}
                ${assetSerial ? `<div style=\"margin-top:2px;\">Serie: ${escapeHtml(assetSerial)}</div>` : ''}
              </div>
            </div>
            ` : ''}

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
          Enviado por <strong>ZIII Helpdesk</strong> · ${escapeHtml(serviceLabel)}
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
  serviceLabel?: string
  locationName?: string
  locationCode?: string
  changedAt?: string
  resolution?: string
  assetTag?: string
  assetType?: string
  assetBrand?: string
  assetModel?: string
  assetSerial?: string
}) {
  const {
    ticketNumber,
    title,
    oldStatus,
    newStatus,
    changedBy,
    ticketUrl,
    recipientName,
    serviceLabel: serviceLabelParam,
    locationName,
    locationCode,
    changedAt,
    resolution,
    assetTag,
    assetType,
    assetBrand,
    assetModel,
    assetSerial,
  } = params

  const serviceLabel = serviceLabelParam || 'Mesa de Ayuda ITIL'

  // Sujeto específico según el nuevo estado
  let statusEmoji = '🔄'
  let statusAction = 'Actualización'
  
  switch (newStatus.toUpperCase()) {
    case 'ASSIGNED':
    case 'ASIGNADO':
      statusEmoji = '👤'
      statusAction = 'ASIGNADO'
      break
    case 'IN_PROGRESS':
    case 'EN PROGRESO':
    case 'EN_PROGRESO':
      statusEmoji = '⚙️'
      statusAction = 'EN PROGRESO'
      break
    case 'NEEDS_INFO':
    case 'REQUIERE INFORMACIÓN':
    case 'REQUIERE_INFORMACIÓN':
      statusEmoji = '❓'
      statusAction = 'REQUIERE INFORMACIÓN'
      break
    case 'WAITING_THIRD_PARTY':
    case 'ESPERANDO TERCERO':
    case 'ESPERANDO_TERCERO':
      statusEmoji = '⏳'
      statusAction = 'ESPERANDO TERCERO'
      break
    case 'RESOLVED':
    case 'RESUELTO':
      statusEmoji = '✅'
      statusAction = 'RESUELTO'
      break
    case 'ON_HOLD':
    case 'EN ESPERA':
    case 'EN_ESPERA':
      statusEmoji = '⏸️'
      statusAction = 'EN ESPERA'
      break
    case 'REOPENED':
    case 'REABIERTO':
      statusEmoji = '🔄'
      statusAction = 'REABIERTO'
      break
    default:
      statusEmoji = '🔄'
      statusAction = newStatus
  }

  const subject = `${statusEmoji} Ticket ${statusAction} #${ticketNumber}`

  const textLines: string[] = [
    `Estado del ticket actualizado`,
    ``,
    `Ticket: #${ticketNumber}`,
    `Título: ${title}`,
    `Estado anterior: ${oldStatus}`,
    `Nuevo estado: ${newStatus}`,
    `Actualizado por: ${changedBy}`,
  ]

  if (assetTag) {
    textLines.push(
      ``,
      `ACTIVO REPORTADO`,
      `Etiqueta: ${assetTag}`,
      assetType ? `Tipo: ${assetType}` : '',
      assetBrand || assetModel ? `Marca/Modelo: ${[assetBrand, assetModel].filter(Boolean).join(' ')}` : '',
      assetSerial ? `Serie: ${assetSerial}` : '',
    )
  }

  textLines.push(
    ``,
    `Ver ticket:`,
    ticketUrl,
  )

  const text = textLines.filter(Boolean).join('\n')

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
        <img src="https://systemach-sas.com/logo_ziii/ZIII%20logo.png" alt="ZIII Helpdesk" width="180" height="120" style="display:block; margin:0 auto; height:120px; width:auto; max-width:100%;" />
      </div>

      <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:16px; box-shadow:0 4px 6px rgba(0,0,0,0.07); overflow:hidden;">
        
        <div style="background:linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%); padding:24px 24px 16px 24px;">
          <div style="background:rgba(255,255,255,0.15); backdrop-filter:blur(10px); border-radius:12px; padding:12px; text-align:center; border:1px solid rgba(255,255,255,0.2);">
            <div style="font-size:36px; margin-bottom:6px;">${statusEmoji}</div>
            <h2 style="margin:0; font-size:20px; font-weight:700; color:#ffffff;">Ticket ${statusAction}</h2>
            <p style="margin:8px 0 0 0; font-size:14px; color:rgba(255,255,255,0.9);">Estado: ${escapeHtml(newStatus)}</p>
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

            ${locationName ? `
            <div style="padding:12px; margin-bottom:16px; background:#fef3c7; border-radius:8px; border:1px solid #fbbf24;">
              <div style="font-size:11px; color:#92400e; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-bottom:4px;">📍 Sede</div>
              <div style="font-size:14px; color:#111827; font-weight:600;">${escapeHtml(locationCode || '')} - ${escapeHtml(locationName)}</div>
            </div>
            ` : ''}

            <div style="padding-bottom:16px;">
              <div style="font-size:11px; color:#6b7280; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-bottom:6px;">Actualizado por</div>
              <div style="font-size:14px; color:#111827; font-weight:500;">${escapeHtml(changedBy)}</div>
            </div>

            ${changedAt ? `
            <div style="padding:12px; background:#f3f4f6; border-radius:8px;">
              <div style="font-size:11px; color:#6b7280; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-bottom:4px;">📅 Fecha de actualización</div>
              <div style="font-size:14px; color:#111827; font-weight:500;">${escapeHtml(changedAt)}</div>
            </div>
            ` : ''}
          </div>
            ${assetTag ? `
            <div style="margin-bottom:24px; padding:16px; background:#ecfeff; border-radius:10px; border:1px solid #bae6fd;">
              <div style="font-size:11px; color:#0369a1; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
                <span style="font-size:16px;">💻</span>
                <span>Activo reportado</span>
              </div>
              <div style="font-size:14px; color:#0f172a; line-height:1.5;">
                <div style="font-weight:600;">Etiqueta: ${escapeHtml(assetTag)}</div>
                ${assetType ? `<div style="margin-top:2px;">Tipo: ${escapeHtml(assetType)}</div>` : ''}
                ${(assetBrand || assetModel) ? `<div style="margin-top:2px;">Marca/Modelo: ${escapeHtml([assetBrand, assetModel].filter(Boolean).join(' '))}</div>` : ''}
                ${assetSerial ? `<div style="margin-top:2px;">Serie: ${escapeHtml(assetSerial)}</div>` : ''}
              </div>
            </div>
            ` : ''}
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
          Enviado por <strong>ZIII Helpdesk</strong> · ${escapeHtml(serviceLabel)}
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
  serviceLabel?: string
  resolution?: string
  assetTag?: string
  assetType?: string
  assetBrand?: string
  assetModel?: string
  assetSerial?: string
}) {
  const {
    ticketNumber,
    title,
    closedBy,
    ticketUrl,
    recipientName,
    serviceLabel: serviceLabelParam,
    resolution,
    assetTag,
    assetType,
    assetBrand,
    assetModel,
    assetSerial,
  } = params

  const serviceLabel = serviceLabelParam || 'Mesa de Ayuda ITIL'

  const subject = `✅ Ticket #${ticketNumber} cerrado`

  const textLines: string[] = [
    `Ticket cerrado`,
    ``,
    `Tu ticket #${ticketNumber} ha sido cerrado.`,
    `Título: ${title}`,
    `Cerrado por: ${closedBy}`,
  ]

  if (assetTag) {
    textLines.push(
      ``,
      `ACTIVO REPORTADO`,
      `Etiqueta: ${assetTag}`,
      assetType ? `Tipo: ${assetType}` : '',
      assetBrand || assetModel ? `Marca/Modelo: ${[assetBrand, assetModel].filter(Boolean).join(' ')}` : '',
      assetSerial ? `Serie: ${assetSerial}` : '',
    )
  }

  textLines.push(
    ``,
    `Gracias por usar nuestro sistema de soporte.`,
    ``,
    `Ver ticket:`,
    ticketUrl,
  )

  const text = textLines.filter(Boolean).join('\n')

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
        <img src="https://systemach-sas.com/logo_ziii/ZIII%20logo.png" alt="ZIII Helpdesk" width="180" height="120" style="display:block; margin:0 auto; height:120px; width:auto; max-width:100%;" />
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

          ${assetTag ? `
          <div style="margin-bottom:24px; padding:16px; background:#ecfeff; border-radius:10px; border:1px solid #bae6fd;">
            <div style="font-size:11px; color:#0369a1; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
              <span style="font-size:16px;">💻</span>
              <span>Activo reportado</span>
            </div>
            <div style="font-size:14px; color:#0f172a; line-height:1.5;">
              <div style="font-weight:600;">Etiqueta: ${escapeHtml(assetTag)}</div>
              ${assetType ? `<div style="margin-top:2px;">Tipo: ${escapeHtml(assetType)}</div>` : ''}
              ${(assetBrand || assetModel) ? `<div style="margin-top:2px;">Marca/Modelo: ${escapeHtml([assetBrand, assetModel].filter(Boolean).join(' '))}</div>` : ''}
              ${assetSerial ? `<div style="margin-top:2px;">Serie: ${escapeHtml(assetSerial)}</div>` : ''}
            </div>
          </div>
          ` : ''}

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
          Enviado por <strong>ZIII Helpdesk</strong> · ${escapeHtml(serviceLabel)}
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
  serviceLabel?: string
  assetTag?: string
  assetType?: string
  assetBrand?: string
  assetModel?: string
  assetSerial?: string
}) {
  const {
    ticketNumber,
    title,
    priority,
    escalatedBy,
    specialistName,
    ticketUrl,
    isSpecialist,
    serviceLabel: serviceLabelParam,
    assetTag,
    assetType,
    assetBrand,
    assetModel,
    assetSerial,
  } = params

  const serviceLabel = serviceLabelParam || 'Mesa de Ayuda ITIL'

  const subject = `🔺 Ticket #${ticketNumber} escalado a Nivel 2 — ${serviceLabel}`

  const textLines: string[] = [
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
  ]

  if (assetTag) {
    textLines.push(
      ``,
      `ACTIVO REPORTADO`,
      `Etiqueta: ${assetTag}`,
      assetType ? `Tipo: ${assetType}` : '',
      assetBrand || assetModel ? `Marca/Modelo: ${[assetBrand, assetModel].filter(Boolean).join(' ')}` : '',
      assetSerial ? `Serie: ${assetSerial}` : '',
    )
  }

  textLines.push(
    ``,
    `Ver detalles: ${ticketUrl}`,
  )

  const text = textLines.filter(Boolean).join('\n')

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
        <img src="https://systemach-sas.com/logo_ziii/ZIII%20logo.png" alt="ZIII Helpdesk" width="180" height="120" style="display:block; margin:0 auto; height:120px; width:auto; max-width:100%;" />
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

          ${assetTag ? `
          <div style="margin-bottom:24px; padding:16px; background:#ecfeff; border-radius:10px; border:1px solid #bae6fd;">
            <div style="font-size:11px; color:#0369a1; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
              <span style="font-size:16px;">💻</span>
              <span>Activo reportado</span>
            </div>
            <div style="font-size:14px; color:#0f172a; line-height:1.5;">
              <div style="font-weight:600;">Etiqueta: ${escapeHtml(assetTag)}</div>
              ${assetType ? `<div style="margin-top:2px;">Tipo: ${escapeHtml(assetType)}</div>` : ''}
              ${(assetBrand || assetModel) ? `<div style="margin-top:2px;">Marca/Modelo: ${escapeHtml([assetBrand, assetModel].filter(Boolean).join(' '))}</div>` : ''}
              ${assetSerial ? `<div style="margin-top:2px;">Serie: ${escapeHtml(assetSerial)}</div>` : ''}
            </div>
          </div>
          ` : ''}

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
          Enviado por <strong>ZIII Helpdesk</strong> · ${escapeHtml(serviceLabel)}
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

export function ticketLocationStaffNotificationTemplate(params: {
  ticketNumber: string
  title: string
  description?: string
  priority: string
  category?: string
  locationName: string
  locationCode: string
  actorName: string
  staffName: string
  ticketUrl: string
  isUpdate: boolean
  oldStatus?: string
  newStatus?: string
  serviceLabel?: string
  assetTag?: string
  assetType?: string
  assetBrand?: string
  assetModel?: string
  assetSerial?: string
}) {
  const {
    ticketNumber,
    title,
    description,
    priority,
    category,
    locationName,
    locationCode,
    actorName,
    staffName,
    ticketUrl,
    isUpdate,
    oldStatus,
    newStatus,
    serviceLabel: serviceLabelParam,
    assetTag,
    assetType,
    assetBrand,
    assetModel,
    assetSerial,
  } = params

  const serviceLabel = serviceLabelParam || 'Mesa de Ayuda ITIL'

  const subject = `[${locationCode}] ${isUpdate ? 'Actualización' : 'Nuevo'} Ticket #${ticketNumber}`

  const textLines: string[] = [
    `${isUpdate ? 'Actualización de' : 'Nuevo'} ticket en tu sede`,
    ``,
    `Sede: ${locationName} (${locationCode})`,
    `Ticket: #${ticketNumber}`,
    `Título: ${title}`,
  ]

  if (description) {
    textLines.push(`Descripción: ${description}`)
  }

  if (assetTag) {
    textLines.push(
      ``,
      `ACTIVO REPORTADO`,
      `Etiqueta: ${assetTag}`,
      assetType ? `Tipo: ${assetType}` : '',
      assetBrand || assetModel ? `Marca/Modelo: ${[assetBrand, assetModel].filter(Boolean).join(' ')}` : '',
      assetSerial ? `Serie: ${assetSerial}` : '',
    )
  }

  textLines.push(
    `Prioridad: ${priority}`,
    category ? `Categoría: ${category}` : '',
    isUpdate && oldStatus && newStatus ? `Estado: ${oldStatus} → ${newStatus}` : '',
    `${isUpdate ? 'Actualizado' : 'Creado'} por: ${actorName}`,
    ``,
    `Ver ticket completo:`,
    ticketUrl,
    ``,
    `Recibes esta notificación porque eres personal técnico/supervisor de la sede ${locationName}.`,
  )

  const text = textLines.filter(Boolean).join('\n')

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
        <img src="https://systemach-sas.com/logo_ziii/ZIII%20logo.png" alt="ZIII Helpdesk" width="180" height="120" style="display:block; margin:0 auto; height:120px; width:auto; max-width:100%;" />
      </div>

      <!-- Main Card -->
      <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:16px; box-shadow:0 4px 6px rgba(0,0,0,0.07); overflow:hidden;">
        
        <!-- Header Gradient -->
        <div style="background:linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding:24px 24px 16px 24px;">
          <div style="background:rgba(255,255,255,0.15); backdrop-filter:blur(10px); border-radius:12px; padding:12px; text-align:center; border:1px solid rgba(255,255,255,0.2);">
            <div style="font-size:36px; margin-bottom:6px;">🎫</div>
            <h2 style="margin:0; font-size:20px; font-weight:700; color:#ffffff;">${isUpdate ? 'Actualización de' : 'Nuevo'} Ticket en tu Sede</h2>
            <p style="margin:6px 0 0 0; font-size:13px; color:rgba(255,255,255,0.9);">Notificación para personal de ${escapeHtml(locationName)}</p>
          </div>
        </div>

        <!-- Content -->
        <div style="padding:32px;">
          
          <!-- Greeting -->
          <p style="margin:0 0 24px 0; font-size:15px; color:#374151; line-height:1.6;">
            Hola <strong style="color:#111827;">${escapeHtml(staffName)}</strong>,
          </p>
          <p style="margin:0 0 24px 0; font-size:15px; color:#374151; line-height:1.6;">
            Se ha ${isUpdate ? 'actualizado' : 'creado'} un ticket en tu sede.
          </p>

          <!-- Location Badge -->
          <div style="margin-bottom:24px; text-align:center;">
            <div style="display:inline-block; padding:8px 20px; background:linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border:2px solid #fbbf24; border-radius:20px;">
              <span style="font-size:12px; color:#78350f; font-weight:700; text-transform:uppercase; letter-spacing:1px;">📍 ${escapeHtml(locationCode)} - ${escapeHtml(locationName)}</span>
            </div>
          </div>

          <!-- Ticket Number Badge -->
          <div style="margin-bottom:24px; padding:20px; background:linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%); border-radius:12px; text-align:center; border:2px solid #fb923c;">
            <div style="font-size:12px; color:#c2410c; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">Ticket</div>
            <div style="font-size:32px; color:#ea580c; font-weight:800; letter-spacing:-1px;">#${escapeHtml(ticketNumber)}</div>
          </div>

          <!-- Details Grid -->
          <div style="margin-bottom:24px;">
            <!-- Title -->
            <div style="margin-bottom:16px; padding-bottom:16px; border-bottom:1px solid #e5e7eb;">
              <div style="font-size:11px; color:#6b7280; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-bottom:6px;">Título del ticket</div>
              <div style="font-size:16px; color:#111827; font-weight:600; line-height:1.4;">${escapeHtml(title)}</div>
            </div>

            ${description ? `
            <!-- Description -->
            <div style="margin-bottom:16px; padding:16px; background:#f9fafb; border-radius:10px; border:1px solid #e5e7eb;">
              <div style="font-size:11px; color:#6b7280; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-bottom:8px;">Descripción</div>
              <div style="font-size:14px; color:#374151; line-height:1.6; white-space:pre-wrap;">${escapeHtml(description.substring(0, 300))}${description.length > 300 ? '...' : ''}</div>
            </div>
            ` : ''}

            <!-- Category & Priority -->
            <div style="display:table; width:100%; margin-bottom:16px;">
              ${category ? `
              <div style="display:table-cell; width:50%; padding-right:12px;">
                <div style="font-size:11px; color:#6b7280; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-bottom:6px;">Categoría</div>
                <div style="font-size:14px; color:#111827; font-weight:500;">${escapeHtml(category)}</div>
              </div>
              ` : ''}
              <div style="display:table-cell; width:50%; padding-left:12px; ${category ? 'border-left:1px solid #e5e7eb;' : ''}">
                <div style="font-size:11px; color:#6b7280; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-bottom:6px;">Prioridad</div>
                <div style="display:inline-block; padding:4px 12px; background:#fef2f2; color:#dc2626; font-size:13px; font-weight:700; border-radius:6px;">${escapeHtml(priority)}</div>
              </div>
            </div>

            ${assetTag ? `
            <!-- Asset Info -->
            <div style="margin-bottom:16px; padding:16px; background:#ecfeff; border-radius:10px; border:1px solid #bae6fd;">
              <div style="font-size:11px; color:#0369a1; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
                <span style="font-size:16px;">💻</span>
                <span>Activo reportado</span>
              </div>
              <div style="font-size:14px; color:#0f172a; line-height:1.5;">
                <div style="font-weight:600;">Etiqueta: ${escapeHtml(assetTag)}</div>
                ${assetType ? `<div style="margin-top:2px;">Tipo: ${escapeHtml(assetType)}</div>` : ''}
                ${(assetBrand || assetModel) ? `<div style="margin-top:2px;">Marca/Modelo: ${escapeHtml([assetBrand, assetModel].filter(Boolean).join(' '))}</div>` : ''}
                ${assetSerial ? `<div style="margin-top:2px;">Serie: ${escapeHtml(assetSerial)}</div>` : ''}
              </div>
            </div>
            ` : ''}

            ${isUpdate && oldStatus && newStatus ? `
            <!-- Status Change -->
            <div style="margin-bottom:16px; padding:16px; background:#eff6ff; border-radius:10px; border:1px solid #bfdbfe;">
              <div style="font-size:11px; color:#1e40af; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-bottom:8px;">📊 Cambio de Estado</div>
              <div style="font-size:14px; color:#1e3a8a; line-height:1.6;">
                <span style="padding:4px 8px; background:#dbeafe; border-radius:4px; font-weight:600;">${escapeHtml(oldStatus)}</span>
                <span style="margin:0 8px; color:#6b7280;">→</span>
                <span style="padding:4px 8px; background:#3b82f6; color:#ffffff; border-radius:4px; font-weight:600;">${escapeHtml(newStatus)}</span>
              </div>
            </div>
            ` : ''}

            <!-- Actor -->
            <div style="padding:12px; background:#f3f4f6; border-radius:8px;">
              <div style="font-size:11px; color:#6b7280; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-bottom:4px;">${isUpdate ? '👤 Actualizado por' : '👤 Creado por'}</div>
              <div style="font-size:14px; color:#111827; font-weight:600;">${escapeHtml(actorName)}</div>
            </div>
          </div>

          <!-- CTA Button -->
          <div style="text-align:center; margin:32px 0 24px 0;">
            <a href="${escapeAttr(ticketUrl)}"
               style="display:inline-block; background:linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color:#ffffff; text-decoration:none; padding:14px 32px; border-radius:12px; font-size:16px; font-weight:600; box-shadow:0 4px 12px rgba(245, 158, 11, 0.3);">
              Ver Ticket Completo →
            </a>
          </div>

          <!-- Info Box -->
          <div style="margin-top:24px; padding:16px; background:#fef3c7; border-left:4px solid #f59e0b; border-radius:8px;">
            <p style="margin:0; font-size:13px; color:#92400e; line-height:1.5;">
              <strong>📬 Notificación de Sede:</strong> Recibes este correo porque eres personal técnico o supervisor de <strong>${escapeHtml(locationName)}</strong>. Los tickets de tu sede requieren tu atención.
            </p>
          </div>

        </div>
      </div>

      <!-- Footer -->
      <div style="max-width:600px; margin:24px auto 0 auto; text-align:center;">
        <p style="margin:0 0 8px 0; font-size:12px; color:#9ca3af;">
          Enviado por <strong>ZIII Helpdesk</strong> · ${escapeHtml(serviceLabel)}
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

/**
 * Template para enviar información completa de un ticket por correo
 * (para investigación, deslinde de responsabilidades, etc.)
 */
export function ticketInvestigationEmailTemplate(params: {
  recipientName: string
  ticketNumber: number
  title: string
  description: string
  priority: string
  category: string
  status: string
  locationName: string
  locationCode: string
  requesterName: string
  assignedAgentName: string | null
  createdAt: string
  updatedAt: string
  closedAt: string | null
  closedBy: string | null
  resolution: string | null
  supportLevel: number
  daysOpen: number
  commentsCount: number
  comments: Array<{ author: string; content: string; date: string; isInternal: boolean }>
  statusHistory: Array<{ fromStatus: string; toStatus: string; actor: string; date: string; note: string | null }>
  ticketUrl: string
  senderName: string
  reason?: string
  assetTag?: string
  assetType?: string
  assetBrand?: string
  assetModel?: string
  assetSerial?: string
}) {
  const {
    recipientName,
    ticketNumber,
    title,
    description,
    priority,
    category,
    status,
    locationName,
    locationCode,
    requesterName,
    assignedAgentName,
    createdAt,
    updatedAt,
    closedAt,
    closedBy,
    resolution,
    supportLevel,
    daysOpen,
    commentsCount,
    comments,
    statusHistory,
    ticketUrl,
    senderName,
    reason,
    assetTag,
    assetType,
    assetBrand,
    assetModel,
    assetSerial,
  } = params

  const subject = `[INFORME] Ticket #${ticketNumber} - ${title}`

  const text = [
    `Información del Ticket #${ticketNumber}`,
    ``,
    `Enviado por: ${senderName}`,
    reason ? `Motivo: ${reason}` : '',
    ``,
    `INFORMACIÓN GENERAL`,
    `Título: ${title}`,
    `Estado: ${status}`,
    `Prioridad: ${priority}`,
    `Categoría: ${category}`,
    `Sede: ${locationName} (${locationCode})`,
    assetTag
      ? `Activo: ${[assetTag, assetBrand, assetModel].filter(Boolean).join(' ')}${assetType ? ` | Tipo: ${assetType}` : ''}${assetSerial ? ` | Serie: ${assetSerial}` : ''}`
      : '',
    ``,
    `Solicitante: ${requesterName}`,
    `Asignado a: ${assignedAgentName || 'Sin asignar'}`,
    ``,
    `Creado: ${createdAt}`,
    `Actualizado: ${updatedAt}`,
    `Días abierto: ${daysOpen}`,
    ``,
    `DESCRIPCIÓN`,
    description,
    ``,
    `COMENTARIOS (${commentsCount})`,
    comments.length > 0
      ? comments
          .map(
            (c) =>
              `[${c.date}] ${c.author}${c.isInternal ? ' (interno)' : ''}: ${c.content}`
          )
          .join('\n')
      : 'Sin comentarios',
    ``,
    `Ver ticket completo: ${ticketUrl}`,
  ].join('\n')

  const html = `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Informe Ticket #${ticketNumber}</title>
    <style>
      @media print {
        body { background: white !important; padding: 20px !important; }
        .no-print { display: none !important; }
      }
    </style>
  </head>
  <body style="margin:0; padding:0; background-color:#f9fafb;">
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background:#f9fafb; padding:40px 20px;">
      
      <!-- Logo -->
      <div style="max-width:700px; margin:0 auto 24px auto; text-align:center;">
        <img src="https://systemach-sas.com/logo_ziii/ZIII%20logo.png" alt="ZIII Helpdesk" width="180" height="120" style="display:block; margin:0 auto; height:120px; width:auto; max-width:100%;" />
      </div>

      <!-- Main Card -->
      <div style="max-width:700px; margin:0 auto; background:#ffffff; border-radius:16px; box-shadow:0 4px 6px rgba(0,0,0,0.07); overflow:hidden;">
        
        <!-- Header -->
        <div style="background:linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%); padding:24px 24px 16px 24px;">
          <div style="background:rgba(255,255,255,0.15); backdrop-filter:blur(10px); border-radius:12px; padding:16px; text-align:center; border:1px solid rgba(255,255,255,0.2);">
            <div style="font-size:40px; margin-bottom:8px;">📋</div>
            <h2 style="margin:0 0 8px 0; font-size:22px; font-weight:700; color:#ffffff;">INFORME DE TICKET #${ticketNumber}</h2>
            <p style="margin:0; font-size:14px; color:rgba(255,255,255,0.9); font-weight:500;">
              Documento Completo de Investigación ITIL
            </p>
          </div>
        </div>

        <!-- Content -->
        <div style="padding:32px;">
          
          <!-- Greeting -->
          <p style="margin:0 0 24px 0; font-size:15px; color:#374151; line-height:1.6;">
            Hola <strong style="color:#111827;">${escapeHtml(recipientName)}</strong>,
          </p>
          <p style="margin:0 0 24px 0; font-size:15px; color:#374151; line-height:1.6;">
            <strong>${escapeHtml(senderName)}</strong> ha compartido contigo la información completa del ticket <strong>#${ticketNumber}</strong> para fines de investigación y deslinde de responsabilidades.
          </p>

          ${reason ? `
          <!-- Reason -->
          <div style="margin-bottom:24px; padding:16px; background:#fef3c7; border-left:4px solid #f59e0b; border-radius:8px;">
            <p style="margin:0; font-size:13px; color:#92400e; line-height:1.5;">
              <strong>📝 Motivo:</strong> ${escapeHtml(reason)}
            </p>
          </div>
          ` : ''}

          <!-- Ticket Info Grid -->
          <div style="margin-bottom:24px; background:#f9fafb; border-radius:12px; padding:20px; border:1px solid #e5e7eb;">
            <h3 style="margin:0 0 16px 0; font-size:16px; font-weight:700; color:#111827; border-bottom:2px solid #e5e7eb; padding-bottom:8px;">
              📊 Información General
            </h3>
            
            <table style="width:100%; border-collapse:collapse;">
              <tr>
                <td style="padding:8px 0; font-size:13px; color:#6b7280; font-weight:600;">Título:</td>
                <td style="padding:8px 0; font-size:13px; color:#111827; font-weight:500;">${escapeHtml(title)}</td>
              </tr>
              <tr>
                <td style="padding:8px 0; font-size:13px; color:#6b7280; font-weight:600;">Estado:</td>
                <td style="padding:8px 0; font-size:13px;">
                  <span style="display:inline-block; padding:4px 12px; background:#e0e7ff; color:#4338ca; border-radius:6px; font-size:12px; font-weight:600;">
                    ${escapeHtml(status)}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0; font-size:13px; color:#6b7280; font-weight:600;">Prioridad:</td>
                <td style="padding:8px 0; font-size:13px;">
                  <span style="display:inline-block; padding:4px 12px; background:#fee2e2; color:#991b1b; border-radius:6px; font-size:12px; font-weight:600;">
                    ${escapeHtml(priority)}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0; font-size:13px; color:#6b7280; font-weight:600;">Categoría:</td>
                <td style="padding:8px 0; font-size:13px; color:#111827;">${escapeHtml(category)}</td>
              </tr>
              <tr>
                <td style="padding:8px 0; font-size:13px; color:#6b7280; font-weight:600;">Sede:</td>
                <td style="padding:8px 0; font-size:13px; color:#111827;">
                  <strong>${escapeHtml(locationName)}</strong> (${escapeHtml(locationCode)})
                </td>
              </tr>
              ${assetTag ? `
              <tr>
                <td style="padding:8px 0; font-size:13px; color:#6b7280; font-weight:600;">Activo reportado:</td>
                <td style="padding:8px 0; font-size:13px; color:#111827;">
                  <strong>${escapeHtml(assetTag)}</strong>
                  ${assetBrand || assetModel ? ` — ${escapeHtml([assetBrand, assetModel].filter(Boolean).join(' '))}` : ''}
                  ${assetSerial ? `<span style="color:#6b7280;"> · Serie: ${escapeHtml(assetSerial)}</span>` : ''}
                </td>
              </tr>
              ` : ''}
              <tr style="border-top:1px solid #e5e7eb;">
                <td style="padding:12px 0 8px 0; font-size:13px; color:#6b7280; font-weight:600;">Solicitante:</td>
                <td style="padding:12px 0 8px 0; font-size:13px; color:#111827; font-weight:500;">${escapeHtml(requesterName)}</td>
              </tr>
              <tr>
                <td style="padding:8px 0; font-size:13px; color:#6b7280; font-weight:600;">Asignado a:</td>
                <td style="padding:8px 0; font-size:13px; color:#111827; font-weight:500;">
                  ${assignedAgentName ? escapeHtml(assignedAgentName) : '<em style="color:#9ca3af;">Sin asignar</em>'}
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0; font-size:13px; color:#6b7280; font-weight:600;">Nivel de Soporte:</td>
                <td style="padding:8px 0; font-size:13px;">
                  <span style="display:inline-block; padding:4px 12px; background:#dbeafe; color:#1e40af; border-radius:6px; font-size:12px; font-weight:600;">
                    Nivel ${supportLevel}
                  </span>
                </td>
              </tr>
              <tr style="border-top:1px solid #e5e7eb;">
                <td style="padding:12px 0 8px 0; font-size:13px; color:#6b7280; font-weight:600;">Creado:</td>
                <td style="padding:12px 0 8px 0; font-size:13px; color:#111827;">${escapeHtml(createdAt)}</td>
              </tr>
              <tr>
                <td style="padding:8px 0; font-size:13px; color:#6b7280; font-weight:600;">Actualizado:</td>
                <td style="padding:8px 0; font-size:13px; color:#111827;">${escapeHtml(updatedAt)}</td>
              </tr>
              ${closedAt ? `
              <tr>
                <td style="padding:8px 0; font-size:13px; color:#6b7280; font-weight:600;">Cerrado:</td>
                <td style="padding:8px 0; font-size:13px; color:#111827;">${escapeHtml(closedAt)}</td>
              </tr>
              ${closedBy ? `
              <tr>
                <td style="padding:8px 0; font-size:13px; color:#6b7280; font-weight:600;">Cerrado por:</td>
                <td style="padding:8px 0; font-size:13px; color:#111827; font-weight:500;">${escapeHtml(closedBy)}</td>
              </tr>
              ` : ''}
              ` : ''}
              <tr>
                <td style="padding:8px 0; font-size:13px; color:#6b7280; font-weight:600;">Días abierto:</td>
                <td style="padding:8px 0; font-size:13px;">
                  <strong style="color:${daysOpen > 7 ? '#dc2626' : daysOpen > 3 ? '#f59e0b' : '#059669'};">
                    ${daysOpen} días
                  </strong>
                </td>
              </tr>
            </table>
          </div>

          <!-- Description -->
          <div style="margin-bottom:24px; background:#f9fafb; border-radius:12px; padding:20px; border:1px solid #e5e7eb;">
            <h3 style="margin:0 0 12px 0; font-size:16px; font-weight:700; color:#111827; border-bottom:2px solid #e5e7eb; padding-bottom:8px;">
              📝 Descripción del Problema
            </h3>
            <p style="margin:0; font-size:14px; color:#374151; line-height:1.7; white-space:pre-wrap;">
              ${escapeHtml(description)}
            </p>
          </div>

          ${resolution ? `
          <!-- Resolution -->
          <div style="margin-bottom:24px; background:#f0fdf4; border-radius:12px; padding:20px; border:2px solid #22c55e;">
            <h3 style="margin:0 0 12px 0; font-size:16px; font-weight:700; color:#15803d; border-bottom:2px solid #86efac; padding-bottom:8px;">
              ✅ Resolución Final
            </h3>
            <p style="margin:0; font-size:14px; color:#166534; line-height:1.7; white-space:pre-wrap; font-weight:500;">
              ${escapeHtml(resolution)}
            </p>
          </div>
          ` : ''}

          <!-- Status History -->
          <div style="margin-bottom:24px; background:#f9fafb; border-radius:12px; padding:20px; border:1px solid #e5e7eb;">
            <h3 style="margin:0 0 16px 0; font-size:16px; font-weight:700; color:#111827; border-bottom:2px solid #e5e7eb; padding-bottom:8px;">
              🔄 Historial de Estados (${statusHistory.length} cambios)
            </h3>
            
            ${statusHistory.length > 0 ? statusHistory.map((h, idx) => `
            <div style="position:relative; padding:14px 14px 14px 40px; margin-bottom:${idx < statusHistory.length - 1 ? '12px' : '0'}; background:#ffffff; border-radius:8px; border-left:3px solid #6366f1;">
              <div style="position:absolute; left:12px; top:14px; width:18px; height:18px; background:#6366f1; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#ffffff; font-size:10px; font-weight:700;">
                ${idx + 1}
              </div>
              <div style="margin-bottom:6px;">
                <span style="font-size:12px; color:#6b7280; font-weight:600; text-decoration:line-through;">${escapeHtml(h.fromStatus)}</span>
                <span style="font-size:12px; color:#6b7280; margin:0 6px;">→</span>
                <span style="font-size:12px; color:#1e40af; font-weight:700;">${escapeHtml(h.toStatus)}</span>
              </div>
              <div style="font-size:12px; color:#6b7280; margin-bottom:4px;">
                <strong style="color:#111827;">${escapeHtml(h.actor)}</strong> · ${escapeHtml(h.date)}
              </div>
              ${h.note ? `
              <div style="margin-top:8px; padding:8px 12px; background:#fef3c7; border-radius:6px; font-size:12px; color:#92400e; line-height:1.5;">
                ${escapeHtml(h.note)}
              </div>
              ` : ''}
            </div>
            `).join('') : `
            <p style="margin:0; font-size:14px; color:#9ca3af; font-style:italic;">
              No hay historial de cambios de estado.
            </p>
            `}
          </div>

          <!-- Comments -->
          <div style="margin-bottom:24px; background:#f9fafb; border-radius:12px; padding:20px; border:1px solid #e5e7eb;">
            <h3 style="margin:0 0 16px 0; font-size:16px; font-weight:700; color:#111827; border-bottom:2px solid #e5e7eb; padding-bottom:8px;">
              💬 Seguimiento y Comentarios (${commentsCount})
            </h3>
            
            ${comments.length > 0 ? comments.map((comment, idx) => `
            <div style="margin-bottom:${idx < comments.length - 1 ? '16px' : '0'}; padding:14px; background:#ffffff; border-radius:8px; border-left:3px solid ${comment.isInternal ? '#f59e0b' : '#1e40af'};">
              <div style="margin-bottom:8px;">
                <strong style="font-size:13px; color:#111827;">${escapeHtml(comment.author)}</strong>
                ${comment.isInternal ? ' <span style="display:inline-block; padding:2px 8px; background:#fef3c7; color:#92400e; border-radius:4px; font-size:10px; font-weight:600; text-transform:uppercase; margin-left:8px;">Interno</span>' : ''}
                <div style="font-size:11px; color:#9ca3af; margin-top:4px;">
                  ${escapeHtml(comment.date)}
                </div>
              </div>
              <div style="margin:0; font-size:13px; color:#374151; line-height:1.6; white-space:pre-wrap;">
                ${escapeHtml(comment.content)}
              </div>
            </div>
            `).join('') : `
            <p style="margin:0; font-size:14px; color:#9ca3af; font-style:italic;">
              No hay comentarios registrados en este ticket.
            </p>
            `}
          </div>

          <!-- CTA Button -->
          <div class="no-print" style="text-align:center; margin:32px 0;">
            <a href="${escapeAttr(ticketUrl)}"
               style="display:inline-block; background:linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%); color:#ffffff; text-decoration:none; padding:14px 32px; border-radius:12px; font-size:16px; font-weight:600; box-shadow:0 4px 12px rgba(30, 64, 175, 0.3);">
              📋 Ver Ticket Completo en Sistema
            </a>
          </div>

          <!-- Print Instructions -->
          <div class="no-print" style="margin:24px 0; padding:16px; background:#f0f9ff; border-left:4px solid #3b82f6; border-radius:8px;">
            <p style="margin:0; font-size:13px; color:#1e40af; line-height:1.5;">
              <strong>💡 Sugerencia:</strong> Puedes guardar este informe como PDF usando la función de imprimir de tu navegador o cliente de correo (Ctrl+P → Guardar como PDF).
            </p>
          </div>

          <!-- Warning Box -->
          <div style="margin-top:24px; padding:16px; background:#eff6ff; border-left:4px solid #1e40af; border-radius:8px;">
            <p style="margin:0; font-size:13px; color:#1e3a8a; line-height:1.5;">
              <strong>🔒 Documento Confidencial:</strong> Esta información es de carácter confidencial y está destinada únicamente para fines de investigación interna. No debe ser compartida con terceros sin autorización.
            </p>
          </div>

        </div>
      </div>

      <!-- Footer -->
      <div style="max-width:700px; margin:24px auto 0 auto; text-align:center;">
        <p style="margin:0 0 8px 0; font-size:12px; color:#9ca3af;">
          Enviado por <strong>ZIII Helpdesk</strong> · Mesa de Ayuda ITIL
        </p>
        <p style="margin:0; font-size:11px; color:#d1d5db;">
          Este correo fue enviado por ${escapeHtml(senderName)} desde el sistema de helpdesk
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

export function locationSummaryEmailTemplate(params: {
  locationCode: string
  locationName: string
  summaryLabel?: string
  totalTickets: number
  openTickets: number
  closedTickets: number
  avgResolutionDays: number
  openTicketsList: {
    ticketNumber: string
    title: string
    priority: string
    status: string
    ageDays: number
    ticketUrl: string
  }[]
}) {
  const {
    locationCode,
    locationName,
    summaryLabel = 'Estado actual de incidencias',
    totalTickets,
    openTickets,
    closedTickets,
    avgResolutionDays,
    openTicketsList,
  } = params

  const subject = `Resumen de incidencias — [${locationCode}] ${locationName}`

  const textLines: string[] = [
    `Resumen de incidencias por sede`,
    ``,
    `Sede: [${locationCode}] ${locationName}`,
    summaryLabel,
    ``,
    `Tickets totales: ${totalTickets}`,
    `Abiertos: ${openTickets}`,
    `Cerrados: ${closedTickets}`,
    `Promedio de resolución: ${avgResolutionDays.toFixed(1)} días`,
  ]

  if (openTicketsList.length) {
    textLines.push('', 'Tickets abiertos más relevantes:')
    for (const t of openTicketsList) {
      textLines.push(
        `- #${t.ticketNumber} (${t.priority}) — ${t.title} [${t.status}] · ${t.ageDays} días · ${t.ticketUrl}`
      )
    }
  }

  const text = textLines.join('\n')

  const ticketsRowsHtml = openTicketsList
    .map((t) => {
      return `
      <tr>
        <td style="padding:8px 12px; border-bottom:1px solid #e5e7eb; font-size:13px; color:#111827; white-space:nowrap;">
          #${escapeHtml(t.ticketNumber)}
        </td>
        <td style="padding:8px 12px; border-bottom:1px solid #e5e7eb; font-size:13px; color:#111827;">
          ${escapeHtml(t.title)}
        </td>
        <td style="padding:8px 12px; border-bottom:1px solid #e5e7eb; font-size:12px; color:#1d4ed8; white-space:nowrap;">
          ${escapeHtml(t.priority)}
        </td>
        <td style="padding:8px 12px; border-bottom:1px solid #e5e7eb; font-size:12px; color:#92400e; white-space:nowrap;">
          ${escapeHtml(t.status)}
        </td>
        <td style="padding:8px 12px; border-bottom:1px solid #e5e7eb; font-size:12px; color:#111827; white-space:nowrap; text-align:right;">
          ${t.ageDays} días
        </td>
      </tr>
      `
    })
    .join('')

  const html = `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin:0; padding:0; background-color:#0f172a;">
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background:#0f172a; padding:24px 16px; color:#e5e7eb;">

      <!-- Header / Logo -->
      <div style="max-width:720px; margin:0 auto 24px auto; text-align:center;">
        <img src="https://systemach-sas.com/logo_ziii/ZIII%20logo.png" alt="ZIII Helpdesk" width="180" height="120" style="display:block; margin:0 auto; height:120px; width:auto; max-width:100%;" />
      </div>

      <!-- Main Card -->
      <div style="max-width:720px; margin:0 auto; background:radial-gradient(circle at top left, #1d4ed8 0, #020617 55%); border-radius:24px; box-shadow:0 20px 40px -16px rgba(15,23,42,0.9); overflow:hidden; border:1px solid rgba(148,163,184,0.35);">

        <!-- Gradient Header -->
        <div style="position:relative; padding:16px 20px 14px 20px; background:linear-gradient(135deg, rgba(37,99,235,0.9) 0%, rgba(79,70,229,0.95) 40%, rgba(15,23,42,0.98) 100%);">
          <div style="position:absolute; inset:auto -60px -80px auto; width:260px; height:260px; background:radial-gradient(circle, rgba(191,219,254,0.35), transparent 55%); opacity:0.7; filter:blur(2px);"></div>
          <div style="position:relative; display:flex; align-items:center; justify-content:space-between; gap:16px;">
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="width:40px; height:40px; border-radius:14px; background:rgba(15,23,42,0.15); border:1px solid rgba(191,219,254,0.5); display:flex; align-items:center; justify-content:center;">
                <span style="font-size:22px;">📊</span>
              </div>
              <div>
                <p style="margin:0 0 4px 0; font-size:11px; letter-spacing:0.12em; text-transform:uppercase; color:rgba(219,234,254,0.9); font-weight:600;">
                  Resumen ejecutivo por sede
                </p>
                <h1 style="margin:0; font-size:18px; font-weight:700; color:#eff6ff; letter-spacing:0.02em;">
                  [${escapeHtml(locationCode)}] ${escapeHtml(locationName)}
                </h1>
              </div>
            </div>
            <div style="text-align:right;">
              <p style="margin:0 0 4px 0; font-size:11px; color:rgba(219,234,254,0.9); text-transform:uppercase; letter-spacing:0.16em;">${escapeHtml(
                summaryLabel
              )}</p>
              <p style="margin:0; font-size:12px; color:rgba(226,232,240,0.9);">ZIII Helpdesk · Mesa de Ayuda ITIL</p>
            </div>
          </div>
        </div>

        <!-- Content -->
        <div style="padding:24px 24px 22px 24px; background:radial-gradient(circle at top, rgba(15,23,42,1) 0, #020617 55%);">

          <!-- KPI Row -->
          <div style="display:flex; flex-wrap:wrap; gap:12px; margin-bottom:20px;">
            <div style="flex:1 1 140px; min-width:0; background:linear-gradient(135deg, rgba(59,130,246,0.12), rgba(15,23,42,0.9)); border-radius:14px; padding:10px 12px; border:1px solid rgba(59,130,246,0.5);">
              <p style="margin:0 0 4px 0; font-size:11px; color:#bfdbfe; text-transform:uppercase; letter-spacing:0.12em;">Tickets totales</p>
              <p style="margin:0; font-size:20px; font-weight:700; color:#eff6ff;">${totalTickets}</p>
            </div>
            <div style="flex:1 1 140px; min-width:0; background:linear-gradient(135deg, rgba(251,191,36,0.1), rgba(15,23,42,0.9)); border-radius:14px; padding:10px 12px; border:1px solid rgba(251,191,36,0.7);">
              <p style="margin:0 0 4px 0; font-size:11px; color:#fef3c7; text-transform:uppercase; letter-spacing:0.12em;">Abiertos</p>
              <p style="margin:0; font-size:18px; font-weight:700; color:#fde68a;">${openTickets}</p>
            </div>
            <div style="flex:1 1 140px; min-width:0; background:linear-gradient(135deg, rgba(16,185,129,0.1), rgba(15,23,42,0.9)); border-radius:14px; padding:10px 12px; border:1px solid rgba(45,212,191,0.7);">
              <p style="margin:0 0 4px 0; font-size:11px; color:#a7f3d0; text-transform:uppercase; letter-spacing:0.12em;">Cerrados</p>
              <p style="margin:0; font-size:18px; font-weight:700; color:#6ee7b7;">${closedTickets}</p>
            </div>
            <div style="flex:1 1 160px; min-width:0; background:linear-gradient(135deg, rgba(129,140,248,0.12), rgba(15,23,42,0.95)); border-radius:14px; padding:10px 12px; border:1px solid rgba(129,140,248,0.7);">
              <p style="margin:0 0 4px 0; font-size:11px; color:#e0e7ff; text-transform:uppercase; letter-spacing:0.12em;">Prom. resolución</p>
              <p style="margin:0; font-size:18px; font-weight:700; color:#e5e7eb;">${avgResolutionDays.toFixed(
                1
              )} días</p>
            </div>
          </div>

          <!-- Divider -->
          <div style="height:1px; background:linear-gradient(to right, transparent, rgba(148,163,184,0.7), transparent); margin:14px 0 18px 0;"></div>

          <!-- Open Tickets List -->
          <div>
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
              <p style="margin:0; font-size:13px; font-weight:600; color:#e5e7eb; letter-spacing:0.02em; text-transform:uppercase;">Tickets abiertos a revisar</p>
              <p style="margin:0; font-size:11px; color:#9ca3af;">Prioriza estos casos para reducir el backlog de la sede.</p>
            </div>

            ${openTicketsList.length
              ? `
              <div style="border-radius:14px; border:1px solid rgba(148,163,184,0.5); background:radial-gradient(circle at top left, rgba(15,23,42,0.95), rgba(15,23,42,0.98)); overflow:hidden;">
                <table style="width:100%; border-collapse:collapse;">
                  <thead>
                    <tr>
                      <th style="padding:8px 12px; border-bottom:1px solid #1f2937; font-size:11px; text-transform:uppercase; letter-spacing:0.12em; color:#9ca3af; text-align:left;">Ticket</th>
                      <th style="padding:8px 12px; border-bottom:1px solid #1f2937; font-size:11px; text-transform:uppercase; letter-spacing:0.12em; color:#9ca3af; text-align:left;">Título</th>
                      <th style="padding:8px 12px; border-bottom:1px solid #1f2937; font-size:11px; text-transform:uppercase; letter-spacing:0.12em; color:#9ca3af; text-align:left;">Prioridad</th>
                      <th style="padding:8px 12px; border-bottom:1px solid #1f2937; font-size:11px; text-transform:uppercase; letter-spacing:0.12em; color:#9ca3af; text-align:left;">Estado</th>
                      <th style="padding:8px 12px; border-bottom:1px solid #1f2937; font-size:11px; text-transform:uppercase; letter-spacing:0.12em; color:#9ca3af; text-align:right;">Antigüedad</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${ticketsRowsHtml}
                  </tbody>
                </table>
              </div>
            `
              : `
              <div style="padding:14px 12px; border-radius:12px; background:rgba(22,163,74,0.12); border:1px solid rgba(22,163,74,0.5);">
                <p style="margin:0; font-size:13px; color:#bbf7d0;">
                  ✅ No hay tickets abiertos pendientes en esta sede. Excelente trabajo de atención y cierre oportuno.
                </p>
              </div>
            `}
          </div>

          <!-- Call to Action -->
          <div style="margin-top:20px; padding:14px 14px 12px 14px; border-radius:14px; background:linear-gradient(135deg, rgba(37,99,235,0.18), rgba(56,189,248,0.16)); border:1px solid rgba(59,130,246,0.7);">
            <p style="margin:0 0 6px 0; font-size:13px; color:#e5e7eb;">
              <strong>Acción sugerida:</strong> Revisa con el responsable técnico y administrativo de la sede para priorizar la atención de los casos abiertos y definir fechas compromiso de solución.
            </p>
            <p style="margin:0; font-size:11px; color:#cbd5f5;">
              Este resumen está diseñado para usarse en comités de seguimiento, reuniones operativas o para escalar incidentes críticos a la dirección correspondiente.
            </p>
          </div>

        </div>

        <!-- Footer inside card -->
        <div style="padding:12px 18px 16px 18px; background:linear-gradient(to right, rgba(15,23,42,0.98), rgba(15,23,42,1)); border-top:1px solid rgba(30,64,175,0.75); display:flex; align-items:center; justify-content:space-between; gap:12px;">
          <p style="margin:0; font-size:11px; color:#9ca3af;">
            Generado automáticamente por <strong style="color:#e5e7eb;">ZIII Helpdesk</strong> para dar trazabilidad a las incidencias por sede.
          </p>
          <p style="margin:0; font-size:11px; color:#6b7280; text-align:right;">
            No respondas a este mensaje · Uso interno
          </p>
        </div>
      </div>
    </div>
  </body>
  </html>
  `

  return { subject, html, text }
}

/**
 * Template para notificar inspecciones con ítems debajo del umbral crítico
 */
export function criticalInspectionAlertTemplate(params: {
  locationCode: string
  locationName: string
  inspectionDate: string
  inspectorName: string
  department: string
  averageScore: number
  criticalItems: Array<{
    areaName: string
    itemDescription: string
    score: number
    comments: string
  }>
  inspectionUrl: string
  threshold: number
}) {
  const {
    locationCode,
    locationName,
    inspectionDate,
    inspectorName,
    department,
    averageScore,
    criticalItems,
    inspectionUrl,
    threshold
  } = params

  const subject = `⚠️ Alerta Crítica: ${locationCode} - ${criticalItems.length} ítem${criticalItems.length === 1 ? '' : 's'} bajo umbral`

  // Limitar a los primeros 10 items para que el correo sea corto
  const maxItemsToShow = 10
  const itemsToShow = criticalItems.slice(0, maxItemsToShow)
  const remainingCount = Math.max(0, criticalItems.length - maxItemsToShow)

  const criticalItemsText = itemsToShow
    .map(item => `  • ${item.itemDescription} (${item.areaName}): ${item.score}/10`)
    .join('\n')

  const text = [
    `ALERTA DE INSPECCIÓN CRÍTICA`,
    ``,
    `Se detectaron ${criticalItems.length} ítems con calificación menor a ${threshold}/10.`,
    ``,
    `Sede: ${locationName} (${locationCode})`,
    `Departamento: ${department}`,
    `Inspector: ${inspectorName}`,
    `Fecha: ${inspectionDate}`,
    `Promedio: ${averageScore.toFixed(1)}/10`,
    ``,
    `ÍTEMS CRÍTICOS:`,
    criticalItemsText,
    remainingCount > 0 ? `  ... y ${remainingCount} más` : '',
    ``,
    `Revisar: ${inspectionUrl}`,
  ].filter(Boolean).join('\n')

  const criticalItemsHtml = itemsToShow
    .map(
      item => `
      <tr>
        <td style="padding:12px 16px; border-bottom:1px solid #fef3c7;">
          <p style="margin:0; font-size:14px; font-weight:600; color:#78350f;">
            ${escapeHtml(item.itemDescription)}
          </p>
          <p style="margin:4px 0 0 0; font-size:12px; color:#92400e;">
            📍 ${escapeHtml(item.areaName)}
          </p>
          ${item.comments ? `
          <p style="margin:6px 0 0 0; font-size:11px; color:#92400e; font-style:italic; padding:6px 10px; background:#fef9e7; border-radius:4px;">
            💬 ${escapeHtml(item.comments)}
          </p>
          ` : ''}
        </td>
        <td style="padding:12px 16px; border-bottom:1px solid #fef3c7; text-align:center; width:80px;">
          <div style="display:inline-block; padding:6px 12px; background:#d97706; border-radius:6px;">
            <p style="margin:0; font-size:14px; font-weight:700; color:#ffffff;">${item.score}/10</p>
          </div>
        </td>
      </tr>
    `
    )
    .join('')

  const html = `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin:0; padding:0; background-color:#f8fafc;">
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background:#f8fafc; padding:32px 16px;">
      
      <!-- Main Card -->
      <div style="max-width:650px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 6px rgba(0,0,0,0.1);">
        
        <!-- Header with Logo -->
        <div style="background:linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding:28px 32px; text-align:center;">
          <div style="margin-bottom:12px;">
            <img src="https://systemach-sas.com/logo_ziii/ZIII%20logo.png" alt="ZIII HoS" style="height:40px; width:auto;" />
          </div>
          <div style="font-size:32px; margin-bottom:8px;">⚠️</div>
          <h1 style="margin:0; font-size:20px; font-weight:700; color:#ffffff; letter-spacing:-0.5px;">
            Alerta de Inspección Crítica
          </h1>
          <p style="margin:8px 0 0 0; font-size:13px; color:#94a3b8;">
            ${department} · ${locationCode}
          </p>
        </div>

        <!-- Alert Banner -->
        <div style="background:#fef3c7; border-left:4px solid #f59e0b; padding:16px 32px;">
          <p style="margin:0; font-size:15px; color:#78350f; font-weight:600;">
            🚨 ${criticalItems.length} ${criticalItems.length === 1 ? 'ítem detectado' : 'ítems detectados'} con calificación inferior a ${threshold}/10
          </p>
        </div>

        <!-- Content -->
        <div style="padding:32px;">
          
          <!-- Inspection Info -->
          <div style="margin-bottom:24px; padding:20px; background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0;">
            <h3 style="margin:0 0 16px 0; font-size:14px; font-weight:700; color:#475569; text-transform:uppercase; letter-spacing:0.5px;">
              📋 Información de la Inspección
            </h3>
            <table style="width:100%; border-collapse:collapse;">
              <tr>
                <td style="padding:8px 0; font-size:13px; color:#64748b; width:140px;">
                  <strong style="color:#334155;">Sede:</strong>
                </td>
                <td style="padding:8px 0; font-size:13px; color:#1e293b;">
                  ${escapeHtml(locationName)} (${escapeHtml(locationCode)})
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0; font-size:13px; color:#64748b;">
                  <strong style="color:#334155;">Inspector:</strong>
                </td>
                <td style="padding:8px 0; font-size:13px; color:#1e293b;">
                  ${escapeHtml(inspectorName)}
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0; font-size:13px; color:#64748b;">
                  <strong style="color:#334155;">Fecha:</strong>
                </td>
                <td style="padding:8px 0; font-size:13px; color:#1e293b;">
                  ${escapeHtml(inspectionDate)}
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0; font-size:13px; color:#64748b;">
                  <strong style="color:#334155;">Promedio General:</strong>
                </td>
                <td style="padding:8px 0; font-size:13px; color:#1e293b;">
                  <span style="display:inline-block; padding:4px 10px; background:${averageScore >= threshold ? '#dcfce7' : '#fee2e2'}; color:${averageScore >= threshold ? '#166534' : '#991b1b'}; border-radius:4px; font-weight:600;">
                    ${averageScore.toFixed(1)}/10
                  </span>
                </td>
              </tr>
            </table>
          </div>

          <!-- Critical Items Section -->
          <div style="margin-bottom:24px;">
            <h3 style="margin:0 0 16px 0; font-size:14px; font-weight:700; color:#475569; text-transform:uppercase; letter-spacing:0.5px;">
              🔍 Ítems que Requieren Atención${remainingCount > 0 ? ` (Mostrando ${maxItemsToShow} de ${criticalItems.length})` : ''}
            </h3>
            <table style="width:100%; border-collapse:collapse; background:#fffbeb; border-radius:8px; overflow:hidden; border:1px solid #fef3c7;">
              ${criticalItemsHtml}
            </table>
            ${remainingCount > 0 ? `
            <p style="margin:12px 0 0 0; font-size:12px; color:#78350f; font-weight:600; padding:12px; background:#fef3c7; border-radius:6px; text-align:center;">
              ⚠️ Hay ${remainingCount} ítem${remainingCount === 1 ? '' : 's'} crítico${remainingCount === 1 ? '' : 's'} adicional${remainingCount === 1 ? '' : 'es'}. Revise el reporte completo.
            </p>
            ` : ''}
          </div>

          <!-- CTA Button -->
          <div style="text-align:center; margin-bottom:24px;">
            <a href="${escapeAttr(inspectionUrl)}"
               style="display:inline-block; background:#0f172a; color:#ffffff; text-decoration:none; padding:14px 36px; border-radius:8px; font-size:15px; font-weight:600; box-shadow:0 2px 4px rgba(0,0,0,0.1);">
              Ver Reporte Completo →
            </a>
          </div>

          <!-- Note -->
          <div style="padding:16px; background:#f1f5f9; border-radius:6px; border-left:3px solid #64748b;">
            <p style="margin:0; font-size:12px; color:#475569; line-height:1.6;">
              <strong>Nota:</strong> Esta alerta se genera automáticamente cuando se detectan ítems con calificación inferior al umbral establecido. Se recomienda revisar y tomar acciones correctivas a la brevedad.
            </p>
          </div>

        </div>

        <!-- Footer -->
        <div style="padding:20px 32px; background:#f8fafc; border-top:1px solid #e2e8f0; text-align:center;">
          <p style="margin:0 0 4px 0; font-size:12px; color:#64748b; font-weight:600;">
            ZIII Helpdesk · Sistema de Inspecciones
          </p>
          <p style="margin:0; font-size:11px; color:#94a3b8;">
            Este es un correo automático, por favor no responder directamente.
          </p>
        </div>

      </div>
    </div>
  </body>
  </html>
  `

  return { subject, html, text }
}

