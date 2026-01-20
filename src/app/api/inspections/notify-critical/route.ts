import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { sendMail } from '@/lib/email/mailer'
import { criticalInspectionAlertTemplate } from '@/lib/email/templates'

const CRITICAL_THRESHOLD = 8 // Umbral crítico: calificaciones menores a 8

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

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

    console.log('[notify-critical] Procesando inspección:', inspectionId)

    // 1. Obtener datos de la inspección
    const { data: inspection, error: inspectionError } = await supabase
      .from('inspections_rrhh')
      .select('location_id, property_code, property_name, inspection_date, inspector_name, department, average_score, status')
      .eq('id', inspectionId)
      .single()

    if (inspectionError || !inspection) {
      console.error('[notify-critical] Error obteniendo inspección:', inspectionError)
      return NextResponse.json({ error: 'Inspección no encontrada' }, { status: 404 })
    }

    // Solo procesar si está completada
    if (inspection.status !== 'completed') {
      return NextResponse.json({ message: 'Inspección no completada, no se envían alertas' }, { status: 200 })
    }

    // 2. Obtener todas las áreas e ítems de la inspección
    const { data: areas, error: areasError } = await supabase
      .from('inspections_rrhh_areas')
      .select('id, area_name, area_order')
      .eq('inspection_id', inspectionId)
      .order('area_order')

    if (areasError || !areas) {
      console.error('[notify-critical] Error obteniendo áreas:', areasError)
      return NextResponse.json({ error: 'Error obteniendo áreas' }, { status: 500 })
    }

    // 3. Obtener todos los ítems de todas las áreas
    const areaIds = areas.map(a => a.id)
    if (areaIds.length === 0) {
      return NextResponse.json({ message: 'No hay áreas para verificar' }, { status: 200 })
    }

    const { data: items, error: itemsError } = await supabase
      .from('inspections_rrhh_items')
      .select('area_id, descripcion, calif_valor, comentarios_valor')
      .in('area_id', areaIds)
      .order('item_order')

    if (itemsError || !items) {
      console.error('[notify-critical] Error obteniendo ítems:', itemsError)
      return NextResponse.json({ error: 'Error obteniendo ítems' }, { status: 500 })
    }

    // 4. Filtrar ítems críticos (calificación < umbral)
    const criticalItems = items
      .filter(item => item.calif_valor < CRITICAL_THRESHOLD)
      .map(item => {
        const area = areas.find(a => a.id === item.area_id)
        return {
          areaName: area?.area_name || 'Área desconocida',
          itemDescription: item.descripcion,
          score: item.calif_valor,
          comments: item.comentarios_valor || ''
        }
      })

    // Si no hay ítems críticos, no enviar notificación
    if (criticalItems.length === 0) {
      console.log('[notify-critical] No hay ítems críticos, no se enviarán notificaciones')
      return NextResponse.json({ message: 'No hay ítems críticos' }, { status: 200 })
    }

    console.log(`[notify-critical] Se encontraron ${criticalItems.length} ítems críticos`)

    // 5. Obtener todos los administradores del sistema
    const { data: admins, error: adminsError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'admin')
      .eq('is_active', true)

    if (adminsError || !admins || admins.length === 0) {
      console.error('[notify-critical] Error obteniendo administradores:', adminsError)
      return NextResponse.json({ error: 'No se encontraron administradores' }, { status: 500 })
    }

    console.log(`[notify-critical] Enviando notificaciones a ${admins.length} administradores`)

    // 6. Preparar URL de la inspección
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const inspectionUrl = `${baseUrl}/inspections/rrhh/${inspectionId}`

    // 7. Generar template de email
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

    // 8. Enviar correos a todos los admins
    const emailPromises = admins
      .filter(admin => admin.email)
      .map(admin =>
        sendMail({
          to: admin.email!,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          text: emailTemplate.text
        }).catch(err => {
          console.error(`[notify-critical] Error enviando email a ${admin.email}:`, err)
        })
      )

    await Promise.all(emailPromises)
    console.log(`[notify-critical] ✓ Correos enviados exitosamente`)

    // 9. Crear notificaciones push para admins
    const notifications = admins.map(admin => ({
      user_id: admin.id,
      type: 'inspection_critical' as const,
      title: `🚨 Inspección crítica en ${inspection.property_code}`,
      message: `Se detectaron ${criticalItems.length} ${criticalItems.length === 1 ? 'ítem crítico' : 'ítems críticos'} (< ${CRITICAL_THRESHOLD}/10) en la inspección de ${inspection.department}. Requiere revisión inmediata.`,
      link: `/inspections/rrhh/${inspectionId}`,
      is_read: false
    }))

    const { error: notifError } = await supabase
      .from('notifications')
      .insert(notifications)

    if (notifError) {
      console.error('[notify-critical] Error creando notificaciones push:', notifError)
    } else {
      console.log(`[notify-critical] ✓ ${notifications.length} notificaciones push creadas`)
    }

    console.log('[notify-critical] Proceso completado exitosamente')
    
    return NextResponse.json({
      success: true,
      criticalItemsCount: criticalItems.length,
      adminsNotified: admins.length
    })
  } catch (error: any) {
    console.error('[notify-critical] Error general:', error)
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
  }
}
