'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { sendMail, getSmtpConfig } from '@/lib/email/mailer'
import { revalidatePath } from 'next/cache'

// URL base del sistema - usar variable de entorno o detectar
const getBaseUrl = () => {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'http://localhost:3000'
}

// Etiquetas legibles para campos
const fieldLabels: Record<string, string> = {
  asset_tag: 'Etiqueta',
  asset_type: 'Tipo',
  brand: 'Marca',
  model: 'Modelo',
  serial_number: 'Número de Serie',
  status: 'Estado',
  assigned_to: 'Asignado a',
  location_id: 'Sede',
  notes: 'Notas',
  purchase_date: 'Fecha de Compra',
  warranty_expires: 'Garantía Expira',
  image_url: 'Imagen',
  created: 'Creación'
}

// Formatear valores de campos (ocultar UUIDs y URLs)
function formatFieldValue(fieldName: string, value: string | null, userName?: string): string {
  if (!value || value === 'null') return '(vacío)'
  
  // Si hay nombre de usuario disponible, usarlo
  if (userName && fieldName === 'assigned_to') return userName
  
  // Si parece un UUID
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    return '(usuario)'
  }
  
  // Si es una URL de imagen
  if (fieldName === 'image_url' && value.startsWith('http')) {
    return '(imagen actualizada)'
  }
  
  return value
}

// Etiquetas de prioridad
const priorityLabels: Record<string, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  critical: 'Crítica'
}

// Etiquetas de estado de tickets
const ticketStatusLabels: Record<string, string> = {
  new: 'Nuevo',
  open: 'Abierto',
  in_progress: 'En Progreso',
  pending: 'Pendiente',
  resolved: 'Resuelto',
  closed: 'Cerrado'
}

// Obtener usuarios para notificar (responsable, supervisores, admins)
async function getNotificationRecipients(assetId: string, requesterId: string) {
  const supabaseAdmin = createSupabaseAdminClient()
  
  // Obtener activo con responsable
  const { data: asset } = await supabaseAdmin
    .from('assets')
    .select('assigned_to, location_id, asset_tag')
    .eq('id', assetId)
    .single()
  
  const recipients: { id: string; email: string; name: string; role: string }[] = []
  const addedEmails = new Set<string>()
  
  // Obtener admins
  const { data: admins, error: adminsError } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'admin')
  
  console.log('[getNotificationRecipients] Admins encontrados:', admins?.length, 'Error:', adminsError)
  
  for (const admin of admins || []) {
    try {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(admin.id)
      const email = userData?.user?.email
      console.log(`[getNotificationRecipients] Admin ${admin.full_name}: email=${email}`)
      if (email && !addedEmails.has(email)) {
        recipients.push({ id: admin.id, email, name: admin.full_name || 'Admin', role: 'admin' })
        addedEmails.add(email)
      }
    } catch (err) {
      console.error(`[getNotificationRecipients] Error getting email for admin ${admin.id}:`, err)
    }
  }
  
  // Obtener supervisores de la misma sede
  if (asset?.location_id) {
    const { data: supervisors } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'supervisor')
    
    for (const sup of supervisors || []) {
      const { data: userLocs } = await supabaseAdmin
        .from('user_locations')
        .select('location_id')
        .eq('user_id', sup.id)
        .eq('location_id', asset.location_id)
      
      if (userLocs && userLocs.length > 0) {
        try {
          const { data: userData } = await supabaseAdmin.auth.admin.getUserById(sup.id)
          const email = userData?.user?.email
          if (email && !addedEmails.has(email)) {
            recipients.push({ id: sup.id, email, name: sup.full_name || 'Supervisor', role: 'supervisor' })
            addedEmails.add(email)
          }
        } catch (err) {
          console.error(`[getNotificationRecipients] Error getting email for supervisor ${sup.id}:`, err)
        }
      }
    }
  }
  
  // Obtener responsable del activo
  if (asset?.assigned_to && asset.assigned_to !== requesterId) {
    const { data: assigned } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', asset.assigned_to)
      .single()
    
    try {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(asset.assigned_to)
      const email = userData?.user?.email
      
      if (email && !addedEmails.has(email)) {
        recipients.push({ id: asset.assigned_to, email, name: assigned?.full_name || 'Responsable', role: 'responsable' })
        addedEmails.add(email)
      }
    } catch (err) {
      console.error(`[getNotificationRecipients] Error getting email for assigned user:`, err)
    }
  }
  
  console.log('[getNotificationRecipients] Total recipients:', recipients.length)
  return { recipients, assetTag: asset?.asset_tag }
}

