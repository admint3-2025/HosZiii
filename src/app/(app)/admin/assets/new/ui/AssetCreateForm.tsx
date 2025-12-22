'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

const ASSET_TYPES = [
  'DESKTOP',
  'LAPTOP',
  'PRINTER',
  'SCANNER',
  'MONITOR',
  'SERVER',
  'NETWORK_DEVICE',
  'PHONE',
  'TABLET',
  'PROJECTOR',
  'OTHER',
] as const

const ASSET_TYPE_LABELS: Record<typeof ASSET_TYPES[number], string> = {
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

const ASSET_STATUSES = ['OPERATIONAL', 'MAINTENANCE', 'OUT_OF_SERVICE', 'RETIRED'] as const

const STATUS_LABELS: Record<typeof ASSET_STATUSES[number], string> = {
  OPERATIONAL: 'Operacional',
  MAINTENANCE: 'En mantenimiento',
  OUT_OF_SERVICE: 'Fuera de servicio',
  RETIRED: 'Retirado',
}

export default function AssetCreateForm() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [assetTag, setAssetTag] = useState('')
  const [assetType, setAssetType] = useState<typeof ASSET_TYPES[number]>('DESKTOP')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [location, setLocation] = useState('')
  const [department, setDepartment] = useState('')
  const [status, setStatus] = useState<typeof ASSET_STATUSES[number]>('OPERATIONAL')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [warrantyEndDate, setWarrantyEndDate] = useState('')
  const [notes, setNotes] = useState('')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('No autenticado')
      setBusy(false)
      return
    }

    const { data, error: insertError } = await supabase
      .from('assets')
      .insert({
        asset_tag: assetTag.trim(),
        asset_type: assetType,
        brand: brand.trim() || null,
        model: model.trim() || null,
        serial_number: serialNumber.trim() || null,
        location: location.trim() || null,
        department: department.trim() || null,
        status,
        purchase_date: purchaseDate || null,
        warranty_end_date: warrantyEndDate || null,
        notes: notes.trim() || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
      setBusy(false)
      return
    }

    setBusy(false)
    router.push(`/admin/assets/${data.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Identificación */}
      <div className="card shadow-lg border-0">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-b border-blue-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-blue-900 uppercase tracking-wider">Identificación</h3>
              <p className="text-xs text-blue-700">Información básica del activo</p>
            </div>
          </div>
        </div>
        <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tag / Código de activo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="input w-full"
              value={assetTag}
              onChange={(e) => setAssetTag(e.target.value)}
              required
              placeholder="Ej: DESK-001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de activo <span className="text-red-500">*</span>
            </label>
            <select
              className="select w-full"
              value={assetType}
              onChange={(e) => setAssetType(e.target.value as typeof ASSET_TYPES[number])}
              required
            >
              {ASSET_TYPES.map((type) => (
                <option key={type} value={type}>
                  {ASSET_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Marca</label>
            <input
              type="text"
              className="input w-full"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Ej: Dell, HP, Lenovo"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Modelo</label>
            <input
              type="text"
              className="input w-full"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Ej: Optiplex 7090"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Número de serie</label>
            <input
              type="text"
              className="input w-full"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="Número de serie del fabricante"
            />
          </div>
        </div>
      </div>

      {/* Ubicación */}
      <div className="card shadow-lg border-0">
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-b border-purple-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-purple-900 uppercase tracking-wider">Ubicación</h3>
              <p className="text-xs text-purple-700">Dónde se encuentra el activo</p>
            </div>
          </div>
        </div>
        <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ubicación física</label>
            <input
              type="text"
              className="input w-full"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ej: Piso 3, Oficina 301"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Departamento</label>
            <input
              type="text"
              className="input w-full"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="Ej: Contabilidad, IT"
            />
          </div>
        </div>
      </div>

      {/* Estado y fechas */}
      <div className="card shadow-lg border-0">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-b border-green-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-green-900 uppercase tracking-wider">Estado y garantía</h3>
              <p className="text-xs text-green-700">Condición actual y fechas importantes</p>
            </div>
          </div>
        </div>
        <div className="card-body grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado <span className="text-red-500">*</span>
            </label>
            <select
              className="select w-full"
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof ASSET_STATUSES[number])}
              required
            >
              {ASSET_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de compra</label>
            <input
              type="date"
              className="input w-full"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fin de garantía</label>
            <input
              type="date"
              className="input w-full"
              value={warrantyEndDate}
              onChange={(e) => setWarrantyEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Notas */}
      <div className="card shadow-lg border-0">
        <div className="card-body">
          <label className="block text-sm font-medium text-gray-700 mb-2">Notas adicionales</label>
          <textarea
            className="textarea w-full min-h-24"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Información adicional sobre el activo..."
          />
        </div>
      </div>

      {/* Botones */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn btn-secondary flex-1"
          disabled={busy}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="btn btn-primary flex-1 flex items-center justify-center gap-2"
          disabled={busy}
        >
          {busy ? (
            <>
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creando...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Crear activo
            </>
          )}
        </button>
      </div>
    </form>
  )
}
