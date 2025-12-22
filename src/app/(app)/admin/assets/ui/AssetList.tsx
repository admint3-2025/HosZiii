'use client'

import { useState } from 'react'
import Link from 'next/link'

type Asset = {
  id: string
  asset_tag: string
  asset_type: string
  brand: string | null
  model: string | null
  serial_number: string | null
  assigned_to: string | null
  location: string | null
  department: string | null
  status: string
  purchase_date: string | null
  warranty_end_date: string | null
  notes: string | null
  created_at: string
}

const ASSET_TYPE_LABELS: Record<string, string> = {
  DESKTOP: 'Computadora de escritorio',
  LAPTOP: 'Laptop',
  PRINTER: 'Impresora',
  SCANNER: 'Escáner',
  MONITOR: 'Monitor',
  PHONE: 'Teléfono',
  TABLET: 'Tablet',
  SERVER: 'Servidor',
  NETWORK_DEVICE: 'Equipo de red',
  PROJECTOR: 'Proyector',
  OTHER: 'Otro',
}

const STATUS_LABELS: Record<string, string> = {
  OPERATIONAL: 'Operacional',
  MAINTENANCE: 'En mantenimiento',
  OUT_OF_SERVICE: 'Fuera de servicio',
  RETIRED: 'Retirado',
}

const STATUS_COLORS: Record<string, string> = {
  OPERATIONAL: 'bg-green-100 text-green-700 border-green-200',
  MAINTENANCE: 'bg-amber-100 text-amber-700 border-amber-200',
  OUT_OF_SERVICE: 'bg-red-100 text-red-700 border-red-200',
  RETIRED: 'bg-gray-100 text-gray-700 border-gray-200',
}

export default function AssetList({ assets }: { assets: Asset[] }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.asset_tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.serial_number?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'ALL' || asset.status === statusFilter
    const matchesType = typeFilter === 'ALL' || asset.asset_type === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="card shadow-sm border border-gray-200">
        <div className="card-body p-4">
          <div className="grid md:grid-cols-3 gap-4">
            {/* Búsqueda */}
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Buscar</label>
              <input
                type="text"
                className="input text-sm"
                placeholder="Tag, marca, modelo, serial..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filtro por estado */}
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Estado</label>
              <select
                className="select text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">Todos</option>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por tipo */}
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Tipo</label>
              <select
                className="select text-sm"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="ALL">Todos</option>
                {Object.entries(ASSET_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Resultados */}
      <div className="text-sm text-gray-600">
        Mostrando {filteredAssets.length} de {assets.length} activos
      </div>

      {/* Lista */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredAssets.map((asset) => (
          <Link
            key={asset.id}
            href={`/admin/assets/${asset.id}`}
            className="card shadow-sm border border-gray-200 hover:shadow-lg hover:border-purple-300 transition-all group"
          >
            <div className="card-body p-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-bold text-purple-600">
                      {asset.asset_tag}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                        STATUS_COLORS[asset.status]
                      }`}
                    >
                      {STATUS_LABELS[asset.status]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 font-medium">
                    {ASSET_TYPE_LABELS[asset.asset_type]}
                  </p>
                </div>
                <svg
                  className="w-5 h-5 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>

              {/* Detalles */}
              <div className="space-y-1.5 text-xs">
                {asset.brand && asset.model && (
                  <div className="flex items-center gap-1.5 text-gray-700">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span className="font-medium">{asset.brand} {asset.model}</span>
                  </div>
                )}
                {asset.location && (
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {asset.location}
                  </div>
                )}
                {asset.department && (
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {asset.department}
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filteredAssets.length === 0 && (
        <div className="card shadow-sm border border-gray-200">
          <div className="card-body p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm text-gray-600 font-medium">No se encontraron activos</p>
            <p className="text-xs text-gray-500 mt-1">Intenta ajustar los filtros de búsqueda</p>
          </div>
        </div>
      )}
    </div>
  )
}
