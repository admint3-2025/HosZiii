'use client'

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  Building2,
  CalendarDays,
  ChartColumn,
  CheckCircle2,
  ClipboardList,
  FolderPlus,
  RefreshCw,
  Wrench,
  X,
} from 'lucide-react'
import type {
  OpsEntidad,
  OpsAgendaItem,
  OpsCalendarItem,
  OpsComplianceItem,
  OpsFinancialItem,
  OpsPlan,
  OpsResponsable,
} from '@/lib/ops/service'
import type { UserPlanningProfile } from './page'

type Props = {
  userProfile: UserPlanningProfile
  initialYear: number
}

type PlanWithRelations = OpsPlan & {
  entidad?: { nombre: string } | null
  responsable?: { nombre: string } | null
}

type DepartmentDef = {
  key: string
  label: string
  shortLabel: string
  icon: LucideIcon
  accent: string
  soft: string
  border: string
  aliases?: string[]
}

type CreateFormState = {
  tipo: string
  titulo: string
  descripcion: string
  departamento: string
  centro_costo: string
  area: string
  fecha: string
  frecuencia: string
  repite: boolean
}

type LocationOption = {
  id: string
  code: string
  name: string
}

type PortfolioResponse = {
  plans: PlanWithRelations[]
  calendar: OpsCalendarItem[]
  compliance: OpsComplianceItem[]
  financial: OpsFinancialItem[]
}

type EditPlanFormState = {
  codigo_plan: string
  nombre: string
  descripcion: string
  departamento_dueno: string
  centro_costo: string
  moneda: string
  entidad_objetivo_id: string
  responsable_proveedor_id: string
  fecha_inicio: string
  fecha_fin: string
  frecuencia_tipo: string
  frecuencia_intervalo: string
  custom_interval_days: string
  dia_semana: string
  dia_del_mes: string
  monto_total_planeado: string
  esfuerzo_total_planeado: string
  estado: OpsPlan['estado']
}

type MatrixCell = {
  count: number
  budget: number
  status: OpsAgendaItem['estado'] | OpsCalendarItem['estado'] | 'mixed' | null
}

