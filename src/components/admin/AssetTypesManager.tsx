"use client"

import React, { useEffect, useState } from 'react'

export default function AssetTypesManager() {
  const [types, setTypes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [value, setValue] = useState('')
  const [label, setLabel] = useState('')
  const [category, setCategory] = useState('IT')

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/asset-types')
      const data = await res.json()
      setTypes(data.assetTypes || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
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
      } else {
        console.error('create failed', await res.text())
      }
    } catch (err) {
      console.error(err)
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

      <form onSubmit={handleCreate} className="grid grid-cols-3 gap-2">
        <input className="input" placeholder="value (ej. NEW_TYPE)" value={value} onChange={e => setValue(e.target.value)} required />
        <input className="input" placeholder="Label" value={label} onChange={e => setLabel(e.target.value)} required />
        <select className="select" value={category} onChange={e => setCategory(e.target.value)}>
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
      </form>
    </div>
  )
}
