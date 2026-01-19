'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import BrandSelector from '@/components/BrandSelector'
import AssetImageUpload from '@/components/AssetImageUpload'

type Location = {
  id: string
  name: string
  code: string
}

type AssetType = {
  id: string
  value: string
  label: string
  category: string
}

type UserOption = {
  id: string
  full_name: string | null
}

type MaintenanceAssetCreateFormProps = {
  locations: Location[]
  canManageAllAssets: boolean
  userRole: string
  users: UserOption[]
}

export default function MaintenanceAssetCreateForm({ 
  locations, 
  canManageAllAssets, 
  userRole,
  users: initialUsers
}: MaintenanceAssetCreateFormProps) {
  const router = useRouter()
  
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [users] = useState<UserOption[]>(initialUsers)
  const [isLoadingTypes, setIsLoadingTypes] = useState(true)
  const [showNewTypeModal, setShowNewTypeModal] = useState(false)
  const [newTypeData, setNewTypeData] = useState({ value: '', label: '', category: '' })
  const [isCreatingType, setIsCreatingType] = useState(false)
  
  const [formData, setFormData] = useState({
    asset_code: '',
    name: '',
    description: '',
    category: '',
    asset_type: '',
    status: 'ACTIVE',
    serial_number: '',
    model: '',
    brand: '',
    purchase_date: '',
    warranty_expiry: '',
    location_id: '',
    assigned_to_user_id: '',
    notes: '',
    image_url: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Cargar tipos de activo desde la base de datos
  useEffect(() => {
    async function loadData() {
      const supabase = createSupabaseBrowserClient()
      
      // Cargar tipos
      const { data: types, error: typesError } = await supabase
        .from('asset_types')
        .select('*')
        .order('category')
        .order('sort_order')
      
      if (types && !typesError) {
        const itTypes = ['DESKTOP', 'LAPTOP', 'TABLET', 'PHONE', 'MONITOR', 'PRINTER', 'SCANNER', 'SERVER', 'NETWORK_DEVICE', 'UPS', 'PROJECTOR']
        const maintenanceTypes = types.filter(t => !itTypes.includes(t.value))
        setAssetTypes(maintenanceTypes)
        const uniqueCategories = [...new Set(maintenanceTypes.map(t => t.category))]
        setCategories(uniqueCategories)
      }
      
      setIsLoadingTypes(false)
    }

    loadData()
  }, [])

  // Filtrar tipos por categoría seleccionada
  const filteredTypes = formData.category 
    ? assetTypes.filter(t => t.category === formData.category)
    : assetTypes

  // Crear nuevo tipo de activo
  const handleCreateType = async () => {
    if (!newTypeData.value || !newTypeData.label || !newTypeData.category) {
      alert('Completa todos los campos del nuevo tipo')
      return
    }

    setIsCreatingType(true)
    const supabase = createSupabaseBrowserClient()

    const { data, error } = await supabase
      .from('asset_types')
      .insert({
        value: newTypeData.value.toUpperCase().replace(/\s+/g, '_'),
        label: newTypeData.label,
        category: newTypeData.category,
        sort_order: 500,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating asset type:', error)
      if (error.code === '23505') {
        alert('Ya existe un tipo con ese código')
      } else {
        alert(`Error: ${error.message}`)
      }
      setIsCreatingType(false)
      return
    }

    // Actualizar la lista de tipos
    setAssetTypes(prev => [...prev, data])
    if (!categories.includes(data.category)) {
      setCategories(prev => [...prev, data.category])
    }

    // Seleccionar el nuevo tipo
    setFormData(prev => ({
      ...prev,
      category: data.category,
      asset_type: data.value,
    }))

    // Cerrar modal y limpiar
    setShowNewTypeModal(false)
    setNewTypeData({ value: '', label: '', category: '' })
    setIsCreatingType(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const supabase = createSupabaseBrowserClient()

    // Validar sede si no tiene permisos globales
    if (userRole !== 'admin' && !canManageAllAssets) {
      const locationIds = locations.map(l => l.id)
      if (!formData.location_id || !locationIds.includes(formData.location_id)) {
        alert('⚠️ No tienes autorización para crear activos en esta sede.\n\nSolo puedes crear activos en las sedes a las que estás asignado.')
        setIsSubmitting(false)
        return
      }
    }

    // Obtener usuario actual para created_by
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('assets_maintenance')
      .insert({
        asset_code: formData.asset_code,
        name: formData.name || formData.asset_code,
        description: formData.description || null,
        category: formData.asset_type,
        status: formData.status,
        serial_number: formData.serial_number || null,
        model: formData.model || null,
        brand: formData.brand || null,
        purchase_date: formData.purchase_date || null,
        warranty_expiry: formData.warranty_expiry || null,
        location_id: formData.location_id || null,
        assigned_to_user_id: formData.assigned_to_user_id || null,
        notes: formData.notes || null,
        image_url: formData.image_url || null,
        created_by: user?.id || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating maintenance asset:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      
      if (error.code === 'PGRST116' || error.message?.includes('violates row-level security')) {
        alert('⚠️ No tienes autorización para crear activos.\n\nContacta con un administrador para obtener los permisos necesarios.')
      } else if (error.code === '23505') {
        alert('⚠️ Ya existe un activo con ese código. Por favor, usa un código único.')
      } else if (error.code === '42501') {
        alert('⚠️ Permiso denegado. Contacta al administrador.')
      } else {
        alert(`Error al crear el activo: ${error.message || error.code || 'Error desconocido'}`)
      }
      
      setIsSubmitting(false)
      return
    }

    // Registrar en auditoría
    await supabase.from('audit_log').insert({
      entity_type: 'asset_maintenance',
      entity_id: data.id,
      action: 'CREATE',
      actor_id: user?.id,
      metadata: {
        asset_code: data.asset_code,
        category: data.category,
        status: data.status,
        brand: data.brand,
        model: data.model,
        location_id: data.location_id,
      },
    })

    router.push(`/mantenimiento/assets/${data.id}`)
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card shadow-sm border border-slate-200">
          <div className="card-body p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Información Básica</h2>
            </div>
            
            {isLoadingTypes ? (
              <div className="flex items-center justify-center py-8">
                <span className="loading loading-spinner loading-md text-primary"></span>
                <span className="ml-2 text-gray-600">Cargando tipos de activo...</span>
              </div>
            ) : (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Código del Activo */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Código del Activo *</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={formData.asset_code}
                  onChange={(e) => setFormData({ ...formData, asset_code: e.target.value })}
                  placeholder="Ej: MNT-AC-001"
                  required
                />
              </div>

              {/* Nombre */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Nombre del Activo *</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Aire Acondicionado Lobby"
                  required
                />
              </div>

              {/* Categoría de Activo */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Categoría de Activo *</span>
                </label>
                <select
                  className="select select-bordered"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value, asset_type: '' })}
                  required
                >
                  <option value="">Seleccionar categoría...</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <label className="label">
                  <span className="label-text-alt text-gray-500">Área o departamento del activo</span>
                </label>
              </div>

              {/* Tipo de Activo */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Tipo de Activo *</span>
                </label>
                <select
                  className="select select-bordered"
                  value={formData.asset_type}
                  onChange={(e) => setFormData({ ...formData, asset_type: e.target.value })}
                  required
                  disabled={!formData.category}
                >
                  <option value="">{formData.category ? 'Seleccionar tipo...' : 'Primero selecciona categoría'}</option>
                  {filteredTypes.map((type) => (
                    <option key={type.id} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <label className="label pb-0">
                  <span className="label-text-alt text-gray-500">
                    ¿No encuentras el tipo? 
                    <button
                      type="button"
                      onClick={() => setShowNewTypeModal(true)}
                      className="ml-1 text-amber-600 hover:text-amber-700 font-medium hover:underline"
                    >
                      Créalo aquí
                    </button>
                  </span>
                </label>
              </div>

              {/* Ubicación */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Ubicación</span>
                </label>
                <select
                  className="select select-bordered"
                  value={formData.location_id}
                  onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                >
                  <option value="">Seleccionar ubicación...</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.code} - {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Responsable */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Responsable del Equipo</span>
                </label>
                <select
                  className="select select-bordered"
                  value={formData.assigned_to_user_id}
                  onChange={(e) => setFormData({ ...formData, assigned_to_user_id: e.target.value })}
                >
                  <option value="">Sin asignar</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.id}
                    </option>
                  ))}
                </select>
                {users.length === 0 && !isLoadingTypes && (
                  <label className="label">
                    <span className="label-text-alt text-amber-600">No hay usuarios disponibles en tus sedes</span>
                  </label>
                )}
              </div>

              {/* Marca */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Marca</span>
                </label>
                <BrandSelector
                  value={formData.brand}
                  onChange={(value) => setFormData({ ...formData, brand: value })}
                />
              </div>

              {/* Modelo */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Modelo</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="Modelo del equipo"
                />
              </div>

              {/* Número de Serie */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Número de Serie</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={formData.serial_number}
                  onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                  placeholder="Número de serie"
                />
              </div>

              {/* Fecha de Compra */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Fecha de Compra</span>
                </label>
                <input
                  type="date"
                  className="input input-bordered"
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                />
              </div>

              {/* Fin de Garantía */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Fin de Garantía</span>
                </label>
                <input
                  type="date"
                  className="input input-bordered"
                  value={formData.warranty_expiry}
                  onChange={(e) => setFormData({ ...formData, warranty_expiry: e.target.value })}
                />
              </div>
            </div>

            {/* Descripción */}
            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text font-medium">Descripción</span>
              </label>
              <textarea
                className="textarea textarea-bordered h-24"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción detallada del activo..."
              />
            </div>

            {/* Notas */}
            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text font-medium">Notas Adicionales</span>
              </label>
              <textarea
                className="textarea textarea-bordered h-20"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Información adicional..."
              />
            </div>
            </>
            )}
          </div>
        </div>

        {/* Imagen */}
        <div className="card shadow-sm border border-slate-200">
          <div className="card-body p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Imagen del Activo</h2>
            <AssetImageUpload
              currentImageUrl={formData.image_url || null}
              onImageUploaded={(url) => setFormData({ ...formData, image_url: url })}
              onImageRemoved={() => setFormData({ ...formData, image_url: '' })}
            />
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Creando...
              </>
            ) : (
              'Crear Activo de Mantenimiento'
            )}
          </button>
        </div>
      </form>

      {/* Modal para crear nuevo tipo */}
      {showNewTypeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowNewTypeModal(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b bg-gray-50 rounded-t-xl">
              <h3 className="font-semibold text-gray-900">Nuevo Tipo de Activo</h3>
              <button
                type="button"
                onClick={() => {
                  setShowNewTypeModal(false)
                  setNewTypeData({ value: '', label: '', category: '' })
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Body */}
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  value={newTypeData.category}
                  onChange={(e) => setNewTypeData({ ...newTypeData, category: e.target.value })}
                  placeholder="HVAC, Plomería, Cocina..."
                  list="existing-categories"
                />
                <datalist id="existing-categories">
                  {categories.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  value={newTypeData.label}
                  onChange={(e) => setNewTypeData({ ...newTypeData, label: e.target.value })}
                  placeholder="Aire Acondicionado Split"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm uppercase focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                  value={newTypeData.value}
                  onChange={(e) => setNewTypeData({ ...newTypeData, value: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                  placeholder="AC_SPLIT"
                />
                <p className="text-xs text-gray-400 mt-1">Solo mayúsculas y guiones bajos</p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-5 py-4 border-t bg-gray-50 rounded-b-xl">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
                onClick={() => {
                  setShowNewTypeModal(false)
                  setNewTypeData({ value: '', label: '', category: '' })
                }}
                disabled={isCreatingType}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                onClick={handleCreateType}
                disabled={isCreatingType || !newTypeData.value || !newTypeData.label || !newTypeData.category}
              >
                {isCreatingType && <span className="loading loading-spinner loading-xs"></span>}
                {isCreatingType ? 'Guardando...' : 'Crear Tipo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