// Crear notificaciones in-app para usuarios
async function createInAppNotifications(
  recipients: { id: string; email: string; name: string; role: string }[],
  title: string,
  message: string,
  actorId: string
) {
  const supabaseAdmin = createSupabaseAdminClient()
  
  // Solo notificar a admins (son quienes pueden autorizar)
  const adminRecipients = recipients.filter(r => r.role === 'admin')
  
  for (const recipient of adminRecipients) {
    try {
      // Insertar notificación usando un tipo genérico
      await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: recipient.id,
          type: 'TICKET_ESCALATED', // Reutilizamos tipo existente para urgencia
          title,
          message,
          actor_id: actorId,
          is_read: false
        })
      console.log(`[createInAppNotifications] Push notification created for ${recipient.name}`)
    } catch (err) {
      console.error(`[createInAppNotifications] Error creating notification for ${recipient.id}:`, err)
    }
  }
}

// Crear solicitud de baja
export async function createDisposalRequest(assetId: string, reason: string) {
  const supabase = await createSupabaseServerClient()
  const supabaseAdmin = createSupabaseAdminClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'No autenticado' }
  }
  
  // Crear solicitud via RPC
  const { data, error } = await supabase.rpc('create_disposal_request', {
    p_asset_id: assetId,
    p_reason: reason
  })
  
  if (error) {
    console.error('[createDisposalRequest] Error:', error)
    return { success: false, error: error.message }
  }
  
  const requestId = data as string
  
  // Obtener info del solicitante
  const { data: requester } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()
  
  // Obtener detalles del activo
  const { data: asset } = await supabaseAdmin
    .from('assets')
    .select(`
      asset_tag, asset_type, brand, model, serial_number,
      location, asset_location:locations(name, code),
      assigned_user:profiles!assets_assigned_to_fkey(full_name)
    `)
    .eq('id', assetId)
    .single()
  
  // Obtener tickets/incidencias relacionados con este activo
  const { data: tickets } = await supabaseAdmin
    .from('tickets')
    .select('id, ticket_number, title, status, priority, created_at, closed_at')
    .eq('asset_id', assetId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(10)
  
  // Obtener historial de cambios
  const { data: history } = await supabaseAdmin
    .from('asset_changes')
    .select('*')
    .eq('asset_id', assetId)
    .order('changed_at', { ascending: false })
    .limit(10)
  
  // Obtener destinatarios
  const { recipients, assetTag } = await getNotificationRecipients(assetId, user.id)
  
  const locationArr = asset?.asset_location as unknown as { name: string; code: string }[] | null
  const locationInfo = locationArr?.[0] || null
  const assignedArr = asset?.assigned_user as unknown as { full_name: string }[] | null
  const assignedUser = assignedArr?.[0] || null
  
  const baseUrl = getBaseUrl()
  const disposalPageUrl = `${baseUrl}/admin/assets/disposals`
  
  // Crear notificaciones push in-app para admins
  await createInAppNotifications(
    recipients,
    `⚠️ Solicitud de Baja: ${assetTag}`,
    `${requester?.full_name || 'Usuario'} solicita dar de baja el activo ${assetTag}. Motivo: "${reason.substring(0, 100)}..."`,
    user.id
  )
  
  // Construir HTML del historial de incidencias
  const ticketsHtml = tickets?.length ? `
    <div style="margin-bottom: 24px;">
      <h3 style="color: #374151; margin-bottom: 12px; font-size: 15px;">🎫 Historial de Incidencias (${tickets.length})</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="background: #fef2f2;">
            <th style="padding: 10px 8px; text-align: left; border: 1px solid #fecaca; color: #991b1b;">Ticket</th>
            <th style="padding: 10px 8px; text-align: left; border: 1px solid #fecaca; color: #991b1b;">Título</th>
            <th style="padding: 10px 8px; text-align: left; border: 1px solid #fecaca; color: #991b1b;">Prioridad</th>
            <th style="padding: 10px 8px; text-align: left; border: 1px solid #fecaca; color: #991b1b;">Estado</th>
            <th style="padding: 10px 8px; text-align: left; border: 1px solid #fecaca; color: #991b1b;">Fecha</th>
          </tr>
        </thead>
        <tbody>
          ${tickets.map(t => `
            <tr style="background: white;">
              <td style="padding: 8px; border: 1px solid #e5e7eb; font-family: monospace; font-weight: 600;">#${t.ticket_number}</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb; max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${t.title?.substring(0, 50) || ''}${(t.title?.length || 0) > 50 ? '...' : ''}</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">${priorityLabels[t.priority] || t.priority}</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">${ticketStatusLabels[t.status] || t.status}</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
                ${new Date(t.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : '<p style="color: #6b7280; font-style: italic; margin-bottom: 20px;">No hay incidencias registradas para este activo.</p>'
  
  // Construir HTML del historial de cambios
  const historyHtml = history?.length ? `
    <div style="margin-bottom: 20px;">
      <h3 style="color: #374151; margin-bottom: 12px; font-size: 15px;">📋 Historial de Cambios (${history.length})</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="padding: 10px 8px; text-align: left; border: 1px solid #e5e7eb;">Fecha</th>
            <th style="padding: 10px 8px; text-align: left; border: 1px solid #e5e7eb;">Campo</th>
            <th style="padding: 10px 8px; text-align: left; border: 1px solid #e5e7eb;">Cambio</th>
          </tr>
        </thead>
        <tbody>
          ${history.map(h => `
            <tr>
              <td style="padding: 8px; border: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
                ${new Date(h.changed_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
              </td>
              <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: 600;">${fieldLabels[h.field_name] || h.field_name}</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">
                <span style="color: #9ca3af;">${formatFieldValue(h.field_name, h.old_value)}</span>
                <span style="margin: 0 4px;">→</span>
                <span style="font-weight: 500;">${formatFieldValue(h.field_name, h.new_value, h.changed_by_name)}</span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : ''
  
  // Construir filas de info del activo (solo las que tienen valor)
  const assetInfoRows: string[] = []
  if ((asset as any)?.asset_type || (asset as any)?.category) {
    const typeValue = (asset as any).asset_type || (asset as any).category
    assetInfoRows.push(`<tr><td style="padding: 6px 0; color: #6b7280; width: 140px;">Tipo:</td><td style="padding: 6px 0; font-weight: 500;">${typeValue.replace(/_/g, ' ')}</td></tr>`)
  }
  if (asset?.brand || asset?.model) {
    assetInfoRows.push(`<tr><td style="padding: 6px 0; color: #6b7280;">Marca / Modelo:</td><td style="padding: 6px 0; font-weight: 500;">${[asset?.brand, asset?.model].filter(Boolean).join(' ')}</td></tr>`)
  }
  if (asset?.serial_number) {
    assetInfoRows.push(`<tr><td style="padding: 6px 0; color: #6b7280;">Serie:</td><td style="padding: 6px 0; font-family: monospace;">${asset.serial_number}</td></tr>`)
  }
  if (locationInfo?.name) {
    assetInfoRows.push(`<tr><td style="padding: 6px 0; color: #6b7280;">Sede:</td><td style="padding: 6px 0; font-weight: 500;">${locationInfo.name}</td></tr>`)
  }
  if (assignedUser?.full_name) {
    assetInfoRows.push(`<tr><td style="padding: 6px 0; color: #6b7280;">Responsable:</td><td style="padding: 6px 0; font-weight: 500;">${assignedUser.full_name}</td></tr>`)
  }
  const assetInfoHtml = assetInfoRows.length > 0 ? assetInfoRows.join('') : '<tr><td colspan="2" style="padding: 6px 0; color: #6b7280;">Sin información adicional</td></tr>'
  
  // Función para generar email según rol
  function generateEmailHtml(role: string): string {
    const isAdmin = role === 'admin'
    
    const headerSubtitle = isAdmin 
      ? 'Se requiere su autorización' 
      : 'Notificación informativa'
    
    const headerGradient = isAdmin 
      ? 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)' 
      : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
    
    const actionButton = isAdmin ? `
      <div style="text-align: center; margin: 28px 0;">
        <a href="${disposalPageUrl}" 
           style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 16px 40px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 15px; box-shadow: 0 4px 14px rgba(220, 38, 38, 0.4);">
          📋 Revisar y Autorizar
        </a>
        <p style="margin: 14px 0 0; font-size: 12px; color: #6b7280;">
          Haga clic para aprobar o rechazar esta solicitud
        </p>
      </div>
    ` : ''
    
    const footerButton = isAdmin ? `
      <div style="text-align: center; margin-top: 28px; padding-top: 24px; border-top: 2px solid #e5e7eb;">
        <a href="${disposalPageUrl}" 
           style="display: inline-block; background: linear-gradient(135deg, #1f2937 0%, #111827 100%); color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);">
          Ir al Panel de Autorizaciones →
        </a>
      </div>
    ` : ''
    
    const footerText = isAdmin 
      ? 'Este correo se envió porque tiene permisos de autorización.'
      : 'Este correo es solo informativo. No requiere acción de su parte.'
    
    const infoNote = !isAdmin ? `
      <div style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border-left: 4px solid #f59e0b; padding: 14px 18px; margin-bottom: 24px; border-radius: 0 10px 10px 0;">
        <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.5;">
          <strong>ℹ️ Nota:</strong> Esta es una notificación informativa. Un administrador revisará y autorizará esta solicitud.
        </p>
      </div>
    ` : ''
    
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f3f4f6;">
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f3f4f6; padding: 40px 20px;">
          
          <!-- Logo -->
          <div style="max-width: 640px; margin: 0 auto 24px auto; text-align: center;">
            <img src="https://integrational3.com.mx/logorigen/ZIII%20logo.png" alt="ZIII Helpdesk" width="180" height="100" style="display: block; margin: 0 auto; height: 100px; width: auto; max-width: 100%;" />
          </div>
          
          <!-- Main Card -->
          <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="background: ${headerGradient}; padding: 28px 24px;">
              <div style="background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); border-radius: 12px; padding: 16px; text-align: center; border: 1px solid rgba(255,255,255,0.2);">
                <div style="font-size: 40px; margin-bottom: 8px;">⚠️</div>
                <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff;">Solicitud de Baja de Activo</h1>
                <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 500;">${headerSubtitle}</p>
              </div>
            </div>
            
            <!-- Content -->
            <div style="padding: 32px 28px;">
              ${actionButton}
              ${infoNote}
              
              <!-- Motivo -->
              <div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-left: 4px solid #dc2626; padding: 18px 20px; margin-bottom: 24px; border-radius: 0 12px 12px 0;">
                <p style="margin: 0 0 10px; color: #991b1b; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">📝 Motivo de la solicitud</p>
                <p style="margin: 0; color: #7f1d1d; line-height: 1.6; font-size: 15px; font-style: italic;">"${reason}"</p>
              </div>
              
              <!-- Info básica del activo -->
              <div style="background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%); border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #e5e7eb;">
                <h3 style="margin: 0 0 16px; color: #1f2937; font-size: 16px; font-weight: 700; display: flex; align-items: center;">
                  <span style="background: #3b82f6; color: white; padding: 6px 12px; border-radius: 6px; font-size: 13px; margin-right: 10px;">📦</span>
                  Activo: ${assetTag}
                </h3>
                <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                  ${assetInfoHtml}
                </table>
              </div>
              
              <!-- Solicitante -->
              <div style="margin-bottom: 24px; padding: 16px 20px; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 12px; border: 1px solid #bfdbfe;">
                <p style="margin: 0; font-size: 13px; color: #1e40af; line-height: 1.6;">
                  <strong style="color: #1e3a8a;">👤 Solicitado por:</strong> ${requester?.full_name || 'Usuario'}<br>
                  <span style="color: #3b82f6; font-family: monospace; font-size: 12px;">${user?.email || ''}</span><br>
                  <span style="color: #6b7280; font-size: 12px;">
                    📅 ${new Date().toLocaleString('es-ES', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </p>
              </div>
              
              <!-- Historial de Incidencias -->
              ${ticketsHtml}
              
              <!-- Historial de Cambios -->
              ${historyHtml}
              
              ${footerButton}
            </div>
            
            <!-- Footer -->
            <div style="background: linear-gradient(135deg, #1f2937 0%, #111827 100%); padding: 20px 24px; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #e5e7eb; font-weight: 600;">ZIII Helpdesk</p>
              <p style="margin: 4px 0 0; font-size: 11px; color: #9ca3af;">Sistema de Gestión de Activos</p>
              <p style="margin: 8px 0 0; font-size: 10px; color: #6b7280;">${footerText}</p>
            </div>
          </div>
          
          <!-- Footer Link -->
          <div style="text-align: center; margin-top: 20px;">
            <p style="margin: 0; font-size: 11px; color: #9ca3af;">
              © ${new Date().getFullYear()} ZIII Helpdesk. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  }
  
  // Enviar emails según rol
  const smtpConfig = getSmtpConfig()
  if (smtpConfig) {
    for (const recipient of recipients) {
      try {
        const emailHtml = generateEmailHtml(recipient.role)
        const subject = recipient.role === 'admin'
          ? `🚨 Autorización Requerida: Baja de ${assetTag}`
          : `ℹ️ Notificación: Solicitud de Baja de ${assetTag}`
        
        await sendMail({
          to: recipient.email,
          subject,
          html: emailHtml,
          text: `Solicitud de baja de activo ${assetTag}\n\nMotivo: ${reason}\n\nSolicitado por: ${requester?.full_name}`
        })
        console.log(`[DisposalRequest] Email sent to ${recipient.role}: ${recipient.email}`)
      } catch (error) {
        console.error(`[DisposalRequest] Failed to send email to ${recipient.email}:`, error)
      }
    }
    
    // Marcar notificación como enviada
    await supabaseAdmin
      .from('asset_disposal_requests')
      .update({ notification_sent_at: new Date().toISOString() })
      .eq('id', requestId)
  }
  
  revalidatePath(`/admin/assets/${assetId}`)
  revalidatePath('/admin/assets')
  revalidatePath('/admin/assets/disposals')
  
  return { success: true, requestId }
}

// Aprobar solicitud de baja
export async function approveDisposalRequest(requestId: string, assetId: string, notes?: string) {
  const supabase = await createSupabaseServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'No autenticado' }
  }
  
  // Obtener solicitud antes de aprobar
  const { data: request } = await supabase
    .from('asset_disposal_requests')
    .select('*, asset:assets(asset_tag)')
    .eq('id', requestId)
    .single()
  
  if (!request) {
    return { success: false, error: 'Solicitud no encontrada' }
  }
  
  // Aprobar via RPC
  const { error } = await supabase.rpc('approve_disposal_request', {
    p_request_id: requestId,
    p_notes: notes || null
  })
  
  if (error) {
    console.error('[approveDisposalRequest] Error:', error)
    return { success: false, error: error.message }
  }
  
  // Enviar notificación de aprobación
  const smtpConfig = getSmtpConfig()
  if (smtpConfig) {
    const { recipients } = await getNotificationRecipients(assetId || request.asset_id, user.id)
    
    // Obtener info del aprobador
    const { data: approver } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()
    
    const assetTag = (request.asset as { asset_tag: string })?.asset_tag || request.asset_snapshot?.asset_tag
    const baseUrl = getBaseUrl()
    
    const emailHtml = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f3f4f6;">
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f3f4f6; padding: 40px 20px;">
          
          <!-- Logo -->
          <div style="max-width: 520px; margin: 0 auto 24px auto; text-align: center;">
            <img src="https://integrational3.com.mx/logorigen/ZIII%20logo.png" alt="ZIII Helpdesk" width="180" height="100" style="display: block; margin: 0 auto; height: 100px; width: auto; max-width: 100%;" />
          </div>
          
          <!-- Main Card -->
          <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 28px 24px;">
              <div style="background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); border-radius: 12px; padding: 16px; text-align: center; border: 1px solid rgba(255,255,255,0.2);">
                <div style="font-size: 48px; margin-bottom: 8px;">✅</div>
                <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff;">Baja de Activo Aprobada</h1>
              </div>
            </div>
            
            <!-- Content -->
            <div style="padding: 32px 28px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 16px; color: #374151;">
                  La solicitud de baja ha sido 
                  <span style="display: inline-block; background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 4px 12px; border-radius: 6px; font-weight: 700;">APROBADA</span>
                </p>
              </div>
              
              <!-- Info del activo -->
              <div style="background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%); border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #e5e7eb;">
                <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px 0; font-weight: 600; color: #6b7280; width: 140px;">📦 Activo:</td>
                    <td style="padding: 10px 0; font-family: monospace; font-weight: 700; color: #1f2937;">${assetTag}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; font-weight: 600; color: #6b7280;">👤 Aprobado por:</td>
                    <td style="padding: 10px 0; font-weight: 500; color: #1f2937;">${approver?.full_name || 'Admin'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; font-weight: 600; color: #6b7280;">📅 Fecha:</td>
                    <td style="padding: 10px 0; color: #1f2937;">${new Date().toLocaleString('es-ES')}</td>
                  </tr>
                  ${notes ? `
                  <tr>
                    <td style="padding: 10px 0; font-weight: 600; color: #6b7280;">📝 Notas:</td>
                    <td style="padding: 10px 0; color: #1f2937; font-style: italic;">${notes}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>
              
              <!-- Mensaje de confirmación -->
              <div style="padding: 18px 20px; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 1px solid #86efac; border-radius: 12px;">
                <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.6; text-align: center;">
                  <strong>✓</strong> El activo ha sido dado de baja del sistema.<br>
                  <span style="font-size: 12px; color: #15803d;">El historial completo permanece disponible para auditoría.</span>
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background: linear-gradient(135deg, #1f2937 0%, #111827 100%); padding: 20px 24px; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #e5e7eb; font-weight: 600;">ZIII Helpdesk</p>
              <p style="margin: 4px 0 0; font-size: 11px; color: #9ca3af;">Sistema de Gestión de Activos</p>
            </div>
          </div>
          
          <!-- Footer Link -->
          <div style="text-align: center; margin-top: 20px;">
            <p style="margin: 0; font-size: 11px; color: #9ca3af;">
              © ${new Date().getFullYear()} ZIII Helpdesk. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </body>
      </html>
    `
    
    for (const recipient of recipients) {
      try {
        await sendMail({
          to: recipient.email,
          subject: `✅ Baja Aprobada: ${assetTag}`,
          html: emailHtml
        })
      } catch (error) {
        console.error(`[approveDisposal] Failed to send email to ${recipient.email}:`, error)
      }
    }
  }
  
  revalidatePath('/admin/assets')
  revalidatePath('/admin/assets/disposals')
  revalidatePath(`/admin/assets/${request.asset_id}`)
  
  return { success: true }
}

// Rechazar solicitud de baja
export async function rejectDisposalRequest(requestId: string, notes: string) {
  const supabase = await createSupabaseServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'No autenticado' }
  }
  
  if (!notes || notes.trim() === '') {
    return { success: false, error: 'Debe proporcionar un motivo de rechazo' }
  }
  
  // Obtener solicitud
  const { data: request } = await supabase
    .from('asset_disposal_requests')
    .select('*, asset:assets(asset_tag)')
    .eq('id', requestId)
    .single()
  
  if (!request) {
    return { success: false, error: 'Solicitud no encontrada' }
  }
  
  // Rechazar via RPC
  const { error } = await supabase.rpc('reject_disposal_request', {
    p_request_id: requestId,
    p_notes: notes
  })
  
  if (error) {
    console.error('[rejectDisposalRequest] Error:', error)
    return { success: false, error: error.message }
  }
  
  // Enviar notificación de rechazo
  const smtpConfig = getSmtpConfig()
  if (smtpConfig) {
    const supabaseAdmin = createSupabaseAdminClient()
    
    // Obtener email del solicitante via admin API
    const { data: requesterData } = await supabaseAdmin.auth.admin.getUserById(request.requested_by)
    const requesterEmail = requesterData?.user?.email
    
    const { data: requester } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', request.requested_by)
      .single()
    
    const { data: rejector } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()
    
    const assetTag = (request.asset as { asset_tag: string })?.asset_tag || request.asset_snapshot?.asset_tag
    
    if (requesterEmail) {
      const emailHtml = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f3f4f6;">
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f3f4f6; padding: 40px 20px;">
            
            <!-- Logo -->
            <div style="max-width: 520px; margin: 0 auto 24px auto; text-align: center;">
              <img src="https://integrational3.com.mx/logorigen/ZIII%20logo.png" alt="ZIII Helpdesk" width="180" height="100" style="display: block; margin: 0 auto; height: 100px; width: auto; max-width: 100%;" />
            </div>
            
            <!-- Main Card -->
            <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 28px 24px;">
                <div style="background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); border-radius: 12px; padding: 16px; text-align: center; border: 1px solid rgba(255,255,255,0.2);">
                  <div style="font-size: 48px; margin-bottom: 8px;">❌</div>
                  <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff;">Solicitud de Baja Rechazada</h1>
                </div>
              </div>
              
              <!-- Content -->
              <div style="padding: 32px 28px;">
                <div style="text-align: center; margin-bottom: 24px;">
                  <p style="margin: 0; font-size: 16px; color: #374151;">
                    Tu solicitud de baja ha sido 
                    <span style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 4px 12px; border-radius: 6px; font-weight: 700;">RECHAZADA</span>
                  </p>
                </div>
                
                <!-- Info del activo -->
                <div style="background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%); border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #e5e7eb;">
                  <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 10px 0; font-weight: 600; color: #6b7280; width: 140px;">📦 Activo:</td>
                      <td style="padding: 10px 0; font-family: monospace; font-weight: 700; color: #1f2937;">${assetTag}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0; font-weight: 600; color: #6b7280;">👤 Rechazado por:</td>
                      <td style="padding: 10px 0; font-weight: 500; color: #1f2937;">${rejector?.full_name || 'Admin'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0; font-weight: 600; color: #6b7280;">📅 Fecha:</td>
                      <td style="padding: 10px 0; color: #1f2937;">${new Date().toLocaleString('es-ES')}</td>
                    </tr>
                  </table>
                </div>
                
                <!-- Motivo del rechazo -->
                <div style="padding: 18px 20px; background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-left: 4px solid #dc2626; border-radius: 0 12px 12px 0;">
                  <p style="margin: 0 0 10px; color: #991b1b; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">📝 Motivo del rechazo</p>
                  <p style="margin: 0; color: #7f1d1d; line-height: 1.6; font-size: 14px;">${notes}</p>
                </div>
              </div>
              
              <!-- Footer -->
              <div style="background: linear-gradient(135deg, #1f2937 0%, #111827 100%); padding: 20px 24px; text-align: center;">
                <p style="margin: 0; font-size: 13px; color: #e5e7eb; font-weight: 600;">ZIII Helpdesk</p>
                <p style="margin: 4px 0 0; font-size: 11px; color: #9ca3af;">Sistema de Gestión de Activos</p>
              </div>
            </div>
            
            <!-- Footer Link -->
            <div style="text-align: center; margin-top: 20px;">
              <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                © ${new Date().getFullYear()} ZIII Helpdesk. Todos los derechos reservados.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
      
      try {
        await sendMail({
          to: requesterEmail,
          subject: `❌ Baja Rechazada: ${assetTag}`,
          html: emailHtml
        })
        console.log(`[rejectDisposal] Email sent to requester: ${requesterEmail}`)
      } catch (error) {
        console.error(`[rejectDisposal] Failed to send email:`, error)
      }
    }
  }
  
  revalidatePath('/admin/assets')
  revalidatePath('/admin/assets/disposals')
  revalidatePath(`/admin/assets/${request.asset_id}`)
  
  return { success: true }
}

// Obtener solicitudes pendientes
export async function getPendingDisposalRequests() {
  const supabase = await createSupabaseServerClient()
  
  const { data, error } = await supabase
    .from('asset_disposal_requests')
    .select(`
      *,
      requester:profiles!asset_disposal_requests_requested_by_fkey(full_name, email),
      reviewer:profiles!asset_disposal_requests_reviewed_by_fkey(full_name),
      asset:assets(asset_tag, asset_type, brand, model, image_url)
    `)
    .eq('status', 'pending')
    .order('requested_at', { ascending: false })
  
  if (error) {
    console.error('[getPendingDisposalRequests] Error:', error)
    return []
  }
  
  return data || []
}

// Obtener solicitud pendiente para un activo
export async function getAssetPendingRequest(assetId: string) {
  const supabase = await createSupabaseServerClient()
  
  const { data } = await supabase
    .from('asset_disposal_requests')
    .select(`
      *,
      requester:profiles!asset_disposal_requests_requested_by_fkey(full_name, email)
    `)
    .eq('asset_id', assetId)
    .eq('status', 'pending')
    .maybeSingle()
  
  return data
}
