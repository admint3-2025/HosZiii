/**
 * GET /api/corporativo/rooms-out-of-service
 * Obtiene habitaciones fuera de servicio con aging e impacto en ingresos
 * Retorna: { properties: Array<{ location_id, location_name, rooms, totalLostRevenue }> }
 */
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_corporate')
    .eq('id', user.id)
    .single()

  // Solo admin o supervisor corporativo pueden ver esto
  if (!profile || !(profile.role === 'admin' || (profile.role === 'supervisor' && profile.is_corporate))) {
    return Response.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const admin = createSupabaseAdminClient()

  // Estados que consideramos "fuera de servicio"
  const outOfServiceStatuses = ['mantenimiento', 'bloqueada'] as const

  type LocationRow = { id: string; name: string }

  // Obtener todas las ubicaciones de hoteles
  const { data: locations, error: locationsError } = await admin
    .from('locations')
    .select('id, name')
    .eq('is_active', true)
    .eq('business_type', 'hotel')

  if (locationsError) {
    console.error('[rooms-out-of-service] locations query error:', locationsError)
    return Response.json({ error: locationsError.message }, { status: 500 })
  }

  if (!locations || locations.length === 0) {
    return Response.json({ properties: [] })
  }

  const locationIds = locations.map(l => l.id)

  // Obtener habitaciones fuera de servicio
  const { data: outOfServiceRooms, error: roomsError } = await admin
    .from('hk_rooms')
    .select('id, location_id, number, floor, status, updated_at')
    .in('location_id', locationIds)
    .in('status', outOfServiceStatuses)
    .eq('is_active', true)

  // Debug logging
  console.log('[rooms-out-of-service] Query params:', { locationIds, outOfServiceStatuses })
  console.log('[rooms-out-of-service] Rooms found:', outOfServiceRooms?.length || 0)
  if (roomsError) {
    console.error('[rooms-out-of-service] Error:', roomsError)
    return Response.json({ error: roomsError.message }, { status: 500 })
  }

  if (!outOfServiceRooms || outOfServiceRooms.length === 0) {
    return Response.json({ properties: [] })
  }

  // Mapear ubicaciones con sus habitaciones fuera de servicio
  const now = new Date()
  
  const properties = locations
    .map(location => {
      const roomsAtLocation = outOfServiceRooms.filter(r => r.location_id === location.id)
      
      if (roomsAtLocation.length === 0) return null

      const roomsWithAging = roomsAtLocation.map(room => {
        const updatedAt = new Date(room.updated_at)
        const daysOut = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24))
        const hoursOut = Math.floor(((now.getTime() - updatedAt.getTime()) % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

        return {
          id: room.id,
          number: room.number,
          floor: room.floor,
          status: room.status,
          daysOut,
          hoursOut,
          updatedAt: room.updated_at,
        }
      })

      const severityScore = roomsWithAging.reduce((sum, r) => sum + (r.daysOut * 10 + r.hoursOut), 0) // Mayor antigüedad = más crítico
      const maxDaysOut = roomsWithAging.reduce((max, r) => Math.max(max, r.daysOut), 0)
      const maxHoursOut = roomsWithAging.reduce((max, r) => (r.daysOut === maxDaysOut ? Math.max(max, r.hoursOut) : max), 0)

      return {
        location_id: location.id,
        location_name: location.name,
        rooms: roomsWithAging.sort((a, b) => b.daysOut - a.daysOut), // Mayor antigüedad primero
        total_rooms_out: roomsWithAging.length,
        severityScore,
        maxDaysOut,
        maxHoursOut,
      }
    })
    .filter(Boolean)
    .sort((a, b) => (b?.total_rooms_out || 0) - (a?.total_rooms_out || 0) || (b?.severityScore || 0) - (a?.severityScore || 0))

  return Response.json({ properties })
}
