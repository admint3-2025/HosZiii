'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

type Location = {
  id: string
  name: string
  code: string
}

type Asset = {
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
  purchase_date: string | null
  warranty_end_date: string | null
  notes: string | null
  assigned_to: string | null
  created_at: string
  asset_location: any
  assigned_user: any
}

type Props = {
  locations: Location[]
  assets: Asset[]
  assetTypeLabels: Record<string, string>
  statusLabels: Record<string, string>
  initialFilters: {
    location?: string
    type?: string
    status?: string
  }
}

export default function AssetInventoryClient({
  locations,
  assets,
  assetTypeLabels,
  statusLabels,
  initialFilters,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedLocation, setSelectedLocation] = useState(initialFilters.location || '')
  const [selectedType, setSelectedType] = useState(initialFilters.type || '')
  const [selectedStatus, setSelectedStatus] = useState(initialFilters.status || '')

  const applyFilters = () => {
    const params = new URLSearchParams()
    if (selectedLocation) params.set('location', selectedLocation)
    if (selectedType) params.set('type', selectedType)
    if (selectedStatus) params.set('status', selectedStatus)
    router.push(`/reports/asset-inventory?${params.toString()}`)
  }

  const clearFilters = () => {
    setSelectedLocation('')
    setSelectedType('')
    setSelectedStatus('')
    router.push('/reports/asset-inventory')
  }

  const exportToCSV = () => {
    const headers = [
      'Etiqueta',
      'Tipo',
      'Marca',
      'Modelo',
      'Serie',
      'Estado',
      'Sede',
      'Departamento',
      'Responsable',
      'Procesador',
      'RAM (GB)',
      'Almacenamiento (GB)',
      'SO',
      'Fecha Compra',
      'Fin Garantía',
    ]

    const rows = assets.map(asset => [
      asset.asset_tag,
      assetTypeLabels[asset.asset_type] || asset.asset_type,
      asset.brand || '',
      asset.model || '',
      asset.serial_number || '',
      statusLabels[asset.status] || asset.status,
      (asset.asset_location as any)?.name || '',
      asset.department || '',
      (asset.assigned_user as any)?.full_name || '',
      asset.processor || '',
      asset.ram_gb?.toString() || '',
      asset.storage_gb?.toString() || '',
      asset.os || '',
      asset.purchase_date || '',
      asset.warranty_end_date || '',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `inventario-activos-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const hasActiveFilters = selectedLocation || selectedType || selectedStatus

  return (
    <>
      {/* Filtros */}
      <div className="card">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Filtros</h3>
            <div className="flex gap-2">
              <button
                onClick={exportToCSV}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Exportar Excel
              </button>
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Sede</label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas las sedes</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.code} - {loc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de Activo</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los tipos</option>
                {Object.entries(assetTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Estado</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los estados</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2">
              <button
                onClick={applyFilters}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Aplicar
              </button>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de activos */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3 font-semibold text-xs">Activo</th>
                <th className="px-4 py-3 font-semibold text-xs">Tipo</th>
                <th className="px-4 py-3 font-semibold text-xs">Estado</th>
                <th className="px-4 py-3 font-semibold text-xs">Sede</th>
                <th className="px-4 py-3 font-semibold text-xs">Responsable</th>
                <th className="px-4 py-3 font-semibold text-xs">Especificaciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {assets.map((asset) => {
                const location = asset.asset_location
                const assignedUser = asset.assigned_user
                const statusColors: Record<string, string> = {
                  OPERATIONAL: 'bg-green-100 text-green-800 border-green-300',
                  MAINTENANCE: 'bg-amber-100 text-amber-800 border-amber-300',
                  OUT_OF_SERVICE: 'bg-red-100 text-red-800 border-red-300',
                  RETIRED: 'bg-gray-100 text-gray-800 border-gray-300',
                }

                return (
                  <tr key={asset.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/assets/${asset.id}`}
                        className="block hover:text-blue-600 transition-colors"
                      >
                        <div className="font-semibold text-gray-900">{asset.asset_tag}</div>
                        <div className="text-xs text-gray-600">
                          {asset.brand} {asset.model}
                        </div>
                        {asset.serial_number && (
                          <div className="text-[10px] text-gray-500 font-mono">
                            S/N: {asset.serial_number}
                          </div>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-700">
                        {assetTypeLabels[asset.asset_type] || asset.asset_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 rounded-md text-xs font-bold border ${
                          statusColors[asset.status] || statusColors.OPERATIONAL
                        }`}
                      >
                        {statusLabels[asset.status] || asset.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {location ? (
                        <div className="text-xs">
                          <div className="font-semibold text-blue-700">{location.code}</div>
                          <div className="text-gray-600">{location.name}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Sin sede</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {assignedUser ? (
                        <div className="text-xs">
                          <div className="font-semibold text-gray-900">{assignedUser.full_name}</div>
                          <div className="text-gray-600">{assignedUser.email}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Sin asignar</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {(asset.processor || asset.ram_gb || asset.storage_gb || asset.os) ? (
                        <div className="text-xs space-y-0.5">
                          {asset.processor && (
                            <div className="text-gray-700 truncate max-w-[200px]">
                              🔧 {asset.processor}
                            </div>
                          )}
                          {(asset.ram_gb || asset.storage_gb) && (
                            <div className="text-gray-600">
                              💾 {asset.ram_gb ? `${asset.ram_gb}GB RAM` : ''}
                              {asset.ram_gb && asset.storage_gb && ' • '}
                              {asset.storage_gb ? `${asset.storage_gb}GB` : ''}
                            </div>
                          )}
                          {asset.os && (
                            <div className="text-gray-600 truncate max-w-[200px]">⚙️ {asset.os}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Sin especificaciones</span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {assets.length === 0 && (
                <tr>
                  <td className="px-4 py-12 text-center text-gray-500" colSpan={6}>
                    <div className="text-4xl mb-2">📦</div>
                    <div className="font-medium">No hay activos con los filtros seleccionados</div>
                    <div className="text-xs mt-1">Ajusta los filtros o limpia la búsqueda</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
