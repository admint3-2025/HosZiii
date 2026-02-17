import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { sendMail } from '@/lib/email/mailer'
import { criticalInspectionAlertTemplate } from '@/lib/email/templates'
import { sendTelegramNotification, TELEGRAM_TEMPLATES } from '@/lib/telegram'

export const runtime = 'nodejs'

const CRITICAL_THRESHOLD = 8 // Umbral crítico: calificaciones menores a 8

type InspectionType = 'rrhh' | 'gsh' | 'ama' | 'cocina' | 'housekeeping'

// Tipo para el resultado del RPC get_admin_emails
type AdminEmail = {
  id: string
  full_name: string
  email: string
  role: string
  is_corporate?: boolean
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
    const inspectionType = (body?.inspectionType as string)?.toLowerCase() || 'rrhh'

    if (!inspectionId) {
      return NextResponse.json({ error: 'inspectionId requerido' }, { status: 400 })
    }

    console.log(`[complete-and-notify] 🟢 Procesando inspección ${inspectionType.toUpperCase()}:`, inspectionId)

    // 1. PRIMERO: Actualizar el status a 'completed' en la BD
    console.log('[complete-and-notify] 📝 Actualizando status a completed...')
    const tableName = `inspections_${inspectionType}`
    const { error: updateError } = await supabase
      .from(tableName)
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
      .from(tableName)
      .select('location_id, property_code, property_name, inspection_date, inspector_name, department, average_score, status')
      .eq('id', inspectionId)
      .single()

    if (inspectionError || !inspection) {
      console.error('[complete-and-notify] ❌ Error obteniendo inspección:', inspectionError)
      return NextResponse.json({ error: 'Inspección no encontrada' }, { status: 404 })
    }

    console.log('[complete-and-notify] 📊 Inspección obtenida, status:', inspection.status)

    // 3. Obtener todas las áreas e ítems de la inspección
    const areasTableName = `inspections_${inspectionType}_areas`
    const { data: areas, error: areasError } = await supabase
      .from(areasTableName)
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

    const itemsTableName = `inspections_${inspectionType}_items`
    const { data: items, error: itemsError } = await supabase
      .from(itemsTableName)
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
    
    // Query directa en vez de RPC para incluir allowed_departments en el filtro
    const { data: allProfiles, error: adminsError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, role, is_corporate, allowed_departments')
      .or('role.eq.admin,is_corporate.eq.true')

    if (adminsError) {
      console.error('[complete-and-notify] ⚠️ Error obteniendo administradores:', adminsError)
      return NextResponse.json({ 
        success: true,
        message: 'Inspección completada pero hubo error al obtener administradores',
        criticalItemsCount: criticalItems.length,
        adminsNotified: 0
      }, { status: 200 })
    }

    // Filtrar por departamento de la inspección: solo notificar a quienes tienen acceso
    const inspDept = (inspection.department || '').toUpperCase().trim()
    const admins = ((allProfiles || []) as (AdminEmail & { allowed_departments?: string[] | null })[])
      .filter(a => a.role === 'admin' || a.is_corporate)
      .filter(a => {
        // Admins sin restricción de departamentos reciben todo
        if (a.role === 'admin' && (!a.allowed_departments || a.allowed_departments.length === 0)) return true
        // Corporativos sin allowed_departments = acceso a todos
        if (!a.allowed_departments || a.allowed_departments.length === 0) return true
        // Si tiene allowed_departments, filtrar por el departamento de la inspección
        if (!inspDept) return true // Sin departamento en inspección = no filtrar
        return a.allowed_departments.some(
          (d: string) => d.toUpperCase().trim() === inspDept
        )
      })

    // Correos y notificaciones SOLO para los admin/corporativo filtrados por departamento
    const emailRecipients = [...admins]

    // Destinatarios de push: mismos destinatarios filtrados
    const pushRecipients = [...admins]

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

    // 7. Preparar URL de la inspección (dinámica según tipo)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const inspectionUrl = `${baseUrl}/inspections/${inspectionType}/${inspectionId}`

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

    // 10. Crear notificaciones push para admins (dinámicas según tipo)
    console.log('[complete-and-notify] 📬 Creando notificaciones push...')
    console.log('[complete-and-notify] Destinatarios push:', pushRecipients.map(a => ({ id: a.id, role: a.role, email: a.email })))
    
    const departmentLabel = inspection.department || inspectionType.toUpperCase()
    const notifications = pushRecipients.map(admin => ({
      user_id: admin.id,
      type: 'inspection_critical' as const,
      title: `🚨 Inspección crítica en ${inspection.property_code}`,
      message: `Se detectaron ${criticalItems.length} ítems con calificación menor a ${CRITICAL_THRESHOLD}/10 en la inspección de ${departmentLabel}. Sede: ${inspection.property_name}`,
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

    // 11. Enviar notificaciones a Telegram (solo a usuarios vinculados)
    console.log('[complete-and-notify] 📱 Enviando notificaciones Telegram...')

    const telegramBaseTemplate = TELEGRAM_TEMPLATES.inspection_critical({
      department: inspection.department,
      propertyCode: inspection.property_code,
      propertyName: inspection.property_name,
      criticalCount: criticalItems.length,
      threshold: CRITICAL_THRESHOLD,
    })

    const telegramTemplate = {
      ...telegramBaseTemplate,
      message: `${telegramBaseTemplate.message}\n\n<b>Ver inspección:</b> ${inspectionUrl}`,
    }

    const telegramResults = await Promise.allSettled(
      pushRecipients.map(async admin => {
        const sent = await sendTelegramNotification(admin.id, telegramTemplate)
        return { userId: admin.id, sent }
      })
    )

    const telegramSent = telegramResults.filter(
      r => r.status === 'fulfilled' && r.value.sent
    ).length
    const telegramFailed = telegramResults.length - telegramSent

    console.log(
      `[complete-and-notify] 📱 Telegram: ${telegramSent} enviados, ${telegramFailed} no enviados (no vinculado o error)`
    )

    // Retornar éxito
    return NextResponse.json({
      success: true,
      message: 'Inspección completada y notificaciones enviadas',
      criticalItemsCount: criticalItems.length,
      adminsNotified: pushRecipients.length,
      emailsSentToAdmins: emailRecipients.length,
      telegramSent,
    }, { status: 200 })

  } catch (error: any) {
    console.error('[complete-and-notify] ❌ Error general:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error.message
    }, { status: 500 })
  }
}
