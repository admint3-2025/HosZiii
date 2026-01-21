'use client'

import { useEffect, useState } from 'react'
import DepartmentSelector from '@/components/DepartmentSelector'
import PositionSelector from '@/components/PositionSelector'
import MultiLocationSelector from '@/components/MultiLocationSelector'
import InspectionDepartmentsSelector from '@/components/InspectionDepartmentsSelector'

const ROLES = [
  { value: 'requester', label: 'Usuario' },
  { value: 'agent_l1', label: 'Técnico (Nivel 1)' },
  { value: 'agent_l2', label: 'Técnico (Nivel 2)' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'auditor', label: 'Auditor' },
  { value: 'corporate_admin', label: 'Admin Corporativo' },
  { value: 'admin', label: 'Administrador' },
] as const

type Role = (typeof ROLES)[number]['value']

type HubModuleId = 'it-helpdesk' | 'mantenimiento' | 'corporativo' | 'administracion'
type HubModules = Record<HubModuleId, boolean>

const DEFAULT_HUB_MODULES: HubModules = {
  'it-helpdesk': true,
  mantenimiento: true,
  corporativo: true,
  administracion: true,
}

type Location = {
  id: string
  name: string
  code: string
}

type Result = {
  id: string
  email: string
  role: Role
  invite: boolean
}

