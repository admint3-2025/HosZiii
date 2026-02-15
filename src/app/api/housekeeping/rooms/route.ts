/**
 * /api/housekeeping/rooms
 *
 * POST – Crear una habitación individual
 * Body: { location_id, number, floor, room_type, status?, notes? }
 */
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'

const VALID_TYPES = ['standard', 'doble', 'suite', 'accesible', 'conectada'] as const
const VALID_STATUSES = ['limpia', 'sucia', 'en_limpieza', 'mantenimiento', 'inspeccion', 'bloqueada'] as const

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || !['admin', 'corporate_admin'].includes(profile.role))
    return Response.json({ error: 'Sin permisos' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const { location_id, number, floor, room_type, status, notes } = body

  if (!location_id || !number || floor === undefined || floor === null)
    return Response.json({ error: 'location_id, number y floor son requeridos' }, { status: 400 })

  if (room_type && !VALID_TYPES.includes(room_type))
    return Response.json({ error: `Tipo inválido. Válidos: ${VALID_TYPES.join(', ')}` }, { status: 400 })

  if (status && !VALID_STATUSES.includes(status))
    return Response.json({ error: `Estado inválido. Válidos: ${VALID_STATUSES.join(', ')}` }, { status: 400 })

  const admin = createSupabaseAdminClient()

  const { data, error } = await admin
    .from('hk_rooms')
    .insert({
      location_id,
      number: String(number).trim(),
      floor: Number(floor),
      room_type: room_type || 'standard',
      status: status || 'sucia',
      notes: notes || null,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return Response.json({ error: `Ya existe la habitación "${number}" en esta sede` }, { status: 409 })
    }
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ success: true, room: data })
}
