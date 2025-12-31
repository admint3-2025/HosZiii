import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getLocationFilter } from '@/lib/supabase/locations'

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return new Response('Unauthorized', { status: 401 })

  // Verificar que el usuario pueda crear tickets para otros
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, location_id')
    .eq('id', user.id)
    .single()

  // Solo agentes, supervisores y admin pueden ver otros usuarios
  if (!profile || !['agent_l1', 'agent_l2', 'supervisor', 'admin'].includes(profile.role)) {
    return new Response('Forbidden', { status: 403 })
  }

  // Obtener filtro de ubicación
  const locationFilter = await getLocationFilter()

  // Construir query base
  let query = supabase
    .from('profiles')
    .select('id, full_name, role, location_id, locations(name, code)')
    .order('full_name', { ascending: true, nullsFirst: false })

  // Aplicar filtro de ubicación si no es admin
  if (locationFilter) {
    query = query.eq('location_id', locationFilter)
  }

  const { data: users, error } = await query

  if (error) return new Response(error.message, { status: 500 })

  // Formatear respuesta
  const formattedUsers = (users ?? []).map((u) => ({
    id: u.id,
    full_name: u.full_name,
    role: u.role,
    location_id: u.location_id,
    location_name: (u.locations as any)?.name ?? null,
    location_code: (u.locations as any)?.code ?? null,
  }))

  return Response.json({ users: formattedUsers })
}
