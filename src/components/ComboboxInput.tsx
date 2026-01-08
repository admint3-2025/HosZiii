'use client'

import { useState, useRef, useEffect } from 'react'

interface ComboboxInputProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  suggestions: string[]
  placeholder?: string
  type?: 'text' | 'number'
  min?: string
  className?: string
}

export default function ComboboxInput({
  id,
  label,
  value,
  onChange,
  suggestions,
  placeholder,
  type = 'text',
  min,
  className = '',
}: ComboboxInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>(suggestions)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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
      {isOpen && filteredSuggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-auto">
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
    </div>
  )
}

// Sugerencias predefinidas para especificaciones técnicas
export const PROCESSOR_SUGGESTIONS = [
  'Intel Core i3-1215U',
  'Intel Core i5-1235U',
  'Intel Core i5-1335U',
  'Intel Core i5-1340P',
  'Intel Core i7-1255U',
  'Intel Core i7-1355U',
  'Intel Core i7-1365U',
  'Intel Core i7-1370P',
  'Intel Core i9-13900H',
  'Intel Core i9-14900HX',
  'Intel Celeron N4500',
  'Intel Pentium Gold 8505',
  'AMD Ryzen 3 7320U',
  'AMD Ryzen 5 5500U',
  'AMD Ryzen 5 5600G',
  'AMD Ryzen 5 7520U',
  'AMD Ryzen 5 7530U',
  'AMD Ryzen 5 7535U',
  'AMD Ryzen 5 7600X',
  'AMD Ryzen 7 5700G',
  'AMD Ryzen 7 5700U',
  'AMD Ryzen 7 7730U',
  'AMD Ryzen 7 7735U',
  'AMD Ryzen 7 7840U',
  'AMD Ryzen 9 7940HS',
  'AMD Ryzen 9 7950X',
  'Apple M1',
  'Apple M1 Pro',
  'Apple M1 Max',
  'Apple M2',
  'Apple M2 Pro',
  'Apple M2 Max',
  'Apple M3',
  'Apple M3 Pro',
  'Apple M3 Max',
]

export const RAM_SUGGESTIONS = ['4', '8', '16', '32', '64', '128']

export const STORAGE_SUGGESTIONS = ['128', '256', '512', '1024', '2048']

export const OS_SUGGESTIONS = [
  'Windows 10 Home',
  'Windows 10 Pro',
  'Windows 11 Home',
  'Windows 11 Pro',
  'Windows 11 Pro for Workstations',
  'Windows Server 2019',
  'Windows Server 2022',
  'Ubuntu 20.04 LTS',
  'Ubuntu 22.04 LTS',
  'Ubuntu 24.04 LTS',
  'Debian 11',
  'Debian 12',
  'Fedora 39',
  'Fedora 40',
  'Linux Mint 21',
  'macOS Ventura',
  'macOS Sonoma',
  'macOS Sequoia',
  'Chrome OS',
]
