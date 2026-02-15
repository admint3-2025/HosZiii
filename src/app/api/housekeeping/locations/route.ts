/**
 * GET /api/housekeeping/locations
 * Devuelve sedes hoteleras con total_rooms para el selector multipropiedad
 */
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function GET() {
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

  const isFullAccess = ['admin', 'corporate_admin'].includes(profile.role)
  let allowedLocationIds: string[] | null = null

  if (!isFullAccess) {
    const { data: userLocs } = await supabase
      .from('user_locations')
      .select('location_id')
      .eq('user_id', user.id)

    allowedLocationIds = (userLocs ?? []).map((l: any) => l.location_id).filter(Boolean)

    if (profile.location_id && !allowedLocationIds.includes(profile.location_id)) {
      allowedLocationIds.push(profile.location_id)
    }

    if (allowedLocationIds.length === 0) {
      return Response.json({
        locations: [],
        userLocationId: profile.location_id,
      })
    }
  }

  const admin = createSupabaseAdminClient()

  let locationsQuery = admin
    .from('locations')
    .select('id, name, code, business_type, total_rooms, total_floors, brand')
    .eq('is_active', true)
    .eq('business_type', 'hotel')
    .order('name')

  if (!isFullAccess && allowedLocationIds) {
    locationsQuery = locationsQuery.in('id', allowedLocationIds)
  }

  const { data: locations, error } = await locationsQuery

  if (error) {
    // If total_rooms column doesn't exist yet, fallback to basic query
    let fallbackQuery = admin
      .from('locations')
      .select('id, name, code, business_type')
      .eq('is_active', true)
      .eq('business_type', 'hotel')
      .order('name')

    if (!isFullAccess && allowedLocationIds) {
      fallbackQuery = fallbackQuery.in('id', allowedLocationIds)
    }

    const { data: fallback, error: err2 } = await fallbackQuery

    if (err2) return new Response(err2.message, { status: 500 })
    return Response.json({
      locations: (fallback ?? []).map((l: any) => ({
        ...l,
        total_rooms: null,
        total_floors: null,
        brand: null,
      })),
      userLocationId: profile.location_id,
    })
  }

  return Response.json({
    locations: locations ?? [],
    userLocationId: profile.location_id,
  })
}
