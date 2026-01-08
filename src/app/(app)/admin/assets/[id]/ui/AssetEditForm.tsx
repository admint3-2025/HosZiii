'use client'

import { useEffect, useState } from 'react'
import { updateAssetWithLocationChange } from '../actions'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import AssetImageUpload from '@/components/AssetImageUpload'
import ComboboxInput, {
  PROCESSOR_SUGGESTIONS,
  RAM_SUGGESTIONS,
  STORAGE_SUGGESTIONS,
  OS_SUGGESTIONS,
} from '@/components/ComboboxInput'

type Location = {
  id: string
  name: string
  code: string
}

type Asset = {
  id: string
  asset_tag: string
  asset_type: string
  status: string
  serial_number: string | null
  model: string | null
  brand: string | null
  department: string | null
  purchase_date: string | null
  warranty_end_date: string | null
  location: string | null
  location_id: string | null
  assigned_to: string | null
  notes: string | null
  processor: string | null
  ram_gb: number | null
  storage_gb: number | null
  os: string | null
  image_url: string | null
}

type AssetEditFormProps = {
  asset: Asset
  locations: Location[]
  onCancel: () => void
  onSuccess: () => void
}

export default function AssetEditForm({ asset, locations, onCancel, onSuccess }: AssetEditFormProps) {
  const [formData, setFormData] = useState({
    asset_tag: asset.asset_tag,
    asset_type: asset.asset_type,
    status: asset.status,
    serial_number: asset.serial_number || '',
    model: asset.model || '',
    brand: asset.brand || '',
    department: asset.department || '',
    purchase_date: asset.purchase_date || '',
    warranty_end_date: asset.warranty_end_date || '',
    location: asset.location || '',
    location_id: asset.location_id || '',
    assigned_to: asset.assigned_to || '',
    notes: asset.notes || '',
    processor: asset.processor || '',
    ram_gb: asset.ram_gb?.toString() || '',
    storage_gb: asset.storage_gb?.toString() || '',
    os: asset.os || '',
    image_url: asset.image_url || '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showLocationChangeModal, setShowLocationChangeModal] = useState(false)
  const [locationChangeReason, setLocationChangeReason] = useState('')
  const [pendingLocationId, setPendingLocationId] = useState<string | null>(null)
  const [availableUsers, setAvailableUsers] = useState<Array<{id: string, name: string, email: string, role: string, location?: string}>>([])
  const [selectedNotifyUsers, setSelectedNotifyUsers] = useState<string[]>([])
  const [additionalEmails, setAdditionalEmails] = useState('')
  const [loadingUsers, setLoadingUsers] = useState(false)

  const [assignees, setAssignees] = useState<Array<{ id: string; name: string; email: string; location?: string }>>([])
  const [loadingAssignees, setLoadingAssignees] = useState(false)

  useEffect(() => {
    const loadAssignees = async () => {
      try {
        setLoadingAssignees(true)
        const res = await fetch('/api/admin/users')
        if (!res.ok) return
        const data = await res.json()
        const users = (data.users || []) as Array<any>
        const mapped = users
          .filter((u) => u.email)
          .map((u) => ({
            id: u.id as string,
            name: (u.full_name as string) || (u.email as string),
            email: u.email as string,
            location: (u.location_name as string) || undefined,
          }))
        setAssignees(mapped)
      } catch {
        setAssignees([])
      } finally {
        setLoadingAssignees(false)
      }
    }

    loadAssignees()
  }, [])

  const handleLocationChange = async (newLocationId: string) => {
    if (newLocationId !== asset.location_id) {
      setPendingLocationId(newLocationId)
      setLocationChangeReason('')
      setSelectedNotifyUsers([])
      setAdditionalEmails('')
      setLoadingUsers(true)
      setShowLocationChangeModal(true)
      
      // Cargar usuarios en background
      try {
        const response = await fetch('/api/users/notifiable')
        const data = await response.json()
        setAvailableUsers(data.users || [])
      } catch (error) {
        setAvailableUsers([])
      } finally {
        setLoadingUsers(false)
      }
    } else {
      setFormData({ ...formData, location_id: newLocationId })
    }
  }

  const confirmLocationChange = () => {
    if (locationChangeReason.trim().length < 20) {
      alert('La justificación debe tener al menos 20 caracteres')
      return
    }
    
    setFormData({ ...formData, location_id: pendingLocationId || '' })
    setShowLocationChangeModal(false)
  }

  const cancelLocationChange = () => {
    setPendingLocationId(null)
    setLocationChangeReason('')
    setSelectedNotifyUsers([])
    setAdditionalEmails('')
    setShowLocationChangeModal(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Verificar si cambió la ubicación
    if (formData.location_id !== asset.location_id && !locationChangeReason.trim()) {
      alert('Debe proporcionar una justificación para el cambio de sede')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await updateAssetWithLocationChange(
        asset.id,
        {
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
          assigned_to: formData.assigned_to || null,
          notes: formData.notes || null,
          processor: formData.processor || null,
          ram_gb: formData.ram_gb ? parseInt(formData.ram_gb) : null,
          storage_gb: formData.storage_gb ? parseInt(formData.storage_gb) : null,
          os: formData.os || null,
          image_url: formData.image_url || null,
        },
        formData.location_id !== asset.location_id ? locationChangeReason : undefined
      )

      if (!result.success) {
        // Verificar si es error de cambio de ubicación sin razón
        if (result.error?.includes('LOCATION_CHANGE_REQUIRES_REASON')) {
          alert('El cambio de sede requiere una justificación. Por favor, intente nuevamente.')
          setIsSubmitting(false)
          return
        }
        
        alert('Error al actualizar el activo: ' + result.error)
        setIsSubmitting(false)
        return
      }

      // Si hubo cambio de sede, enviar notificaciones
      if (formData.location_id !== asset.location_id) {
        try {
          const notifyResponse = await fetch('/api/assets/location-change-notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              assetId: asset.id,
              assetTag: asset.asset_tag,
              fromLocationId: asset.location_id,
              toLocationId: formData.location_id,
              reason: locationChangeReason,
              notifyUserIds: selectedNotifyUsers,
              additionalEmails: additionalEmails
            })
          })
          
          const notifyResult = await notifyResponse.json()
          console.log('Notificaciones enviadas:', notifyResult)
          
          if (!notifyResult.success) {
            console.error('Error al enviar notificaciones:', notifyResult.error)
          }
        } catch (notifyError) {
          console.error('Error al enviar notificaciones:', notifyError)
        }
        
        // Limpiar estados de notificación después de enviar
        setLocationChangeReason('')
        setSelectedNotifyUsers([])
        setAdditionalEmails('')
      }

      onSuccess()
    } catch (err) {
      console.error('Error:', err)
      alert('Error al actualizar el activo')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Editar Activo</h1>
          <p className="text-sm text-gray-600 mt-1">Modifica la información del activo</p>
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card shadow-sm border border-slate-200">
          <div className="card-body p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Información General</h2>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Etiqueta del Activo */}
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
                  placeholder="Ej: LAP-001, DKT-042"
                />
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

              {/* Responsable / Asignado a */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Responsable del equipo
                </label>
                <select
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="">Sin asignar</option>
                  {loadingAssignees && <option> Cargando usuarios... </option>}
                  {!loadingAssignees &&
                    assignees.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.location ? `[${u.location}] ` : ''}
                        {u.name} ({u.email})
                      </option>
                    ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Este cambio quedará registrado en la auditoría de responsables del activo.
                </p>
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
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: Dell, HP, Lenovo"
                />
              </div>

              {/* Departamento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Departamento
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: TI, Contabilidad"
                />
              </div>

              {/* Sede */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Sede / Ubicación
                </label>
                <select
                  value={formData.location_id}
                  onChange={(e) => handleLocationChange(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Seleccionar sede...</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.code} - {loc.name}
                    </option>
                  ))}
                </select>
                {formData.location_id !== asset.location_id && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Cambio de sede - Se requiere justificación y notificación
                  </p>
                )}
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
                  placeholder="Ej: Piso 2, Oficina 15"
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
              
              <div className="grid gap-4 md:grid-cols-2">
                {/* Procesador */}
                <ComboboxInput
                  id="processor"
                  label="Procesador"
                  value={formData.processor}
                  onChange={(value) => setFormData({ ...formData, processor: value })}
                  suggestions={PROCESSOR_SUGGESTIONS}
                  placeholder="Buscar o escribir procesador..."
                />

                {/* Memoria RAM */}
                <ComboboxInput
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
                <ComboboxInput
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
                <ComboboxInput
                  id="os"
                  label="Sistema Operativo"
                  value={formData.os}
                  onChange={(value) => setFormData({ ...formData, os: value })}
                  suggestions={OS_SUGGESTIONS}
                  placeholder="Buscar o escribir S.O..."
                />
              </div>

              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-blue-800">
                    <strong>Importante:</strong> Estos datos técnicos son críticos para el inventario. Cualquier modificación quedará registrada en el historial con usuario responsable.
                  </p>
                </div>
              </div>
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
                  assetId={asset.id}
                  currentImageUrl={formData.image_url || null}
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
            onClick={onCancel}
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
                Guardando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Guardar Cambios
              </>
            )}
          </button>
        </div>
      </form>

      {/* Modal de confirmación de cambio de sede */}
      {showLocationChangeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Cambio de Sede del Activo</h3>
                  <p className="text-sm text-gray-600">Se requiere justificación y auditoría</p>
                </div>
              </div>

              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-900">
                  <strong>Activo:</strong> {asset.asset_tag}
                </p>
                <p className="text-sm text-blue-900 mt-1">
                  <strong>Nueva sede:</strong> {locations.find(l => l.id === pendingLocationId)?.name}
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Justificación del cambio <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={locationChangeReason}
                  onChange={(e) => setLocationChangeReason(e.target.value)}
                  rows={4}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Explique el motivo del cambio de sede (mínimo 10 caracteres)&#10;Ejemplo: Reasignación de activo por cambio de área del usuario, traslado definitivo a nueva sucursal, etc."
                />
                <p className="text-xs text-gray-500 mt-1">
                  {locationChangeReason.length}/20 caracteres mínimos
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Usuarios a notificar
                </label>
                {loadingUsers ? (
                  <div className="text-center py-4 text-gray-500">Cargando usuarios...</div>
                ) : (
                  <select
                    multiple
                    value={selectedNotifyUsers}
                    onChange={(e) => setSelectedNotifyUsers(Array.from(e.target.selectedOptions, option => option.value))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    size={Math.min(availableUsers.length || 5, 7)}
                  >
                    {availableUsers.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.role === 'admin' ? '👨‍💼' : '👨‍🏫'} [{user.location || '?'}] {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Mantén presionado Ctrl/Cmd para seleccionar múltiples
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Correos adicionales (opcional)
                </label>
                <input
                  type="text"
                  value={additionalEmails}
                  onChange={(e) => setAdditionalEmails(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="correo1@ejemplo.com, correo2@ejemplo.com"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Separar múltiples correos con comas
                </p>
              </div>

              <div className="mb-4 p-3 bg-amber-50 rounded border border-amber-200">
                <p className="text-xs text-amber-800">
                  ⚠️ <strong>Este cambio será registrado en auditoría</strong>
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={cancelLocationChange}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmLocationChange}
                  disabled={locationChangeReason.trim().length < 20}
                  className="btn btn-warning"
                >
                  Confirmar Cambio
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
