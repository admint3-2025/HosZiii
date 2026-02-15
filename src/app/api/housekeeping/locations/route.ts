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

  const admin = createSupabaseAdminClient()

  const { data: locations, error } = await admin
    .from('locations')
    .select('id, name, code, business_type, total_rooms, total_floors, brand')
    .eq('is_active', true)
    .eq('business_type', 'hotel')
    .order('name')

  if (error) {
    // If total_rooms column doesn't exist yet, fallback to basic query
    const { data: fallback, error: err2 } = await admin
      .from('locations')
      .select('id, name, code, business_type')
      .eq('is_active', true)
      .eq('business_type', 'hotel')
      .order('name')

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
