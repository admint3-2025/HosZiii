'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

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
  assigned_to: string | null
  notes: string | null
}

type AssetEditFormProps = {
  asset: Asset
  onCancel: () => void
  onSuccess: () => void
}

export default function AssetEditForm({ asset, onCancel, onSuccess }: AssetEditFormProps) {
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
    notes: asset.notes || '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const supabase = createSupabaseBrowserClient()

    const { error } = await supabase
      .from('assets')
      .update({
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
        notes: formData.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', asset.id)

    if (error) {
      console.error('Error updating asset:', error)
      alert('Error al actualizar el activo')
      setIsSubmitting(false)
      return
    }

    onSuccess()
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

              {/* Ubicación */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Ubicación
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: Oficina Principal, Piso 2"
                />
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

              {/* Notas */}
              <div className="md:col-span-2">
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
    </div>
  )
}
