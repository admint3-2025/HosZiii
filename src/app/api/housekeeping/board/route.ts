/**
 * GET /api/housekeeping/board
 *
 * Returns ALL hotel locations with their hk_rooms status counts.
 * Used by the "Tablero de Habitaciones" consolidated view.
 *
 * Response: { properties: Array<{ id, name, code, brand, city, state, total_rooms, total_floors, stats, rooms }> }
 */
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'supervisor', 'corporate_admin'].includes(profile.role))
    return Response.json({ error: 'Sin permisos' }, { status: 403 })

  const admin = createSupabaseAdminClient()

  // 1. Get all hotel locations
  const { data: locations, error: locErr } = await admin
    .from('locations')
    .select('id, name, code, brand, city, state, total_rooms, total_floors')
    .eq('is_active', true)
    .eq('business_type', 'hotel')
    .order('name')

  if (locErr) return Response.json({ error: locErr.message }, { status: 500 })
  if (!locations || locations.length === 0) return Response.json({ properties: [] })

  // 2. Get all hk_rooms for all hotel locations in a single query
  const locationIds = locations.map((l: any) => l.id)

  const { data: allRooms, error: roomsErr } = await admin
    .from('hk_rooms')
    .select('id, location_id, number, floor, room_type, status, has_incident, notes, last_cleaned_at, assigned_to')
    .in('location_id', locationIds)
    .eq('is_active', true)
    .order('floor')
    .order('number')

  if (roomsErr) return Response.json({ error: roomsErr.message }, { status: 500 })

  // 2b. Fetch open incidents (from hk_room_incidents view) for rooms with has_incident
  const roomIdsWithIncident = (allRooms ?? []).filter((r: any) => r.has_incident).map((r: any) => r.id)
  let incidentsByRoom: Record<string, { ticketNumber: string; title: string; source: string; status: string; priority: string }[]> = {}

  if (roomIdsWithIncident.length > 0) {
    const { data: incidents } = await admin
      .from('hk_room_incidents')
      .select('room_id, ticket_number, title, source, status, priority')
      .in('room_id', roomIdsWithIncident)

    ;(incidents ?? []).forEach((inc: any) => {
      // Only include open incidents
      if (['RESOLVED', 'CLOSED'].includes((inc.status || '').toUpperCase())) return
      if (!incidentsByRoom[inc.room_id]) incidentsByRoom[inc.room_id] = []
      incidentsByRoom[inc.room_id].push({
        ticketNumber: inc.ticket_number,
        title: inc.title,
        source: inc.source,
        status: inc.status,
        priority: inc.priority,
      })
    })
  }

  // 3. Group rooms by location_id
  const roomsByLocation: Record<string, any[]> = {}
  ;(allRooms ?? []).forEach((r: any) => {
    if (!roomsByLocation[r.location_id]) roomsByLocation[r.location_id] = []
    roomsByLocation[r.location_id].push(r)
  })

  // Status mapping: hk_rooms uses hk_room_status enum
  // limpia → disponible, sucia → sucia, en_limpieza → limpieza,
  // mantenimiento → mantenimiento, inspeccion → inspeccion, bloqueada → bloqueada
  const mapStatus = (s: string) => {
    switch (s) {
      case 'limpia': return 'disponible'
      case 'en_limpieza': return 'limpieza'
      default: return s
    }
  }

  // 4. Build response
  const properties = locations.map((loc: any) => {
    const rooms = roomsByLocation[loc.id] ?? []

    // Calculate stats
    const stats = {
      disponible: 0,
      ocupada: 0,
      sucia: 0,
      limpieza: 0,
      mantenimiento: 0,
      inspeccion: 0,
      bloqueada: 0,
      incidencias: 0,
    }

    const mappedRooms = rooms.map((r: any) => {
      const displayStatus = mapStatus(r.status)
      // @ts-expect-error dynamic key
      if (stats[displayStatus] !== undefined) stats[displayStatus]++
      if (r.has_incident) stats.incidencias++

      return {
        id: r.id,
        number: r.number,
        floor: r.floor,
        status: displayStatus,
        roomType: r.room_type,
        hasIncident: r.has_incident,
        incidents: incidentsByRoom[r.id] || [],
        notes: r.notes,
        lastCleaning: r.last_cleaned_at,
      }
    })

    const locationLabel = [loc.city, loc.state].filter(Boolean).join(', ') || null

    return {
      id: loc.id,
      name: loc.name,
      code: loc.code || '',
      brand: loc.brand || '',
      totalRooms: loc.total_rooms || rooms.length,
      totalFloors: loc.total_floors || (rooms.length > 0 ? Math.max(...rooms.map((r: any) => r.floor)) : 0),
      location: locationLabel,
      stats,
      rooms: mappedRooms,
      hasRooms: rooms.length > 0,
    }
  })

  return Response.json({ properties })
}
