/**
 * POST /api/housekeeping/smart-assign
 * Asignación inteligente: distribuye habitaciones sucias round-robin
 * Body: { location_id }
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
  // Solo admin o supervisor corporativo pueden asignar habitaciones
  if (!profile || !(profile.role === 'admin' || (profile.role === 'supervisor' && profile.is_corporate)))
    return new Response('Solo admin o supervisor corporativo puede asignar habitaciones', { status: 403 })

  let body: any
  try {
    body = await request.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const { location_id } = body || {}
  if (!location_id) return new Response('location_id requerido', { status: 400 })

  const admin = createSupabaseAdminClient()

  const { data, error } = await admin.rpc('hk_smart_assign', {
    p_location_id: location_id,
  })

  if (error) return new Response(error.message, { status: 500 })

  return Response.json({ assignments: data ?? [], count: (data ?? []).length })
}
