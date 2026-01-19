import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import MaintenanceAssetFilters from './ui/MaintenanceAssetFilters'
import { isMaintenanceAssetCategory } from '@/lib/permissions/asset-category'
import MaintenanceBanner from '../ui/MaintenanceBanner'

export default async function MaintenanceAssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; type?: string; status?: string; location?: string }>
}) {
  const supabase = await createSupabaseServerClient()
  const params = await searchParams
  
  // Obtener el rol del usuario actual
  const { data: { user } } = await supabase.auth.getUser()
  let userRole = 'user'
  let userLocations: any[] = []
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
    
    // Si no es admin y no tiene permiso global de activos, obtener sus sedes asignadas
    if (userRole !== 'admin' && !canManageAllAssets) {
      const { data: assignedLocations } = await supabase
        .from('user_locations')
        .select(`
          location:locations(id, name, code)
        `)
        .eq('user_id', user.id)
      
      userLocations = assignedLocations?.map(ul => ul.location).filter(Boolean) || []
    }
  }

  // Validar acceso a mantenimiento
  const canAccessMaintenance = userRole === 'admin' || isMaintenanceAssetCategory(userAssetCategory)
  
  if (!canAccessMaintenance) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h2>
          <p className="text-gray-600">No tienes permisos para acceder a este módulo.</p>
        </div>
      </div>
    )
  }

  // Usar admin client para evitar problemas con RLS
  const dbClient = createSupabaseAdminClient()
  
  // Construir query base - usando tabla assets_maintenance
  let query = dbClient
    .from('assets_maintenance')
    .select(`
      *,
      location:locations(id, name, code)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  // Filtrar por sede según el rol del usuario y permisos
  if (userRole !== 'admin' && !canManageAllAssets) {
    if (user) {
      const { data: userLocs } = await supabase
        .from('user_locations')
        .select('location_id')
        .eq('user_id', user.id)
      
      let locationIds = userLocs?.map(ul => ul.location_id).filter(Boolean) || []
      
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
        query = query.in('location_id', locationIds)
      } else {
        query = query.eq('id', '00000000-0000-0000-0000-000000000000')
      }
    }
  }

  // Aplicar filtros
  if (params.search) {
    query = query.or(`asset_code.ilike.%${params.search}%,serial_number.ilike.%${params.search}%,model.ilike.%${params.search}%,brand.ilike.%${params.search}%,name.ilike.%${params.search}%`)
  }
  
  if (params.type) {
    query = query.eq('category', params.type)
  }
  
  if (params.status) {
    query = query.eq('status', params.status)
  }
  
  if (params.location) {
    query = query.eq('location_id', params.location)
  }

  const { data: assets, error } = await query
  
  // Obtener sedes para el filtro
  let locationsQuery = dbClient
    .from('locations')
    .select('id, name, code')
    .eq('is_active', true)
    .order('name')
  
  if (userRole !== 'admin' && !canManageAllAssets && user) {
    const { data: userLocs } = await supabase
      .from('user_locations')
      .select('location_id')
      .eq('user_id', user.id)
    
    const locationIds = userLocs?.map(ul => ul.location_id).filter(Boolean) || []
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('location_id')
      .eq('id', user.id)
      .single()
    
    if (profile?.location_id && !locationIds.includes(profile.location_id)) {
      locationIds.push(profile.location_id)
    }
    
    if (locationIds.length > 0) {
      locationsQuery = locationsQuery.in('id', locationIds)
    }
  }
  
  const { data: locations } = await locationsQuery

  if (error) {
    console.error('Error fetching assets:', error)
    return <div className="alert alert-danger">Error al cargar activos</div>
  }

  // Calcular estadísticas
  const stats = {
    total: assets?.length || 0,
    operational: assets?.filter(a => a.status === 'ACTIVE').length || 0,
    maintenance: assets?.filter(a => a.status === 'MAINTENANCE').length || 0,
    outOfService: assets?.filter(a => a.status === 'INACTIVE').length || 0,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <MaintenanceBanner
        title="Gestión de Activos - Mantenimiento"
        subtitle="Administra el inventario de equipos de Mantenimiento"
        icon={
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        }
        actionLabel={(userRole === 'admin' || userRole === 'supervisor') ? 'Nuevo Activo' : undefined}
        actionHref={(userRole === 'admin' || userRole === 'supervisor') ? '/mantenimiento/assets/new' : undefined}
      >
        {userRole !== 'admin' && userLocations.length > 0 && (
          <div className="flex items-center gap-2 text-xs bg-white/10 px-3 py-1.5 rounded-lg">
            <svg className="w-4 h-4 text-orange-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-orange-100">
              Mis sedes: {userLocations.map(l => l.code).join(', ')}
            </span>
          </div>
        )}
        {(userRole === 'agent_l1' || userRole === 'agent_l2') && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 border border-yellow-400/30 rounded-lg text-xs text-yellow-100">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Solo lectura
          </div>
        )}
      </MaintenanceBanner>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card shadow-sm border border-slate-200">
          <div className="card-body p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Total Activos</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="card shadow-sm border border-slate-200">
          <div className="card-body p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Operacionales</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.operational}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="card shadow-sm border border-slate-200">
          <div className="card-body p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">En Mantenimiento</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.maintenance}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="card shadow-sm border border-slate-200">
          <div className="card-body p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Fuera de Servicio</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{stats.outOfService}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <MaintenanceAssetFilters locations={locations || []} userRole={userRole} />

      {/* Lista de Activos */}
      <div className="card shadow-sm border border-slate-200">
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Activo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Ubicación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {assets && assets.length > 0 ? (
                  assets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m0 0l8-4m0 0l8 4m0 0v10l-8 4m0-10L4 7m8 4l8 4m0 0l-8-4m0 0l-8 4" />
                            </svg>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-gray-900">{asset.asset_code}</div>
                            <div className="text-xs text-gray-500">
                              {asset.brand || 'Sin marca'} {asset.model || ''} • {asset.serial_number || 'Sin S/N'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {asset.category.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {asset.status === 'ACTIVE' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>
                            Activo
                          </span>
                        )}
                        {asset.status === 'MAINTENANCE' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-600"></span>
                            Mantenimiento
                          </span>
                        )}
                        {asset.status === 'INACTIVE' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                            Inactivo
                          </span>
                        )}
                        {asset.status === 'DISPOSED' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-600"></span>
                            Descartado
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {asset.location ? (
                          <div className="flex items-center gap-1.5">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="text-sm text-gray-900">{asset.location.name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Sin asignar</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/mantenimiento/assets/${asset.id}`}
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          Ver detalles
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <svg className="w-12 h-12 mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <p className="text-sm font-medium">No se encontraron activos</p>
                        <p className="text-xs mt-1">No hay activos de mantenimiento registrados</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
