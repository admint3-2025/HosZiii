import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { sendMail } from '@/lib/email/mailer'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { 
      assetId, 
      assetTag, 
      fromLocationId, 
      toLocationId, 
      reason,
      notifyUserIds = [],
      additionalEmails = ''
    } = body

    console.log('📧 Iniciando notificación de cambio de sede:', {
      assetId,
      assetTag,
      fromLocationId,
      toLocationId,
      notifyUserIds,
      additionalEmails
    })

    const supabase = await createSupabaseServerClient()

    // Obtener información de las sedes
    const { data: locations } = await supabase
      .from('locations')
      .select('id, name, code')
      .in('id', [fromLocationId, toLocationId].filter(Boolean))

    console.log('📍 Sedes encontradas:', locations)

    const fromLocation = locations?.find(l => l.id === fromLocationId)
    const toLocation = locations?.find(l => l.id === toLocationId)

    // Obtener usuario que realizó el cambio
    const { data: { user } } = await supabase.auth.getUser()
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user?.id)
      .single()

    console.log('👤 Usuario que realizó el cambio:', userProfile)

    // Consolidar destinatarios
    const allRecipients = new Map()

    // Obtener correos de usuarios seleccionados usando la RPC centralizada
    if (notifyUserIds.length > 0) {
      const { data: notifiableUsers, error: notifiableError } = await supabase
        .rpc('get_notifiable_users_with_locations')

      if (notifiableError) {
        console.error('Error RPC get_notifiable_users_with_locations en notify:', notifiableError)
      } else {
        const idSet = new Set((notifyUserIds || []).map((id: string) => id))

        for (const u of notifiableUsers || []) {
          if (idSet.has(u.user_id)) {
            if (u.email) {
              allRecipients.set(u.email, {
                email: u.email,
                full_name: u.full_name || u.email,
              })
              console.log('  ✉️', u.full_name || u.email, '<' + u.email + '>')
            }
          }
        }

        console.log('👥 Usuarios procesados:', allRecipients.size)
      }
    }

    // Agregar correos adicionales
    if (additionalEmails.trim()) {
      const extraEmails = additionalEmails.split(',').map((e: string) => e.trim()).filter(Boolean)
      console.log('📧 Correos adicionales:', extraEmails.length)
      extraEmails.forEach((email: string) => {
        allRecipients.set(email, { email, full_name: email })
        console.log('  ✉️', email)
      })
    }

    console.log('📧 Total de destinatarios únicos:', allRecipients.size)

    if (allRecipients.size === 0) {
      console.log('⚠️ No hay destinatarios para notificar')
      return NextResponse.json({ 
        success: true, 
        message: 'No se seleccionaron destinatarios',
        recipientCount: 0,
        successCount: 0
      })
    }

    // Preparar contenido del correo
    const subject = `🔄 Cambio de Sede - Activo ${assetTag}`
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
          .info-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .detail-row { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-label { font-weight: bold; color: #6b7280; font-size: 14px; }
          .detail-value { color: #111827; margin-top: 5px; }
          .reason-box { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">⚠️ Cambio de Sede de Activo</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Registro de auditoría</p>
          </div>
          
          <div class="content">
            <div class="info-box">
              <strong>⚠️ Notificación Importante</strong><br>
              Se ha registrado un cambio de sede para el siguiente activo. Este cambio ha sido documentado en el sistema de auditoría.
            </div>

            <div class="detail-row">
              <div class="detail-label">ACTIVO</div>
              <div class="detail-value"><strong>${assetTag}</strong></div>
            </div>

            <div class="detail-row">
              <div class="detail-label">SEDE ORIGEN</div>
              <div class="detail-value">${fromLocation ? `${fromLocation.code} - ${fromLocation.name}` : 'Sin sede asignada'}</div>
            </div>

            <div class="detail-row">
              <div class="detail-label">SEDE DESTINO</div>
              <div class="detail-value"><strong>${toLocation?.code} - ${toLocation?.name}</strong></div>
            </div>

            <div class="detail-row">
              <div class="detail-label">REALIZADO POR</div>
              <div class="detail-value">${userProfile?.full_name || user?.email || 'Usuario desconocido'}</div>
            </div>

            <div class="detail-row">
              <div class="detail-label">FECHA Y HORA</div>
              <div class="detail-value">${new Date().toLocaleString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'America/Mexico_City'
              })}</div>
            </div>

            <div class="reason-box">
              <div class="detail-label">JUSTIFICACIÓN DEL CAMBIO</div>
              <div class="detail-value" style="margin-top: 10px; white-space: pre-wrap;">${reason}</div>
            </div>

            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              Puede revisar el detalle completo del activo y su historial de cambios en el sistema de gestión de activos.
            </p>
          </div>

          <div class="footer">
            <p>Este es un correo automático del Sistema de Helpdesk<br>
            No responda a este mensaje</p>
          </div>
        </div>
      </body>
      </html>
    `

    // Enviar correos a todos los destinatarios
    const emailPromises = Array.from(allRecipients.values()).map(async (recipient: any) => {
      try {
        await sendMail({
          to: recipient.email,
          subject,
          html: htmlContent
        })
        return { success: true, email: recipient.email }
      } catch (error) {
        console.error(`Error sending email to ${recipient.email}:`, error)
        return { success: false, email: recipient.email, error }
      }
    })

    const results = await Promise.allSettled(emailPromises)
    
    const successCount = results.filter(r => r.status === 'fulfilled').length
    const failureCount = results.length - successCount

    return NextResponse.json({
      success: true,
      message: `Notificaciones enviadas: ${successCount} exitosas, ${failureCount} fallidas`,
      recipientCount: allRecipients.size,
      successCount,
      failureCount
    })

  } catch (error) {
    console.error('Error in location-change-notify:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error al enviar notificaciones' 
      },
      { status: 500 }
    )
  }
}
