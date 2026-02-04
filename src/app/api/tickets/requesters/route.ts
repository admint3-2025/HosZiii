import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
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
    .select('role, location_id, is_it_supervisor, is_maintenance_supervisor')
    .eq('id', user.id)
    .single()

  // Solo agentes, supervisores y admin pueden ver otros usuarios
  // corporate_admin solo si tiene is_it_supervisor o is_maintenance_supervisor activado
  const isAllowedRole = ['agent_l1', 'agent_l2', 'supervisor', 'admin'].includes(profile?.role || '')
  const isCorporateAdminWithSupervisorPermission = 
    profile?.role === 'corporate_admin' && 
    (profile?.is_it_supervisor === true || profile?.is_maintenance_supervisor === true)
  
  if (!profile || (!isAllowedRole && !isCorporateAdminWithSupervisorPermission)) {
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
  if (locationFilter === null) {
    // Admin: sin filtro (ve todos los usuarios)
  } else if (Array.isArray(locationFilter) && locationFilter.length > 0) {
    // Supervisor/Técnico con múltiples sedes: buscar usuarios de esas sedes
    // Necesitamos buscar en user_locations también
    const { data: usersInLocations } = await supabase
      .from('user_locations')
      .select('user_id')
      .in('location_id', locationFilter)
    
    const userIdsFromLocations = usersInLocations?.map(ul => ul.user_id) || []
    
    // Combinar usuarios que tengan location_id en profiles O estén en user_locations
    if (userIdsFromLocations.length > 0) {
      query = query.or(`location_id.in.(${locationFilter.join(',')}),id.in.(${userIdsFromLocations.join(',')})`)
    } else {
      // Solo usuarios con location_id en profiles
      query = query.in('location_id', locationFilter)
    }
  } else {
    // Sin sedes asignadas: no mostrar usuarios
    query = query.eq('location_id', 'none')
  }

  const { data: users, error } = await query

  if (error) return new Response(error.message, { status: 500 })

  // Filtrar usuarios desactivados (banned)
  const adminClient = createSupabaseAdminClient()
  const { data: authUsers } = await adminClient.auth.admin.listUsers()
  const activeUserIds = new Set(
    (authUsers?.users ?? []).filter(u => {
      const bannedUntil = (u as any).banned_until
      if (!bannedUntil) return true
      return new Date(bannedUntil).getTime() <= Date.now()
    }).map(u => u.id)
  )

  // Formatear respuesta (solo usuarios activos)
  const formattedUsers = (users ?? [])
    .filter(u => activeUserIds.has(u.id))
    .map((u) => ({
    id: u.id,
    full_name: u.full_name,
    role: u.role,
    location_id: u.location_id,
    location_name: (u.locations as any)?.name ?? null,
    location_code: (u.locations as any)?.code ?? null,
  }))

  return Response.json({ users: formattedUsers })
}
