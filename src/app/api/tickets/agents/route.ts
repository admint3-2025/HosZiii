import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
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
  if (locationFilter === null) {
    // Admin: sin filtro (ve todos los agentes)
  } else if (Array.isArray(locationFilter) && locationFilter.length > 0) {
    // Supervisor/Técnico con múltiples sedes: buscar agentes de esas sedes
    // Necesitamos buscar en user_locations también
    const { data: agentsInLocations } = await supabase
      .from('user_locations')
      .select('user_id')
      .in('location_id', locationFilter)
    
    const userIdsFromLocations = agentsInLocations?.map(ul => ul.user_id) || []
    
    // Combinar con agentes que tengan location_id en profiles
    query = query.or(`location_id.in.(${locationFilter.join(',')}),id.in.(${userIdsFromLocations.join(',')})`)
  } else {
    // Sin sedes asignadas: no mostrar agentes
    query = query.eq('location_id', 'none')
  }

  const { data: agents, error } = await query

  if (error) return new Response(error.message, { status: 500 })

  // Filtrar agentes desactivados (banned)
  const adminClient = createSupabaseAdminClient()
  const { data: authUsers } = await adminClient.auth.admin.listUsers()
  const activeUserIds = new Set(
    (authUsers?.users ?? []).filter(u => {
      const bannedUntil = (u as any).banned_until
      if (!bannedUntil) return true
      return new Date(bannedUntil).getTime() <= Date.now()
    }).map(u => u.id)
  )

  // Formatear respuesta (solo agentes activos)
  const formattedAgents = (agents ?? [])
    .filter(a => activeUserIds.has(a.id))
    .map((a) => ({
    id: a.id,
    full_name: a.full_name,
    role: a.role,
  }))

  return Response.json({ agents: formattedAgents })
}
