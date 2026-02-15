/**
 * GET /api/housekeeping?location_id=UUID
 * Devuelve rooms, staff (con productividad), inventory de una sede.
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
    .select('role, location_id')
    .eq('id', user.id)
    .single()
  if (!profile || !['admin', 'supervisor', 'corporate_admin'].includes(profile.role))
    return new Response('Forbidden', { status: 403 })

  const locationId = request.nextUrl.searchParams.get('location_id')
  if (!locationId) return new Response('location_id requerido', { status: 400 })

  const admin = createSupabaseAdminClient()

  // Parallelise all data fetches
  const [roomsRes, staffRes, inventoryRes, assignmentsRes] = await Promise.all([
    admin
      .from('hk_rooms')
      .select('id, number, floor, room_type, status, assigned_to, last_cleaned_at, last_inspected_at, has_incident, notes, is_active')
      .eq('location_id', locationId)
      .eq('is_active', true)
      .order('floor')
      .order('number'),
    admin
      .from('hk_staff')
      .select('id, profile_id, status, shift, profiles!inner(full_name)')
      .eq('location_id', locationId)
      .eq('is_active', true)
      .order('status'),
    admin
      .from('hk_inventory_items')
      .select('id, name, category, unit, stock, min_stock')
      .eq('location_id', locationId)
      .eq('is_active', true)
      .order('category')
      .order('name'),
    admin
      .from('hk_room_assignments')
      .select('staff_id, status, duration_minutes')
      .eq('location_id', locationId)
      .eq('assignment_date', new Date().toISOString().slice(0, 10)),
  ])

  if (roomsRes.error) return new Response(`rooms: ${roomsRes.error.message}`, { status: 500 })
  if (staffRes.error) return new Response(`staff: ${staffRes.error.message}`, { status: 500 })
  if (inventoryRes.error) return new Response(`inventory: ${inventoryRes.error.message}`, { status: 500 })

  // Build staff metrics from today's assignments
  const staffMetrics: Record<string, { assigned: number; cleaned: number; totalMinutes: number; count: number }> = {}
  ;(assignmentsRes.data ?? []).forEach((a: any) => {
    if (!staffMetrics[a.staff_id]) staffMetrics[a.staff_id] = { assigned: 0, cleaned: 0, totalMinutes: 0, count: 0 }
    staffMetrics[a.staff_id].assigned++
    if (a.status === 'completada') {
      staffMetrics[a.staff_id].cleaned++
      if (a.duration_minutes) {
        staffMetrics[a.staff_id].totalMinutes += a.duration_minutes
        staffMetrics[a.staff_id].count++
      }
    }
  })

  // Map rooms to frontend shape
  const rooms = (roomsRes.data ?? []).map((r: any) => ({
    id: r.id,
    number: r.number,
    floor: r.floor,
    status: r.status,
    assignedTo: r.assigned_to, // profile_id — resolved below
    lastCleaned: r.last_cleaned_at,
    hasIncident: r.has_incident,
    notes: r.notes,
    type: r.room_type,
  }))

  // Build profile_id → staff name map for assigned_to display
  const profileNames: Record<string, string> = {}
  ;(staffRes.data ?? []).forEach((s: any) => {
    const name = (s as any).profiles?.full_name ?? 'Sin nombre'
    profileNames[s.profile_id] = name
  })

  // Resolve assigned_to from profile_id to display name
  rooms.forEach((r: any) => {
    if (r.assignedTo && profileNames[r.assignedTo]) {
      r.assignedTo = profileNames[r.assignedTo]
    } else {
      r.assignedTo = null
    }
  })

  // Map staff
  const staff = (staffRes.data ?? []).map((s: any) => {
    const name = (s as any).profiles?.full_name ?? 'Sin nombre'
    const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    const m = staffMetrics[s.id] || { assigned: 0, cleaned: 0, totalMinutes: 0, count: 0 }
    return {
      id: s.id,
      name,
      avatar: initials,
      status: s.status as 'activo' | 'descanso' | 'inactivo',
      roomsAssigned: m.assigned,
      roomsCleaned: m.cleaned,
      avgMinutes: m.count > 0 ? Math.round(m.totalMinutes / m.count) : 0,
    }
  })

  // Map inventory
  const inventory = (inventoryRes.data ?? []).map((i: any) => ({
    id: i.id,
    name: i.name,
    category: i.category,
    stock: i.stock,
    minStock: i.min_stock,
    unit: i.unit,
  }))

  return Response.json({ rooms, staff, inventory })
}
