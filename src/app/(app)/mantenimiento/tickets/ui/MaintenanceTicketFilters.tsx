'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'

type Location = {
  id: string
  code: string
  name: string
}

export default function MaintenanceTicketFilters({ 
  locations 
}: { 
  locations: Location[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const view = searchParams.get('view') || ''
  
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [status, setStatus] = useState(searchParams.get('status') || '')
  const [priority, setPriority] = useState(searchParams.get('priority') || '')
  const [location, setLocation] = useState(searchParams.get('location') || '')

  const handleFilter = () => {
    const params = new URLSearchParams()
    if (view) params.set('view', view)
    if (search) params.set('search', search)
    if (status) params.set('status', status)
    if (priority) params.set('priority', priority)
    if (location) params.set('location', location)
    
    startTransition(() => {
      router.push(`/mantenimiento/tickets?${params.toString()}`)
    })
  }

  const handleClear = () => {
    setSearch('')
    setStatus('')
    setPriority('')
    setLocation('')
    startTransition(() => {
      router.push(view ? `/mantenimiento/tickets?view=${encodeURIComponent(view)}` : '/mantenimiento/tickets')
    })
  }

  const hasFilters = search || status || priority || location

  return (
    <div className="card shadow-sm border border-slate-200">
      <div className="card-body p-4">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900">Filtros y Búsqueda</h3>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Búsqueda */}
          <div className="lg:col-span-4">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Buscar solicitud
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
                placeholder="Buscar por #, título o descripción..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Estado
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="">Todos los estados</option>
              <option value="NEW">Nuevo</option>
              <option value="ASSIGNED">Asignado</option>
              <option value="IN_PROGRESS">En progreso</option>
              <option value="NEEDS_INFO">Info requerida</option>
              <option value="WAITING_THIRD_PARTY">Esperando 3ro</option>
              <option value="RESOLVED">Resuelto</option>
              <option value="CLOSED">Cerrado</option>
            </select>
          </div>

          {/* Prioridad */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Prioridad
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="">Todas las prioridades</option>
              <option value="1">P1 - Crítica</option>
              <option value="2">P2 - Alta</option>
              <option value="3">P3 - Media</option>
              <option value="4">P4 - Baja</option>
            </select>
          </div>

          {/* Sede/Ubicación */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Sede
            </label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="">Todas las sedes</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  [{loc.code}] {loc.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Botones */}
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={handleFilter}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {isPending ? 'Filtrando...' : 'Aplicar filtros'}
          </button>
          
          {hasFilters && (
            <button
              onClick={handleClear}
              disabled={isPending}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Limpiar
            </button>
          )}

          {hasFilters && (
            <span className="text-xs text-gray-500 ml-auto">
              {[search, status, priority, location].filter(Boolean).length} filtro(s) activo(s)
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
