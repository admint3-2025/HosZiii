/**
 * GET /api/housekeeping/rooms-for-ticket?location_id=UUID
 * Devuelve las habitaciones activas de una sede hotelera.
 * Usado por los formularios de tickets para seleccionar habitación afectada.
 * Retorna array vacío si la sede no es hotel o no tiene habitaciones.
 */
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const locationId = request.nextUrl.searchParams.get('location_id')
  if (!locationId) return Response.json({ rooms: [] })

  const admin = createSupabaseAdminClient()

  // Verificar que la sede es de tipo hotel
  const { data: location } = await admin
    .from('locations')
    .select('id, business_type')
    .eq('id', locationId)
    .maybeSingle()

  if (!location || location.business_type !== 'hotel') {
    return Response.json({ rooms: [] })
  }

  // Traer habitaciones activas ordenadas por piso y número
  const { data: rooms, error } = await admin
    .from('hk_rooms')
    .select('id, number, floor, room_type, status')
    .eq('location_id', locationId)
    .eq('is_active', true)
    .order('floor')
    .order('number')

  if (error) {
    console.error('[rooms-for-ticket] Error:', error)
    return Response.json({ rooms: [] })
  }

  return Response.json({
    rooms: (rooms ?? []).map((r: any) => ({
      id: r.id,
      number: r.number,
      floor: r.floor,
      roomType: r.room_type,
      status: r.status,
    })),
  })
}
