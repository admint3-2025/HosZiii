'use client'

import { useState } from 'react'

const ROLES = [
  { value: 'requester', label: 'Usuario' },
  { value: 'agent_l1', label: 'Técnico (Nivel 1)' },
  { value: 'agent_l2', label: 'Técnico (Nivel 2)' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'auditor', label: 'Auditor' },
  { value: 'admin', label: 'Administrador' },
] as const

type Role = (typeof ROLES)[number]['value']

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
  const [invite, setInvite] = useState(true)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)

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
      setInvite(true)
      setPassword('')
    } catch (e: any) {
      setError(e?.message ?? 'Error inesperado')
    } finally {
      setBusy(false)
    }
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
            <input
              className="input mt-1"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="TI, RRHH, Ventas..."
              autoComplete="off"
            />
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
            <input
              className="input mt-1"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="Analista, Gerente..."
              autoComplete="off"
            />
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
            <select className="select mt-1" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
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
    </div>
  )
}
