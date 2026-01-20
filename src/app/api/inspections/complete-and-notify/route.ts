import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { sendMail } from '@/lib/email/mailer'
import { criticalInspectionAlertTemplate } from '@/lib/email/templates'

const CRITICAL_THRESHOLD = 8 // Umbral crítico: calificaciones menores a 8

// Tipo para el resultado del RPC get_admin_emails
type AdminEmail = {
  id: string
  full_name: string
  email: string
  role: string
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const supabaseAdmin = createSupabaseAdminClient()

    // Verificar autenticación
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    const inspectionId = body?.inspectionId as string | undefined

    if (!inspectionId) {
      return NextResponse.json({ error: 'inspectionId requerido' }, { status: 400 })
    }

    console.log('[complete-and-notify] 🟢 Procesando inspección:', inspectionId)

    // 1. PRIMERO: Actualizar el status a 'completed' en la BD
    console.log('[complete-and-notify] 📝 Actualizando status a completed...')
    const { error: updateError } = await supabase
      .from('inspections_rrhh')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', inspectionId)

    if (updateError) {
      console.error('[complete-and-notify] ❌ Error actualizando status:', updateError)
      return NextResponse.json({ error: 'Error al completar inspección' }, { status: 500 })
    }

    console.log('[complete-and-notify] ✅ Status actualizado a completed')

    // 2. Obtener datos de la inspección (ahora sí con status='completed')
    const { data: inspection, error: inspectionError } = await supabase
      .from('inspections_rrhh')
      .select('location_id, property_code, property_name, inspection_date, inspector_name, department, average_score, status')
      .eq('id', inspectionId)
      .single()

    if (inspectionError || !inspection) {
      console.error('[complete-and-notify] ❌ Error obteniendo inspección:', inspectionError)
      return NextResponse.json({ error: 'Inspección no encontrada' }, { status: 404 })
    }

    console.log('[complete-and-notify] 📊 Inspección obtenida, status:', inspection.status)

    // 3. Obtener todas las áreas e ítems de la inspección
    const { data: areas, error: areasError } = await supabase
      .from('inspections_rrhh_areas')
      .select('id, area_name, area_order')
      .eq('inspection_id', inspectionId)
      .order('area_order')

    if (areasError || !areas) {
      console.error('[complete-and-notify] ❌ Error obteniendo áreas:', areasError)
      return NextResponse.json({ error: 'Error obteniendo áreas' }, { status: 500 })
    }

    console.log('[complete-and-notify] 📋 Áreas obtenidas:', areas.length)

    // 4. Obtener todos los ítems de todas las áreas
    const areaIds = areas.map(a => a.id)
    if (areaIds.length === 0) {
      return NextResponse.json({ 
        success: true,
        message: 'No hay áreas para verificar',
        criticalItemsCount: 0,
        adminsNotified: 0
      }, { status: 200 })
    }

    const { data: items, error: itemsError } = await supabase
      .from('inspections_rrhh_items')
      .select('area_id, descripcion, calif_valor, comentarios_valor')
      .in('area_id', areaIds)
      .order('item_order')

    if (itemsError || !items) {
      console.error('[complete-and-notify] ❌ Error obteniendo ítems:', itemsError)
      return NextResponse.json({ error: 'Error obteniendo ítems' }, { status: 500 })
    }

    console.log('[complete-and-notify] 📝 Items obtenidos:', items.length)

    // 5. Filtrar ítems críticos (calificación < umbral)
    // SOLO contar items que fueron evaluados (no NULL, no 0) Y están bajo el umbral
    const criticalItems = items
      .filter(item => 
        item.calif_valor != null && 
        item.calif_valor > 0 && 
        item.calif_valor < CRITICAL_THRESHOLD
      )
      .map(item => {
        const area = areas.find(a => a.id === item.area_id)
        return {
          areaName: area?.area_name || 'Área desconocida',
          itemDescription: item.descripcion,
          score: item.calif_valor,
          comments: item.comentarios_valor || ''
        }
      })

    console.log(`[complete-and-notify] 🚨 Ítems críticos encontrados: ${criticalItems.length}`)
    
    // Si no hay ítems críticos, retornar éxito sin enviar notificaciones
    if (criticalItems.length === 0) {
      console.log('[complete-and-notify] ✅ No hay ítems críticos, inspección completada sin alertas')
      return NextResponse.json({ 
        success: true,
        message: 'Inspección completada, no hay ítems críticos',
        criticalItemsCount: 0,
        adminsNotified: 0
      }, { status: 200 })
    }

    // 6. Obtener todos los administradores del sistema con sus emails usando RPC
    console.log('[complete-and-notify] 👥 Buscando administradores con emails...')
    
    const { data: adminsData, error: adminsError } = await supabaseAdmin
      .rpc('get_admin_emails')

    if (adminsError) {
      console.error('[complete-and-notify] ⚠️ Error obteniendo administradores:', adminsError)
      return NextResponse.json({ 
        success: true,
        message: 'Inspección completada pero hubo error al obtener administradores',
        criticalItemsCount: criticalItems.length,
        adminsNotified: 0
      }, { status: 200 })
    }

    const admins = (adminsData || []) as AdminEmail[]

    // Correos solo para admins (no corporate_admin)
    const emailRecipients = admins.filter(a => a.role === 'admin')

    // Destinatarios de push: SOLO admin
    const pushRecipients = admins.filter(a => a.role === 'admin')

    // Fallback para correos si no hay admins: usar usuario actual
    if (emailRecipients.length === 0 && user.email) {
      emailRecipients.push({
        id: user.id,
        full_name: (user.user_metadata as any)?.full_name || user.email,
        email: user.email,
        role: 'current_user'
      })
      console.log('[complete-and-notify] ⚠️ No se encontraron admins. Usando usuario actual como fallback para correo')
    }

    if (emailRecipients.length === 0 && pushRecipients.length === 0) {
      console.log('[complete-and-notify] ⚠️ No hay destinatarios para correo ni push')
      return NextResponse.json({ 
        success: true,
        message: 'Inspección completada pero no se encontraron destinatarios',
        criticalItemsCount: criticalItems.length,
        adminsNotified: 0
      }, { status: 200 })
    }

    console.log(`[complete-and-notify] 👥 Admins (correo) encontrados: ${emailRecipients.length}`)
    console.log(`[complete-and-notify] 👥 Admins/Corp (push) encontrados: ${pushRecipients.length}`)
    console.log(`[complete-and-notify] 📧 Emails: ${emailRecipients.map(a => a.email).join(', ')}`)

    // 7. Preparar URL de la inspección
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const inspectionUrl = `${baseUrl}/inspections/rrhh/${inspectionId}`

    // 8. Generar template de email
    const emailTemplate = criticalInspectionAlertTemplate({
      locationCode: inspection.property_code,
      locationName: inspection.property_name,
      inspectionDate: inspection.inspection_date,
      inspectorName: inspection.inspector_name,
      department: inspection.department,
      averageScore: inspection.average_score || 0,
      criticalItems,
      inspectionUrl,
      threshold: CRITICAL_THRESHOLD
    })

    // 9. Enviar correos a todos los admins
    console.log('[complete-and-notify] 📧 Enviando correos...')
    const emailPromises = emailRecipients
      .filter(admin => admin.email)
      .map(admin =>
        sendMail({
          to: admin.email!,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          text: emailTemplate.text
        }).catch(err => {
          console.error(`[complete-and-notify] ❌ Error enviando email a ${admin.email}:`, err)
        })
      )

    await Promise.all(emailPromises)
    console.log(`[complete-and-notify] ✅ Correos enviados`)

    // 10. Crear notificaciones push para admins
    console.log('[complete-and-notify] 📬 Creando notificaciones push...')
    console.log('[complete-and-notify] Destinatarios push:', pushRecipients.map(a => ({ id: a.id, role: a.role, email: a.email })))
    
    const notifications = pushRecipients.map(admin => ({
      user_id: admin.id,
      type: 'inspection_critical' as const,
      title: `🚨 Inspección crítica en ${inspection.property_code}`,
      message: `Se detectaron ${criticalItems.length} ítems con calificación menor a ${CRITICAL_THRESHOLD}/10 en la inspección de ${inspection.department}. Sede: ${inspection.property_name}`,
      is_read: false
    }))

    console.log('[complete-and-notify] Notificaciones a insertar:', JSON.stringify(notifications, null, 2))

    const { data: insertedData, error: notifError } = await supabaseAdmin
      .from('notifications')
      .insert(notifications)
      .select()

    if (notifError) {
      console.error('[complete-and-notify] ⚠️ Error creando notificaciones push:', notifError)
      console.error('[complete-and-notify] Detalles del error:', JSON.stringify(notifError, null, 2))
    } else {
      console.log(`[complete-and-notify] ✅ ${notifications.length} notificaciones push creadas`)
      console.log('[complete-and-notify] Notificaciones insertadas:', JSON.stringify(insertedData, null, 2))
    }

    // Retornar éxito
    return NextResponse.json({
      success: true,
      message: 'Inspección completada y notificaciones enviadas',
      criticalItemsCount: criticalItems.length,
      adminsNotified: pushRecipients.length,
      emailsSentToAdmins: emailRecipients.length
    }, { status: 200 })

  } catch (error: any) {
    console.error('[complete-and-notify] ❌ Error general:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error.message
    }, { status: 500 })
  }
}
