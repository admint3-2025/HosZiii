'use client'

import { useState } from 'react'

type Location = {
  id: string
  name: string
  code: string
}

type Props = {
  value: string[] // Array de IDs de sedes seleccionadas
  onChange: (locationIds: string[]) => void
  locations: Location[]
  className?: string
  label?: string
  helpText?: string
}

export default function MultiLocationSelector({
  value,
  onChange,
  locations,
  className = '',
  label = 'Sedes asignadas',
  helpText = 'Selecciona una o más sedes para este usuario',
}: Props) {
  const [isOpen, setIsOpen] = useState(false)

  const selectedLocations = locations.filter((loc) => value.includes(loc.id))
  const availableLocations = locations.filter((loc) => !value.includes(loc.id))

  const toggleLocation = (locationId: string) => {
    if (value.includes(locationId)) {
      onChange(value.filter((id) => id !== locationId))
    } else {
      onChange([...value, locationId])
    }
  }

  const removeLocation = (locationId: string) => {
    onChange(value.filter((id) => id !== locationId))
  }

  return (
    <div className={className}>
      <label className="block text-[11px] font-medium text-gray-700">{label}</label>
      {helpText && <p className="text-[10px] text-gray-500 mt-0.5">{helpText}</p>}

      {/* Tags de sedes seleccionadas */}
      {selectedLocations.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {selectedLocations.map((loc) => (
            <span
              key={loc.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium bg-indigo-100 text-indigo-800 rounded border border-indigo-300"
              title={loc.name}
            >
              {loc.code}
              <button
                type="button"
                onClick={() => removeLocation(loc.id)}
                className="ml-0.5 hover:text-indigo-900"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown de sedes disponibles */}
      <div className="relative mt-1.5">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs text-left border border-gray-300 rounded-md hover:border-gray-400 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        >
          <span className="text-gray-500">
            {selectedLocations.length === 0
              ? 'Selecciona sedes...'
              : `${selectedLocations.length} sede${selectedLocations.length > 1 ? 's' : ''} seleccionada${selectedLocations.length > 1 ? 's' : ''}`}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && availableLocations.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-auto">
            {availableLocations.map((loc) => (
              <button
                key={loc.id}
                type="button"
                onClick={() => {
                  toggleLocation(loc.id)
                  // No cerramos el dropdown para permitir múltiples selecciones
                }}
                className="w-full px-3 py-2 text-xs text-left hover:bg-indigo-50 flex items-center gap-2"
              >
                <span className="font-medium text-indigo-600">{loc.code}</span>
                <span className="text-gray-700">{loc.name}</span>
              </button>
            ))}
          </div>
        )}

        {isOpen && availableLocations.length === 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
            <div className="px-3 py-2 text-xs text-gray-500">
              Todas las sedes ya están seleccionadas
            </div>
          </div>
        )}
      </div>

      {/* Click fuera para cerrar */}
      {isOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsOpen(false)}
        ></div>
      )}
    </div>
  )
}
