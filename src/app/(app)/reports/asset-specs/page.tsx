import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getReportsLocationFilter } from '@/lib/supabase/reports-filter'
import { redirect } from 'next/navigation'
import AssetSpecsClient from './AssetSpecsClient'

export default async function AssetSpecsReportPage() {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'supervisor'].includes(profile.role)) {
    redirect('/dashboard')
  }

  // Obtener filtro de ubicaciones para reportes
  const locationFilter = await getReportsLocationFilter()

  // Usar cliente admin para que el reporte tenga visibilidad completa de activos
  const adminSupabase = createSupabaseAdminClient()

  // Obtener activos con especificaciones técnicas (solo PC y Laptops)
  let assetsQuery = adminSupabase
    .from('assets')
    .select(`
      id,
      asset_tag,
      asset_type,
      status,
      brand,
      model,
      serial_number,
      processor,
      ram_gb,
      storage_gb,
      os,
      location_id,
      department,
      assigned_to,
      purchase_date,
      locations!assets_location_id_fkey(code, name)
    `)
    .in('asset_type', ['DESKTOP', 'LAPTOP'])
    .is('deleted_at', null)
    .order('asset_tag', { ascending: true })

  // Aplicar filtro de ubicación para supervisores sin permiso especial
  if (locationFilter.shouldFilter && locationFilter.locationIds.length > 0) {
    assetsQuery = assetsQuery.in('location_id', locationFilter.locationIds)
  } else if (locationFilter.shouldFilter && locationFilter.locationIds.length === 0) {
    // Supervisor sin sedes: no mostrar nada
    assetsQuery = assetsQuery.eq('id', '00000000-0000-0000-0000-000000000000')
  }

  const { data: assets, error: assetsError } = await assetsQuery

  if (assetsError) {
    console.error('Error loading assets:', assetsError)
  }

  // Obtener información de usuarios asignados por separado
  const assignedUserIds = [...new Set((assets ?? []).map(a => a.assigned_to).filter(Boolean))]
  
  const { data: assignedProfiles } = assignedUserIds.length > 0 
    ? await adminSupabase
        .from('profiles')
        .select('id, full_name')
        .in('id', assignedUserIds)
    : { data: [] }

  // Obtener emails de auth.users
  const { data: authData } = assignedUserIds.length > 0
    ? await adminSupabase.auth.admin.listUsers()
    : { data: { users: [] } }

  const emailMap = new Map(
    authData?.users?.map(u => [u.id, u.email]) ?? []
  )

  // Combinar datos de profiles y auth
  const assignedUsers = (assignedProfiles ?? []).map(p => ({
    id: p.id,
    full_name: p.full_name,
    email: emailMap.get(p.id) || 'Sin email'
  }))

  const userMap = new Map(assignedUsers.map(u => [u.id, u]))

  // Mapear assets con usuarios
  const assetsWithUsers = (assets ?? []).map(asset => ({
    ...asset,
    asset_location: (asset.locations as any) || null,
    assigned_user: asset.assigned_to ? userMap.get(asset.assigned_to) : null,
  }))

  // Obtener todas las ubicaciones para el filtro
  const { data: locations } = await adminSupabase
    .from('locations')
    .select('id, code, name')
    .order('code', { ascending: true })

  // Obtener departamentos únicos
  const departments = [...new Set(assetsWithUsers.map(a => a.department).filter(Boolean))].sort()

  return <AssetSpecsClient 
    initialAssets={assetsWithUsers} 
    locations={locations ?? []}
    departments={departments}
  />
}
