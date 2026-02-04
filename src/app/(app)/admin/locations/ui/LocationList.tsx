'use client'

import { useEffect, useMemo, useState } from 'react'

type LocationRow = {
  id: string
  name: string
  code: string
  business_type: 'hotel' | 'corporate' | 'office' | 'warehouse' | 'other'
  city: string | null
  state: string | null
  country: string | null
  address: string | null
  phone: string | null
  email: string | null
  manager_name: string | null
  is_active: boolean
  created_at: string
}

export default function LocationList() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [locations, setLocations] = useState<LocationRow[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCode, setEditCode] = useState('')
  const [editBusinessType, setEditBusinessType] = useState<'hotel' | 'corporate' | 'office' | 'warehouse' | 'other'>('hotel')
  const [editCity, setEditCity] = useState('')
  const [editState, setEditState] = useState('')
  const [editCountry, setEditCountry] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editManager, setEditManager] = useState('')

  const sorted = useMemo(() => {
    return [...locations].sort((a, b) => {
      return a.name.localeCompare(b.name)
    })
  }, [locations])

  async function load() {
    setError(null)
    setBusy(true)
    try {
      const res = await fetch('/api/admin/locations', { method: 'GET' })
      const text = await res.text()
      if (!res.ok) {
        setError(text || `Error ${res.status}`)
        return
      }
      const json = JSON.parse(text) as { locations: LocationRow[] }
      setLocations(json.locations)
    } catch (e: any) {
      setError(e?.message ?? 'Error inesperado')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function beginEdit(loc: LocationRow) {
    setEditingId(loc.id)
    setEditName(loc.name)
    setEditCode(loc.code)
    setEditBusinessType(loc.business_type)
    setEditCity(loc.city ?? '')
    setEditState(loc.state ?? '')
    setEditCountry(loc.country ?? 'México')
    setEditAddress(loc.address ?? '')
    setEditPhone(loc.phone ?? '')
    setEditEmail(loc.email ?? '')
    setEditManager(loc.manager_name ?? '')
  }

  async function saveEdit(locationId: string) {
    setError(null)
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/locations/${locationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          code: editCode.trim().toUpperCase(),
          business_type: editBusinessType,
          city: editCity.trim(),
          state: editState.trim(),
          country: editCountry.trim(),
          address: editAddress.trim(),
          phone: editPhone.trim(),
          email: editEmail.trim(),
          manager_name: editManager.trim(),
        }),
      })
      const text = await res.text()
      if (!res.ok) {
        setError(text || `Error ${res.status}`)
        return
      }
      setEditingId(null)
      await load()
    } catch (e: any) {
      setError(e?.message ?? 'Error inesperado')
    } finally {
      setBusy(false)
    }
  }

  async function toggleActive(loc: LocationRow) {
    const nextActive = !loc.is_active
    const msg = nextActive
      ? `¿Reactivar ubicación ${loc.name}?`
      : `¿Desactivar ${loc.name}? No aparecerá en los dropdowns.`

    if (!confirm(msg)) return

    setError(null)
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/locations/${loc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: nextActive }),
      })
      const text = await res.text()
      if (!res.ok) {
        setError(text || `Error ${res.status}`)
        return
      }
      await load()
    } catch (e: any) {
      setError(e?.message ?? 'Error inesperado')
    } finally {
      setBusy(false)
    }
  }

  async function deleteLocation(loc: LocationRow) {
    if (!confirm(`¿Eliminar ubicación ${loc.name}? (Solo si no tiene usuarios/tickets asociados)`)) return

    setError(null)
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/locations/${loc.id}`, { method: 'DELETE' })
      const text = await res.text()
      if (!res.ok) {
        setError(text || `Error ${res.status}`)
        return
      }
      await load()
    } catch (e: any) {
      setError(e?.message ?? 'Error inesperado')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card overflow-hidden">
      <div className="p-4 pb-0">
        <div className="flex items-center justify-between gap-2.5">
          <div>
            <div className="text-sm font-semibold text-gray-900">Listado de ubicaciones</div>
            <div className="text-[11px] text-gray-600 mt-0.5">Administra las sedes activas del sistema.</div>
          </div>
          <button type="button" className="btn btn-secondary" onClick={load} disabled={busy}>
            {busy ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>

        {error ? (
          <div className="mt-2.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-xs text-red-700">{error}</div>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 text-left text-gray-600">
            <tr>
              <th className="px-3 py-2 font-semibold uppercase tracking-wider text-[10px]">Nombre</th>
              <th className="px-3 py-2 font-semibold uppercase tracking-wider text-[10px]">Código</th>
              <th className="px-3 py-2 font-semibold uppercase tracking-wider text-[10px]">Tipo</th>
              <th className="px-3 py-2 font-semibold uppercase tracking-wider text-[10px]">Ciudad/Estado</th>
              <th className="px-3 py-2 font-semibold uppercase tracking-wider text-[10px]">Contacto</th>
              <th className="px-3 py-2 font-semibold uppercase tracking-wider text-[10px]">Estado</th>
              <th className="px-3 py-2 font-semibold uppercase tracking-wider text-[10px]">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sorted.map((loc) => {
              const editing = editingId === loc.id
              return (
                <tr key={loc.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    {editing ? (
                      <input className="input text-xs" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nombre" />
                    ) : (
                      <div className="font-medium text-gray-900 text-xs">{loc.name}</div>
                    )}
                  </td>

                  <td className="px-3 py-2">
                    {editing ? (
                      <input className="input text-xs" value={editCode} onChange={(e) => setEditCode(e.target.value)} placeholder="MTY" maxLength={10} />
                    ) : (
                      <div className="inline-flex items-center px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono font-semibold text-[10px]">
                        {loc.code}
                      </div>
                    )}
                  </td>

                  <td className="px-3 py-2">
                    {editing ? (
                      <select className="input text-xs" value={editBusinessType} onChange={(e) => setEditBusinessType(e.target.value as any)}>
                        <option value="hotel">🏨 Hotel</option>
                        <option value="corporate">🏢 Corporativo</option>
                        <option value="office">🏢 Oficina</option>
                        <option value="warehouse">🏭 Almacén</option>
                        <option value="other">💼 Otro</option>
                      </select>
                    ) : (
                      <div className="text-xs">
                        {loc.business_type === 'hotel' && <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 text-[10px]">🏨 Hotel</span>}
                        {loc.business_type === 'corporate' && <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-purple-50 border border-purple-200 text-purple-700 text-[10px]">🏢 Corporativo</span>}
                        {loc.business_type === 'office' && <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-700 text-[10px]">🏢 Oficina</span>}
                        {loc.business_type === 'warehouse' && <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-orange-50 border border-orange-200 text-orange-700 text-[10px]">🏭 Almacén</span>}
                        {loc.business_type === 'other' && <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-50 border border-gray-200 text-gray-700 text-[10px]">💼 Otro</span>}
                      </div>
                    )}
                  </td>

                  <td className="px-3 py-2">
                    {editing ? (
                      <div className="space-y-1">
                        <input className="input text-xs" value={editCity} onChange={(e) => setEditCity(e.target.value)} placeholder="Ciudad" />
                        <input className="input text-xs" value={editState} onChange={(e) => setEditState(e.target.value)} placeholder="Estado" />
                        <input className="input text-xs" value={editCountry} onChange={(e) => setEditCountry(e.target.value)} placeholder="País" />
                        <input className="input text-xs" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} placeholder="Dirección" />
                      </div>
                    ) : (
                      <div className="text-gray-900 text-xs">
                        {loc.city && loc.state ? `${loc.city}, ${loc.state}` : loc.city || loc.state || '—'}
                      </div>
                    )}
                  </td>

                  <td className="px-3 py-2">
                    {editing ? (
                      <div className="space-y-1">
                        <input className="input text-xs" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Teléfono" />
                        <input className="input text-xs" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Email" />
                        <input className="input text-xs" value={editManager} onChange={(e) => setEditManager(e.target.value)} placeholder="Responsable" />
                      </div>
                    ) : (
                      <div className="text-gray-700 text-xs">
                        {loc.phone || loc.email ? (
                          <>
                            {loc.phone ? <div>{loc.phone}</div> : null}
                            {loc.email ? <div className="text-[10px] text-gray-500">{loc.email}</div> : null}
                          </>
                        ) : (
                          '—'
                        )}
                      </div>
                    )}
                  </td>

                  <td className="px-3 py-2">
                    <span
                      className={
                        loc.is_active
                          ? 'inline-flex rounded-full border border-green-200 bg-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-green-700'
                          : 'inline-flex rounded-full border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700'
                      }
                    >
                      {loc.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>

                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1.5">
                      {editing ? (
                        <>
                          <button className="btn btn-primary text-[11px] px-2 py-1" type="button" disabled={busy} onClick={() => saveEdit(loc.id)}>
                            Guardar
                          </button>
                          <button
                            className="btn btn-secondary text-[11px] px-2 py-1"
                            type="button"
                            disabled={busy}
                            onClick={() => setEditingId(null)}
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <button className="btn btn-secondary text-[11px] px-2 py-1" type="button" disabled={busy} onClick={() => beginEdit(loc)}>
                          Editar
                        </button>
                      )}

                      <button className="btn btn-secondary text-[11px] px-2 py-1" type="button" disabled={busy} onClick={() => toggleActive(loc)}>
                        {loc.is_active ? 'Desactivar' : 'Activar'}
                      </button>

                      <button className="btn btn-danger text-[11px] px-2 py-1" type="button" disabled={busy} onClick={() => deleteLocation(loc)}>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}

            {sorted.length === 0 ? (
              <tr>
                <td className="px-3 py-8 text-center text-gray-500 text-xs" colSpan={7}>
                  {busy ? 'Cargando…' : 'No hay ubicaciones registradas'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
