"use client"

import React, { useEffect, useState } from 'react'

export default function AssetTypesManager() {
  const [types, setTypes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
   const [error, setError] = useState<string | null>(null)
  const [value, setValue] = useState('')
  const [label, setLabel] = useState('')
  const [category, setCategory] = useState('IT')
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState<string | null>(null)

  async function load() {
    setLoading(true)
     setError(null)
    try {
      const res = await fetch('/api/admin/asset-types')
      const data = await res.json()
      setTypes(data.assetTypes || [])
    } catch (e) {
      console.error(e)
       setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    // quick permission check: only admins can list users (endpoint protected)
    async function checkAdmin() {
      try {
        const res = await fetch('/api/admin/users')
        setIsAdmin(res.ok)
      } catch (e) {
        setIsAdmin(false)
      }
    }
    checkAdmin()
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError(null)
    setCreateSuccess(null)
    try {
      const res = await fetch('/api/admin/asset-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: value.toUpperCase().replace(/\s+/g,'_'), label, category })
      })
      if (res.ok) {
        setValue('')
        setLabel('')
        load()
        setCreateSuccess('Tipo creado correctamente')
      } else {
        const txt = await res.text().catch(() => '')
        if (res.status === 403) setCreateError('No autorizado: se requiere rol admin para crear tipos')
        else setCreateError(`Error creando tipo: ${res.status} ${txt}`)
        console.error('create failed', res.status, txt)
      }
    } catch (err) {
      console.error(err)
      setCreateError(String(err))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Tipos de activos</h3>
        <div className="text-sm text-slate-500">Admin: gestiona valores disponibles</div>
      </div>

      <div className="rounded border p-3 bg-white">
        {loading ? <div>Loading…</div> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th>Value</th>
                <th>Label</th>
                <th>Category</th>
              </tr>
            </thead>
            <tbody>
              {types.map(t => (
                <tr key={t.id} className="border-t">
                  <td className="py-2">{t.value}</td>
                  <td className="py-2">{t.label}</td>
                  <td className="py-2">{t.category}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="pt-4">
        <h4 className="text-sm font-medium">Crear Tipo de activo</h4>
        <form onSubmit={handleCreate} className="grid grid-cols-3 gap-2 mt-2">
          <input className="input" placeholder="value (ej. NEW_TYPE)" value={value} onChange={e => setValue(e.target.value)} required disabled={isAdmin === false} />
          <input className="input" placeholder="Label" value={label} onChange={e => setLabel(e.target.value)} required disabled={isAdmin === false} />
          <select className="select" value={category} onChange={e => setCategory(e.target.value)} disabled={isAdmin === false}>
            <option value="IT">IT</option>
            <option value="HVAC">HVAC</option>
            <option value="Lavandería">Lavandería</option>
            <option value="Plomería">Plomería</option>
            <option value="Cocina/Minibar">Cocina/Minibar</option>
            <option value="Housekeeping">Housekeeping</option>
            <option value="General">General</option>
          </select>
          <div className="col-span-3 text-right">
            <button className="btn btn-primary" type="submit">Crear tipo</button>
          </div>
          {isAdmin === false && (
            <div className="col-span-3 text-sm text-slate-500">Nota: no pareces administrador; si recibes &quot;No autorizado&quot; al crear, verifica tu sesión.</div>
          )}
          {createSuccess && <div className="col-span-3 text-sm text-emerald-600">{createSuccess}</div>}
          {createError && <div className="col-span-3 text-sm text-rose-600">{createError}</div>}
        </form>
      </div>
    </div>
  )
}
