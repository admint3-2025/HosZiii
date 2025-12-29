'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'

export default function AssetFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [type, setType] = useState(searchParams.get('type') || '')
  const [status, setStatus] = useState(searchParams.get('status') || '')

  const handleFilter = () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (type) params.set('type', type)
    if (status) params.set('status', status)
    
    startTransition(() => {
      router.push(`/admin/assets?${params.toString()}`)
    })
  }

  const handleClear = () => {
    setSearch('')
    setType('')
    setStatus('')
    startTransition(() => {
      router.push('/admin/assets')
    })
  }

  const hasFilters = search || type || status

  return (
    <div className="card shadow-sm border border-slate-200">
      <div className="card-body p-4">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900">Filtros y Búsqueda</h3>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Búsqueda */}
          <div className="lg:col-span-3">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Buscar activo
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
                placeholder="Buscar por etiqueta, marca, modelo, número de serie..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Tipo de Activo
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos los tipos</option>
              <option value="DESKTOP">Desktop</option>
              <option value="LAPTOP">Laptop</option>
              <option value="PRINTER">Impresora</option>
              <option value="SCANNER">Escáner</option>
              <option value="SERVER">Servidor</option>
              <option value="NETWORK_DEVICE">Dispositivo de Red</option>
              <option value="PHONE">Teléfono</option>
              <option value="TABLET">Tablet</option>
              <option value="MONITOR">Monitor</option>
              <option value="PERIPHERAL">Periférico</option>
              <option value="OTHER">Otro</option>
            </select>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Estado
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos los estados</option>
              <option value="OPERATIONAL">Operacional</option>
              <option value="MAINTENANCE">Mantenimiento</option>
              <option value="OUT_OF_SERVICE">Fuera de Servicio</option>
              <option value="RETIRED">Retirado</option>
            </select>
          </div>

          {/* Botones */}
          <div className="flex items-end gap-2">
            <button
              onClick={handleFilter}
              disabled={isPending}
              className="btn btn-primary flex-1 inline-flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Buscar
            </button>
            {hasFilters && (
              <button
                onClick={handleClear}
                disabled={isPending}
                className="btn btn-secondary inline-flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