export default function UserCreateForm() {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<Role>('requester')
  const [department, setDepartment] = useState('')
  const [phone, setPhone] = useState('')
  const [building, setBuilding] = useState('')
  const [floor, setFloor] = useState('')
  const [position, setPosition] = useState('')
  const [locationId, setLocationId] = useState<string>('')
  const [locationIds, setLocationIds] = useState<string[]>([]) // Múltiples sedes
  const [locations, setLocations] = useState<Location[]>([])
  const [assetCategory, setAssetCategory] = useState<string>('')
  const [allowedDepartments, setAllowedDepartments] = useState<string[]>([])
  const [canViewBeo, setCanViewBeo] = useState(false)
  const [canManageAssets, setCanManageAssets] = useState(false)
  const [invite, setInvite] = useState(true)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)

  const [adminHubModules, setAdminHubModules] = useState<HubModules>(DEFAULT_HUB_MODULES)
  const [adminHubModalOpen, setAdminHubModalOpen] = useState(false)
  const [roleBeforeAdmin, setRoleBeforeAdmin] = useState<Role>('requester')

  useEffect(() => {
    async function loadLocations() {
      try {
        const res = await fetch('/api/admin/users')
        if (res.ok) {
          const data = await res.json()
          setLocations(data.locations || [])
        }
      } catch {
        // Silent fail, locations will remain empty
      }
    }
    loadLocations()
  }, [])

  async function submit() {
    setError(null)
    setResult(null)

    if (!email.trim()) {
      setError('Email requerido')
      return
    }

    if (!invite && password.length < 8) {
      setError('Password requerido (mínimo 8 caracteres) cuando no se envía invitación')
      return
    }

    if (role === 'admin') {
      const enabled = Object.values(adminHubModules).some(Boolean)
      if (!enabled) {
        setError('Selecciona al menos 1 módulo visible para el Administrador')
        return
      }
    }

    setBusy(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          full_name: fullName.trim(),
          role,
          department: department.trim(),
          phone: phone.trim(),
          building: building.trim(),
          floor: floor.trim(),
          position: position.trim(),
          location_ids: locationIds.length > 0 ? locationIds : [],
          asset_category: assetCategory || null,
          allowed_departments: role === 'corporate_admin' && allowedDepartments.length > 0 ? allowedDepartments : null,
          can_view_beo: canViewBeo,
          can_manage_assets: canManageAssets,
          hub_visible_modules: role === 'admin' ? adminHubModules : null,
          invite,
          ...(invite ? {} : { password }),
        }),
      })

      const text = await res.text()
      if (!res.ok) {
        setError(text || `Error ${res.status}`)
        return
      }

      const json = JSON.parse(text) as Result
      setResult(json)
      setEmail('')
      setFullName('')
      setRole('requester')
      setDepartment('')
      setPhone('')
      setBuilding('')
      setFloor('')
      setPosition('')
      setLocationIds([])
      setAssetCategory('')
      setAllowedDepartments([])
      setCanViewBeo(false)
      setCanManageAssets(false)
      setInvite(true)
      setPassword('')
      setAdminHubModules(DEFAULT_HUB_MODULES)
    } catch (e: any) {
      setError(e?.message ?? 'Error inesperado')
    } finally {
      setBusy(false)
    }
  }

  const roleLabel = (r: Role) => ROLES.find((x) => x.value === r)?.label ?? r

  const openAdminHubModal = () => {
    setAdminHubModalOpen(true)
  }

  const cancelAdminHubModal = () => {
    setAdminHubModalOpen(false)
    // revertir rol si todavía no quedó aplicado
    if (role === 'admin') {
      // keep
      return
    }
    setRole(roleBeforeAdmin)
  }

  const confirmAdminHubModal = () => {
    const enabled = Object.values(adminHubModules).some(Boolean)
    if (!enabled) {
      setError('Selecciona al menos 1 módulo visible para el Administrador')
      return
    }
    setRole('admin')
    setAdminHubModalOpen(false)
  }

  return (
    <div className="card">
      <div className="p-4 space-y-3">
        <div>
          <div className="text-sm font-semibold text-gray-900">Crear usuario</div>
          <div className="text-[11px] text-gray-600 mt-0.5">
            Crea/invita usuarios y asigna rol (solo Administrador).
          </div>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-medium text-gray-700">Email</label>
            <input
              className="input mt-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@empresa.com"
              autoComplete="off"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-medium text-gray-700">Nombre completo</label>
            <input
              className="input mt-1"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nombre Apellido"
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-700">Departamento</label>
            <div className="mt-1">
              <DepartmentSelector
                value={department}
                onChange={setDepartment}
                placeholder="Selecciona un departamento"
                allowCreate={true}
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-700">Teléfono / Ext</label>
            <input
              className="input mt-1"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="555-1234 ext. 100"
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-700">Puesto</label>
            <div className="mt-1">
              <PositionSelector
                value={position}
                onChange={setPosition}
                placeholder="Selecciona un puesto"
                allowCreate={true}
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-700">Edificio / Sede</label>
            <input
              className="input mt-1"
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
              placeholder="Edificio A, Matriz..."
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-700">Piso</label>
            <input
              className="input mt-1"
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              placeholder="3, PB..."
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-700">Rol</label>
            <select
              className="select mt-1"
              value={role}
              onChange={(e) => {
                const nextRole = e.target.value as Role
                if (nextRole === 'admin') {
                  setRoleBeforeAdmin(role)
                  setAdminHubModalOpen(true)
                  return
                }
                setRole(nextRole)
              }}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {role === 'admin' && (
            <div className="sm:col-span-2 p-3 border-2 border-violet-200 bg-violet-50 rounded-lg">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold text-violet-900 uppercase tracking-wide">
                    Vista del Hub (Administrador)
                  </div>
                  <div className="text-[11px] text-violet-800 mt-1">
                    Visible: {Object.entries(adminHubModules)
                      .filter(([, v]) => v)
                      .map(([k]) => k)
                      .join(', ') || '—'}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={openAdminHubModal}
                >
                  Configurar
                </button>
              </div>
            </div>
          )}

          <div className="sm:col-span-2">
            <MultiLocationSelector
              value={locationIds}
              onChange={setLocationIds}
              locations={locations}
              label="Sedes asignadas"
              helpText="Selecciona una o más sedes para este usuario"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-medium text-gray-700">Categoría de activos</label>
            <select 
              className="select mt-1" 
              value={assetCategory} 
              onChange={(e) => setAssetCategory(e.target.value)}
            >
              <option value="">Todo Activo</option>
              <option value="IT">IT</option>
              <option value="MAINTENANCE">Mantenimiento</option>
            </select>
            <div className="mt-1 text-[10px] text-gray-500">
              Define qué tipos de activos puede gestionar este usuario
            </div>
          </div>

          {/* Selector de departamentos para inspección (solo para corporate_admin) */}
          {role === 'corporate_admin' && (
            <div className="sm:col-span-2 p-3 border-2 border-amber-200 bg-amber-50 rounded-lg">
              <div className="text-[11px] font-semibold text-amber-900 uppercase tracking-wide mb-2.5">
                Permisos de Inspección Corporativa
              </div>
              <InspectionDepartmentsSelector
                value={allowedDepartments}
                onChange={setAllowedDepartments}
                label="Departamentos que puede inspeccionar"
                helpText="Sin selección = puede inspeccionar todos los departamentos"
              />
            </div>
          )}

          {/* Permisos especiales agrupados */}
          <div className="sm:col-span-2 p-3 border-2 border-blue-200 bg-blue-50 rounded-lg">
            <div className="text-[11px] font-semibold text-blue-900 uppercase tracking-wide mb-2.5">
              Permisos Especiales
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-2 focus:ring-purple-500"
                  checked={canViewBeo}
                  onChange={(e) => setCanViewBeo(e.target.checked)}
                />
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Acceso a BEO (Eventos)
                </span>
              </label>

              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  checked={canManageAssets}
                  onChange={(e) => setCanManageAssets(e.target.checked)}
                  disabled={role === 'requester' || role === 'auditor' || role === 'corporate_admin'}
                />
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                  Gestión de activos (inventario)
                </span>
              </label>
            </div>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-1.5 text-xs text-gray-700">
              <input
                type="checkbox"
                className="checkbox"
                checked={invite}
                onChange={(e) => setInvite(e.target.checked)}
              />
              Enviar invitación por email
            </label>
          </div>

          {!invite ? (
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-medium text-gray-700">Password</label>
              <input
                className="input mt-1"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                type="password"
                autoComplete="new-password"
              />
              <div className="mt-1 text-[10px] text-gray-500">
                El password se envía solo al servidor para crear el usuario.
              </div>
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-xs text-red-700">{error}</div>
        ) : null}

        {result ? (
          <div className="rounded-md border border-green-200 bg-green-50 px-2.5 py-2 text-xs text-green-800">
            Usuario creado: <span className="font-semibold">{result.email}</span> — rol <span className="font-semibold">{result.role}</span>
          </div>
        ) : null}

        <div className="flex justify-end">
          <button type="button" className="btn btn-primary" onClick={submit} disabled={busy}>
            {busy ? 'Procesando…' : 'Crear'}
          </button>
        </div>
      </div>

      {adminHubModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={cancelAdminHubModal} />
          <div className="relative w-full max-w-lg rounded-xl bg-white border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h2 className="text-sm font-bold text-slate-900">Configurar vista del Hub (Administrador)</h2>
              <p className="text-xs text-slate-600 mt-1">
                Selecciona qué módulos verá en el Hub. Puedes cambiarlo después editando el usuario.
              </p>
            </div>

            <div className="p-4 space-y-2">
              {(
                [
                  { id: 'it-helpdesk', label: 'IT - HELPDESK' },
                  { id: 'mantenimiento', label: 'MANTENIMIENTO' },
                  { id: 'corporativo', label: 'CORPORATIVO' },
                  { id: 'administracion', label: 'ADMINISTRACIÓN' },
                ] as Array<{ id: HubModuleId; label: string }>
              ).map((m) => (
                <label key={m.id} className="flex items-center gap-2 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300"
                    checked={adminHubModules[m.id]}
                    onChange={(e) =>
                      setAdminHubModules((prev) => ({
                        ...prev,
                        [m.id]: e.target.checked,
                      }))
                    }
                  />
                  {m.label}
                </label>
              ))}
            </div>

            <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between gap-2">
              <div className="text-xs text-slate-500">
                Rol seleccionado: <span className="font-semibold">{roleLabel('admin')}</span>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" className="btn btn-secondary" onClick={cancelAdminHubModal}>
                  Cancelar
                </button>
                <button type="button" className="btn btn-primary" onClick={confirmAdminHubModal}>
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
