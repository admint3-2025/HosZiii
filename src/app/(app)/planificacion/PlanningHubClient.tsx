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
  OpsAgendaItem,
  OpsCalendarItem,
  OpsComplianceItem,
  OpsFinancialItem,
  OpsPlan,
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
}

type CreateFormState = {
  tipo: string
  titulo: string
  descripcion: string
  departamento: string
  area: string
  fecha: string
  frecuencia: string
  repite: boolean
}

type PortfolioResponse = {
  plans: PlanWithRelations[]
  calendar: OpsCalendarItem[]
  compliance: OpsComplianceItem[]
  financial: OpsFinancialItem[]
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
  },
  {
    key: 'ALIMENTOS Y BEBIDAS',
    label: 'Alimentos y Bebidas',
    shortLabel: 'AyB',
    icon: ClipboardList,
    accent: 'text-rose-700',
    soft: 'bg-rose-50',
    border: 'border-rose-200',
  },
  {
    key: 'AMA DE LLAVES',
    label: 'Ama de Llaves',
    shortLabel: 'ADL',
    icon: CheckCircle2,
    accent: 'text-fuchsia-700',
    soft: 'bg-fuchsia-50',
    border: 'border-fuchsia-200',
  },
  {
    key: 'CONTABILIDAD',
    label: 'Contabilidad',
    shortLabel: 'Conta',
    icon: Banknote,
    accent: 'text-teal-700',
    soft: 'bg-teal-50',
    border: 'border-teal-200',
  },
  {
    key: 'MARKETING',
    label: 'Marketing',
    shortLabel: 'Mkt',
    icon: CalendarDays,
    accent: 'text-pink-700',
    soft: 'bg-pink-50',
    border: 'border-pink-200',
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

function normalize(value: string | null | undefined) {
  return (value ?? '').trim().toUpperCase()
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
  return DEPARTMENTS.find((item) => item.key === normalize(department)) ?? {
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
  if (profile.isAdmin || profile.isCorporate) return DEPARTMENTS

  const allowed = new Set<string>()
  if (profile.departamento) allowed.add(normalize(profile.departamento))
  for (const dept of profile.allowed_departments ?? []) {
    allowed.add(normalize(dept))
  }

  const filtered = DEPARTMENTS.filter((item) => allowed.has(item.key) || allowed.has(normalize(item.label)))
  return filtered.length > 0 ? filtered : [getDepartmentConfig(profile.departamento || 'MANTENIMIENTO')]
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
  departments,
  onClose,
  onCreated,
}: {
  open: boolean
  canManage: boolean
  defaultDepartment: string
  departments: DepartmentDef[]
  onClose: () => void
  onCreated: () => Promise<void>
}) {
  const [form, setForm] = useState<CreateFormState>({
    tipo: 'mantenimiento_preventivo',
    titulo: '',
    descripcion: '',
    departamento: defaultDepartment,
    area: '',
    fecha: `${new Date().getFullYear()}-01-15`,
    frecuencia: 'monthly',
    repite: true,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setForm((prev) => ({ ...prev, departamento: defaultDepartment }))
  }, [defaultDepartment])

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
              <select className="input-base" value={form.tipo} onChange={(e) => setForm((prev) => ({ ...prev, tipo: e.target.value }))}>
                <option value="mantenimiento_preventivo">Mantenimiento preventivo</option>
                <option value="inspeccion">Inspeccion</option>
                <option value="inventario">Inventario</option>
                <option value="capacitacion">Capacitacion</option>
                <option value="otro">Otro</option>
              </select>
            </Field>
            <Field label="Departamento">
              <select className="input-base" value={form.departamento} onChange={(e) => setForm((prev) => ({ ...prev, departamento: e.target.value }))}>
                {departments.map((department) => (
                  <option key={department.key} value={department.key}>{department.label}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Titulo del plan">
            <input className="input-base" value={form.titulo} onChange={(e) => setForm((prev) => ({ ...prev, titulo: e.target.value }))} placeholder="Ej. Programa anual de elevadores" required />
          </Field>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Activo / area objetivo">
              <input className="input-base" value={form.area} onChange={(e) => setForm((prev) => ({ ...prev, area: e.target.value }))} placeholder="Ej. Elevadores principales" />
            </Field>
            <Field label="Fecha de inicio">
              <input type="date" className="input-base" value={form.fecha} onChange={(e) => setForm((prev) => ({ ...prev, fecha: e.target.value }))} required />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Frecuencia">
              <select className="input-base" value={form.frecuencia} onChange={(e) => setForm((prev) => ({ ...prev, frecuencia: e.target.value }))}>
                <option value="monthly">Mensual</option>
                <option value="quarterly">Trimestral</option>
                <option value="yearly">Anual</option>
                <option value="weekly">Semanal</option>
              </select>
            </Field>
            <Field label="Descripcion">
              <input className="input-base" value={form.descripcion} onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))} placeholder="Objetivo, alcance o alcance presupuestal" />
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

export default function PlanningHubClient({ userProfile, initialYear }: Props) {
  const accessibleDepartments = useMemo(() => getAccessibleDepartments(userProfile), [userProfile])
  const canSeeAll = userProfile.isAdmin || userProfile.isCorporate
  const canManage = userProfile.isAdmin || userProfile.role === 'supervisor'
  const preferredDept = accessibleDepartments[0]?.key ?? 'MANTENIMIENTO'

  const [year, setYear] = useState(initialYear)
  const [selectedDepartment, setSelectedDepartment] = useState<string>(canSeeAll ? 'ALL' : preferredDept)
  const [portfolio, setPortfolio] = useState<PortfolioResponse>({ plans: [], calendar: [], compliance: [], financial: [] })
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [agenda, setAgenda] = useState<OpsAgendaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [agendaLoading, setAgendaLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const visibleDepartmentKeys = useMemo(() => new Set(accessibleDepartments.map((item) => item.key)), [accessibleDepartments])

  async function loadPortfolio() {
    try {
      setError(null)
      setRefreshing(true)
      const bounds = monthBounds(year)
      const departmentParam = selectedDepartment === 'ALL' ? '' : `&departamento=${encodeURIComponent(selectedDepartment)}`

      const [plansJson, calendarJson, complianceJson, financialJson] = await Promise.all([
        fetchJson<{ ok: true; data: PlanWithRelations[] }>('/api/ops/planes'),
        fetchJson<{ ok: true; data: OpsCalendarItem[] }>(`/api/ops/calendar?from=${bounds.from}&to=${bounds.to}${departmentParam}&limit=800`),
        fetchJson<{ ok: true; data: OpsComplianceItem[] }>(`/api/ops/compliance?as_of_date=${todayIso()}${departmentParam}`),
        fetchJson<{ ok: true; data: OpsFinancialItem[] }>(`/api/ops/financial?${selectedDepartment === 'ALL' ? '' : `departamento=${encodeURIComponent(selectedDepartment)}`}`),
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
  }, [selectedDepartment, year])

  const filteredPlans = useMemo(() => {
    return portfolio.plans.filter((plan) => selectedDepartment === 'ALL' || normalize(plan.departamento_dueno) === selectedDepartment)
  }, [portfolio.plans, selectedDepartment])

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

  const departmentCards = useMemo(() => {
    return accessibleDepartments.map((department) => ({
      department,
      selected: selectedDepartment === department.key,
    }))
  }, [accessibleDepartments, selectedDepartment])

  const totalPlanned = portfolio.financial.reduce((sum, item) => sum + Number(item.monto_total_planeado || 0), 0)
  const activePlans = filteredPlans.filter((plan) => plan.estado === 'activo').length
  const totalEvents = portfolio.calendar.filter((item) => selectedDepartment === 'ALL' || normalize(item.departamento_dueno) === selectedDepartment).length
  const totalCritical = portfolio.compliance.filter((item) => item.alert_flag === 'RED').length

  const matrixRows = useMemo(() => {
    return filteredPlans.map((plan) => ({
      plan,
      matrix: getMatrixForPlan(plan, portfolio.calendar),
      annualBudget: portfolio.calendar
        .filter((item) => item.plan_maestro_id === plan.id)
        .reduce((sum, item) => sum + Number(item.monto_estimado || 0), 0),
    }))
  }, [filteredPlans, portfolio.calendar])

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
              <h2 className="text-xl font-bold text-slate-900">Vista por departamento</h2>
              <p className="mt-1 text-sm text-slate-500">Selecciona un departamento para centrar el tablero, la matriz y el panel operativo.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canSeeAll ? (
                <button type="button" onClick={() => setSelectedDepartment('ALL')} className={`rounded-full px-4 py-2 text-sm font-semibold ${selectedDepartment === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                  Todos
                </button>
              ) : null}
              {accessibleDepartments.map((department) => (
                <button key={department.key} type="button" onClick={() => setSelectedDepartment(department.key)} className={`rounded-full px-4 py-2 text-sm font-semibold ${selectedDepartment === department.key ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                  {department.shortLabel}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
            {departmentCards.map(({ department, selected }) => (
              <DepartmentCard
                key={department.key}
                department={department}
                selected={selected}
                onSelect={() => setSelectedDepartment(department.key)}
                plans={portfolio.plans}
                financial={portfolio.financial}
                calendar={portfolio.calendar}
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
                      <p><span className="font-semibold text-slate-900">Entidad:</span> {selectedPlan.entidad?.nombre ?? 'Sin entidad'}</p>
                      <p><span className="font-semibold text-slate-900">Proveedor:</span> {selectedPlan.responsable?.nombre ?? 'Sin proveedor'}</p>
                      <p><span className="font-semibold text-slate-900">Inicio:</span> {formatDate(selectedPlan.fecha_inicio)}</p>
                      <p><span className="font-semibold text-slate-900">Frecuencia:</span> {selectedPlan.frecuencia_tipo}</p>
                      <p><span className="font-semibold text-slate-900">Presupuesto:</span> {formatCurrency(selectedPlan.monto_total_planeado)}</p>
                    </div>
                    {canManage ? (
                      <div className="mt-4 flex flex-wrap gap-2">
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

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500">Riesgo y cumplimiento</h3>
              <div className="mt-4 space-y-3">
                {portfolio.compliance.slice(0, 6).map((item) => (
                  <div key={item.agenda_id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-900">{item.plan_nombre}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.departamento} | {formatDate(item.due_date)}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${item.alert_flag === 'RED' ? 'bg-rose-100 text-rose-800 border-rose-200' : item.alert_flag === 'YELLOW' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'}`}>{item.alert_flag}</span>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600"><ArrowUpRight className="h-3.5 w-3.5" />Impacto {formatCurrency(item.impacto_financiero)}</span>
                    </div>
                  </div>
                ))}
                {portfolio.compliance.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">Sin alertas activas para la vista actual.</div> : null}
              </div>
            </div>
          </aside>
        </section>
      </div>

      <NewPlanModal
        open={showCreateModal}
        canManage={canManage}
        defaultDepartment={selectedDepartment === 'ALL' ? preferredDept : selectedDepartment}
        departments={accessibleDepartments}
        onClose={() => setShowCreateModal(false)}
        onCreated={loadPortfolio}
      />
    </div>
  )
}
