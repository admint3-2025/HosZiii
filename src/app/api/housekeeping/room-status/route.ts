/**
 * POST /api/housekeeping/room-status
 * Cambiar estado de una habitación (llama a la RPC hk_change_room_status)
 * Body: { room_id, new_status, notes? }
 */
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, location_id, is_corporate')
    .eq('id', user.id)
    .single()
  // Supervisores (corporativo o estándar) pueden cambiar estado; solo corporativo para gestión completa
  if (!profile || !['admin', 'supervisor'].includes(profile.role))
    return new Response('Solo admin o supervisor puede cambiar estado de habitaciones', { status: 403 })

  let body: any
  try {
    body = await request.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const { room_id, new_status, notes } = body || {}
  if (!room_id || !new_status) return new Response('room_id y new_status requeridos', { status: 400 })

  const validStatuses = ['limpia', 'sucia', 'en_limpieza', 'mantenimiento', 'inspeccion', 'bloqueada']
  if (!validStatuses.includes(new_status)) return new Response('Estado inválido', { status: 400 })

  const admin = createSupabaseAdminClient()

  // Solo corporativo: acceso a todas las ubicaciones
  // Supervisor estándar: solo su ubicación asignada
  const isFullAccess = profile.role === 'admin' || Boolean((profile as any)?.is_corporate)
  if (!isFullAccess) {
    const { data: room } = await admin
      .from('hk_rooms')
      .select('location_id')
      .eq('id', room_id)
      .single()

    if (!room) {
      return new Response('Habitación no encontrada', { status: 404 })
    }

    // Verificar que el supervisor estándar tenga acceso a esta ubicación
    const { data: userLocs } = await supabase
      .from('user_locations')
      .select('location_id')
      .eq('user_id', user.id)

    const allowedLocationIds = (userLocs ?? []).map((l: any) => l.location_id).filter(Boolean)
    if (profile.location_id) allowedLocationIds.push(profile.location_id)

    if (!allowedLocationIds.includes(room.location_id)) {
      return new Response('No tiene permiso en esta ubicación', { status: 403 })
    }
  }

  // Use RPC for transactional status change
  const { error } = await admin.rpc('hk_change_room_status', {
    p_room_id: room_id,
    p_new_status: new_status,
    p_changed_by: user.id,
    p_notes: notes || null,
  })

  if (error) {
    // Workflow guardrails (e.g., requires open maintenance ticket)
    const message = error.message || 'No se pudo cambiar el estado'

    if (
      message.toLowerCase().includes('ticket de mantenimiento abierto') ||
      message.toLowerCase().includes('sin un ticket de mantenimiento')
    ) {
      return new Response(message, { status: 409 })
    }

    return new Response(message, { status: 500 })
  }

  return Response.json({ ok: true })
}
