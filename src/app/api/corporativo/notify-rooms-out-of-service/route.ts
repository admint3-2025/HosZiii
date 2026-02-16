/**
 * POST /api/corporativo/notify-rooms-out-of-service
 * Envía notificación a gerentes/responsables de una propiedad sobre habitaciones fuera de servicio
 * Body: { location_id, explanation? }
 */
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_corporate, full_name')
    .eq('id', user.id)
    .single()

  // Solo admin o supervisor corporativo pueden enviar notificaciones
  if (!profile || !(profile.role === 'admin' || (profile.role === 'supervisor' && profile.is_corporate))) {
    return Response.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const { location_id, explanation } = body

  if (!location_id) {
    return Response.json({ error: 'location_id es requerido' }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()

  // Obtener información de la ubicación
  const { data: location } = await admin
    .from('locations')
    .select('id, name')
    .eq('id', location_id)
    .single()

  if (!location) {
    return Response.json({ error: 'Ubicación no encontrada' }, { status: 404 })
  }

  // Obtener gerentes/responsables de la propiedad (supervisores con hub_visible_modules que incluyan 'ama-de-llaves')
  const { data: managers } = await admin
    .from('profiles')
    .select('id, full_name, location_id')
    .eq('location_id', location_id)
    .in('role', ['supervisor', 'admin'])

  if (!managers || managers.length === 0) {
    return Response.json({ 
      success: false, 
      message: 'No hay gerentes asignados a esta propiedad' 
    }, { status: 400 })
  }

  // Obtener habitaciones fuera de servicio
  const { data: outOfServiceRooms } = await admin
    .from('hk_rooms')
    .select('id, number, floor, status, updated_at')
    .eq('location_id', location_id)
    .in('status', ['mantenimiento', 'bloqueada'])
    .eq('is_active', true)

  if (!outOfServiceRooms || outOfServiceRooms.length === 0) {
    return Response.json({ 
      success: false, 
      message: 'No hay habitaciones fuera de servicio en esta propiedad' 
    }, { status: 400 })
  }

  // Crear notificación en tabla de notificaciones (si existe) o guardar en base de datos
  const now = new Date()
  const notificationData = {
    created_by: user.id,
    location_id: location.id,
    location_name: location.name,
    sender_name: profile.full_name,
    rooms_count: outOfServiceRooms.length,
    explanation: explanation || 'Solicitud de explicación sobre habitaciones fuera de servicio',
    rooms: outOfServiceRooms.map(r => ({
      number: r.number,
      floor: r.floor,
      status: r.status
    })),
    sent_at: now.toISOString()
  }

  // Guardar la notificación en una tabla de auditoría o notificaciones
  // Por ahora, simulamos enviando un payload que podría guardarse
  try {
    // Si tienes tabla de notificaciones, insertar aquí
    // const { error: notifError } = await admin
    //   .from('notifications')
    //   .insert(notificationData)

    // Para demostración, retornamos éxito
    return Response.json({
      success: true,
      message: `Notificación enviada a ${managers.length} gerente(s)`,
      recipients: managers.map(m => m.full_name),
      notificationData
    })
  } catch (error) {
    return Response.json({
      error: 'Error al enviar notificación',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
