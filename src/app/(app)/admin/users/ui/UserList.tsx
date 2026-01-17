'use client'

import { useEffect, useMemo, useState, Fragment } from 'react'
import DepartmentSelector from '@/components/DepartmentSelector'
import PositionSelector from '@/components/PositionSelector'
import MultiLocationSelector from '@/components/MultiLocationSelector'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

type Role = 'requester' | 'agent_l1' | 'agent_l2' | 'supervisor' | 'auditor' | 'admin'

type Location = {
  id: string
  name: string
  code: string
}

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
  location_id: string | null
  location_code: string | null
  location_name: string | null
  location_codes: string[]
  location_names: string[]
  can_view_beo: boolean | null
  can_manage_assets: boolean | null
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
  const [locations, setLocations] = useState<Location[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editRole, setEditRole] = useState<Role>('requester')
  const [editDepartment, setEditDepartment] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editPosition, setEditPosition] = useState('')
  const [editBuilding, setEditBuilding] = useState('')
  const [editFloor, setEditFloor] = useState('')
  const [editLocationIds, setEditLocationIds] = useState<string[]>([])
  const [editCanViewBeo, setEditCanViewBeo] = useState(false)
  const [editCanManageAssets, setEditCanManageAssets] = useState(false)

  // Filtros
  const [searchText, setSearchText] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [filterLocation, setFilterLocation] = useState<string>('all')
  const [filterBeo, setFilterBeo] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const filtered = useMemo(() => {
    let result = [...users]

    // Filtro por texto (email, nombre, departamento)
    if (searchText.trim()) {
      const search = searchText.toLowerCase()
      result = result.filter(
        (u) =>
          (u.email ?? '').toLowerCase().includes(search) ||
          (u.full_name ?? '').toLowerCase().includes(search) ||
          (u.department ?? '').toLowerCase().includes(search)
      )
    }

    // Filtro por rol
    if (filterRole !== 'all') {
      result = result.filter((u) => u.role === filterRole)
    }

    // Filtro por ubicación
    if (filterLocation !== 'all') {
      result = result.filter((u) => u.location_id === filterLocation)
    }

    // Filtro por acceso BEO
    if (filterBeo === 'yes') {
      result = result.filter((u) => u.can_view_beo)
    } else if (filterBeo === 'no') {
      result = result.filter((u) => !u.can_view_beo)
    }

    // Filtro por estado
    if (filterStatus === 'active') {
      result = result.filter((u) => isActive(u))
    } else if (filterStatus === 'inactive') {
      result = result.filter((u) => !isActive(u))
    }

    return result
  }, [users, searchText, filterRole, filterLocation, filterBeo, filterStatus])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aKey = (a.email ?? '').toLowerCase()
      const bKey = (b.email ?? '').toLowerCase()
      return aKey.localeCompare(bKey)
    })
  }, [filtered])

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
      const json = JSON.parse(text) as { users: UserRow[]; locations: Location[] }
      setUsers(json.users)
      setLocations(json.locations || [])
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
    setEditCanViewBeo(u.can_view_beo ?? false)
    setEditCanManageAssets(u.can_manage_assets ?? false)
    
    // Cargar sedes del usuario desde user_locations
    try {
      const supabase = createSupabaseBrowserClient()
      const { data: userLocs } = await supabase
        .from('user_locations')
        .select('location_id')
        .eq('user_id', u.id)
      
      const locationIds = userLocs?.map((ul: { location_id: string }) => ul.location_id) ?? []
      // Si no tiene sedes en user_locations, usar location_id de profiles
      if (locationIds.length === 0 && u.location_id) {
        setEditLocationIds([u.location_id])
      } else {
        setEditLocationIds(locationIds)
      }
    } catch (err) {
      console.error('Error loading user locations:', err)
      // Fallback a location_id de profiles
      setEditLocationIds(u.location_id ? [u.location_id] : [])
    }
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
          location_ids: editLocationIds,
          can_view_beo: editCanViewBeo,
          can_manage_assets: editCanManageAssets,
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
      ? `¿Reactivar usuario ${u.full_name || u.email}?\n\nEl usuario podrá iniciar sesión nuevamente y aparecerá en todos los listados del sistema.`
      : `¿Desactivar usuario ${u.full_name || u.email}?\n\n⚠️ El usuario:\n• No podrá iniciar sesión\n• No aparecerá en selectores ni listados\n• Sus tickets existentes permanecerán intactos\n• Puede ser reactivado en cualquier momento`

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
    if (!confirm(`¿Generar contraseña temporal para ${u.email ?? u.id}?`)) return
    setError(null)
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/users/${u.id}/reset-password`, { method: 'POST' })
      const text = await res.text()
      if (!res.ok) {
        setError(text || `Error ${res.status}`)
        return
      }

      let temporaryPassword: string | null = null
      let sent = false
      let message = ''
      try {
        const parsed = JSON.parse(text)
        temporaryPassword = parsed?.temporaryPassword ?? null
        sent = Boolean(parsed?.sent)
        message = parsed?.message ?? ''
      } catch {
        // ignore
      }

      if (sent) {
        alert(`✅ ${message}\n\nLa contraseña temporal ha sido enviada al correo del usuario.`)
        return
      }

      if (!temporaryPassword) {
        setError('No se pudo generar la contraseña temporal.')
        return
      }

      // Mostrar contraseña temporal en un dialog mejorado
      const instructions = [
        `🔐 CONTRASEÑA TEMPORAL GENERADA`,
        ``,
        `Usuario: ${u.email}`,
        `Contraseña: ${temporaryPassword}`,
        ``,
        `⚠️ IMPORTANTE:`,
        `- Entrega esta contraseña al usuario de forma segura`,
        `- Recomienda al usuario cambiarla después de iniciar sesión`,
        `- El usuario NO podrá recuperar esta contraseña después de cerrar este mensaje`,
        ``,
        `✅ La contraseña ha sido copiada al portapapeles`,
      ].join('\n')

      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(temporaryPassword)
        alert(instructions)
      } else {
        prompt('⚠️ COPIA ESTA CONTRASEÑA TEMPORAL:\n\n(El usuario debe cambiarla en su primer inicio de sesión)', temporaryPassword)
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
      <div className="p-4 pb-0 space-y-3">
        <div className="flex items-center justify-between gap-2.5">
          <div>
            <div className="text-sm font-semibold text-gray-900">Listado de usuarios</div>
            <div className="text-[11px] text-gray-600 mt-0.5">Activa/desactiva accesos y asigna roles.</div>
          </div>
          <button type="button" className="btn btn-secondary" onClick={load} disabled={busy}>
            {busy ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <div className="lg:col-span-2">
            <input
              type="text"
              placeholder="Buscar por email, nombre o departamento..."
              className="input text-xs"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          <div>
            <select className="select text-xs" value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
              <option value="all">Todos los roles</option>
              {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <select className="select text-xs" value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)}>
              <option value="all">Todas las sedes</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <select className="select text-xs flex-1" value={filterBeo} onChange={(e) => setFilterBeo(e.target.value)}>
              <option value="all">BEO: Todos</option>
              <option value="yes">Con BEO</option>
              <option value="no">Sin BEO</option>
            </select>
            <select className="select text-xs flex-1" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">Estado: Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>
        </div>

        <div className="text-[10px] text-gray-500">
          Mostrando {sorted.length} de {users.length} usuarios
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
              <th className="px-3 py-2 font-semibold uppercase tracking-wider text-[10px]">Ciudad/Empresa</th>
              <th className="px-3 py-2 font-semibold uppercase tracking-wider text-[10px]">Rol</th>
              <th className="px-3 py-2 font-semibold uppercase tracking-wider text-[10px]">Acceso BEO</th>
              <th className="px-3 py-2 font-semibold uppercase tracking-wider text-[10px]">Gestión Activos</th>
              <th className="px-3 py-2 font-semibold uppercase tracking-wider text-[10px]">Estado</th>
              <th className="px-3 py-2 font-semibold uppercase tracking-wider text-[10px]">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sorted.map((u) => {
              const active = isActive(u)
              const editing = editingId === u.id
              return (
                <Fragment key={u.id}>
                  <tr className={editing ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900 text-xs">{u.email ?? '—'}</div>
                    </td>

                    <td className="px-3 py-2">
                      <div className="text-gray-900 text-xs">{u.full_name || '—'}</div>
                      {u.department && <div className="text-[10px] text-gray-500">{u.department}</div>}
                    </td>

                    <td className="px-3 py-2">
                      <div className="text-gray-900 text-xs">
                        {u.location_codes && u.location_codes.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {u.location_codes.map((code, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 font-medium text-[10px]"
                                title={u.location_names?.[idx] || code}
                              >
                                {code}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">Sin asignar</span>
                        )}
                      </div>
                    </td>

                    <td className="px-3 py-2">
                      <div className="text-gray-900 text-xs">{u.role ? ROLE_LABEL[u.role] : '—'}</div>
                    </td>

                    <td className="px-3 py-2">
                      <div className="flex items-center">
                        {u.can_view_beo ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700 border border-purple-300">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            BEO
                          </span>
                        ) : (
                          <span className="text-gray-400 text-[10px]">—</span>
                        )}
                      </div>
                    </td>

                    <td className="px-3 py-2">
                      <div className="flex items-center">
                        {u.can_manage_assets ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 border border-emerald-300">
                            <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </span>
                        ) : (
                          <span className="text-gray-400 text-[10px]">—</span>
                        )}
                      </div>
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
                        {!editing && (
                          <>
                            <button className="btn btn-secondary text-[11px] px-2 py-1" type="button" disabled={busy} onClick={() => beginEdit(u)}>
                              Editar
                            </button>

                            <button className="btn btn-secondary text-[11px] px-2 py-1" type="button" disabled={busy} onClick={() => toggleActive(u)}>
                              {active ? 'Desactivar' : 'Activar'}
                            </button>

                            <button className="btn btn-secondary text-[11px] px-2 py-1" type="button" disabled={busy} onClick={() => sendReset(u)}>
                              Reset
                            </button>

                            <button className="btn btn-danger text-[11px] px-2 py-1" type="button" disabled={busy} onClick={() => deleteUser(u)}>
                              Eliminar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Fila expandida para edición */}
                  {editing && (
                    <tr key={`${u.id}-edit`} className="bg-white border-l-4 border-blue-500">
                      <td colSpan={7} className="px-3 py-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Editando: {u.email}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[11px] font-medium text-gray-700 mb-1">Nombre completo</label>
                              <input className="input text-xs" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nombre Apellido" />
                            </div>

                            <div>
                              <label className="block text-[11px] font-medium text-gray-700 mb-1">Departamento</label>
                              <DepartmentSelector
                                value={editDepartment}
                                onChange={setEditDepartment}
                                placeholder="Selecciona un departamento"
                                allowCreate={true}
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-medium text-gray-700 mb-1">Teléfono / Ext</label>
                              <input className="input text-xs" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="555-1234 ext. 100" />
                            </div>

                            <div>
                              <label className="block text-[11px] font-medium text-gray-700 mb-1">Puesto</label>
                              <PositionSelector
                                value={editPosition}
                                onChange={setEditPosition}
                                placeholder="Selecciona un puesto"
                                allowCreate={true}
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-medium text-gray-700 mb-1">Edificio / Sede</label>
                              <input className="input text-xs" value={editBuilding} onChange={(e) => setEditBuilding(e.target.value)} placeholder="Edificio A, Matriz..." />
                            </div>

                            <div>
                              <label className="block text-[11px] font-medium text-gray-700 mb-1">Piso</label>
                              <input className="input text-xs" value={editFloor} onChange={(e) => setEditFloor(e.target.value)} placeholder="3, PB..." />
                            </div>

                            <div className="md:col-span-2">
                              <MultiLocationSelector
                                value={editLocationIds}
                                onChange={setEditLocationIds}
                                locations={locations}
                                label="Sedes asignadas"
                                helpText="Selecciona una o más sedes"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-medium text-gray-700 mb-1">Rol</label>
                              <select className="select text-xs" value={editRole} onChange={(e) => setEditRole(e.target.value as Role)}>
                                {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                                  <option key={r} value={r}>
                                    {ROLE_LABEL[r]}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Permisos especiales agrupados */}
                            <div className="md:col-span-2 p-3 border-2 border-blue-200 bg-blue-50 rounded-lg">
                              <div className="text-[11px] font-semibold text-blue-900 uppercase tracking-wide mb-2.5">
                                Permisos Especiales
                              </div>
                              <div className="space-y-2.5">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={editCanViewBeo}
                                    onChange={(e) => setEditCanViewBeo(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-2 focus:ring-purple-500"
                                  />
                                  <span className="text-xs text-gray-700 flex items-center gap-1.5">
                                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    Acceso a Eventos BEO
                                  </span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={editCanManageAssets}
                                    onChange={(e) => setEditCanManageAssets(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-2 focus:ring-emerald-500"
                                  />
                                  <span className="text-xs text-gray-700 flex items-center gap-1.5">
                                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                                    </svg>
                                    Puede gestionar inventario y activos
                                  </span>
                                </label>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-200">
                            <div className="flex gap-2">
                              <button 
                                className="btn btn-secondary text-xs px-3 py-1.5" 
                                type="button" 
                                disabled={busy} 
                                onClick={() => {
                                  setEditingId(null)
                                  toggleActive(u)
                                }}
                              >
                                {active ? 'Desactivar usuario' : 'Activar usuario'}
                              </button>
                              <button 
                                className="btn btn-secondary text-xs px-3 py-1.5" 
                                type="button" 
                                disabled={busy} 
                                onClick={() => {
                                  setEditingId(null)
                                  sendReset(u)
                                }}
                              >
                                Enviar reset password
                              </button>
                              <button 
                                className="btn btn-danger text-xs px-3 py-1.5" 
                                type="button" 
                                disabled={busy} 
                                onClick={() => {
                                  setEditingId(null)
                                  deleteUser(u)
                                }}
                              >
                                Eliminar usuario
                              </button>
                            </div>
                            <div className="flex gap-2">
                              <button
                                className="btn btn-secondary text-xs px-3 py-1.5"
                                type="button"
                                disabled={busy}
                                onClick={() => setEditingId(null)}
                              >
                                Cancelar
                              </button>
                              <button className="btn btn-primary text-xs px-3 py-1.5" type="button" disabled={busy} onClick={() => saveEdit(u.id)}>
                                {busy ? 'Guardando...' : 'Guardar cambios'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}

            {sorted.length === 0 ? (
              <tr>
                <td className="px-3 py-8 text-center text-gray-500 text-xs" colSpan={7}>
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
