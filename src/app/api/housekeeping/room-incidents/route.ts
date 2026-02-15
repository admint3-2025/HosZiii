/**
 * GET /api/housekeeping/room-incidents?location_id=UUID[&room_id=UUID]
 * Devuelve incidencias (tickets de IT y Mantenimiento) vinculadas a habitaciones.
 * - Sin room_id: todas las incidencias abiertas de la sede
 * - Con room_id: todas las incidencias (abiertas y cerradas) de esa habitación
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || !['admin', 'supervisor', 'corporate_admin'].includes(profile.role))
    return new Response('Forbidden', { status: 403 })

  const locationId = request.nextUrl.searchParams.get('location_id')
  if (!locationId) return new Response('location_id requerido', { status: 400 })

  const roomId = request.nextUrl.searchParams.get('room_id')
  const admin = createSupabaseAdminClient()

  // ── Fetch IT tickets vinculados a habitaciones ──
  let itQuery = admin
    .from('tickets')
    .select('id, ticket_number, hk_room_id, title, description, status, priority, requester_id, assigned_agent_id, created_at, updated_at, closed_at, resolution')
    .eq('location_id', locationId)
    .not('hk_room_id', 'is', null)
    .is('deleted_at', null)

  if (roomId) {
    itQuery = itQuery.eq('hk_room_id', roomId)
  } else {
    // Solo abiertas para la vista general
    itQuery = itQuery.not('status', 'in', '("RESOLVED","CLOSED")')
  }

  itQuery = itQuery.order('created_at', { ascending: false }).limit(100)

  // ── Fetch Maintenance tickets vinculados a habitaciones ──
  let maintQuery = admin
    .from('tickets_maintenance')
    .select('id, ticket_number, hk_room_id, title, description, status, priority, requester_id, assigned_agent_id, assigned_to, created_at, updated_at, closed_at, resolution')
    .eq('location_id', locationId)
    .not('hk_room_id', 'is', null)
    .is('deleted_at', null)

  if (roomId) {
    maintQuery = maintQuery.eq('hk_room_id', roomId)
  } else {
    maintQuery = maintQuery.not('status', 'in', '("RESOLVED","CLOSED")')
  }

  maintQuery = maintQuery.order('created_at', { ascending: false }).limit(100)

  // ── Fetch room info (for context) ──
  let roomsQuery = admin
    .from('hk_rooms')
    .select('id, number, floor, status, has_incident')
    .eq('location_id', locationId)
    .eq('is_active', true)

  if (roomId) {
    roomsQuery = roomsQuery.eq('id', roomId)
  } else {
    roomsQuery = roomsQuery.eq('has_incident', true)
  }

  const [itRes, maintRes, roomsRes] = await Promise.all([itQuery, maintQuery, roomsQuery])

  if (itRes.error) return new Response(`IT query: ${itRes.error.message}`, { status: 500 })
  if (maintRes.error) return new Response(`Maint query: ${maintRes.error.message}`, { status: 500 })

  // ── Resolve profile names ──
  const profileIds = new Set<string>()
  ;(itRes.data ?? []).forEach((t: any) => {
    if (t.requester_id) profileIds.add(t.requester_id)
    if (t.assigned_agent_id) profileIds.add(t.assigned_agent_id)
  })
  ;(maintRes.data ?? []).forEach((t: any) => {
    if (t.requester_id) profileIds.add(t.requester_id)
    if (t.assigned_agent_id) profileIds.add(t.assigned_agent_id)
    if (t.assigned_to) profileIds.add(t.assigned_to)
  })

  let profileNames: Record<string, string> = {}
  if (profileIds.size > 0) {
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, full_name')
      .in('id', Array.from(profileIds))
    ;(profiles ?? []).forEach((p: any) => {
      profileNames[p.id] = p.full_name || 'Sin nombre'
    })
  }

  // ── Map to unified incident format ──
  const itIncidents = (itRes.data ?? []).map((t: any) => ({
    ticketId: t.id,
    source: 'it' as const,
    roomId: t.hk_room_id,
    ticketNumber: String(t.ticket_number),
    title: t.title,
    description: t.description,
    status: t.status,
    priority: String(t.priority),
    requester: profileNames[t.requester_id] || null,
    assignedTo: profileNames[t.assigned_agent_id] || null,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    closedAt: t.closed_at,
    resolution: t.resolution,
  }))

  const maintIncidents = (maintRes.data ?? []).map((t: any) => ({
    ticketId: t.id,
    source: 'maintenance' as const,
    roomId: t.hk_room_id,
    ticketNumber: t.ticket_number,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    requester: profileNames[t.requester_id] || null,
    assignedTo: profileNames[t.assigned_agent_id] || profileNames[t.assigned_to] || null,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    closedAt: t.closed_at,
    resolution: t.resolution,
  }))

  // Merge and sort by created_at desc
  const incidents = [...itIncidents, ...maintIncidents].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  // Room map for context (number → incident count)
  const roomMap: Record<string, { number: string; floor: number; status: string; incidentCount: number }> = {}
  ;(roomsRes.data ?? []).forEach((r: any) => {
    roomMap[r.id] = { number: r.number, floor: r.floor, status: r.status, incidentCount: 0 }
  })
  incidents.forEach(i => {
    if (roomMap[i.roomId]) roomMap[i.roomId].incidentCount++
  })

  return Response.json({
    incidents,
    rooms: Object.entries(roomMap).map(([id, info]) => ({ id, ...info })),
    totalOpen: incidents.filter(i => !['RESOLVED', 'CLOSED'].includes(i.status)).length,
  })
}
