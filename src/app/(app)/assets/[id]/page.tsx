import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import AssetDetailView from './ui/AssetDetailView'

async function fetchProfilesSafe(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  userIds: string[],
): Promise<Array<{ id: string; full_name: string | null; email: string | null }>> {
  if (!userIds.length) return []

  const primary = await adminClient.from('profiles').select('id, full_name, email').in('id', userIds)
  if (!primary.error) {
    return ((primary.data ?? []) as any[]).map((p) => ({
      id: p.id as string,
      full_name: (p.full_name as string) ?? null,
      email: (p.email as string) ?? null,
    }))
  }

  const fallback = await adminClient.from('profiles').select('id, full_name').in('id', userIds)
  return ((fallback.data ?? []) as any[]).map((p) => ({
    id: p.id as string,
    full_name: (p.full_name as string) ?? null,
    email: null,
  }))
}

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const dbClient = createSupabaseAdminClient()


  
  // Obtener usuario actual y su rol
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    notFound()
  }

  // Obtener perfil del usuario (rol y category)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, asset_category, can_manage_assets, location_id')
    .eq('id', user.id)
    .single()

  const userRole = profile?.role || 'requester'

  // Obtener activo - puede ser de IT o Mantenimiento
  let rawAsset: any = null
  let assetCategory: 'IT' | 'MAINTENANCE' = 'IT'
  
  // Primero intentar IT
  const { data: itAsset, error: itError } = await supabase
    .from('assets_it')
    .select(`
      *,
      asset_location:locations!location_id(id, name, code)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (itAsset && !itError) {
    rawAsset = itAsset
    assetCategory = 'IT'
  } else {
    // Si no es IT, intentar Mantenimiento
    const { data: maintAsset, error: maintError } = await supabase
      .from('assets_maintenance')
      .select(`
        *,
        asset_location:locations!location_id(id, name, code)
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single()
    
    if (maintAsset && !maintError) {
      rawAsset = maintAsset
      assetCategory = 'MAINTENANCE'
    }
  }

  if (!rawAsset) {
    notFound()
  }

  // Mapear campos de assets_it a los esperados por AssetDetailView
  const asset = {
    ...rawAsset,
    // Mapeo de campos principales (assets_it usa nombres diferentes)
    asset_tag: rawAsset.asset_code,
    asset_type: rawAsset.category,
    assigned_to: rawAsset.assigned_to_user_id,
    warranty_end_date: rawAsset.warranty_expiry,
    // Campo location desde la relación
    location: rawAsset.asset_location?.name || null,
    // Campos IT específicos que pueden no existir en la nueva tabla
    department: (rawAsset as any).department || null,
    processor: (rawAsset as any).processor || null,
    ram_gb: (rawAsset as any).ram_gb || null,
    storage_gb: (rawAsset as any).storage_gb || null,
    os: (rawAsset as any).os || null,
    // Campos dinámicos desde dynamic_specs (solo si no son DESKTOP/LAPTOP)
    // Para DESKTOP/LAPTOP usamos las columnas legacy arriba
    ...((rawAsset.category !== 'DESKTOP' && rawAsset.category !== 'LAPTOP') 
      ? (rawAsset.dynamic_specs || {}) 
      : {}),
  }

  // Validar acceso basado en rol para agent_l1 y agent_l2
  if (userRole === 'agent_l1' || userRole === 'agent_l2') {
    const { data: userLocations } = await supabase
      .from('user_locations')
      .select('location_id')
      .eq('user_id', user.id)

    const userLocationIds = userLocations?.map(ul => ul.location_id) || []
    
    // Si el activo tiene una sede y el usuario no tiene acceso a esa sede, denegar
    if (asset.location_id && !userLocationIds.includes(asset.location_id)) {
      notFound()
    }
  }
  
  // Obtener sedes disponibles según permisos
  let locationsQuery = supabase
    .from('locations')
    .select('id, name, code')
    .eq('is_active', true)
    .order('name')
  
  // Si no es admin y no tiene permiso global, filtrar por sedes asignadas
  if (userRole !== 'admin' && !profile?.can_manage_assets && user) {
    // Obtener sedes de user_locations
    const { data: userLocs } = await supabase
      .from('user_locations')
      .select('location_id')
      .eq('user_id', user.id)
    
    let locationIds = userLocs?.map(ul => ul.location_id).filter(Boolean) || []
    
    // Si no hay en user_locations, obtener del perfil
    if (locationIds.length === 0 && profile?.location_id) {
      locationIds.push(profile.location_id)
    }
    
    if (locationIds.length > 0) {
      locationsQuery = locationsQuery.in('id', locationIds)
    }
  }
  
  const { data: locations } = await locationsQuery
  
  // Cargar usuarios de la SEDE DEL ACTIVO (no de las sedes del usuario actual)
  let users: Array<{id: string, full_name: string | null}> = []
  
  if (asset.location_id) {
    // Cargar todos los usuarios de la sede del activo
    const { data: assetLocationUsers } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('location_id', asset.location_id)
      .order('full_name')
    
    users = assetLocationUsers || []
  } else if (userRole === 'admin' || profile?.can_manage_assets) {
    // Si el activo no tiene sede asignada y el usuario es admin, mostrar todos
    const { data: allUsers } = await supabase
      .from('profiles')
      .select('id, full_name')
      .order('full_name')
    
    users = allUsers || []
  }

  // Obtener responsable actual del activo (si existe)
  let assignedUser: { id: string; full_name: string | null; location_name: string | null } | null = null
  if (asset.assigned_to) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, locations(name)')
      .eq('id', asset.assigned_to)
      .single()

    if (profile) {
      assignedUser = {
        id: profile.id as string,
        full_name: (profile as any).full_name ?? null,
        location_name: ((profile as any).locations?.name as string) ?? null,
      }
    }
  }
  
  // Obtener tickets relacionados con este activo
  const { data: relatedTickets } = await supabase
    .from('tickets')
    .select(`
      id,
      ticket_number,
      title,
      status,
      priority,
      created_at,
      closed_at
    `)
    .eq('asset_id', id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(20)

  // Obtener estadísticas consolidadas del activo
  const { data: statsRows } = await supabase
    .rpc('get_asset_detail_stats', { p_asset_id: id })

  const rawStats = Array.isArray(statsRows) && statsRows.length > 0 ? statsRows[0] as any : null
  
  // Obtener historial de cambios del activo
  const { data: assetHistoryRaw } = await supabase
    .from('asset_changes')
    .select('*')
    .eq('asset_id', id)
    .order('changed_at', { ascending: false })
    .limit(100)

  const changedByIds = Array.from(
    new Set((assetHistoryRaw ?? []).map((h: any) => h.changed_by).filter(Boolean))
  ) as string[]

  const changedByMap = new Map<string, { full_name: string | null; email: string | null }>()
  if (changedByIds.length > 0) {
    const changedByProfiles = await fetchProfilesSafe(dbClient, changedByIds)
    changedByProfiles.forEach((p) => {
      changedByMap.set(p.id, { full_name: p.full_name, email: p.email })
    })

    // Fallback: si falta perfil (o nombre/email), intentar desde Auth Admin API
    const idsNeedingAuthFallback = changedByIds.filter((uid) => {
      const existing = changedByMap.get(uid)
      return !existing || (!existing.full_name && !existing.email)
    })

    if (idsNeedingAuthFallback.length > 0) {
      await Promise.all(
        idsNeedingAuthFallback.map(async (uid) => {
          const { data } = await dbClient.auth.admin.getUserById(uid)
          const email = (data as any)?.user?.email ?? null

          const existing = changedByMap.get(uid)
          changedByMap.set(uid, {
            full_name: existing?.full_name ?? email,
            email: existing?.email ?? email,
          })
        }),
      )
    }
  }

  const assetHistory = (assetHistoryRaw ?? []).map((h: any) => {
    const p = h.changed_by ? changedByMap.get(h.changed_by as string) : null
    return {
      ...h,
      changed_by_name: h.changed_by_name ?? p?.full_name ?? p?.email ?? null,
      changed_by_email: h.changed_by_email ?? p?.email ?? null,
    }
  })

  // Obtener solicitud de baja pendiente (si existe)
  const { data: pendingDisposalRequest } = await supabase
    .from('asset_disposal_requests')
    .select(`
      id,
      reason,
      created_at,
      requester:profiles!asset_disposal_requests_requested_by_fkey(full_name)
    `)
    .eq('asset_id', id)
    .eq('status', 'pending')
    .maybeSingle()

  const assetStats = rawStats
    ? {
        totalTickets: rawStats.total_tickets ?? 0,
        openTickets: rawStats.open_tickets ?? 0,
        locationChangeCount: rawStats.location_change_count ?? 0,
        lastLocationChangeAt: rawStats.last_location_change_at as string | null,
        assignmentChangeCount: rawStats.assignment_change_count ?? 0,
        lastAssignmentChangeAt: rawStats.last_assignment_change_at as string | null,
      }
    : null

  return (
    <AssetDetailView
      asset={asset}
      locations={locations || []}
      users={users}
      relatedTickets={relatedTickets || []}
      assignedUser={assignedUser}
      stats={assetStats}
      assetHistory={assetHistory || []}
      userRole={userRole}
      pendingDisposalRequest={pendingDisposalRequest as any}
    />
  )
}
