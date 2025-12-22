'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

const ASSET_TYPE_LABELS: Record<string, string> = {
  DESKTOP: 'Computadora de escritorio',
  LAPTOP: 'Laptop',
  PRINTER: 'Impresora',
  SCANNER: 'Escáner',
  MONITOR: 'Monitor',
  SERVER: 'Servidor',
  NETWORK_DEVICE: 'Equipo de red',
  PHONE: 'Teléfono',
  TABLET: 'Tablet',
  PROJECTOR: 'Proyector',
  OTHER: 'Otro',
}

const STATUS_LABELS: Record<string, string> = {
  OPERATIONAL: 'Operacional',
  MAINTENANCE: 'En mantenimiento',
  OUT_OF_SERVICE: 'Fuera de servicio',
  RETIRED: 'Retirado',
}

const STATUS_COLORS: Record<string, string> = {
  OPERATIONAL: 'bg-green-100 text-green-800',
  MAINTENANCE: 'bg-yellow-100 text-yellow-800',
  OUT_OF_SERVICE: 'bg-red-100 text-red-800',
  RETIRED: 'bg-gray-100 text-gray-800',
}

type Asset = {
  id: string
  asset_tag: string
  asset_type: string
  brand: string | null
  model: string | null
  serial_number: string | null
  location: string | null
  department: string | null
  status: string
  purchase_date: string | null
  warranty_end_date: string | null
  notes: string | null
  created_at: string
  created_by_profile: { full_name: string | null } | null
}

export default function AssetDetailView({ asset }: { asset: Asset }) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [formData, setFormData] = useState({
    asset_tag: asset.asset_tag,
    brand: asset.brand || '',
    model: asset.model || '',
    serial_number: asset.serial_number || '',
    location: asset.location || '',
    department: asset.department || '',
    status: asset.status,
    purchase_date: asset.purchase_date || '',
    warranty_end_date: asset.warranty_end_date || '',
    notes: asset.notes || '',
  })

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)

    const { error: updateError } = await supabase
      .from('assets')
      .update({
        asset_tag: formData.asset_tag,
        brand: formData.brand || null,
        model: formData.model || null,
        serial_number: formData.serial_number || null,
        location: formData.location || null,
        department: formData.department || null,
        status: formData.status,
        purchase_date: formData.purchase_date || null,
        warranty_end_date: formData.warranty_end_date || null,
        notes: formData.notes || null,
      })
      .eq('id', asset.id)

    if (updateError) {
      setError(updateError.message)
      setBusy(false)
      return
    }

    setBusy(false)
    setEditing(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm('¿Estás seguro de eliminar este activo? Esta acción no se puede deshacer.')) {
      return
    }

    setDeleting(true)

    const { error: deleteError } = await supabase
      .from('assets')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', asset.id)

    if (deleteError) {
      alert('Error al eliminar: ' + deleteError.message)
      setDeleting(false)
      return
    }

    router.push('/admin/assets')
    router.refresh()
  }

  if (editing) {
    return (
      <form onSubmit={handleUpdate} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {error}
          </div>
        )}

        <div className="card shadow-lg border-0">
          <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tag de activo</label>
              <input
                type="text"
                className="input w-full"
                value={formData.asset_tag}
                onChange={(e) => setFormData({ ...formData, asset_tag: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
              <select
                className="select w-full"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Marca</label>
              <input
                type="text"
                className="input w-full"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Modelo</label>
              <input
                type="text"
                className="input w-full"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Número de serie</label>
              <input
                type="text"
                className="input w-full"
                value={formData.serial_number}
                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ubicación</label>
              <input
                type="text"
                className="input w-full"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Departamento</label>
              <input
                type="text"
                className="input w-full"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de compra</label>
              <input
                type="date"
                className="input w-full"
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fin de garantía</label>
              <input
                type="date"
                className="input w-full"
                value={formData.warranty_end_date}
                onChange={(e) => setFormData({ ...formData, warranty_end_date: e.target.value })}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Notas</label>
              <textarea
                className="textarea w-full min-h-24"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="btn btn-secondary flex-1"
            disabled={busy}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn-primary flex-1"
            disabled={busy}
          >
            {busy ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="space-y-6">
      <div className="card shadow-lg border-0">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-b border-blue-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-blue-900 uppercase tracking-wider">Información del activo</h3>
                <p className="text-xs text-blue-700">{ASSET_TYPE_LABELS[asset.asset_type] || asset.asset_type}</p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[asset.status]}`}>
              {STATUS_LABELS[asset.status] || asset.status}
            </span>
          </div>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Tag de activo</label>
              <p className="text-lg font-semibold text-gray-900">{asset.asset_tag}</p>
            </div>

            {asset.brand && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Marca</label>
                <p className="text-lg text-gray-900">{asset.brand}</p>
              </div>
            )}

            {asset.model && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Modelo</label>
                <p className="text-lg text-gray-900">{asset.model}</p>
              </div>
            )}

            {asset.serial_number && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Número de serie</label>
                <p className="text-lg text-gray-900 font-mono text-sm">{asset.serial_number}</p>
              </div>
            )}

            {asset.location && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Ubicación</label>
                <p className="text-lg text-gray-900">{asset.location}</p>
              </div>
            )}

            {asset.department && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Departamento</label>
                <p className="text-lg text-gray-900">{asset.department}</p>
              </div>
            )}

            {asset.purchase_date && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Fecha de compra</label>
                <p className="text-lg text-gray-900">{new Date(asset.purchase_date).toLocaleDateString('es-MX')}</p>
              </div>
            )}

            {asset.warranty_end_date && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Fin de garantía</label>
                <p className="text-lg text-gray-900">{new Date(asset.warranty_end_date).toLocaleDateString('es-MX')}</p>
              </div>
            )}

            {asset.notes && (
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-gray-500 uppercase">Notas</label>
                <p className="text-gray-900 mt-1 whitespace-pre-wrap">{asset.notes}</p>
              </div>
            )}

            <div className="md:col-span-2 pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Creado: {new Date(asset.created_at).toLocaleDateString('es-MX', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
                {asset.created_by_profile?.full_name && ` por ${asset.created_by_profile.full_name}`}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => setEditing(true)}
          className="btn btn-primary flex-1 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Editar
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="btn btn-danger flex-1 flex items-center justify-center gap-2"
        >
          {deleting ? (
            <>
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Eliminando...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Eliminar
            </>
          )}
        </button>
      </div>
    </div>
  )
}
