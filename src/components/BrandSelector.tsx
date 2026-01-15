'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

type Brand = {
  id: string
  name: string
  category: string | null
}

type BrandSelectorProps = {
  value: string
  onChange: (value: string) => void
  required?: boolean
  placeholder?: string
  allowCreate?: boolean
}

export default function BrandSelector({
  value,
  onChange,
  required = false,
  placeholder = 'Selecciona una marca',
  allowCreate = true,
}: BrandSelectorProps) {
  const [brands, setBrands] = useState<Brand[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newBrandName, setNewBrandName] = useState('')
  const [newBrandCategory, setNewBrandCategory] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBrands()
  }, [])

  async function loadBrands() {
    const supabase = createSupabaseBrowserClient()
    const { data } = await supabase
      .from('brands')
      .select('id, name, category')
      .eq('is_active', true)
      .order('name')
    
    setBrands(data ?? [])
    setLoading(false)
  }

  async function createBrand() {
    if (!newBrandName.trim()) return

    setIsCreating(true)
    const supabase = createSupabaseBrowserClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    const { data, error } = await supabase
      .from('brands')
      .insert({
        name: newBrandName.trim(),
        category: newBrandCategory.trim() || null,
        is_active: true,
        created_by: user?.id,
      })
      .select()
      .single()

    if (error) {
      alert(`Error al crear marca: ${error.message}`)
      setIsCreating(false)
      return
    }

    // Registrar en auditoría
    await supabase.from('audit_log').insert({
      entity_type: 'brand',
      entity_id: data.id,
      action: 'CREATE',
      actor_id: user?.id,
      metadata: {
        name: data.name,
        category: data.category,
      },
    })

    // Actualizar lista y seleccionar la nueva
    await loadBrands()
    onChange(data.name)
    setShowCreateModal(false)
    setNewBrandName('')
    setNewBrandCategory('')
    setIsCreating(false)
  }

  if (loading) {
    return (
      <select
        disabled
        className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
      >
        <option>Cargando marcas...</option>
      </select>
    )
  }

  // Agrupar marcas por categoría
  const categorizedBrands = brands.reduce((acc, brand) => {
    const cat = brand.category || 'Sin categoría'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(brand)
    return acc
  }, {} as Record<string, Brand[]>)

  return (
    <>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => {
            if (e.target.value === '__CREATE_NEW__') {
              setShowCreateModal(true)
            } else {
              onChange(e.target.value)
            }
          }}
          required={required}
          className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">{placeholder}</option>
          {Object.entries(categorizedBrands).sort().map(([category, categoryBrands]) => (
            <optgroup key={category} label={category}>
              {categoryBrands.map((brand) => (
                <option key={brand.id} value={brand.name}>
                  {brand.name}
                </option>
              ))}
            </optgroup>
          ))}
          {allowCreate && (
            <option value="__CREATE_NEW__" className="font-semibold text-blue-600">
              + Crear nueva marca
            </option>
          )}
        </select>
      </div>

      {/* Modal para crear marca */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Crear Nueva Marca</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nombre de la Marca <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  placeholder="Ej: Dell, HP, Lenovo..."
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Categoría (Opcional)
                </label>
                <input
                  type="text"
                  list="category-suggestions"
                  value={newBrandCategory}
                  onChange={(e) => setNewBrandCategory(e.target.value)}
                  placeholder="Escribe o selecciona una categoría..."
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <datalist id="category-suggestions">
                  <option value="Computadoras" />
                  <option value="Impresoras" />
                  <option value="Almacenamiento" />
                  <option value="Componentes" />
                  <option value="Periféricos" />
                  <option value="Audio" />
                  <option value="Redes" />
                  <option value="Monitores" />
                  <option value="Aire Acondicionado" />
                  <option value="Ventilación" />
                  <option value="Refrigeración" />
                  <option value="Calefacción" />
                  <option value="Electrodomésticos Cocina" />
                  <option value="Equipos de Lavandería" />
                  <option value="Refrigeradores" />
                  <option value="Plomería" />
                  <option value="Eléctrico" />
                  <option value="Generadores" />
                  <option value="Elevadores" />
                  <option value="Seguridad" />
                  <option value="Mobiliario" />
                  <option value="Limpieza" />
                  <option value="Vehículos" />
                  <option value="General" />
                </datalist>
                <p className="text-xs text-gray-500 mt-1">Escribe o selecciona la categoría del producto</p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={isCreating}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={createBrand}
                  disabled={!newBrandName.trim() || isCreating}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isCreating ? 'Creando...' : 'Crear Marca'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
