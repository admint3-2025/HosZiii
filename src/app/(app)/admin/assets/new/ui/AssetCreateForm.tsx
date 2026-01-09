'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import DepartmentSelector from '@/components/DepartmentSelector'
import BrandSelector from '@/components/BrandSelector'
import AssetImageUpload from '@/components/AssetImageUpload'
import ComboboxWithAdd from '@/components/ComboboxWithAdd'
import {
  RAM_SUGGESTIONS,
  STORAGE_SUGGESTIONS,
} from '@/components/ComboboxInput'

type Location = {
  id: string
  name: string
  code: string
}

type AssetCreateFormProps = {
  locations: Location[]
  canManageAllAssets: boolean
  userRole: string
}

export default function AssetCreateForm({ locations, canManageAllAssets, userRole }: AssetCreateFormProps) {
  const router = useRouter()
  const [processorSuggestions, setProcessorSuggestions] = useState<string[]>([])
  const [osSuggestions, setOsSuggestions] = useState<string[]>([])
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(true)
  
  const [formData, setFormData] = useState({
    asset_tag: '',
    asset_type: 'DESKTOP',
    status: 'OPERATIONAL',
    serial_number: '',
    model: '',
    brand: '',
    department: '',
    purchase_date: '',
    warranty_end_date: '',
    location: '',
    location_id: '',
    notes: '',
    processor: '',
    ram_gb: '',
    storage_gb: '',
    os: '',
    image_url: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Cargar catálogos desde la base de datos
  useEffect(() => {
    async function loadCatalogs() {
      const supabase = createSupabaseBrowserClient()
      
      const [processorsRes, osRes] = await Promise.all([
        supabase
          .from('asset_processors')
          .select('name')
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('asset_operating_systems')
          .select('name')
          .eq('is_active', true)
          .order('name'),
      ])

      if (processorsRes.data) {
        setProcessorSuggestions(processorsRes.data.map(p => p.name))
      }
      
      if (osRes.data) {
        setOsSuggestions(osRes.data.map(o => o.name))
      }
      
      setIsLoadingCatalogs(false)
    }

    loadCatalogs()
  }, [])

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
      .from('assets')
      .insert({
        asset_tag: formData.asset_tag,
        asset_type: formData.asset_type,
        status: formData.status,
        serial_number: formData.serial_number || null,
        model: formData.model || null,
        brand: formData.brand || null,
        department: formData.department || null,
        purchase_date: formData.purchase_date || null,
        warranty_end_date: formData.warranty_end_date || null,
        location: formData.location || null,
        location_id: formData.location_id || null,
        notes: formData.notes || null,
        processor: formData.processor || null,
        ram_gb: formData.ram_gb ? parseInt(formData.ram_gb) : null,
        storage_gb: formData.storage_gb ? parseInt(formData.storage_gb) : null,
        os: formData.os || null,
        image_url: formData.image_url || null,
        created_by: user?.id || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating asset:', error)
      
      // Mensaje de error más claro
      if (error.code === 'PGRST116' || error.message?.includes('violates row-level security')) {
        alert('⚠️ No tienes autorización para crear activos.\n\nContacta con un administrador para obtener los permisos necesarios.')
      } else {
        alert(`Error al crear el activo: ${error.message}`)
      }
      
      setIsSubmitting(false)
      return
    }

    // Registrar en auditoría
    await supabase.from('audit_log').insert({
      entity_type: 'asset',
      entity_id: data.id,
      action: 'CREATE',
      actor_id: user?.id,
      metadata: {
        asset_tag: data.asset_tag,
        asset_type: data.asset_type,
        status: data.status,
        brand: data.brand,
        model: data.model,
        location_id: data.location_id,
      },
    })

    router.push(`/admin/assets/${data.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="card shadow-sm border border-slate-200">
        <div className="card-body p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Información General</h2>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Etiqueta del Activo (Asset Tag) */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Etiqueta del Activo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.asset_tag}
                onChange={(e) => setFormData({ ...formData, asset_tag: e.target.value })}
                required
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: LAP-001, DKT-042, SRV-WEB-01"
              />
              <p className="text-xs text-gray-500 mt-1">Código único para identificar el activo</p>
            </div>

            {/* Tipo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Tipo de Activo <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.asset_type}
                onChange={(e) => setFormData({ ...formData, asset_type: e.target.value })}
                required
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="DESKTOP">Desktop</option>
                <option value="LAPTOP">Laptop</option>
                <option value="PRINTER">Impresora</option>
                <option value="SCANNER">Escáner</option>
                <option value="MONITOR">Monitor</option>
                <option value="PHONE">Teléfono</option>
                <option value="TABLET">Tablet</option>
                <option value="SERVER">Servidor</option>
                <option value="NETWORK_DEVICE">Dispositivo de Red</option>
                <option value="PERIPHERAL">Periférico</option>
                <option value="OTHER">Otro</option>
              </select>
            </div>

            {/* Estado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Estado <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                required
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="OPERATIONAL">Operacional</option>
                <option value="MAINTENANCE">En Mantenimiento</option>
                <option value="OUT_OF_SERVICE">Fuera de Servicio</option>
                <option value="RETIRED">Retirado</option>
              </select>
            </div>

            {/* Número de Serie */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Número de Serie
              </label>
              <input
                type="text"
                value={formData.serial_number}
                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: SN123456789"
              />
            </div>

            {/* Modelo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Modelo
              </label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: Latitude 7420"
              />
            </div>

            {/* Fabricante/Marca */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Marca
              </label>
              <BrandSelector
                value={formData.brand}
                onChange={(value) => setFormData({ ...formData, brand: value })}
                placeholder="Selecciona una marca"
                allowCreate={true}
              />
            </div>

            {/* Departamento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Departamento
              </label>
              <DepartmentSelector
                value={formData.department}
                onChange={(value) => setFormData({ ...formData, department: value })}
                placeholder="Selecciona un departamento"
                allowCreate={true}
              />
            </div>

            {/* Sede */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Sede / Ubicación
              </label>
              <select
                value={formData.location_id}
                onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seleccionar sede...</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.code} - {loc.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Sede donde se encuentra el activo</p>
            </div>

            {/* Ubicación física */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Ubicación Física
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: Piso 2, Oficina 15, Escritorio A"
              />
              <p className="text-xs text-gray-500 mt-1">Ubicación específica dentro de la sede</p>
            </div>

            {/* Fecha de Compra */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Fecha de Compra
              </label>
              <input
                type="date"
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Vencimiento de Garantía */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Fin de Garantía
              </label>
              <input
                type="date"
                value={formData.warranty_end_date}
                onChange={(e) => setFormData({ ...formData, warranty_end_date: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Especificaciones Técnicas (solo para PC/Laptop) */}
      {(formData.asset_type === 'DESKTOP' || formData.asset_type === 'LAPTOP') && (
        <div className="card shadow-sm border border-slate-200">
          <div className="card-body p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Especificaciones Técnicas</h2>
            
            {isLoadingCatalogs ? (
              <div className="flex items-center justify-center py-8">
                <svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="ml-2 text-sm text-gray-600">Cargando catálogos...</span>
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Procesador */}
                  <ComboboxWithAdd
                    id="processor"
                    label="Procesador"
                    value={formData.processor}
                    onChange={(value) => setFormData({ ...formData, processor: value })}
                    suggestions={processorSuggestions}
                    placeholder="Buscar o escribir procesador..."
                    allowAdd={userRole === 'admin' || userRole === 'supervisor'}
                    tableName="asset_processors"
                    onSuggestionsUpdate={setProcessorSuggestions}
                  />

                  {/* Memoria RAM */}
                  <ComboboxWithAdd
                    id="ram_gb"
                    label="Memoria RAM (GB)"
                    value={formData.ram_gb}
                    onChange={(value) => setFormData({ ...formData, ram_gb: value })}
                    suggestions={RAM_SUGGESTIONS}
                    placeholder="Buscar o escribir..."
                    type="number"
                    min="1"
                  />

                  {/* Almacenamiento */}
                  <ComboboxWithAdd
                    id="storage_gb"
                    label="Almacenamiento (GB)"
                    value={formData.storage_gb}
                    onChange={(value) => setFormData({ ...formData, storage_gb: value })}
                    suggestions={STORAGE_SUGGESTIONS}
                    placeholder="Buscar o escribir..."
                    type="number"
                    min="1"
                  />

                  {/* Sistema Operativo */}
                  <ComboboxWithAdd
                    id="os"
                    label="Sistema Operativo"
                    value={formData.os}
                    onChange={(value) => setFormData({ ...formData, os: value })}
                    suggestions={osSuggestions}
                    placeholder="Buscar o escribir S.O..."
                    allowAdd={userRole === 'admin' || userRole === 'supervisor'}
                    tableName="asset_operating_systems"
                    onSuggestionsUpdate={setOsSuggestions}
                  />
                </div>

                {/* Info sobre catálogos */}
                <div className="mt-4 space-y-3">
                  {/* Estado de catálogos */}
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-xs text-gray-700">
                        <p className="font-semibold mb-1">Estado de catálogos:</p>
                        <ul className="list-disc list-inside space-y-0.5">
                          <li>Procesadores cargados: <strong>{processorSuggestions.length}</strong></li>
                          <li>Sistemas operativos cargados: <strong>{osSuggestions.length}</strong></li>
                          <li>Tu rol: <strong>{userRole}</strong></li>
                          {(userRole === 'admin' || userRole === 'supervisor') && (
                            <li className="text-green-700 font-medium">✓ Puedes agregar nuevos elementos</li>
                          )}
                          {userRole !== 'admin' && userRole !== 'supervisor' && (
                            <li className="text-amber-700 font-medium">⚠ Solo admin/supervisor pueden agregar elementos</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Instrucciones */}
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-xs text-blue-800">
                        <p className="font-semibold mb-1">Cómo agregar nuevos elementos:</p>
                        <ol className="list-decimal list-inside space-y-1">
                          <li>Selecciona tipo de activo: <strong>Desktop</strong> o <strong>Laptop</strong></li>
                          <li>En Procesador o Sistema Operativo, escribe un valor nuevo</li>
                          <li>Si no existe en la lista, aparecerá un botón <strong>&quot;Agregar al catálogo&quot;</strong></li>
                          <li>Haz clic en el botón para agregarlo permanentemente</li>
                          <li>El nuevo elemento queda disponible para todos los usuarios</li>
                        </ol>
                        {processorSuggestions.length === 0 && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                            <p className="font-bold text-red-700">⚠️ ATENCIÓN: No se cargaron procesadores</p>
                            <p className="mt-1">Esto indica que la migración SQL no se ejecutó en Supabase.</p>
                            <p className="mt-1">Ejecuta: <code className="bg-red-100 px-1 py-0.5 rounded">supabase/migration-add-asset-catalogs.sql</code></p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Notas */}
      <div className="card shadow-sm border border-slate-200">
        <div className="card-body p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Información Adicional</h2>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Imagen del activo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Imagen del Activo
              </label>
              <AssetImageUpload
                onImageUploaded={(url) => setFormData({ ...formData, image_url: url })}
                onImageRemoved={() => setFormData({ ...formData, image_url: '' })}
              />
              <p className="text-xs text-gray-500 mt-1">JPG, PNG, WebP o GIF. Máximo 5MB.</p>
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Notas
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Información adicional sobre el activo..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Botones */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isSubmitting}
          className="btn btn-secondary"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary inline-flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creando...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Crear Activo
            </>
          )}
        </button>
      </div>
    </form>
  )
}
