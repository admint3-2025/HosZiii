import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getReportsLocationFilter } from '@/lib/supabase/reports-filter'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AssetInventoryClient from '../../asset-inventory/AssetInventoryClient'

export default async function MaintenanceAssetInventoryReportPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string; type?: string; status?: string }>
}) {
  const supabase = await createSupabaseServerClient()
  const params = await searchParams
  const isDev = process.env.NODE_ENV !== 'production'

  // Verificar autenticación
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role,asset_category')
    .eq('id', user.id)
    .single()

  // Acceso: admin o usuarios cuyo área principal sea MAINTENANCE
  const canManageMaintenance = profile?.role === 'admin' || profile?.asset_category === 'MAINTENANCE'
  if (!canManageMaintenance) redirect('/reports')

  // En reportes de inventario exigimos supervisor/admin (gestión)
  if (!profile || !['admin', 'supervisor'].includes(profile.role)) redirect('/reports/maintenance')

  const locationFilter = await getReportsLocationFilter()
  const adminSupabase = createSupabaseAdminClient()

  // Sedes activas (en dropdown)
  let locationsQuery = adminSupabase
    .from('locations')
    .select('id, name, code')
    .eq('is_active', true)
    .order('name')

  // Si es supervisor sin acceso total, limitar a sus sedes
  if (profile.role === 'supervisor') {
    if (locationFilter.shouldFilter && locationFilter.locationIds.length > 0) {
      locationsQuery = locationsQuery.in('id', locationFilter.locationIds)
    } else if (locationFilter.shouldFilter && locationFilter.locationIds.length === 0) {
      locationsQuery = locationsQuery.eq('id', '00000000-0000-0000-0000-000000000000')
    }
  }

  const { data: locations } = await locationsQuery

  // Query de activos de mantenimiento (esquema nuevo)
  let query = adminSupabase
    .from('assets_maintenance')
    .select(
      `
      id,
      asset_code,
      name,
      description,
      category,
      status,
      brand,
      model,
      serial_number,
      location_id,
      assigned_to_user_id,
      purchase_date,
      warranty_expiry,
      notes,
      created_at,
      deleted_at
    `
    )
    .is('deleted_at', null)
    .order('asset_code', { ascending: true })

  // Filtro por sedes SOLO para supervisor
  if (profile.role === 'supervisor') {
    if (locationFilter.shouldFilter && locationFilter.locationIds.length > 0) {
      query = query.in('location_id', locationFilter.locationIds)
    } else if (locationFilter.shouldFilter && locationFilter.locationIds.length === 0) {
      query = query.eq('id', '00000000-0000-0000-0000-000000000000')
    }
  }

  // Filtros del usuario
  if (params.location) query = query.eq('location_id', params.location)
  if (params.type) query = query.eq('category', params.type)
  if (params.status) query = query.eq('status', params.status)

  const { data: rawAssets, error: assetsError } = await query

  if (assetsError) {
    const e: any = assetsError
    console.error('[maintenance-asset-inventory] Error fetching assets_maintenance:', {
      message: e?.message,
      details: e?.details,
      hint: e?.hint,
      code: e?.code,
      string: String(e),
    })
  }

  if (isDev) {
    console.log('[maintenance-asset-inventory] Assets count (assets_maintenance):', rawAssets?.length ?? 0)
    console.log('[maintenance-asset-inventory] Locations count:', locations?.length ?? 0)
  }

  // Normalizar a shape del cliente
  const normalizedAssets = (rawAssets ?? []).map((a: any) => ({
    id: a.id,
    asset_tag: a.asset_code,
    asset_type: a.category ?? 'OTHER',
    status: a.status ?? 'ACTIVE',
    brand: a.brand ?? null,
    model: a.model ?? null,
    serial_number: a.serial_number ?? null,
    processor: null,
    ram_gb: null,
    storage_gb: null,
    os: null,
    location_id: a.location_id ?? null,
    department: null,
    purchase_date: a.purchase_date ?? null,
    warranty_end_date: a.warranty_expiry ?? null,
    notes: a.notes ?? null,
    assigned_to: a.assigned_to_user_id ?? null,
    created_at: a.created_at,
    locations: null,
    _name: a.name ?? null,
    _description: a.description ?? null,
  }))

  // Mapear sede (evita depender de FK names)
  const assetsWithLocation = normalizedAssets.map((a: any) => ({
    ...a,
    locations: locations?.find((l: any) => l.id === a.location_id) ?? null,
  }))

  // Usuarios asignados
  const assignedUserIds = [...new Set(assetsWithLocation.map(a => a.assigned_to).filter(Boolean))]
  let assignedUsersMap = new Map()

  if (assignedUserIds.length > 0) {
    const { data: assignedUsers } = await adminSupabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', assignedUserIds)

    assignedUsersMap = new Map((assignedUsers ?? []).map(u => [u.id, u]))
  }

  const enrichedAssets = assetsWithLocation.map((asset: any) => ({
    ...asset,
    asset_location: asset.locations,
    assigned_user: asset.assigned_to ? assignedUsersMap.get(asset.assigned_to) : null,
  }))

  // Estadísticas
  const totalAssets = enrichedAssets.length
  const byLocation = enrichedAssets.reduce(
    (acc, asset) => {
      const locId = asset.location_id || 'sin-sede'
      const locName = asset.asset_location?.name || 'Sin sede asignada'
      if (!acc[locId]) acc[locId] = { name: locName, count: 0 }
      acc[locId].count++
      return acc
    },
    {} as Record<string, { name: string; count: number }>
  )

  const byStatus = enrichedAssets.reduce(
    (acc, asset) => {
      const st = asset.status || 'ACTIVE'
      acc[st] = (acc[st] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const uniqueCategories = Array.from(new Set(enrichedAssets.map(a => a.asset_type).filter(Boolean)))
  const assetTypeLabels: Record<string, string> = uniqueCategories.reduce((acc, cat) => {
    acc[String(cat)] = String(cat)
    return acc
  }, {} as Record<string, string>)

  const statusLabels: Record<string, string> = {
    ACTIVE: 'Activo',
    INACTIVE: 'Inactivo',
    MAINTENANCE: 'En Mantenimiento',
    DISPOSED: 'Dado de baja',
  }

  return (
    <main className="p-6 space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-orange-700 via-orange-800 to-red-900 shadow-md">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-24 -mt-24"></div>
        <div className="relative z-10 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/reports/maintenance"
                className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white">Inventario de Equipos (Mantenimiento)</h1>
                <p className="text-orange-100 text-sm">Catálogo completo con filtros por sede, tipo y estado</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card bg-gradient-to-br from-white to-orange-50">
          <div className="p-4">
            <div className="text-xs font-medium text-gray-600">Total de Equipos</div>
            <div className="text-2xl font-bold text-orange-600 mt-1">{totalAssets}</div>
            <div className="text-[10px] text-gray-500 mt-1">En inventario activo</div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-white to-green-50">
          <div className="p-4">
            <div className="text-xs font-medium text-gray-600">Activos</div>
            <div className="text-2xl font-bold text-green-600 mt-1">{byStatus.ACTIVE ?? 0}</div>
            <div className="text-[10px] text-gray-500 mt-1">En operación</div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-white to-amber-50">
          <div className="p-4">
            <div className="text-xs font-medium text-gray-600">En Mantenimiento</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">{byStatus.MAINTENANCE ?? 0}</div>
            <div className="text-[10px] text-gray-500 mt-1">Requieren atención</div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-white to-blue-50">
          <div className="p-4">
            <div className="text-xs font-medium text-gray-600">Sedes con Equipos</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">{Object.keys(byLocation).length}</div>
            <div className="text-[10px] text-gray-500 mt-1">Ubicaciones activas</div>
          </div>
        </div>
      </div>

      <AssetInventoryClient
        locations={locations ?? []}
        assets={enrichedAssets}
        assetTypeLabels={assetTypeLabels}
        statusLabels={statusLabels}
        assetDetailBasePath="/mantenimiento/assets"
        initialFilters={{
          location: params.location,
          type: params.type,
          status: params.status,
        }}
      />

      {/* Distribución por sede */}
      {Object.keys(byLocation).length > 0 && (
        <div className="card">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Distribución por Sede</h3>
          </div>
          <div className="p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(Object.entries(byLocation) as Array<[string, { name: string; count: number }]>)
                .sort((a, b) => b[1].count - a[1].count)
                .map(([locId, { name, count }]) => (
                  <div key={locId} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 text-sm truncate">{name}</div>
                        <div className="text-xs text-gray-600">{count} equipos</div>
                      </div>
                      <div className="text-2xl font-bold text-blue-600">{count}</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Nota informativa */}
      <div className="card bg-orange-50 border-orange-200">
        <div className="p-4">
          <div className="flex gap-3">
            <div className="text-2xl">📊</div>
            <div className="flex-1">
              <h3 className="font-semibold text-orange-900 text-sm mb-1">Sobre este reporte</h3>
              <p className="text-xs text-orange-800 leading-relaxed">
                Este reporte muestra el inventario completo de equipos de mantenimiento con opciones de filtrado por sede, tipo y estado.
                Puedes exportar los resultados a CSV desde el botón &quot;Exportar Excel&quot;.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
