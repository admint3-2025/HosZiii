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
  if (asset?.asset_type) {
    assetInfoRows.push(`<tr><td style="padding: 6px 0; color: #6b7280; width: 140px;">Tipo:</td><td style="padding: 6px 0; font-weight: 500;">${asset.asset_type.replace(/_/g, ' ')}</td></tr>`)
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
    
    const headerColor = isAdmin ? '#dc2626' : '#f59e0b'
    
    const actionButton = isAdmin ? `
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${disposalPageUrl}" 
           style="display: inline-block; background: #dc2626; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
          📋 Revisar y Autorizar
        </a>
        <p style="margin: 12px 0 0; font-size: 12px; color: #6b7280;">
          Haga clic para aprobar o rechazar esta solicitud
        </p>
      </div>
    ` : ''
    
    const footerButton = isAdmin ? `
      <div style="text-align: center; margin-top: 24px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <a href="${disposalPageUrl}" 
           style="display: inline-block; background: #1f2937; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 14px;">
          Ir al Panel de Autorizaciones →
        </a>
      </div>
    ` : ''
    
    const footerText = isAdmin 
      ? 'Este correo se envió porque tiene permisos de autorización.'
      : 'Este correo es solo informativo. No requiere acción de su parte.'
    
    const infoNote = !isAdmin ? `
      <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
        <p style="margin: 0; color: #92400e; font-size: 13px;">
          <strong>ℹ️ Nota:</strong> Esta es una notificación informativa. Un administrador revisará y autorizará esta solicitud.
        </p>
      </div>
    ` : ''
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f3f4f6; padding: 20px; margin: 0;">
        <div style="max-width: 640px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <div style="background: ${headerColor}; padding: 24px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 22px; color: white; font-weight: 600;">⚠️ Solicitud de Baja de Activo</h1>
            <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">${headerSubtitle}</p>
          </div>
          
          <div style="padding: 24px 20px;">
            ${actionButton}
            ${infoNote}
            
            <!-- Motivo -->
            <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
              <p style="margin: 0 0 8px; color: #991b1b; font-weight: 600; font-size: 14px;">📝 Motivo de la solicitud:</p>
              <p style="margin: 0; color: #7f1d1d; line-height: 1.5;">"${reason}"</p>
            </div>
            
            <!-- Info básica del activo -->
            <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <h3 style="margin: 0 0 12px; color: #374151; font-size: 15px;">📦 Activo: ${assetTag}</h3>
              <table style="width: 100%; font-size: 14px;">
                ${assetInfoHtml}
              </table>
            </div>
            
            <!-- Solicitante -->
            <div style="margin-bottom: 24px; padding: 12px; background: #eff6ff; border-radius: 8px;">
              <p style="margin: 0; font-size: 13px; color: #1e40af;">
                <strong>Solicitado por:</strong> ${requester?.full_name || 'Usuario'} (${user?.email || ''})<br>
                <span style="color: #6b7280;">
                  ${new Date().toLocaleString('es-ES', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
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
          <div style="background: #f3f4f6; padding: 16px 20px; text-align: center; font-size: 12px; color: #6b7280;">
            <p style="margin: 0;">ZIII Helpdesk - Sistema de Gestión de Activos</p>
            <p style="margin: 4px 0 0; font-size: 11px;">${footerText}</p>
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
      <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f9fafb; padding: 20px;">
        <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="background: #16a34a; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 20px; color: white;">✅ Baja de Activo Aprobada</h1>
          </div>
          <div style="padding: 24px;">
            <p style="margin: 0 0 16px; text-align: center; font-size: 15px;">La solicitud de baja ha sido <strong style="color: #16a34a;">APROBADA</strong>.</p>
            
            <table style="width: 100%;">
              <tr>
                <td style="padding: 8px 0; font-weight: 600;">Activo:</td>
                <td style="padding: 8px 0; font-family: monospace;">${assetTag}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600;">Aprobado por:</td>
                <td style="padding: 8px 0;">${approver?.full_name || 'Admin'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600;">Fecha:</td>
                <td style="padding: 8px 0;">${new Date().toLocaleString('es-ES')}</td>
              </tr>
              ${notes ? `
              <tr>
                <td style="padding: 8px 0; font-weight: 600;">Notas:</td>
                <td style="padding: 8px 0;">${notes}</td>
              </tr>
              ` : ''}
            </table>
            
            <div style="margin-top: 20px; padding: 12px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px;">
              <p style="margin: 0; color: #166534; font-size: 13px;">
                El activo ha sido dado de baja del sistema. El historial completo permanece disponible para auditoría.
              </p>
            </div>
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
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f9fafb; padding: 20px;">
          <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="background: #dc2626; padding: 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 20px; color: white;">❌ Solicitud de Baja Rechazada</h1>
            </div>
            <div style="padding: 24px;">
              <p style="margin: 0 0 16px; text-align: center; font-size: 15px;">Tu solicitud de baja ha sido <strong style="color: #dc2626;">RECHAZADA</strong>.</p>
              
              <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                <table style="width: 100%; font-size: 14px;">
                  <tr>
                    <td style="padding: 6px 0; color: #6b7280; width: 130px;">Activo:</td>
                    <td style="padding: 6px 0; font-family: monospace; font-weight: 500;">${assetTag}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #6b7280;">Rechazado por:</td>
                    <td style="padding: 6px 0; font-weight: 500;">${rejector?.full_name || 'Admin'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #6b7280;">Fecha:</td>
                    <td style="padding: 6px 0;">${new Date().toLocaleString('es-ES')}</td>
                  </tr>
                </table>
              </div>
              
              <div style="padding: 16px; background: #fef2f2; border-left: 4px solid #dc2626; border-radius: 0 8px 8px 0;">
                <p style="margin: 0 0 8px; color: #991b1b; font-weight: 600;">Motivo del rechazo:</p>
                <p style="margin: 0; color: #7f1d1d; line-height: 1.5;">${notes}</p>
              </div>
            </div>
            <div style="background: #f3f4f6; padding: 16px; text-align: center; font-size: 12px; color: #6b7280;">
              <p style="margin: 0;">ZIII Helpdesk - Sistema de Gestión de Activos</p>
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
