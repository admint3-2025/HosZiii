import AssetCreateForm from './ui/AssetCreateForm'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { isMaintenanceAssetCategory } from '@/lib/permissions/asset-category'

export default async function NewAssetPage() {
  const supabase = await createSupabaseServerClient()
  
  // Obtener usuario y permisos
  const { data: { user } } = await supabase.auth.getUser()
  let userRole = 'user'
  let canManageAllAssets = false
  let userAssetCategory: string | null = null
  
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, can_manage_assets, asset_category')
      .eq('id', user.id)
      .single()
    
    userRole = profile?.role || 'user'
    canManageAllAssets = profile?.can_manage_assets || false
    userAssetCategory = profile?.asset_category || null
  }

  // Bloquear inventario IT para perfiles de mantenimiento (no admin)
  if (user && userRole !== 'admin' && isMaintenanceAssetCategory(userAssetCategory)) {
    redirect('/mantenimiento/dashboard')
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
  
  // Obtener usuarios según permisos
  let users: Array<{ id: string; full_name: string | null }> = []
  
  if (userRole === 'admin' || canManageAllAssets) {
    // Admin puede ver todos los usuarios
    const { data: allUsers } = await supabase
      .from('profiles')
      .select('id, full_name')
      .order('full_name')
    
    users = allUsers || []
  } else if (user && locations && locations.length > 0) {
    // Supervisor: solo usuarios de sus sedes
    const locationIds = locations.map(l => l.id)
    
    const { data: supervisorUsers } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('location_id', locationIds)
      .order('full_name')
    
    users = supervisorUsers || []
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nuevo Activo de TI</h1>
          <p className="text-sm text-gray-600">Registra un nuevo equipo de tecnología en el inventario IT</p>
        </div>
      </div>

      <AssetCreateForm 
        locations={locations || []} 
        canManageAllAssets={canManageAllAssets}
        userRole={userRole}
        users={users}
      />
    </div>
  )
}
