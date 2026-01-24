import { createSupabaseServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { isMaintenanceAssetCategory } from '@/lib/permissions/asset-category'
import AssetDetailView from '@/app/(app)/assets/[id]/ui/AssetDetailView'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

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

export default async function MaintenanceAssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    notFound()
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role,asset_category')
    .eq('id', user.id)
    .single()

  const canAccessMaintenance = profile?.role === 'admin' || isMaintenanceAssetCategory(profile?.asset_category)
  
  if (!canAccessMaintenance) {
    return notFound()
  }

  const userRole = profile?.role || 'requester'

  // Obtener activo con la sede - usando tabla assets_maintenance
  const { data: rawAsset, error } = await supabase
    .from('assets_maintenance')
    .select(`
      *,
      asset_location:locations!location_id(id, name, code)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error || !rawAsset) {
    notFound()
  }

  // Mapear campos de assets_maintenance a los esperados por AssetDetailView
  const asset = {
    ...rawAsset,
    // Mapeo de campos principales
    asset_tag: rawAsset.asset_code,
    asset_type: rawAsset.category,
    assigned_to: rawAsset.assigned_to_user_id,
    warranty_end_date: rawAsset.warranty_expiry,
    // Campos que AssetDetailView espera
    department: (rawAsset as any).department || null,
    processor: null,
    ram_gb: null,
    storage_gb: null,
    os: null,
    location: rawAsset.asset_location?.name || null,
    // Mantener el nombre del activo
    asset_name: rawAsset.name,
    // Campos dinámicos desde dynamic_specs
    ...(rawAsset.dynamic_specs || {}),
  }

  // Obtener todas las sedes activas para el formulario de edición
  const { data: locations } = await supabase
    .from('locations')
    .select('id, name, code')
    .eq('is_active', true)
    .order('name')

  // Obtener usuarios según permisos
  let users: Array<{ id: string; full_name: string | null }> = []
  
  if (asset.location_id) {
    // Cargar todos los usuarios de la sede del activo
    const { data: assetLocationUsers } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('location_id', asset.location_id)
      .order('full_name')
    
    users = assetLocationUsers || []
  } else if (userRole === 'admin') {
    // Si el activo no tiene sede asignada y el usuario es admin, mostrar todos
    const { data: allUsers } = await supabase
      .from('profiles')
      .select('id, full_name')
      .order('full_name')
    
    users = allUsers || []
  }

  // Obtener responsable actual del activo (si existe)
  let assignedUser: { id: string; full_name: string | null; location_name: string | null } | null = null
  if (asset.assigned_to_user_id) {
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('id, full_name, locations(name)')
      .eq('id', asset.assigned_to_user_id)
      .single()

    if (userProfile) {
      assignedUser = {
        id: userProfile.id as string,
        full_name: (userProfile as any).full_name ?? null,
        location_name: ((userProfile as any).locations?.name as string) ?? null,
      }
    }
  }
  
  // Obtener tickets relacionados con este activo (si existen en tabla tickets)
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

  // Obtener historial de cambios del activo (si existe tabla asset_changes)
  const { data: assetHistoryRaw } = await supabase
    .from('asset_changes')
    .select('*')
    .eq('asset_id', id)
    .order('changed_at', { ascending: false })
    .limit(100)

  const changedByIds = Array.from(
    new Set((assetHistoryRaw ?? []).map((h: any) => h.changed_by).filter(Boolean))
  ) as string[]

  // Usar admin client para evitar bloqueos por RLS en profiles
  const adminSupabase = createSupabaseAdminClient()
  const changedByMap = new Map<string, { full_name: string | null; email: string | null }>()
  if (changedByIds.length > 0) {
    const changedByProfiles = await fetchProfilesSafe(adminSupabase, changedByIds)
    changedByProfiles.forEach((p) => {
      changedByMap.set(p.id, { full_name: p.full_name, email: p.email })
    })

    const idsNeedingAuthFallback = changedByIds.filter((uid) => {
      const existing = changedByMap.get(uid)
      return !existing || (!existing.full_name && !existing.email)
    })

    if (idsNeedingAuthFallback.length > 0) {
      await Promise.all(
        idsNeedingAuthFallback.map(async (uid) => {
          const { data } = await adminSupabase.auth.admin.getUserById(uid)
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

  // No tiene solicitudes de baja en mantenimiento (feature solo IT por ahora)
  const pendingDisposalRequest = null

  // Estadísticas simplificadas (sin RPC por ahora)
  const assetStats = relatedTickets
    ? {
        totalTickets: relatedTickets.length,
        openTickets: relatedTickets.filter(t => !['RESOLVED', 'CLOSED'].includes(t.status)).length,
        locationChangeCount: 0,
        lastLocationChangeAt: null,
        assignmentChangeCount: 0,
        lastAssignmentChangeAt: null,
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
      pendingDisposalRequest={pendingDisposalRequest}
      backLink="/mantenimiento/assets"
      assetCategory="MAINTENANCE"
    />
  )
}
