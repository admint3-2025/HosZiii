'use client'

import { useEffect, useMemo, useState } from 'react'

type Role = 'requester' | 'agent_l1' | 'agent_l2' | 'supervisor' | 'auditor' | 'admin'

type UserRow = {
  id: string
  email: string | null
  created_at: string | null
  last_sign_in_at: string | null
  banned_until: string | null
  role: Role | null
  full_name: string | null
  department: string | null
  phone: string | null
  building: string | null
  floor: string | null
  position: string | null
  supervisor_id: string | null
}

const ROLE_LABEL: Record<Role, string> = {
  requester: 'Usuario',
  agent_l1: 'Técnico (Nivel 1)',
  agent_l2: 'Técnico (Nivel 2)',
  supervisor: 'Supervisor',
  auditor: 'Auditor',
  admin: 'Administrador',
}

function isActive(user: UserRow) {
  if (!user.banned_until) return true
  const until = new Date(user.banned_until).getTime()
  return Number.isFinite(until) ? until <= Date.now() : true
}

export default function UserList() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [users, setUsers] = useState<UserRow[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editRole, setEditRole] = useState<Role>('requester')
  const [editDepartment, setEditDepartment] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editPosition, setEditPosition] = useState('')
  const [editBuilding, setEditBuilding] = useState('')
  const [editFloor, setEditFloor] = useState('')

  const sorted = useMemo(() => {
    return [...users].sort((a, b) => {
      const aKey = (a.email ?? '').toLowerCase()
      const bKey = (b.email ?? '').toLowerCase()
      return aKey.localeCompare(bKey)
    })
  }, [users])

  async function load() {
    setError(null)
    setBusy(true)
    try {
      const res = await fetch('/api/admin/users', { method: 'GET' })
      const text = await res.text()
      if (!res.ok) {
        setError(text || `Error ${res.status}`)
        return
      }
      const json = JSON.parse(text) as { users: UserRow[] }
      setUsers(json.users)
    } catch (e: any) {
      setError(e?.message ?? 'Error inesperado')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function beginEdit(u: UserRow) {
    setEditingId(u.id)
    setEditName(u.full_name ?? '')
    setEditRole((u.role ?? 'requester') as Role)
    setEditDepartment(u.department ?? '')
    setEditPhone(u.phone ?? '')
    setEditPosition(u.position ?? '')
    setEditBuilding(u.building ?? '')
    setEditFloor(u.floor ?? '')
  }

  async function saveEdit(userId: string) {
    setError(null)
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: editName.trim(),
          role: editRole,
          department: editDepartment.trim(),
          phone: editPhone.trim(),
          position: editPosition.trim(),
          building: editBuilding.trim(),
          floor: editFloor.trim(),
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

  async function toggleActive(u: UserRow) {
    const nextActive = !isActive(u)
    const msg = nextActive
      ? `¿Reactivar acceso para ${u.email ?? u.id}?`
      : `¿Desactivar acceso para ${u.email ?? u.id}? (No podrá iniciar sesión)`

    if (!confirm(msg)) return

    setError(null)
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: nextActive }),
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

  async function deleteUser(u: UserRow) {
    if (!confirm(`¿Eliminar usuario ${u.email ?? u.id}? (Soft delete en Auth)`)) return

    setError(null)
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' })
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

  async function sendReset(u: UserRow) {
    if (!confirm(`¿Generar link de recuperación para ${u.email ?? u.id}?`)) return
    setError(null)
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/users/${u.id}/reset-password`, { method: 'POST' })
      const text = await res.text()
      if (!res.ok) {
        setError(text || `Error ${res.status}`)
        return
      }

      let actionLink: string | null = null
      let sent = false
      try {
        const parsed = JSON.parse(text)
        actionLink = parsed?.actionLink ?? null
        sent = Boolean(parsed?.sent)
      } catch {
        // ignore
      }

      if (sent) {
        alert('Correo de recuperación enviado.')
        return
      }

      if (!actionLink) {
        setError('No se pudo obtener el link de recuperación.')
        return
      }

      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(actionLink)
        alert('Link copiado al portapapeles.')
      } else {
        prompt('Copia el link de recuperación:', actionLink)
      }
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
            <div className="text-sm font-semibold text-gray-900">Listado de usuarios</div>
            <div className="text-[11px] text-gray-600 mt-0.5">Activa/desactiva accesos y asigna roles.</div>
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
              <th className="px-3 py-2 font-semibold uppercase tracking-wider text-[10px]">Email</th>
              <th className="px-3 py-2 font-semibold uppercase tracking-wider text-[10px]">Nombre</th>
              <th className="px-3 py-2 font-semibold uppercase tracking-wider text-[10px]">Sede</th>
              <th className="px-3 py-2 font-semibold uppercase tracking-wider text-[10px]">Rol</th>
              <th className="px-3 py-2 font-semibold uppercase tracking-wider text-[10px]">Estado</th>
              <th className="px-3 py-2 font-semibold uppercase tracking-wider text-[10px]">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sorted.map((u) => {
              const active = isActive(u)
              const editing = editingId === u.id
              return (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-900 text-xs">{u.email ?? '—'}</div>
                  </td>

                  <td className="px-3 py-2">
                    {editing ? (
                      <input className="input text-xs" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nombre completo" />
                    ) : (
                      <div className="text-gray-900 text-xs">{u.full_name || '—'}</div>
                    )}
                  </td>

                  <td className="px-3 py-2">
                    {editing ? (
                      <div className="space-y-1">
                        <input className="input text-xs" value={editBuilding} onChange={(e) => setEditBuilding(e.target.value)} placeholder="Edificio" />
                        <input className="input text-xs" value={editFloor} onChange={(e) => setEditFloor(e.target.value)} placeholder="Piso" />
                        <input className="input text-xs" value={editDepartment} onChange={(e) => setEditDepartment(e.target.value)} placeholder="Departamento" />
                        <input className="input text-xs" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Teléfono" />
                        <input className="input text-xs" value={editPosition} onChange={(e) => setEditPosition(e.target.value)} placeholder="Puesto" />
                      </div>
                    ) : (
                      <div className="text-gray-900 text-xs">
                        {u.building || u.floor ? `${u.building || ''} ${u.floor ? 'P' + u.floor : ''}`.trim() : '—'}
                      </div>
                    )}
                  </td>

                  <td className="px-3 py-2">
                    {editing ? (
                      <select className="select" value={editRole} onChange={(e) => setEditRole(e.target.value as Role)}>
                        {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABEL[r]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-gray-900 text-xs">{u.role ? ROLE_LABEL[u.role] : '—'}</div>
                    )}
                  </td>

                  <td className="px-3 py-2">
                    <span
                      className={
                        active
                          ? 'inline-flex rounded-full border border-green-200 bg-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-green-700'
                          : 'inline-flex rounded-full border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700'
                      }
                    >
                      {active ? 'Activo' : 'Desactivado'}
                    </span>
                  </td>

                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1.5">
                      {editing ? (
                        <>
                          <button className="btn btn-primary text-[11px] px-2 py-1" type="button" disabled={busy} onClick={() => saveEdit(u.id)}>
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
                        <button className="btn btn-secondary text-[11px] px-2 py-1" type="button" disabled={busy} onClick={() => beginEdit(u)}>
                          Editar
                        </button>
                      )}

                      <button className="btn btn-secondary text-[11px] px-2 py-1" type="button" disabled={busy} onClick={() => toggleActive(u)}>
                        {active ? 'Desactivar' : 'Activar'}
                      </button>

                      <button className="btn btn-secondary text-[11px] px-2 py-1" type="button" disabled={busy} onClick={() => sendReset(u)}>
                        Reset
                      </button>

                      <button className="btn btn-danger text-[11px] px-2 py-1" type="button" disabled={busy} onClick={() => deleteUser(u)}>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}

            {sorted.length === 0 ? (
              <tr>
                <td className="px-3 py-8 text-center text-gray-500 text-xs" colSpan={6}>
                  {busy ? 'Cargando…' : 'No hay usuarios'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
