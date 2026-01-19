import MaintenanceAssetCreateForm from './ui/MaintenanceAssetCreateForm'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import { isMaintenanceAssetCategory } from '@/lib/permissions/asset-category'

export default async function NewMaintenanceAssetPage() {
  const supabase = await createSupabaseServerClient()
  
  // Obtener usuario y permisos
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, can_manage_assets, asset_category')
    .eq('id', user.id)
    .single()
  
  const userRole = profile?.role || 'user'
  const canManageAllAssets = profile?.can_manage_assets || false
  const userAssetCategory = profile?.asset_category || null

  // Solo admin o supervisores de mantenimiento pueden crear activos
  const canCreate = userRole === 'admin' || 
    (userRole === 'supervisor' && isMaintenanceAssetCategory(userAssetCategory))

  if (!canCreate) {
    return notFound()
  }
  
  // Obtener sedes según permisos
  const dbClient = createSupabaseAdminClient()
  
  // Si no es admin y no tiene permiso global, filtrar por sedes asignadas
  let locations: Array<{id: string, name: string, code: string}> = []
  
  if (userRole !== 'admin' && !canManageAllAssets) {
    // Usar admin client para evitar RLS
    const { data: userLocs } = await dbClient
      .from('user_locations')
      .select('location_id')
      .eq('user_id', user.id)
    
    let locationIds = userLocs?.map(ul => ul.location_id).filter(Boolean) || []
    
    // También incluir sede del perfil
    const { data: profileData } = await dbClient
      .from('profiles')
      .select('location_id')
      .eq('id', user.id)
      .single()
    
    if (profileData?.location_id && !locationIds.includes(profileData.location_id)) {
      locationIds.push(profileData.location_id)
    }
    
    // SOLO cargar las ubicaciones asignadas (si no hay ninguna, array vacío)
    if (locationIds.length > 0) {
      const { data: locs } = await dbClient
        .from('locations')
        .select('id, name, code')
        .eq('is_active', true)
        .in('id', locationIds)
        .order('name')
      
      locations = locs || []
    }
  } else {
    // Admin puede ver todas
    const { data: locs } = await dbClient
      .from('locations')
      .select('id, name, code')
      .eq('is_active', true)
      .order('name')
    
    locations = locs || []
  }

  // Cargar usuarios de las sedes asignadas (server-side para evitar RLS)
  const locationIds = locations.map(l => l.id)
  let users: Array<{id: string, full_name: string | null}> = []
  
  if (locationIds.length > 0) {
    const { data: usersData } = await dbClient
      .from('profiles')
      .select('id, full_name, location_id')
      .in('location_id', locationIds)
      .not('full_name', 'is', null)
      .order('full_name')
    
    users = usersData || []
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-100 rounded-lg">
          <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nuevo Activo de Mantenimiento</h1>
          <p className="text-sm text-gray-600">Registra equipos de HVAC, plomería, cocina, lavandería y más</p>
        </div>
      </div>
      
      <MaintenanceAssetCreateForm 
        locations={locations || []} 
        canManageAllAssets={canManageAllAssets}
        userRole={userRole}
        users={users}
      />
    </div>
  )
}
