import AssetCreateForm from './ui/AssetCreateForm'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export default async function NewAssetPage() {
  const supabase = await createSupabaseServerClient()
  
  // Obtener usuario y permisos
  const { data: { user } } = await supabase.auth.getUser()
  let userRole = 'user'
  let canManageAllAssets = false
  
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, can_manage_assets')
      .eq('id', user.id)
      .single()
    
    userRole = profile?.role || 'user'
    canManageAllAssets = profile?.can_manage_assets || false
  }
  
  // Obtener sedes según permisos
  const dbClient = createSupabaseAdminClient()
  let locationsQuery = dbClient
    .from('locations')
    .select('id, name, code')
    .eq('is_active', true)
    .order('name')
  
  // Si no es admin y no tiene permiso global, filtrar por sedes asignadas
  if (userRole !== 'admin' && !canManageAllAssets && user) {
    // Obtener sedes de user_locations
    const { data: userLocs } = await supabase
      .from('user_locations')
      .select('location_id')
      .eq('user_id', user.id)
    
    let locationIds = userLocs?.map(ul => ul.location_id).filter(Boolean) || []
    
    // Si no hay en user_locations, obtener del perfil
    if (locationIds.length === 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('location_id')
        .eq('id', user.id)
        .single()
      
      if (profileData?.location_id) {
        locationIds.push(profileData.location_id)
      }
    }
    
    if (locationIds.length > 0) {
      locationsQuery = locationsQuery.in('id', locationIds)
    }
  }
  
  const { data: locations } = await locationsQuery
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nuevo Activo</h1>
        <p className="text-sm text-gray-600 mt-1">Registra un nuevo activo en el inventario</p>
      </div>

      <AssetCreateForm 
        locations={locations || []} 
        canManageAllAssets={canManageAllAssets}
        userRole={userRole}
      />
    </div>
  )
}
