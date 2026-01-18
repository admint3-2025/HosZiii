'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'

type Location = {
  id: string
  name: string
  code: string
}

type MaintenanceAssetFiltersProps = {
  locations: Location[]
  userRole: string
}

export default function MaintenanceAssetFilters({ locations, userRole }: MaintenanceAssetFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [type, setType] = useState(searchParams.get('type') || '')
  const [status, setStatus] = useState(searchParams.get('status') || '')
  const [location, setLocation] = useState(searchParams.get('location') || '')

  const handleFilter = () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (type) params.set('type', type)
    if (status) params.set('status', status)
    if (location) params.set('location', location)
    
    startTransition(() => {
      router.push(`/mantenimiento/assets?${params.toString()}`)
    })
  }

  const handleClear = () => {
    setSearch('')
    setType('')
    setStatus('')
    setLocation('')
    startTransition(() => {
      router.push('/mantenimiento/assets')
    })
  }

  const hasFilters = search || type || status || location
  const isAdmin = userRole === 'admin'

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

          {/* Sede/Ubicación */}
          {isAdmin && locations.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Sede / Ubicación
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todas las sedes</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.code} - {loc.name}
                  </option>
                ))}
              </select>
            </div>
          )}

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
              <option value="AIR_CONDITIONING">Aire Acondicionado</option>
              <option value="HVAC_SYSTEM">Sistema HVAC</option>
              <option value="BOILER">Caldera</option>
              <option value="REFRIGERATOR">Refrigerador</option>
              <option value="KITCHEN_EQUIPMENT">Equipo de Cocina</option>
              <option value="WASHING_MACHINE">Lavadora</option>
              <option value="DRYER">Secadora</option>
              <option value="WATER_HEATER">Calentador de Agua</option>
              <option value="PUMP">Bomba</option>
              <option value="GENERATOR">Generador</option>
              <option value="ELEVATOR">Elevador</option>
              <option value="FURNITURE">Mobiliario</option>
              <option value="FIXTURE">Fixture</option>
              <option value="CLEANING_EQUIPMENT">Equipo de Limpieza</option>
              <option value="SECURITY_SYSTEM">Sistema de Seguridad</option>
              <option value="FIRE_SYSTEM">Sistema Contra Incendios</option>
              <option value="PLUMBING">Plomería</option>
              <option value="ELECTRICAL">Eléctrico</option>
              <option value="LIGHTING">Iluminación</option>
              <option value="VEHICLE">Vehículo</option>
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
              <option value="ACTIVE">Activo</option>
              <option value="MAINTENANCE">Mantenimiento</option>
              <option value="INACTIVE">Inactivo</option>
              <option value="DISPOSED">Descartado</option>
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
