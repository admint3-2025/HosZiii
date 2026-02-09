'use client'

import { useState, useRef, useEffect } from 'react'

// Departamentos de inspección disponibles (deben coincidir con los del InspectionFlowSelector)
const INSPECTION_DEPARTMENTS = [
  { id: 'rrhh', name: 'RECURSOS HUMANOS' },
  { id: 'gsh', name: 'GSH' },
  { id: 'cuartos', name: 'DIV. CUARTOS' },
  { id: 'mantenimiento', name: 'MANTENIMIENTO' },
  { id: 'sistemas', name: 'SISTEMAS' },
  { id: 'marketing', name: 'MARKETING' },
  { id: 'alimentos', name: 'ALIMENTOS Y BEBIDAS' },
  { id: 'llaves', name: 'AMA DE LLAVES' },
  { id: 'contabilidad', name: 'CONTABILIDAD' },
]

type Props = {
  value: string[]
  onChange: (value: string[]) => void
  label?: string
  helpText?: string
}

export default function InspectionDepartmentsSelector({
  value,
  onChange,
  label = 'Departamentos de Inspección',
  helpText = 'Sin selección = acceso a todos los departamentos',
}: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleDepartment = (deptName: string) => {
    if (value.includes(deptName)) {
      onChange(value.filter(d => d !== deptName))
    } else {
      onChange([...value, deptName])
    }
  }

  const selectAll = () => {
    onChange(INSPECTION_DEPARTMENTS.map(d => d.name))
  }

  const clearAll = () => {
    onChange([])
  }

  const selectedCount = value.length

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-[11px] font-medium text-gray-700 mb-1">{label}</label>
      
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-left hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors"
      >
        <span className={selectedCount === 0 ? 'text-gray-500' : 'text-gray-900'}>
          {selectedCount === 0 
            ? 'Todos los departamentos' 
            : `${selectedCount} departamento${selectedCount > 1 ? 's' : ''} seleccionado${selectedCount > 1 ? 's' : ''}`
          }
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

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-auto">
          {/* Quick actions */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50">
            <button
              type="button"
              onClick={selectAll}
              className="text-[10px] text-amber-600 hover:text-amber-700 font-medium"
            >
              Seleccionar todos
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="text-[10px] text-gray-500 hover:text-gray-700 font-medium"
            >
              Limpiar
            </button>
          </div>

          {/* Department list */}
          <div className="py-1">
            {INSPECTION_DEPARTMENTS.map((dept) => {
              const isSelected = value.includes(dept.name)
              return (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => toggleDepartment(dept.name)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-amber-50 transition-colors ${
                    isSelected ? 'bg-amber-50 text-amber-900' : 'text-gray-700'
                  }`}
                >
                  <span className={`w-4 h-4 flex items-center justify-center rounded border ${
                    isSelected 
                      ? 'bg-amber-500 border-amber-500 text-white' 
                      : 'border-gray-300'
                  }`}>
                    {isSelected && (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <span className="truncate">{dept.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Selected tags preview */}
      {selectedCount > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {value.slice(0, 3).map((deptName) => (
            <span
              key={deptName}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-medium"
            >
              {deptName}
              <button
                type="button"
                onClick={() => toggleDepartment(deptName)}
                className="hover:text-amber-600"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
          {selectedCount > 3 && (
            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-medium">
              +{selectedCount - 3} más
            </span>
          )}
        </div>
      )}

      <p className="mt-1 text-[10px] text-gray-500">{helpText}</p>
    </div>
  )
}
