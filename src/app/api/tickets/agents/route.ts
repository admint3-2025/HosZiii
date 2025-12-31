import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getLocationFilter } from '@/lib/supabase/locations'

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return new Response('Unauthorized', { status: 401 })

  // Obtener parámetro de nivel (l1, l2, all)
  const { searchParams } = new URL(request.url)
  const level = searchParams.get('level') || 'all' // all, l1, l2

  // Obtener filtro de ubicación
  const locationFilter = await getLocationFilter()

  // Construir query base
  let query = supabase
    .from('profiles')
    .select('id, full_name, role, location_id')
    .order('full_name', { ascending: true, nullsFirst: false })

  // Filtrar por roles según nivel solicitado
  if (level === 'l2') {
    query = query.in('role', ['agent_l2', 'supervisor', 'admin'])
  } else {
    query = query.in('role', ['agent_l1', 'agent_l2', 'supervisor', 'admin'])
  }

  // Aplicar filtro de ubicación si no es admin
  if (locationFilter) {
    query = query.eq('location_id', locationFilter)
  }

  const { data: agents, error } = await query

  if (error) return new Response(error.message, { status: 500 })

  // Formatear respuesta
  const formattedAgents = (agents ?? []).map((a) => ({
    id: a.id,
    full_name: a.full_name,
    role: a.role,
  }))

  return Response.json({ agents: formattedAgents })
}
