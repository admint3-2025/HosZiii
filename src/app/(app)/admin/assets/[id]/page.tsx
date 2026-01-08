import { createSupabaseServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import AssetDetailView from './ui/AssetDetailView'

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()


  
  // Obtener usuario actual y su rol
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    notFound()
  }

  // Obtener perfil del usuario (rol)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const userRole = profile?.role || 'requester'

  // Obtener activo con la sede
  const { data: asset, error } = await supabase
    .from('assets')
    .select(`
      *,
      asset_location:locations!location_id(id, name, code)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error || !asset) {
    notFound()
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
  // Obtener todas las sedes activas para el formulario de edición
  const { data: locations } = await supabase
    .from('locations')
    .select('id, name, code')
    .eq('is_active', true)
    .order('name')

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
  const { data: assetHistory } = await supabase
    .from('asset_changes')
    .select('*')
    .eq('asset_id', id)
    .order('changed_at', { ascending: false })
    .limit(100)

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
      relatedTickets={relatedTickets || []}
      assignedUser={assignedUser}
      stats={assetStats}
      assetHistory={assetHistory || []}
      userRole={userRole}
      pendingDisposalRequest={pendingDisposalRequest as any}
    />
  )
}
