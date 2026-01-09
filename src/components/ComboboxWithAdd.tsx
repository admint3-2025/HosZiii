'use client'

import { useState, useRef, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

interface ComboboxWithAddProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  suggestions: string[]
  placeholder?: string
  type?: 'text' | 'number'
  min?: string
  className?: string
  allowAdd?: boolean
  tableName?: 'asset_processors' | 'asset_operating_systems'
  onSuggestionsUpdate?: (newSuggestions: string[]) => void
}

export default function ComboboxWithAdd({
  id,
  label,
  value,
  onChange,
  suggestions: initialSuggestions,
  placeholder,
  type = 'text',
  min,
  className = '',
  allowAdd = false,
  tableName,
  onSuggestionsUpdate,
}: ComboboxWithAddProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>(initialSuggestions)
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>(initialSuggestions)
  const [isAdding, setIsAdding] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Actualizar sugerencias cuando cambien las iniciales
  useEffect(() => {
    setSuggestions(initialSuggestions)
    setFilteredSuggestions(initialSuggestions)
  }, [initialSuggestions])

  // Filtrar sugerencias basado en el valor actual
  useEffect(() => {
    if (value) {
      const filtered = suggestions.filter((s) =>
        s.toLowerCase().includes(value.toLowerCase())
      )
      setFilteredSuggestions(filtered)
    } else {
      setFilteredSuggestions(suggestions)
    }
  }, [value, suggestions])

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (suggestion: string) => {
    onChange(suggestion)
    setIsOpen(false)
    inputRef.current?.focus()
  }

  const handleAddNew = async () => {
    if (!allowAdd || !tableName || !value.trim()) return

    setIsAdding(true)
    const supabase = createSupabaseBrowserClient()

    try {
      const { data: userData } = await supabase.auth.getUser()
      
      // Determinar el campo adicional según la tabla
      const additionalData: any = { name: value.trim() }
      
      if (tableName === 'asset_processors') {
        // Intentar detectar el fabricante
        const valueLower = value.toLowerCase()
        if (valueLower.includes('intel')) additionalData.manufacturer = 'Intel'
        else if (valueLower.includes('amd') || valueLower.includes('ryzen')) additionalData.manufacturer = 'AMD'
        else if (valueLower.includes('apple') || valueLower.includes('m1') || valueLower.includes('m2') || valueLower.includes('m3')) additionalData.manufacturer = 'Apple'
      } else if (tableName === 'asset_operating_systems') {
        // Intentar detectar la familia de SO
        const valueLower = value.toLowerCase()
        if (valueLower.includes('windows')) additionalData.os_family = 'Windows'
        else if (valueLower.includes('ubuntu') || valueLower.includes('debian') || valueLower.includes('fedora') || valueLower.includes('linux')) additionalData.os_family = 'Linux'
        else if (valueLower.includes('macos') || valueLower.includes('mac os')) additionalData.os_family = 'macOS'
        else if (valueLower.includes('chrome os')) additionalData.os_family = 'Chrome OS'
      }

      if (userData.user) {
        additionalData.created_by = userData.user.id
      }

      const { data, error } = await supabase
        .from(tableName)
        .insert(additionalData)
        .select()
        .single()

      if (error) {
        console.error('Error adding new item:', error)
        if (error.code === '23505') {
          alert('Este elemento ya existe en el catálogo')
        } else if (error.message?.includes('row-level security')) {
          alert('No tienes permisos para agregar elementos al catálogo. Contacta a un administrador.')
        } else {
          alert(`Error al agregar: ${error.message}`)
        }
        return
      }

      // Agregar el nuevo elemento a las sugerencias
      const newSuggestions = [...suggestions, data.name].sort()
      setSuggestions(newSuggestions)
      setFilteredSuggestions(newSuggestions)
      
      // Notificar al componente padre
      if (onSuggestionsUpdate) {
        onSuggestionsUpdate(newSuggestions)
      }

      // Seleccionar el nuevo elemento
      onChange(data.name)
      setIsOpen(false)
      
      alert(`✅ "${data.name}" agregado correctamente al catálogo`)
    } catch (error) {
      console.error('Unexpected error:', error)
      alert('Error inesperado al agregar el elemento')
    } finally {
      setIsAdding(false)
    }
  }

  const showAddButton = allowAdd && tableName && value.trim() && 
    !suggestions.some(s => s.toLowerCase() === value.toLowerCase())

  return (
    <div ref={wrapperRef} className="relative">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className={`block w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
          placeholder={placeholder}
          min={min}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute inset-y-0 right-0 flex items-center px-2 text-gray-400 hover:text-gray-600"
          tabIndex={-1}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Dropdown de sugerencias */}
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {filteredSuggestions.length > 0 && (
            <div>
              {filteredSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSelect(suggestion)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 ${
                    suggestion === value ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-700'
                  }`}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {/* Botón para agregar nuevo elemento */}
          {showAddButton && (
            <div className="border-t border-gray-200 bg-green-50">
              <button
                type="button"
                onClick={handleAddNew}
                disabled={isAdding}
                className="w-full px-3 py-2.5 text-left text-sm font-bold text-green-700 hover:bg-green-100 flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                {isAdding ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Agregando...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>➕ Agregar &quot;{value}&quot; al catálogo permanentemente</span>
                  </>
                )}
              </button>
            </div>
          )}

          {filteredSuggestions.length === 0 && !showAddButton && value.trim() && (
            <div className="px-3 py-4 text-sm">
              {allowAdd && tableName ? (
                <div className="text-amber-600 text-center">
                  <p className="font-medium">Este elemento ya existe en el catálogo</p>
                  <p className="text-xs mt-1 text-amber-700">Selecciónalo de la lista o escribe un nombre diferente</p>
                </div>
              ) : (
                <div className="text-gray-500 text-center">
                  No se encontraron resultados
                </div>
              )}
            </div>
          )}

          {filteredSuggestions.length === 0 && !showAddButton && !value.trim() && (
            <div className="px-3 py-4 text-sm text-gray-500 text-center">
              Escribe para buscar o agregar un elemento nuevo
            </div>
          )}
        </div>
      )}
    </div>
  )
}
