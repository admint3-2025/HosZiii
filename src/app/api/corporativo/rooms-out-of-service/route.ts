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
  const outOfServiceStatuses = ['mantenimiento', 'bloqueada']

  // Obtener todas las ubicaciones de hoteles
  const { data: locations } = await admin
    .from('locations')
    .select('id, name, nightly_rate')
    .eq('is_active', true)
    .eq('business_type', 'hotel')

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
  if (roomsError) console.error('[rooms-out-of-service] Error:', roomsError)

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
        
        // Calcular impacto en ingresos (asumiendo tarifa nightly)
        const nightlyRate = location.nightly_rate || 150 // valor por defecto si no está disponible
        const lostRevenue = daysOut * nightlyRate

        return {
          id: room.id,
          number: room.number,
          floor: room.floor,
          status: room.status,
          daysOut,
          hoursOut,
          updatedAt: room.updated_at,
          lostRevenue
        }
      })

      const totalLostRevenue = roomsWithAging.reduce((sum, r) => sum + r.lostRevenue, 0)
      const severityScore = roomsWithAging.reduce((sum, r) => sum + (r.daysOut * 10 + r.hoursOut), 0) // Mayor antigüedad = más crítico

      return {
        location_id: location.id,
        location_name: location.name,
        nightly_rate: location.nightly_rate,
        rooms: roomsWithAging.sort((a, b) => b.daysOut - a.daysOut), // Mayor antigüedad primero
        total_rooms_out: roomsWithAging.length,
        totalLostRevenue,
        severityScore
      }
    })
    .filter(Boolean)
    .sort((a, b) => (b?.totalLostRevenue || 0) - (a?.totalLostRevenue || 0))

  return Response.json({ properties })
}
