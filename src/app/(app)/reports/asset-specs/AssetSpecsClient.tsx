'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

interface Asset {
  id: string
  asset_tag: string
  asset_type: string
  status: string
  brand: string | null
  model: string | null
  serial_number: string | null
  processor: string | null
  ram_gb: number | null
  storage_gb: number | null
  os: string | null
  location_id: string | null
  department: string | null
  assigned_to: string | null
  purchase_date: string | null
  asset_location: { code: string; name: string } | null
  assigned_user: { id: string; full_name: string; email: string } | null | undefined
}

interface Location {
  id: string
  code: string
  name: string
}

interface Props {
  initialAssets: Asset[]
  locations: Location[]
  departments: string[]
}

export default function AssetSpecsClient({ initialAssets, locations, departments }: Props) {
  const [filterType, setFilterType] = useState<string>('ALL')
  const [filterLocation, setFilterLocation] = useState<string>('ALL')
  const [filterDepartment, setFilterDepartment] = useState<string>('ALL')
  const [filterSpecs, setFilterSpecs] = useState<string>('ALL')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')

  // Aplicar filtros
  const filteredAssets = useMemo(() => {
    return initialAssets.filter(asset => {
      // Filtro por tipo
      if (filterType !== 'ALL' && asset.asset_type !== filterType) return false
      
      // Filtro por ubicación
      if (filterLocation !== 'ALL' && asset.location_id !== filterLocation) return false
      
      // Filtro por departamento
      if (filterDepartment !== 'ALL' && asset.department !== filterDepartment) return false
      
      // Filtro por estado
      if (filterStatus !== 'ALL' && asset.status !== filterStatus) return false
      
      // Filtro por especificaciones
      const hasSpecs = asset.processor || asset.ram_gb || asset.storage_gb || asset.os
      if (filterSpecs === 'WITH_SPECS' && !hasSpecs) return false
      if (filterSpecs === 'WITHOUT_SPECS' && hasSpecs) return false
      
      return true
    })
  }, [initialAssets, filterType, filterLocation, filterDepartment, filterSpecs, filterStatus])

  // Estadísticas de activos filtrados
  const totalAssets = filteredAssets.length
  const withSpecs = filteredAssets.filter(a => a.processor || a.ram_gb || a.storage_gb || a.os).length
  const desktops = filteredAssets.filter(a => a.asset_type === 'DESKTOP').length
  const laptops = filteredAssets.filter(a => a.asset_type === 'LAPTOP').length

  // Procesador más común
  const processorCounts = filteredAssets.reduce((acc, a) => {
    if (a.processor) {
      acc[a.processor] = (acc[a.processor] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)
  const topProcessor = Object.entries(processorCounts).sort((a, b) => b[1] - a[1])[0]

  const resetFilters = () => {
    setFilterType('ALL')
    setFilterLocation('ALL')
    setFilterDepartment('ALL')
    setFilterSpecs('ALL')
    setFilterStatus('ALL')
  }

  const hasActiveFilters = filterType !== 'ALL' || filterLocation !== 'ALL' || 
                          filterDepartment !== 'ALL' || filterSpecs !== 'ALL' || filterStatus !== 'ALL'

  return (
    <main className="p-6 space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 shadow-md">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-24 -mt-24"></div>
        <div className="relative z-10 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/reports"
                className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white">Especificaciones Técnicas de Activos</h1>
                <p className="text-violet-100 text-sm">Inventario detallado de PCs y Laptops con hardware y software</p>
              </div>
            </div>
            <a
              href="/reports/asset-specs/export-csv"
              className="px-3 py-1.5 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30 transition-colors text-white text-sm font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exportar CSV
            </a>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filtros
            </h3>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-xs text-violet-600 hover:text-violet-700 font-medium"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {/* Filtro por tipo */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Tipo de Equipo</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              >
                <option value="ALL">Todos</option>
                <option value="DESKTOP">🖥️ PC de Escritorio</option>
                <option value="LAPTOP">💻 Laptop</option>
              </select>
            </div>

            {/* Filtro por ubicación */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Ubicación</label>
              <select
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              >
                <option value="ALL">Todas</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>
                    {loc.code} - {loc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por departamento */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Departamento</label>
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              >
                <option value="ALL">Todos</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Filtro por estado */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Estado</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              >
                <option value="ALL">Todos</option>
                <option value="OPERATIONAL">Operacional</option>
                <option value="MAINTENANCE">En Mantenimiento</option>
                <option value="OUT_OF_SERVICE">Fuera de Servicio</option>
                <option value="RETIRED">Retirado</option>
              </select>
            </div>

            {/* Filtro por especificaciones */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Especificaciones</label>
              <select
                value={filterSpecs}
                onChange={(e) => setFilterSpecs(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              >
                <option value="ALL">Todos</option>
                <option value="WITH_SPECS">✅ Con especificaciones</option>
                <option value="WITHOUT_SPECS">⚠️ Sin especificaciones</option>
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="text-xs text-gray-600 pt-2 border-t">
              Mostrando <span className="font-semibold text-violet-600">{totalAssets}</span> de <span className="font-semibold">{initialAssets.length}</span> equipos
            </div>
          )}
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card bg-gradient-to-br from-white to-violet-50">
          <div className="p-4">
            <div className="text-xs font-medium text-gray-600">Total PCs/Laptops</div>
            <div className="text-2xl font-bold text-violet-600 mt-1">{totalAssets}</div>
            <div className="text-[10px] text-gray-500 mt-1">
              {desktops} PCs • {laptops} Laptops
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-white to-green-50">
          <div className="p-4">
            <div className="text-xs font-medium text-gray-600">Con Especificaciones</div>
            <div className="text-2xl font-bold text-green-600 mt-1">{withSpecs}</div>
            <div className="text-[10px] text-gray-500 mt-1">
              {Math.round((withSpecs / (totalAssets || 1)) * 100)}% del inventario
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-white to-blue-50">
          <div className="p-4">
            <div className="text-xs font-medium text-gray-600">Sin Especificar</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">{totalAssets - withSpecs}</div>
            <div className="text-[10px] text-gray-500 mt-1">Pendientes de registro</div>
          </div>
        </div>
        {topProcessor && (
          <div className="card bg-gradient-to-br from-white to-amber-50">
            <div className="p-4">
              <div className="text-xs font-medium text-gray-600">Procesador más común</div>
              <div className="text-sm font-bold text-amber-700 mt-1 line-clamp-2">
                {topProcessor[0]}
              </div>
              <div className="text-[10px] text-gray-500 mt-1">{topProcessor[1]} equipos</div>
            </div>
          </div>
        )}
      </div>

      {/* Tabla de activos */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 text-left text-gray-600">
              <tr>
                <th className="px-3 py-3 font-semibold text-xs">Activo</th>
                <th className="px-3 py-3 font-semibold text-xs">Procesador</th>
                <th className="px-3 py-3 font-semibold text-xs">RAM</th>
                <th className="px-3 py-3 font-semibold text-xs">Almacenamiento</th>
                <th className="px-3 py-3 font-semibold text-xs">Sistema Operativo</th>
                <th className="px-3 py-3 font-semibold text-xs">Ubicación</th>
                <th className="px-3 py-3 font-semibold text-xs">Responsable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAssets.map((asset) => {
                const location = asset.asset_location
                const assignedUser = asset.assigned_user
                const hasSpecs = asset.processor || asset.ram_gb || asset.storage_gb || asset.os
                
                return (
                  <tr key={asset.id} className={hasSpecs ? "hover:bg-gray-50" : "hover:bg-yellow-50 bg-yellow-50/30"}>
                    <td className="px-3 py-3">
                      <Link
                        href={`/admin/assets/${asset.id}`}
                        className="block hover:text-blue-600 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className="text-xl">
                            {asset.asset_type === 'LAPTOP' ? '💻' : '🖥️'}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{asset.asset_tag}</div>
                            <div className="text-xs text-gray-600">
                              {asset.brand} {asset.model}
                            </div>
                            {asset.serial_number && (
                              <div className="text-[10px] text-gray-500 font-mono">
                                S/N: {asset.serial_number}
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      {asset.processor ? (
                        <div className="text-xs font-mono bg-slate-50 px-2 py-1 rounded max-w-[200px]">
                          {asset.processor}
                        </div>
                      ) : (
                        <span className="text-xs text-red-500 font-semibold">⚠️ Sin especificar</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {asset.ram_gb ? (
                        <div className="text-sm">
                          <span className="font-bold text-gray-900">{asset.ram_gb}</span>
                          <span className="text-gray-600 ml-1">GB</span>
                        </div>
                      ) : (
                        <span className="text-xs text-red-500">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {asset.storage_gb ? (
                        <div className="text-sm">
                          <span className="font-bold text-gray-900">{asset.storage_gb}</span>
                          <span className="text-gray-600 ml-1">GB</span>
                        </div>
                      ) : (
                        <span className="text-xs text-red-500">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {asset.os ? (
                        <div className="text-xs font-mono bg-slate-50 px-2 py-1 rounded max-w-[150px]">
                          {asset.os}
                        </div>
                      ) : (
                        <span className="text-xs text-red-500">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {location ? (
                        <div className="text-xs">
                          <div className="font-semibold text-blue-700">{location.code}</div>
                          <div className="text-gray-600">{location.name}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Sin ubicación</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {assignedUser ? (
                        <div className="text-xs">
                          <div className="font-semibold text-gray-900">{assignedUser.full_name}</div>
                          <div className="text-gray-600">{assignedUser.email}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Sin asignar</span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {filteredAssets.length === 0 && (
                <tr>
                  <td className="px-3 py-12 text-center text-gray-500" colSpan={7}>
                    <div className="text-4xl mb-2">🔍</div>
                    <div className="font-medium">No se encontraron equipos con estos filtros</div>
                    <div className="text-xs mt-1">Intenta ajustar los criterios de búsqueda</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Nota informativa */}
      <div className="card bg-violet-50 border-violet-200">
        <div className="p-4">
          <div className="flex gap-3">
            <div className="text-2xl">💡</div>
            <div className="flex-1">
              <h3 className="font-semibold text-violet-900 text-sm mb-1">Importancia de las especificaciones</h3>
              <p className="text-xs text-violet-700 leading-relaxed">
                Mantener el inventario actualizado con especificaciones técnicas permite tomar decisiones informadas sobre 
                actualizaciones, reemplazos y optimización de recursos. Los equipos sin especificaciones (resaltados en amarillo) 
                deben ser completados para mantener un control preciso del hardware.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
