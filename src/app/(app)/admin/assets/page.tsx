import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import AssetFilters from './ui/AssetFilters'

export default async function AssetsPage({
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
  
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, can_manage_assets')
      .eq('id', user.id)
      .single()
    userRole = profile?.role || 'user'
    canManageAllAssets = profile?.can_manage_assets || false
    
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
  
  // Siempre usar admin client para evitar problemas con RLS
  // Aplicaremos el filtro de sedes manualmente según los permisos
  const dbClient = createSupabaseAdminClient()
  
  // Construir query base
  let query = dbClient
    .from('assets')
    .select(`
      *,
      location:locations(id, name, code)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  // Filtrar por sede según el rol del usuario y permisos
  if (userRole !== 'admin' && !canManageAllAssets) {
    // Solo usuarios sin permiso global ven activos filtrados por sede
    if (user) {
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
        query = query.in('location_id', locationIds)
      } else {
        // Si realmente no tiene sedes asignadas, no ver ningún activo
        query = query.eq('id', '00000000-0000-0000-0000-000000000000') // Query imposible = 0 resultados
      }
    }
  }
  // Si es admin o tiene can_manage_assets=true, ve TODOS los activos (sin filtro adicional)

  // Aplicar filtros
  if (params.search) {
    query = query.or(`asset_tag.ilike.%${params.search}%,serial_number.ilike.%${params.search}%,model.ilike.%${params.search}%,brand.ilike.%${params.search}%`)
  }
  
  if (params.type) {
    query = query.eq('asset_type', params.type)
  }
  
  if (params.status) {
    query = query.eq('status', params.status)
  }
  
  if (params.location) {
    query = query.eq('location_id', params.location)
  }

  const { data: assets, error } = await query
  
  // Obtener sedes para el filtro según el rol del usuario y permisos
  let locationsQuery = dbClient
    .from('locations')
    .select('id, name, code')
    .eq('is_active', true)
    .order('name')
  
  // Si no es admin y no tiene permiso global, filtrar por sedes asignadas
  if (userRole !== 'admin' && !canManageAllAssets && user) {
    const { data: userLocs } = await supabase
      .from('user_locations')
      .select('location_id')
      .eq('user_id', user.id)
    
    const locationIds = userLocs?.map(ul => ul.location_id).filter(Boolean) || []
    
    // Incluir también la location_id del perfil si existe
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
    operational: assets?.filter(a => a.status === 'OPERATIONAL').length || 0,
    maintenance: assets?.filter(a => a.status === 'MAINTENANCE').length || 0,
    outOfService: assets?.filter(a => a.status === 'OUT_OF_SERVICE').length || 0,
  }

  // Obtener solicitudes de baja pendientes (solo para admins)
  let pendingDisposalRequests: any[] = []
  if (userRole === 'admin') {
    const { data: disposalRequests, error: disposalError } = await dbClient
      .from('asset_disposal_requests')
      .select(`
        *,
        requester:profiles!asset_disposal_requests_requested_by_fkey(full_name),
        asset:assets(asset_tag, asset_type, brand, model, image_url)
      `)
      .eq('status', 'pending')
      .order('requested_at', { ascending: false })
    
    if (disposalError) {
      console.error('[AssetsPage] Error fetching disposal requests:', disposalError)
    }
    pendingDisposalRequests = disposalRequests || []
    console.log('[AssetsPage] Pending disposals:', pendingDisposalRequests.length)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Activos</h1>
          <p className="text-sm text-gray-600 mt-1">Administra el inventario de equipos de TI</p>
          {userRole !== 'admin' && userLocations.length > 0 && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-gray-600">
                Mis sedes: {userLocations.map(l => l.code).join(', ')}
              </span>
            </div>
          )}
        </div>
        {(userRole === 'admin' || userRole === 'supervisor') && (
          <div className="flex items-center gap-3">
            {userRole === 'admin' && (
              <Link
                href="/admin/assets/disposals"
                className={`btn inline-flex items-center gap-2 ${
                  pendingDisposalRequests.length > 0 
                    ? 'bg-amber-500 hover:bg-amber-600 text-white border-0 animate-pulse' 
                    : 'btn-outline btn-warning'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {pendingDisposalRequests.length > 0 ? (
                  <span className="font-semibold">{pendingDisposalRequests.length} Bajas Pendientes</span>
                ) : (
                  <span>Solicitudes de Baja</span>
                )}
              </Link>
            )}
            <Link
              href="/admin/assets/new"
              className="btn btn-primary inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo Activo
            </Link>
          </div>
        )}
        {(userRole === 'agent_l1' || userRole === 'agent_l2') && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Solo lectura - Consultar con supervisor</span>
          </div>
        )}
      </div>

      {/* Panel de aprobación de bajas (solo admins) */}
      {userRole === 'admin' && pendingDisposalRequests.length > 0 && (
        <Link 
          href="/admin/assets/disposals"
          className="block bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl p-4 hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-amber-900">
                  {pendingDisposalRequests.length} Solicitud{pendingDisposalRequests.length > 1 ? 'es' : ''} de Baja Pendiente{pendingDisposalRequests.length > 1 ? 's' : ''}
                </h3>
                <p className="text-sm text-amber-700">
                  Requieren su autorización para proceder
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-amber-700">
              <span className="font-medium">Ver Panel de Autorizaciones</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>
      )}

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
      <AssetFilters locations={locations || []} userRole={userRole} />

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
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-gray-900">{asset.asset_tag}</div>
                            <div className="text-xs text-gray-500">
                              {asset.brand || 'Sin marca'} {asset.model || ''} • {asset.serial_number || 'Sin S/N'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {asset.asset_type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {asset.status === 'OPERATIONAL' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>
                            Operacional
                          </span>
                        )}
                        {asset.status === 'MAINTENANCE' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-600"></span>
                            Mantenimiento
                          </span>
                        )}
                        {asset.status === 'OUT_OF_SERVICE' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                            Fuera de Servicio
                          </span>
                        )}
                        {asset.status === 'RETIRED' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-600"></span>
                            Retirado
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
                          href={`/admin/assets/${asset.id}`}
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
                        <p className="text-xs mt-1">Intenta ajustar los filtros o crea un nuevo activo</p>
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