const MONTHS = ['ENE', 'FEB', 'MZO', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEPT', 'OCT', 'NOV', 'DIC']

const DEPARTMENTS: DepartmentDef[] = [
  {
    key: 'RECURSOS HUMANOS',
    label: 'Recursos Humanos',
    shortLabel: 'RRHH',
    icon: Building2,
    accent: 'text-blue-700',
    soft: 'bg-blue-50',
    border: 'border-blue-200',
    aliases: ['RRHH', 'RH'],
  },
  {
    key: 'GSH',
    label: 'GSH',
    shortLabel: 'GSH',
    icon: ClipboardList,
    accent: 'text-emerald-700',
    soft: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  {
    key: 'DIV. CUARTOS',
    label: 'Div. Cuartos',
    shortLabel: 'Cuartos',
    icon: Building2,
    accent: 'text-indigo-700',
    soft: 'bg-indigo-50',
    border: 'border-indigo-200',
    aliases: ['CUARTOS', 'DIV CUARTOS', 'DIVISION CUARTOS'],
  },
  {
    key: 'MANTENIMIENTO',
    label: 'Mantenimiento',
    shortLabel: 'Mantenimiento',
    icon: Wrench,
    accent: 'text-orange-700',
    soft: 'bg-orange-50',
    border: 'border-orange-200',
  },
  {
    key: 'SISTEMAS',
    label: 'Sistemas',
    shortLabel: 'Sistemas',
    icon: ChartColumn,
    accent: 'text-cyan-700',
    soft: 'bg-cyan-50',
    border: 'border-cyan-200',
    aliases: ['IT'],
  },
  {
    key: 'ALIMENTOS Y BEBIDAS',
    label: 'Alimentos y Bebidas',
    shortLabel: 'AyB',
    icon: ClipboardList,
    accent: 'text-rose-700',
    soft: 'bg-rose-50',
    border: 'border-rose-200',
    aliases: ['AYB', 'A&B', 'ALIMENTOS Y BEBIDAS (A&B)'],
  },
  {
    key: 'AMA DE LLAVES',
    label: 'Ama de Llaves',
    shortLabel: 'ADL',
    icon: CheckCircle2,
    accent: 'text-fuchsia-700',
    soft: 'bg-fuchsia-50',
    border: 'border-fuchsia-200',
    aliases: ['HOUSEKEEPING', 'AMA DE LLAVES (HOUSEKEEPING)'],
  },
  {
    key: 'CONTABILIDAD',
    label: 'Contabilidad',
    shortLabel: 'Conta',
    icon: Banknote,
    accent: 'text-teal-700',
    soft: 'bg-teal-50',
    border: 'border-teal-200',
    aliases: ['CONTA'],
  },
  {
    key: 'MARKETING',
    label: 'Marketing',
    shortLabel: 'Mkt',
    icon: CalendarDays,
    accent: 'text-pink-700',
    soft: 'bg-pink-50',
    border: 'border-pink-200',
    aliases: ['MKT'],
  },
]

const STATUS_STYLES: Record<string, string> = {
  pendiente: 'bg-amber-100 text-amber-800 border-amber-200',
  en_proceso: 'bg-sky-100 text-sky-800 border-sky-200',
  completado: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelado: 'bg-slate-100 text-slate-700 border-slate-200',
  mixed: 'bg-violet-100 text-violet-800 border-violet-200',
}

const PLAN_STATE_STYLES: Record<string, string> = {
  activo: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  pausado: 'bg-amber-100 text-amber-800 border-amber-200',
  cerrado: 'bg-slate-100 text-slate-700 border-slate-200',
}

const INPUT_CLASS = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100'

function normalize(value: string | null | undefined) {
  return (value ?? '').trim().toUpperCase()
}

function resolveDepartmentConfig(value: string | null | undefined) {
  const normalized = normalize(value)
  if (!normalized) return null

  return DEPARTMENTS.find((item) => {
    if (item.key === normalized || normalize(item.label) === normalized) return true
    return item.aliases?.some((alias) => normalize(alias) === normalized) ?? false
  }) ?? null
}

function formatCurrency(amount: number | null | undefined) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(Number(amount ?? 0))
}

function formatDate(date: string | null | undefined) {
  if (!date) return '-'
  const parsed = new Date(date + 'T00:00:00')
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

function monthBounds(year: number) {
  return {
    from: `${year}-01-01`,
    to: `${year}-12-31`,
  }
}

function todayIso() {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function statusRank(status: string) {
  if (status === 'en_proceso') return 3
  if (status === 'pendiente') return 2
  if (status === 'cancelado') return 1
  return 0
}

function getDepartmentConfig(department: string) {
  return resolveDepartmentConfig(department) ?? {
    key: normalize(department),
    label: department || 'Sin departamento',
    shortLabel: department || 'Sin depto',
    icon: Building2,
    accent: 'text-slate-700',
    soft: 'bg-slate-50',
    border: 'border-slate-200',
  }
}

function getAccessibleDepartments(profile: UserPlanningProfile) {
  if (profile.isAdmin) return DEPARTMENTS

  const allowed = new Map<string, DepartmentDef>()
  if (profile.departamento) {
    const department = getDepartmentConfig(profile.departamento)
    allowed.set(department.key, department)
  }

  for (const dept of profile.allowed_departments ?? []) {
    const department = getDepartmentConfig(dept)
    allowed.set(department.key, department)
  }

  if (profile.isCorporate && allowed.size === 0) {
    return DEPARTMENTS
  }

  const filtered = Array.from(allowed.values()).sort((left, right) => left.label.localeCompare(right.label, 'es-MX'))
  return filtered.length > 0 ? filtered : [getDepartmentConfig(profile.departamento || 'MANTENIMIENTO')]
}

function buildDepartmentCatalog(profile: UserPlanningProfile, portfolio: PortfolioResponse) {
  const known = new Map(DEPARTMENTS.map((department) => [department.key, department]))
  const discovered = new Set<string>()

  if (profile.departamento) discovered.add(normalize(profile.departamento))
  for (const department of profile.allowed_departments ?? []) {
    discovered.add(normalize(department))
  }

  for (const plan of portfolio.plans) discovered.add(normalize(plan.departamento_dueno))
  for (const item of portfolio.calendar) discovered.add(normalize(item.departamento_dueno))
  for (const item of portfolio.financial) discovered.add(normalize(item.departamento_dueno))
  for (const item of portfolio.compliance) discovered.add(normalize(item.departamento))

  const departments = Array.from(discovered)
    .filter(Boolean)
    .map((department) => known.get(department) ?? getDepartmentConfig(department))
    .sort((left, right) => left.label.localeCompare(right.label, 'es-MX'))

  if (profile.isAdmin) {
    const merged = new Map(DEPARTMENTS.map((department) => [department.key, department]))

    for (const department of departments) {
      merged.set(department.key, department)
    }

    return Array.from(merged.values()).sort((left, right) => left.label.localeCompare(right.label, 'es-MX'))
  }

  const allowed = new Set(getAccessibleDepartments(profile).map((department) => department.key))
  const filtered = departments.filter((department) => allowed.has(department.key))
  return filtered.length > 0 ? filtered : getAccessibleDepartments(profile)
}

function locationMatches(centroCosto: string | null | undefined, location: LocationOption) {
  const value = normalize(centroCosto)
  if (!value) return false
  return value === normalize(location.code) || value === normalize(location.name) || value === normalize(location.id)
}

function locationLabel(centroCosto: string | null | undefined, locations: LocationOption[]) {
  if (!centroCosto) return 'Sin sede asignada'
  const matched = locations.find((location) => locationMatches(centroCosto, location))
  return matched ? `${matched.code} - ${matched.name}` : centroCosto
}

function matchesSelectedLocation(
  centroCosto: string | null | undefined,
  selectedLocationId: string,
  locations: LocationOption[],
) {
  if (selectedLocationId === 'ALL') return true
  const selected = locations.find((location) => location.id === selectedLocationId)
  if (!selected) return false
  return locationMatches(centroCosto, selected)
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' })
  const json = await response.json()
  if (!response.ok || !json.ok) {
    throw new Error(json.error ?? `Error ${response.status}`)
  }
  return json as T
}

function getMatrixForPlan(plan: PlanWithRelations, calendar: OpsCalendarItem[]) {
  const map = new Map<number, MatrixCell>()
  const planRows = calendar.filter((item) => item.plan_maestro_id === plan.id)

  for (const row of planRows) {
    const month = new Date(row.due_date + 'T00:00:00').getMonth() + 1
    const current = map.get(month)
    if (!current) {
      map.set(month, { count: 1, budget: Number(row.monto_estimado || 0), status: row.estado })
      continue
    }

    current.count += 1
    current.budget += Number(row.monto_estimado || 0)
    current.status = current.status === row.estado
      ? current.status
      : statusRank(row.estado) >= statusRank(current.status ?? '')
        ? 'mixed'
        : current.status
  }

  return map
}

function SummaryCard({
  title,
  value,
  help,
  accent,
  icon: Icon,
}: {
  title: string
  value: string
  help: string
  accent: string
  icon: LucideIcon
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
          <p className={`mt-3 text-3xl font-black leading-none ${accent}`}>{value}</p>
          <p className="mt-2 text-sm text-slate-500">{help}</p>
        </div>
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-600">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function DepartmentCard({
  department,
  selected,
  onSelect,
  plans,
  financial,
  calendar,
}: {
  department: DepartmentDef
  selected: boolean
  onSelect: () => void
  plans: PlanWithRelations[]
  financial: OpsFinancialItem[]
  calendar: OpsCalendarItem[]
}) {
  const Icon = department.icon
  const activePlans = plans.filter((item) => normalize(item.departamento_dueno) === department.key)
  const budget = financial
    .filter((item) => normalize(item.departamento_dueno) === department.key)
    .reduce((sum, item) => sum + Number(item.monto_total_planeado || 0), 0)
  const events = calendar.filter((item) => normalize(item.departamento_dueno) === department.key).length

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-2xl border p-5 text-left shadow-sm transition-all ${selected ? `${department.border} ${department.soft} ring-2 ring-sky-200` : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className={`rounded-2xl p-3 ${department.soft} ${department.accent}`}>
          <Icon className="h-6 w-6" />
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 shadow-sm">
          {activePlans.length} planes
        </span>
      </div>
      <h3 className="mt-4 text-lg font-bold text-slate-900">{department.label}</h3>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white/80 px-3 py-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Presupuesto</p>
          <p className="mt-1 text-sm font-bold text-slate-900">{formatCurrency(budget)}</p>
        </div>
        <div className="rounded-xl bg-white/80 px-3 py-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Eventos</p>
          <p className="mt-1 text-sm font-bold text-slate-900">{events}</p>
        </div>
      </div>
    </button>
  )
}

function NewPlanModal({
  open,
  canManage,
  defaultDepartment,
  defaultCentroCosto,
  departments,
  locations,
  onClose,
  onCreated,
}: {
  open: boolean
  canManage: boolean
  defaultDepartment: string
  defaultCentroCosto: string
  departments: DepartmentDef[]
  locations: LocationOption[]
  onClose: () => void
  onCreated: () => Promise<void>
}) {
  const [form, setForm] = useState<CreateFormState>({
    tipo: 'mantenimiento_preventivo',
    titulo: '',
    descripcion: '',
    departamento: defaultDepartment,
    centro_costo: defaultCentroCosto,
    area: '',
    fecha: `${new Date().getFullYear()}-01-15`,
    frecuencia: 'monthly',
    repite: true,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      departamento: defaultDepartment,
      centro_costo: defaultCentroCosto,
    }))
  }, [defaultDepartment, defaultCentroCosto])

  if (!open) return null

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!canManage) {
      setError('Tu perfil solo tiene acceso de consulta')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/ops/actividades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await response.json()
      if (!response.ok || !json.ok) {
        throw new Error(json.error ?? 'No se pudo crear la actividad')
      }
      await onCreated()
      onClose()
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo crear la actividad')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Nuevo plan anual</h2>
            <p className="mt-1 text-sm text-slate-500">Crea el plan y genera su agenda inicial en base de datos</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <span className="sr-only">Cerrar</span>
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4 px-6 py-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Tipo">
              <select className={INPUT_CLASS} value={form.tipo} onChange={(e) => setForm((prev) => ({ ...prev, tipo: e.target.value }))}>
                <option value="mantenimiento_preventivo">Mantenimiento preventivo</option>
                <option value="inspeccion">Inspeccion</option>
                <option value="inventario">Inventario</option>
                <option value="capacitacion">Capacitacion</option>
                <option value="otro">Otro</option>
              </select>
            </Field>
            <Field label="Departamento">
              <select className={INPUT_CLASS} value={form.departamento} onChange={(e) => setForm((prev) => ({ ...prev, departamento: e.target.value }))}>
                {departments.map((department) => (
                  <option key={department.key} value={department.key}>{department.label}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Sede / propiedad">
            <select className={INPUT_CLASS} value={form.centro_costo} onChange={(e) => setForm((prev) => ({ ...prev, centro_costo: e.target.value }))}>
              <option value="">Sin sede</option>
              {locations.map((location) => (
                <option key={location.id} value={location.code}>{location.code} - {location.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Titulo del plan">
            <input className={INPUT_CLASS} value={form.titulo} onChange={(e) => setForm((prev) => ({ ...prev, titulo: e.target.value }))} placeholder="Ej. Programa anual de elevadores" required />
          </Field>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Activo / area objetivo">
              <input className={INPUT_CLASS} value={form.area} onChange={(e) => setForm((prev) => ({ ...prev, area: e.target.value }))} placeholder="Ej. Elevadores principales" />
            </Field>
            <Field label="Fecha de inicio">
              <input type="date" className={INPUT_CLASS} value={form.fecha} onChange={(e) => setForm((prev) => ({ ...prev, fecha: e.target.value }))} required />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Frecuencia">
              <select className={INPUT_CLASS} value={form.frecuencia} onChange={(e) => setForm((prev) => ({ ...prev, frecuencia: e.target.value }))}>
                <option value="monthly">Mensual</option>
                <option value="quarterly">Trimestral</option>
                <option value="yearly">Anual</option>
                <option value="weekly">Semanal</option>
              </select>
            </Field>
            <Field label="Descripcion">
              <input className={INPUT_CLASS} value={form.descripcion} onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))} placeholder="Objetivo, alcance o alcance presupuestal" />
            </Field>
          </div>
          {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
            <button type="submit" disabled={submitting} className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60">{submitting ? 'Guardando...' : 'Crear plan'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</span>
      {children}
    </label>
  )
}

function EditPlanModal({
  open,
  plan,
  departments,
  locations,
  entidades,
  responsables,
  canEdit,
  onClose,
  onSaved,
}: {
  open: boolean
  plan: PlanWithRelations | null
  departments: DepartmentDef[]
  locations: LocationOption[]
  entidades: OpsEntidad[]
  responsables: OpsResponsable[]
  canEdit: boolean
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [form, setForm] = useState<EditPlanFormState>({
    codigo_plan: '',
    nombre: '',
    descripcion: '',
    departamento_dueno: '',
    centro_costo: '',
    moneda: 'MXN',
    entidad_objetivo_id: '',
    responsable_proveedor_id: '',
    fecha_inicio: '',
    fecha_fin: '',
    frecuencia_tipo: 'monthly',
    frecuencia_intervalo: '1',
    custom_interval_days: '',
    dia_semana: '',
    dia_del_mes: '',
    monto_total_planeado: '0',
    esfuerzo_total_planeado: '0',
    estado: 'activo',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!plan) return
    setForm({
      codigo_plan: plan.codigo_plan ?? '',
      nombre: plan.nombre ?? '',
      descripcion: plan.descripcion ?? '',
      departamento_dueno: plan.departamento_dueno ?? '',
      centro_costo: plan.centro_costo ?? '',
      moneda: plan.moneda ?? 'MXN',
      entidad_objetivo_id: plan.entidad_objetivo_id ?? '',
      responsable_proveedor_id: plan.responsable_proveedor_id ?? '',
      fecha_inicio: plan.fecha_inicio ?? '',
      fecha_fin: plan.fecha_fin ?? '',
      frecuencia_tipo: plan.frecuencia_tipo ?? 'monthly',
      frecuencia_intervalo: String(plan.frecuencia_intervalo ?? 1),
      custom_interval_days: plan.custom_interval_days ? String(plan.custom_interval_days) : '',
      dia_semana: plan.dia_semana === null ? '' : String(plan.dia_semana),
      dia_del_mes: plan.dia_del_mes === null ? '' : String(plan.dia_del_mes),
      monto_total_planeado: String(plan.monto_total_planeado ?? 0),
      esfuerzo_total_planeado: String(plan.esfuerzo_total_planeado ?? 0),
      estado: plan.estado ?? 'activo',
    })
    setError(null)
  }, [plan])

  if (!open || !plan) return null
  const currentPlan = plan

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!canEdit) {
      setError('No tienes permisos para editar este plan')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/ops/planes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentPlan.id,
          ...form,
          entidad_objetivo_id: form.entidad_objetivo_id || null,
          responsable_proveedor_id: form.responsable_proveedor_id || null,
          centro_costo: form.centro_costo || null,
          custom_interval_days: form.custom_interval_days || null,
          dia_semana: form.dia_semana || null,
          dia_del_mes: form.dia_del_mes || null,
        }),
      })
      const json = await response.json()
      if (!response.ok || !json.ok) {
        throw new Error(json.error ?? 'No se pudo actualizar el plan')
      }

      await onSaved()
      onClose()
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo actualizar el plan')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Editar plan</h2>
            <p className="mt-1 text-sm text-slate-500">Actualiza los campos operativos y financieros del plan seleccionado.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <span className="sr-only">Cerrar</span>
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={submit} className="max-h-[80vh] space-y-4 overflow-y-auto px-6 py-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Codigo del plan">
              <input className={INPUT_CLASS} value={form.codigo_plan} onChange={(e) => setForm((prev) => ({ ...prev, codigo_plan: e.target.value }))} />
            </Field>
            <Field label="Nombre del plan">
              <input className={INPUT_CLASS} value={form.nombre} onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))} required />
            </Field>
            <Field label="Estado">
              <select className={INPUT_CLASS} value={form.estado} onChange={(e) => setForm((prev) => ({ ...prev, estado: e.target.value as OpsPlan['estado'] }))}>
                <option value="activo">Activo</option>
                <option value="pausado">Pausado</option>
                <option value="cerrado">Cerrado</option>
              </select>
            </Field>
          </div>

          <Field label="Descripcion">
            <textarea className={`${INPUT_CLASS} min-h-[96px]`} value={form.descripcion} onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))} />
          </Field>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Departamento">
              <select className={INPUT_CLASS} value={form.departamento_dueno} onChange={(e) => setForm((prev) => ({ ...prev, departamento_dueno: e.target.value }))}>
                {departments.map((department) => (
                  <option key={department.key} value={department.key}>{department.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Sede">
              <select className={INPUT_CLASS} value={form.centro_costo} onChange={(e) => setForm((prev) => ({ ...prev, centro_costo: e.target.value }))}>
                <option value="">Sin sede asignada</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.code}>{location.code} - {location.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Moneda">
              <input className={INPUT_CLASS} value={form.moneda} onChange={(e) => setForm((prev) => ({ ...prev, moneda: e.target.value }))} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Entidad objetivo">
              <select className={INPUT_CLASS} value={form.entidad_objetivo_id} onChange={(e) => setForm((prev) => ({ ...prev, entidad_objetivo_id: e.target.value }))}>
                <option value="">Sin entidad</option>
                {entidades.map((item) => (
                  <option key={item.id} value={item.id}>{item.nombre}</option>
                ))}
              </select>
            </Field>
            <Field label="Proveedor / responsable">
              <select className={INPUT_CLASS} value={form.responsable_proveedor_id} onChange={(e) => setForm((prev) => ({ ...prev, responsable_proveedor_id: e.target.value }))}>
                <option value="">Sin proveedor</option>
                {responsables.map((item) => (
                  <option key={item.id} value={item.id}>{item.nombre}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Inicio">
              <input type="date" className={INPUT_CLASS} value={form.fecha_inicio} onChange={(e) => setForm((prev) => ({ ...prev, fecha_inicio: e.target.value }))} required />
            </Field>
            <Field label="Fin">
              <input type="date" className={INPUT_CLASS} value={form.fecha_fin} onChange={(e) => setForm((prev) => ({ ...prev, fecha_fin: e.target.value }))} required />
            </Field>
            <Field label="Frecuencia">
              <select className={INPUT_CLASS} value={form.frecuencia_tipo} onChange={(e) => setForm((prev) => ({ ...prev, frecuencia_tipo: e.target.value }))}>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensual</option>
                <option value="quarterly">Trimestral</option>
                <option value="yearly">Anual</option>
                <option value="custom_days">Personalizado</option>
              </select>
            </Field>
            <Field label="Intervalo">
              <input type="number" min="1" className={INPUT_CLASS} value={form.frecuencia_intervalo} onChange={(e) => setForm((prev) => ({ ...prev, frecuencia_intervalo: e.target.value }))} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Dias personalizados">
              <input type="number" min="1" className={INPUT_CLASS} value={form.custom_interval_days} onChange={(e) => setForm((prev) => ({ ...prev, custom_interval_days: e.target.value }))} />
            </Field>
            <Field label="Dia de semana">
              <input type="number" min="1" max="7" className={INPUT_CLASS} value={form.dia_semana} onChange={(e) => setForm((prev) => ({ ...prev, dia_semana: e.target.value }))} />
            </Field>
            <Field label="Dia del mes">
              <input type="number" min="1" max="31" className={INPUT_CLASS} value={form.dia_del_mes} onChange={(e) => setForm((prev) => ({ ...prev, dia_del_mes: e.target.value }))} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Presupuesto planeado">
              <input type="number" min="0" step="0.01" className={INPUT_CLASS} value={form.monto_total_planeado} onChange={(e) => setForm((prev) => ({ ...prev, monto_total_planeado: e.target.value }))} />
            </Field>
            <Field label="Esfuerzo planeado">
              <input type="number" min="0" step="0.01" className={INPUT_CLASS} value={form.esfuerzo_total_planeado} onChange={(e) => setForm((prev) => ({ ...prev, esfuerzo_total_planeado: e.target.value }))} />
            </Field>
          </div>

          {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
            <button type="submit" disabled={submitting} className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60">{submitting ? 'Guardando...' : 'Guardar cambios'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function PlanningHubClient({ userProfile, initialYear }: Props) {
  const canSeeAll = userProfile.isAdmin
  const canSelectAllAssignedLocations = userProfile.isAdmin || userProfile.isCorporate
  const canSelectAllAccessibleDepartments = userProfile.isAdmin || userProfile.isCorporate
  const canManage = userProfile.isAdmin || userProfile.role === 'supervisor'

  const [year, setYear] = useState(initialYear)
  const [locations, setLocations] = useState<LocationOption[]>([])
  const [locationsLoading, setLocationsLoading] = useState(true)
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL')
  const [selectedLocationId, setSelectedLocationId] = useState<string>('ALL')
  const [portfolio, setPortfolio] = useState<PortfolioResponse>({ plans: [], calendar: [], compliance: [], financial: [] })
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [agenda, setAgenda] = useState<OpsAgendaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [agendaLoading, setAgendaLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [entityOptions, setEntityOptions] = useState<OpsEntidad[]>([])
  const [responsibleOptions, setResponsibleOptions] = useState<OpsResponsable[]>([])

  const accessibleDepartments = useMemo(() => {
    return buildDepartmentCatalog(userProfile, portfolio)
  }, [portfolio, userProfile])
  const preferredDept = accessibleDepartments[0]?.key ?? 'MANTENIMIENTO'
  const visibleDepartmentKeys = useMemo(() => new Set(accessibleDepartments.map((item) => item.key)), [accessibleDepartments])

  useEffect(() => {
    async function loadReferenceData() {
      try {
        setLocationsLoading(true)
        const locationsJson = await fetchJson<{ locations: LocationOption[] }>('/api/planificacion/locations')
        setLocations(locationsJson.locations ?? [])
      } catch {
        setLocations([])
      } finally {
        setLocationsLoading(false)
      }
    }

    loadReferenceData()
  }, [])

  useEffect(() => {
    if (canSelectAllAccessibleDepartments) {
      setSelectedDepartment((current) => current || 'ALL')
      return
    }

    setSelectedDepartment((current) => {
      if (current !== 'ALL' && accessibleDepartments.some((department) => department.key === current)) return current
      return preferredDept
    })
  }, [accessibleDepartments, canSelectAllAccessibleDepartments, preferredDept])

  useEffect(() => {
    if (canSelectAllAssignedLocations) {
      setSelectedLocationId((current) => current || 'ALL')
      return
    }

    if (locationsLoading) return
    setSelectedLocationId((current) => {
      if (current !== 'ALL' && locations.some((location) => location.id === current)) return current
      return locations[0]?.id ?? 'ALL'
    })
  }, [canSelectAllAssignedLocations, locations, locationsLoading])

  async function loadPortfolio() {
    try {
      setError(null)
      setRefreshing(true)
      const bounds = monthBounds(year)
      const [plansJson, calendarJson, complianceJson, financialJson] = await Promise.all([
        fetchJson<{ ok: true; data: PlanWithRelations[] }>('/api/ops/planes'),
        fetchJson<{ ok: true; data: OpsCalendarItem[] }>(`/api/ops/calendar?from=${bounds.from}&to=${bounds.to}&limit=1200`),
        fetchJson<{ ok: true; data: OpsComplianceItem[] }>(`/api/ops/compliance?as_of_date=${todayIso()}`),
        fetchJson<{ ok: true; data: OpsFinancialItem[] }>('/api/ops/financial'),
      ])

      const scopedPlans = plansJson.data.filter((item) => canSeeAll || visibleDepartmentKeys.has(normalize(item.departamento_dueno)))
      const scopedCalendar = calendarJson.data.filter((item) => canSeeAll || visibleDepartmentKeys.has(normalize(item.departamento_dueno)))
      const scopedCompliance = complianceJson.data.filter((item) => canSeeAll || visibleDepartmentKeys.has(normalize(item.departamento)))
      const scopedFinancial = financialJson.data.filter((item) => canSeeAll || visibleDepartmentKeys.has(normalize(item.departamento_dueno)))

      setPortfolio({ plans: scopedPlans, calendar: scopedCalendar, compliance: scopedCompliance, financial: scopedFinancial })
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo cargar la cartera anual')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadPortfolio()
  }, [canSeeAll, visibleDepartmentKeys, year])

  const scopedPortfolio = useMemo(() => {
    const basePlans = portfolio.plans.filter((plan) => canSeeAll || visibleDepartmentKeys.has(normalize(plan.departamento_dueno)))
    const baseCalendar = portfolio.calendar.filter((item) => canSeeAll || visibleDepartmentKeys.has(normalize(item.departamento_dueno)))
    const baseCompliance = portfolio.compliance.filter((item) => canSeeAll || visibleDepartmentKeys.has(normalize(item.departamento)))
    const baseFinancial = portfolio.financial.filter((item) => canSeeAll || visibleDepartmentKeys.has(normalize(item.departamento_dueno)))

    const byLocation = {
      plans: basePlans.filter((item) => matchesSelectedLocation(item.centro_costo, selectedLocationId, locations)),
      calendar: baseCalendar.filter((item) => matchesSelectedLocation(item.centro_costo, selectedLocationId, locations)),
      compliance: baseCompliance.filter((item) => matchesSelectedLocation(item.centro_costo, selectedLocationId, locations)),
      financial: baseFinancial.filter((item) => matchesSelectedLocation(item.centro_costo, selectedLocationId, locations)),
    }

    return {
      plans: byLocation.plans.filter((plan) => selectedDepartment === 'ALL' || normalize(plan.departamento_dueno) === selectedDepartment),
      calendar: byLocation.calendar.filter((item) => selectedDepartment === 'ALL' || normalize(item.departamento_dueno) === selectedDepartment),
      compliance: byLocation.compliance.filter((item) => selectedDepartment === 'ALL' || normalize(item.departamento) === selectedDepartment),
      financial: byLocation.financial.filter((item) => selectedDepartment === 'ALL' || normalize(item.departamento_dueno) === selectedDepartment),
    }
  }, [canSeeAll, locations, portfolio, selectedDepartment, selectedLocationId, visibleDepartmentKeys])

  const filteredPlans = scopedPortfolio.plans

  useEffect(() => {
    if (filteredPlans.length === 0) {
      setSelectedPlanId(null)
      return
    }
    if (!selectedPlanId || !filteredPlans.some((plan) => plan.id === selectedPlanId)) {
      setSelectedPlanId(filteredPlans[0].id)
    }
  }, [filteredPlans, selectedPlanId])

  async function loadAgenda(planId: string) {
    try {
      setAgendaLoading(true)
      const json = await fetchJson<{ ok: true; data: OpsAgendaItem[] }>(`/api/ops/agenda?plan_id=${encodeURIComponent(planId)}`)
      setAgenda(json.data)
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo cargar la agenda del plan')
      setAgenda([])
    } finally {
      setAgendaLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedPlanId) {
      setAgenda([])
      return
    }
    loadAgenda(selectedPlanId)
  }, [selectedPlanId])

  const selectedPlan = useMemo(() => filteredPlans.find((plan) => plan.id === selectedPlanId) ?? null, [filteredPlans, selectedPlanId])
  const canEditSelectedPlan = useMemo(() => {
    if (!selectedPlan) return false
    if (userProfile.isAdmin) return true
    return visibleDepartmentKeys.has(normalize(selectedPlan.departamento_dueno))
  }, [selectedPlan, userProfile.isAdmin, visibleDepartmentKeys])

  const departmentCards = useMemo(() => {
    return accessibleDepartments.map((department) => ({
      department,
      selected: selectedDepartment === department.key,
    }))
  }, [accessibleDepartments, selectedDepartment])

  const totalPlanned = scopedPortfolio.financial.reduce((sum, item) => sum + Number(item.monto_total_planeado || 0), 0)
  const activePlans = filteredPlans.filter((plan) => plan.estado === 'activo').length
  const totalEvents = scopedPortfolio.calendar.length
  const totalCritical = scopedPortfolio.compliance.filter((item) => item.alert_flag === 'RED').length

  const matrixRows = useMemo(() => {
    return filteredPlans.map((plan) => ({
      plan,
      matrix: getMatrixForPlan(plan, scopedPortfolio.calendar),
      annualBudget: scopedPortfolio.calendar
        .filter((item) => item.plan_maestro_id === plan.id)
        .reduce((sum, item) => sum + Number(item.monto_estimado || 0), 0),
    }))
  }, [filteredPlans, scopedPortfolio.calendar])

  async function updateAgendaStatus(id: string, estado: OpsAgendaItem['estado']) {
    try {
      const response = await fetch('/api/ops/agenda', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, estado }),
      })
      const json = await response.json()
      if (!response.ok || !json.ok) {
        throw new Error(json.error ?? 'No se pudo actualizar la agenda')
      }
      if (selectedPlanId) {
        await Promise.all([loadAgenda(selectedPlanId), loadPortfolio()])
      }
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo actualizar la agenda')
    }
  }

  async function updatePlanState(id: string, estado: OpsPlan['estado']) {
    try {
      const response = await fetch('/api/ops/planes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, estado }),
      })
      const json = await response.json()
      if (!response.ok || !json.ok) {
        throw new Error(json.error ?? 'No se pudo actualizar el plan')
      }
      await loadPortfolio()
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo actualizar el plan')
    }
  }

  async function loadEditCatalogs() {
    const [entitiesJson, responsiblesJson] = await Promise.all([
      fetchJson<{ ok: true; data: OpsEntidad[] }>('/api/ops/entidades'),
      fetchJson<{ ok: true; data: OpsResponsable[] }>('/api/ops/responsables'),
    ])

    setEntityOptions(entitiesJson.data ?? [])
    setResponsibleOptions(responsiblesJson.data ?? [])
  }

  async function openEditPlanModal() {
    try {
      setError(null)
      await loadEditCatalogs()
      setShowEditModal(true)
    } catch (err: any) {
      setError(err?.message ?? 'No se pudieron cargar los catalogos para editar el plan')
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-[28px] border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-sky-900 px-8 py-8 text-white shadow-sm">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-100">
                <Building2 className="h-4 w-4" />
                Planeacion anual corporativa
              </div>
              <h1 className="mt-4 text-4xl font-black tracking-tight">Dashboard ejecutivo de cartera anual</h1>
              <p className="mt-3 text-sm leading-6 text-slate-200">
                Portafolio real por departamentos, agenda operativa, presupuesto planeado y alertas de cumplimiento.
                Esta vista usa datos de base y sirve como centro de control para corporativo y supervisores.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <select className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white outline-none" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {[initialYear - 1, initialYear, initialYear + 1, initialYear + 2].map((item) => (
                  <option key={item} value={item} className="text-slate-900">{item}</option>
                ))}
              </select>
              <button type="button" onClick={loadPortfolio} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/15">
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Actualizar
              </button>
              <button type="button" onClick={() => setShowCreateModal(true)} className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-sky-50">
                <FolderPlus className="h-4 w-4" />
                Nuevo plan
              </button>
            </div>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Planes activos" value={String(activePlans)} help="Portafolio filtrado por vista actual" accent="text-slate-900" icon={ClipboardList} />
          <SummaryCard title="Eventos del anio" value={String(totalEvents)} help="Ocurrencias programadas en agenda" accent="text-sky-700" icon={CalendarDays} />
          <SummaryCard title="Presupuesto planeado" value={formatCurrency(totalPlanned)} help="Monto agregado desde control financiero" accent="text-emerald-700" icon={Banknote} />
          <SummaryCard title="Alertas criticas" value={String(totalCritical)} help="Planes con brecha operativa activa" accent="text-rose-700" icon={AlertTriangle} />
        </section>

        <section className="mt-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Vista corporativa por sede y departamento</h2>
              <p className="mt-1 text-sm text-slate-500">Como admin puedes ver el consolidado global o bajar por propiedad y por area corporativa.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canSelectAllAssignedLocations ? (
                <button type="button" onClick={() => setSelectedLocationId('ALL')} className={`rounded-full px-4 py-2 text-sm font-semibold ${selectedLocationId === 'ALL' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                  {userProfile.isAdmin ? 'Todas las sedes' : 'Mis sedes'}
                </button>
              ) : null}
              {locations.map((location) => (
                <button key={location.id} type="button" onClick={() => setSelectedLocationId(location.id)} className={`rounded-full px-4 py-2 text-sm font-semibold ${selectedLocationId === location.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                  {location.code}
                </button>
              ))}
              {!locationsLoading && locations.length === 0 ? (
                <span className="rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">Sin sedes disponibles</span>
              ) : null}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-200 pt-5">
            <div className="mr-2 inline-flex items-center rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Departamentos
            </div>
            <div className="flex flex-wrap gap-2">
              {canSelectAllAccessibleDepartments ? (
                <button type="button" onClick={() => setSelectedDepartment('ALL')} className={`rounded-full px-4 py-2 text-sm font-semibold ${selectedDepartment === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                  Todos
                </button>
              ) : null}
              {accessibleDepartments.map((department) => (
                <button key={department.key} type="button" onClick={() => setSelectedDepartment(department.key)} className={`rounded-full px-4 py-2 text-sm font-semibold ${selectedDepartment === department.key ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                  {department.shortLabel}
                </button>
              ))}
              {accessibleDepartments.length === 0 ? (
                <span className="rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">Sin departamentos disponibles</span>
              ) : null}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
            {departmentCards.map(({ department, selected }) => (
              <DepartmentCard
                key={department.key}
                department={department}
                selected={selected}
                onSelect={() => setSelectedDepartment(department.key)}
                plans={scopedPortfolio.plans}
                financial={scopedPortfolio.financial}
                calendar={scopedPortfolio.calendar}
              />
            ))}
          </div>
        </section>

        {error ? <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div> : null}

        <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Matriz anual de planes</h2>
                <p className="mt-1 text-sm text-slate-500">Portafolio real de planes por mes, con lectura presupuestal y operativa.</p>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                {filteredPlans.length} planes
              </div>
            </div>

            {loading ? (
              <div className="px-6 py-16 text-center text-sm text-slate-500">Cargando cartera anual...</div>
            ) : filteredPlans.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-lg font-semibold text-slate-800">No hay planes para esta vista</p>
                <p className="mt-2 text-sm text-slate-500">Comienza creando el primer plan anual del departamento.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1480px] text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="sticky left-0 z-10 min-w-[320px] border-b border-slate-200 bg-slate-50 px-5 py-4 font-semibold">Plan / entidad</th>
                      <th className="min-w-[170px] border-b border-slate-200 px-4 py-4 font-semibold">Sede</th>
                      <th className="min-w-[150px] border-b border-slate-200 px-4 py-4 font-semibold">Departamento</th>
                      <th className="min-w-[120px] border-b border-slate-200 px-4 py-4 font-semibold text-center">Estado</th>
                      {MONTHS.map((month) => (
                        <th key={month} className="min-w-[88px] border-b border-slate-200 px-2 py-4 text-center font-semibold">{month}</th>
                      ))}
                      <th className="min-w-[140px] border-b border-slate-200 bg-slate-100 px-5 py-4 text-right font-bold text-slate-900">Total anual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {matrixRows.map(({ plan, matrix, annualBudget }) => {
                      const department = getDepartmentConfig(plan.departamento_dueno)
                      const selected = selectedPlanId === plan.id
                      return (
                        <tr key={plan.id} className={`cursor-pointer ${selected ? 'bg-sky-50/70' : 'hover:bg-slate-50'}`} onClick={() => setSelectedPlanId(plan.id)}>
                          <td className={`sticky left-0 z-10 border-r border-slate-100 px-5 py-4 ${selected ? 'bg-sky-50/70' : 'bg-white'}`}>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-slate-900">{plan.nombre}</p>
                                <p className="mt-1 truncate text-xs text-slate-500">{plan.entidad?.nombre ?? 'Sin entidad ligada'} | {plan.responsable?.nombre ?? 'Proveedor por definir'}</p>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">{locationLabel(plan.centro_costo, locations)}</span>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${department.soft} ${department.accent} ${department.border}`}>{department.shortLabel}</span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${PLAN_STATE_STYLES[plan.estado] ?? PLAN_STATE_STYLES.activo}`}>{plan.estado}</span>
                          </td>
                          {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => {
                            const cell = matrix.get(month)
                            return (
                              <td key={month} className="px-2 py-4 text-center">
                                {cell ? (
                                  <div className={`rounded-xl border px-1.5 py-2 ${STATUS_STYLES[cell.status ?? 'pending'] ?? STATUS_STYLES.pendiente}`}>
                                    <p className="text-[10px] font-bold">{cell.count} evt</p>
                                    <p className="mt-1 text-[10px]">{formatCurrency(cell.budget)}</p>
                                  </div>
                                ) : (
                                  <div className="rounded-xl border border-dashed border-slate-200 px-1.5 py-2 text-[10px] text-slate-300">-</div>
                                )}
                              </td>
                            )
                          })}
                          <td className="bg-slate-50/80 px-5 py-4 text-right font-bold text-slate-900">{formatCurrency(annualBudget)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Panel operativo</h2>
                  <p className="mt-1 text-sm text-slate-500">Detalle del plan seleccionado y su agenda real.</p>
                </div>
                {selectedPlan ? (
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${PLAN_STATE_STYLES[selectedPlan.estado] ?? PLAN_STATE_STYLES.activo}`}>{selectedPlan.estado}</span>
                ) : null}
              </div>

              {selectedPlan ? (
                <>
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-lg font-bold text-slate-900">{selectedPlan.nombre}</p>
                    <div className="mt-3 space-y-2 text-sm text-slate-600">
                      <p><span className="font-semibold text-slate-900">Departamento:</span> {selectedPlan.departamento_dueno}</p>
                      <p><span className="font-semibold text-slate-900">Sede:</span> {locationLabel(selectedPlan.centro_costo, locations)}</p>
                      <p><span className="font-semibold text-slate-900">Entidad:</span> {selectedPlan.entidad?.nombre ?? 'Sin entidad'}</p>
                      <p><span className="font-semibold text-slate-900">Proveedor:</span> {selectedPlan.responsable?.nombre ?? 'Sin proveedor'}</p>
                      <p><span className="font-semibold text-slate-900">Inicio:</span> {formatDate(selectedPlan.fecha_inicio)}</p>
                      <p><span className="font-semibold text-slate-900">Frecuencia:</span> {selectedPlan.frecuencia_tipo}</p>
                      <p><span className="font-semibold text-slate-900">Presupuesto:</span> {formatCurrency(selectedPlan.monto_total_planeado)}</p>
                    </div>
                    {canManage ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {canEditSelectedPlan ? (
                          <button type="button" onClick={openEditPlanModal} className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100">
                            Editar plan
                          </button>
                        ) : null}
                        {(['activo', 'pausado', 'cerrado'] as const).map((state) => (
                          <button key={state} type="button" onClick={() => updatePlanState(selectedPlan.id, state)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${selectedPlan.estado === state ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}>
                            {state}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500">Agenda del plan</h3>
                      {agendaLoading ? <span className="text-xs text-slate-400">Actualizando...</span> : null}
                    </div>
                    <div className="mt-3 space-y-3">
                      {agenda.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">No hay agenda cargada para este plan.</div>
                      ) : (
                        agenda.slice(0, 12).map((item) => (
                          <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-bold text-slate-900">{formatDate(item.due_date)}</p>
                                <p className="mt-1 text-xs text-slate-500">Ocurrencia {item.ocurrencia_nro} | {formatCurrency(item.monto_estimado)}</p>
                              </div>
                              <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[item.estado] ?? STATUS_STYLES.pendiente}`}>{item.estado}</span>
                            </div>
                            {canManage ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {(['pendiente', 'en_proceso', 'completado', 'cancelado'] as const).map((state) => (
                                  <button key={state} type="button" onClick={() => updateAgendaStatus(item.id, state)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${item.estado === state ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                                    {state}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                  Selecciona un plan para ver detalle operativo, agenda y controles.
                </div>
              )}
            </div>

            <EditPlanModal
              open={showEditModal}
              plan={selectedPlan}
              departments={accessibleDepartments}
              locations={locations}
              entidades={entityOptions}
              responsables={responsibleOptions}
              canEdit={canEditSelectedPlan}
              onClose={() => setShowEditModal(false)}
              onSaved={loadPortfolio}
            />

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500">Riesgo y cumplimiento</h3>
              <div className="mt-4 space-y-3">
                {scopedPortfolio.compliance.slice(0, 6).map((item) => (
                  <div key={item.agenda_id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-900">{item.plan_nombre}</p>
                    <p className="mt-1 text-xs text-slate-500">{locationLabel(item.centro_costo, locations)} | {item.departamento} | {formatDate(item.due_date)}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${item.alert_flag === 'RED' ? 'bg-rose-100 text-rose-800 border-rose-200' : item.alert_flag === 'YELLOW' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'}`}>{item.alert_flag}</span>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600"><ArrowUpRight className="h-3.5 w-3.5" />Impacto {formatCurrency(item.impacto_financiero)}</span>
                    </div>
                  </div>
                ))}
                {scopedPortfolio.compliance.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">Sin alertas activas para la vista actual.</div> : null}
              </div>
            </div>
          </aside>
        </section>
      </div>

      <NewPlanModal
        open={showCreateModal}
        canManage={canManage}
        defaultDepartment={selectedDepartment === 'ALL' ? preferredDept : selectedDepartment}
        defaultCentroCosto={selectedLocationId === 'ALL' ? (locations[0]?.code ?? '') : (locations.find((location) => location.id === selectedLocationId)?.code ?? '')}
        departments={accessibleDepartments}
        locations={locations}
        onClose={() => setShowCreateModal(false)}
        onCreated={loadPortfolio}
      />
    </div>
  )
}
