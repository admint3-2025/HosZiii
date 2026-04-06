'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  Building2,
  CalendarDays,
  ChartColumn,
  CheckCircle2,
  CircleHelp,
  ClipboardList,
  FileSpreadsheet,
  FileText,
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
import { buildPlanningDemoData, type PlanningDemoData } from '@/lib/planificacion/demo-data'
import { downloadPdfUrl } from '@/lib/mobile/pdf-download'
import type { UserPlanningProfile } from './planning-page-context'

type Props = {
  userProfile: UserPlanningProfile
  initialYear: number
  mode?: 'overview' | 'portfolio' | 'catalogs'
  demoMode?: boolean
  basePath?: string
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
}

type LocationOption = {
  id: string
  code: string
  name: string
}

function resolveLocationId(value: string | null | undefined, locations: LocationOption[]) {
  const normalized = normalize(value)
  if (!normalized) return ''

  const matched = locations.find((location) => locationMatches(value, location))
  return matched?.id ?? ''
}

function resolveCentroCostoFromLocationId(locationId: string | null | undefined, locations: LocationOption[]) {
  if (!locationId) return ''
  const matched = locations.find((location) => location.id === locationId)
  return matched?.code ?? ''
}

function ModalPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [mounted])

  if (!mounted) return null

  return createPortal(children, document.body)
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

type ResponsableFormState = {
  id: string | null
  nombre: string
  tipo: 'interno' | 'externo'
  departamento: string
  email: string
}

type EntidadFormState = {
  id: string | null
  nombre: string
  tipo_entidad: string
  categoria: string
  departamento: string
  centro_costo: string
  responsable_proveedor_id: string
}

type MatrixCell = {
  count: number
  budget: number
  status: OpsAgendaItem['estado'] | OpsCalendarItem['estado'] | 'mixed' | null
}

type MatrixEventDetail = Pick<
  OpsCalendarItem,
  'agenda_id' | 'due_date' | 'estado' | 'prioridad' | 'monto_estimado' | 'esfuerzo_estimado' | 'ocurrencia_nro' | 'entidad_objetivo'
>

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

const EVENT_STATUS_OPTIONS: OpsAgendaItem['estado'][] = ['pendiente', 'en_proceso', 'completado', 'cancelado']

const EVENT_PRIORITY_STYLES: Record<string, { badge: string; accent: string }> = {
  BAJA: {
    badge: 'border-slate-200 bg-slate-100 text-slate-700',
    accent: 'border-l-slate-300',
  },
  MEDIA: {
    badge: 'border-sky-200 bg-sky-50 text-sky-700',
    accent: 'border-l-sky-400',
  },
  ALTA: {
    badge: 'border-amber-200 bg-amber-50 text-amber-700',
    accent: 'border-l-amber-400',
  },
  CRITICA: {
    badge: 'border-rose-200 bg-rose-50 text-rose-700',
    accent: 'border-l-rose-500',
  },
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

function normalizeLabelToken(value: string | null | undefined) {
  return normalize(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function formatAgendaStatusLabel(status: OpsAgendaItem['estado']) {
  switch (status) {
    case 'en_proceso':
      return 'En proceso'
    case 'completado':
      return 'Completado'
    case 'cancelado':
      return 'Cancelado'
    case 'pendiente':
    default:
      return 'Pendiente'
  }
}

function formatPriorityLabel(priority: string | null | undefined) {
  switch (normalizeLabelToken(priority)) {
    case 'CRITICA':
      return 'Critica'
    case 'ALTA':
      return 'Alta'
    case 'MEDIA':
      return 'Media'
    case 'BAJA':
      return 'Baja'
    default:
      return priority?.trim() || 'Sin prioridad'
  }
}

function getEventPriorityStyle(priority: string | null | undefined) {
  return EVENT_PRIORITY_STYLES[normalizeLabelToken(priority)] ?? EVENT_PRIORITY_STYLES.MEDIA
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

function toIsoDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function overviewBounds(year: number) {
  const now = new Date()
  const startOfYear = new Date(year, 0, 1)
  const endOfYear = new Date(year, 11, 31)
  const start = now.getFullYear() === year
    ? new Date(Math.min(Math.max(now.getTime(), startOfYear.getTime()), endOfYear.getTime()))
    : startOfYear

  const end = addDays(start, 84)
  return {
    from: toIsoDate(start),
    to: toIsoDate(end > endOfYear ? endOfYear : end),
  }
}

function buildCreateFormState(defaultDepartment: string, defaultLocationId: string, year: number): CreateFormState {
  return {
    codigo_plan: '',
    nombre: '',
    descripcion: '',
    departamento_dueno: defaultDepartment,
    centro_costo: defaultLocationId,
    moneda: 'MXN',
    entidad_objetivo_id: '',
    responsable_proveedor_id: '',
    fecha_inicio: `${year}-01-15`,
    fecha_fin: `${year}-12-31`,
    frecuencia_tipo: 'monthly',
    frecuencia_intervalo: '1',
    custom_interval_days: '',
    dia_semana: '',
    dia_del_mes: '15',
    monto_total_planeado: '0',
    esfuerzo_total_planeado: '0',
  }
}

function toNullableNumber(value: string) {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function buildResponsableFormState(defaultDepartment: string): ResponsableFormState {
  return {
    id: null,
    nombre: '',
    tipo: 'externo',
    departamento: defaultDepartment,
    email: '',
  }
}

function buildEntidadFormState(defaultDepartment: string, defaultLocationId: string, locations: LocationOption[]): EntidadFormState {
  return {
    id: null,
    nombre: '',
    tipo_entidad: 'activo',
    categoria: '',
    departamento: defaultDepartment,
    centro_costo: resolveCentroCostoFromLocationId(defaultLocationId, locations),
    responsable_proveedor_id: '',
  }
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

function getEventDetailsForPlan(plan: PlanWithRelations, calendar: OpsCalendarItem[]) {
  const map = new Map<number, MatrixEventDetail[]>()
  const planRows = calendar.filter((item) => item.plan_maestro_id === plan.id)

  for (const row of planRows) {
    const month = new Date(row.due_date + 'T00:00:00').getMonth() + 1
    const current = map.get(month) ?? []
    current.push({
      agenda_id: row.agenda_id,
      due_date: row.due_date,
      estado: row.estado,
      prioridad: row.prioridad,
      monto_estimado: row.monto_estimado,
      esfuerzo_estimado: row.esfuerzo_estimado,
      ocurrencia_nro: row.ocurrencia_nro,
      entidad_objetivo: row.entidad_objetivo,
    })
    map.set(month, current)
  }

  for (const items of map.values()) {
    items.sort((left, right) => left.due_date.localeCompare(right.due_date, 'es-MX'))
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

function PlanningViewLink({
  href,
  label,
  active,
}: {
  href: string
  label: string
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${active ? 'bg-slate-900 text-white' : 'bg-white/8 text-slate-200 hover:bg-white/12'}`}
    >
      {label}
    </Link>
  )
}

function PlanningActionCard({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string
  title: string
  description: string
  icon: LucideIcon
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
          <Icon className="h-5 w-5" />
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Abrir
        </span>
      </div>
      <h3 className="mt-4 text-lg font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </Link>
  )
}

function NewPlanModal({
  open,
  canManage,
  defaultDepartment,
  defaultLocationId,
  year,
  departments,
  locations,
  entidades,
  responsables,
  onClose,
  onCreated,
}: {
  open: boolean
  canManage: boolean
  defaultDepartment: string
  defaultLocationId: string
  year: number
  departments: DepartmentDef[]
  locations: LocationOption[]
  entidades: OpsEntidad[]
  responsables: OpsResponsable[]
  onClose: () => void
  onCreated: (planId: string) => Promise<void>
}) {
  const [form, setForm] = useState<CreateFormState>(() => buildCreateFormState(defaultDepartment, defaultLocationId, year))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setForm(buildCreateFormState(defaultDepartment, defaultLocationId, year))
    setError(null)
  }, [defaultDepartment, defaultLocationId, open, year])

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
      const response = await fetch('/api/ops/planes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo_plan: form.codigo_plan.trim() || undefined,
          nombre: form.nombre.trim(),
          descripcion: form.descripcion.trim() || undefined,
          departamento_dueno: form.departamento_dueno,
          centro_costo: resolveCentroCostoFromLocationId(form.centro_costo, locations) || undefined,
          moneda: form.moneda.trim() || 'MXN',
          entidad_objetivo_id: form.entidad_objetivo_id,
          responsable_proveedor_id: form.responsable_proveedor_id || undefined,
          fecha_inicio: form.fecha_inicio,
          fecha_fin: form.fecha_fin,
          frecuencia_tipo: form.frecuencia_tipo,
          frecuencia_intervalo: Number(form.frecuencia_intervalo || '1'),
          custom_interval_days: toNullableNumber(form.custom_interval_days) ?? undefined,
          dia_semana: toNullableNumber(form.dia_semana) ?? undefined,
          dia_del_mes: toNullableNumber(form.dia_del_mes) ?? undefined,
          monto_total_planeado: Number(form.monto_total_planeado || '0'),
          esfuerzo_total_planeado: Number(form.esfuerzo_total_planeado || '0'),
        }),
      })
      const json = await response.json()
      if (!response.ok || !json.ok) {
        throw new Error(json.error ?? 'No se pudo crear el plan')
      }

      const createdPlanId = json.data?.id
      if (!createdPlanId) {
        throw new Error('El plan se creo, pero no se recibio el identificador para sembrar la agenda')
      }

      const seedResponse = await fetch(`/api/ops/plans/${createdPlanId}/seed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replaceExisting: false }),
      })
      const seedJson = await seedResponse.json()
      if (!seedResponse.ok || !seedJson.ok) {
        throw new Error(seedJson.error ?? 'El plan se creo, pero no se pudo generar su agenda inicial')
      }

      await onCreated(createdPlanId)
      onClose()
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo crear el plan')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm">
        <div className="flex min-h-full items-start justify-center py-4 sm:items-center sm:py-8">
          <div className="flex w-full max-w-2xl max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Nuevo plan anual</h2>
                <p className="mt-1 text-sm text-slate-500">Registra el plan maestro completo y siembra su agenda inicial con presupuesto prorrateado.</p>
              </div>
              <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <span className="sr-only">Cerrar</span>
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={submit} className="flex-1 min-h-0 space-y-4 overflow-y-auto px-6 py-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Codigo del plan" help="Clave interna para rastrear el plan en reportes y seguimiento.">
              <input className={INPUT_CLASS} value={form.codigo_plan} onChange={(e) => setForm((prev) => ({ ...prev, codigo_plan: e.target.value }))} placeholder="Ej. PLAN-MANT-2025-01" />
            </Field>
            <Field label="Nombre del plan" help="Nombre visible del plan dentro del tablero anual.">
              <input className={INPUT_CLASS} value={form.nombre} onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))} placeholder="Ej. Programa anual de elevadores" required />
            </Field>
            <Field label="Departamento" help="Area responsable del seguimiento y cumplimiento del plan.">
              <select className={INPUT_CLASS} value={form.departamento_dueno} onChange={(e) => setForm((prev) => ({ ...prev, departamento_dueno: e.target.value }))}>
                {departments.map((department) => (
                  <option key={department.key} value={department.key}>{department.label}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Sede / propiedad" help="Hotel o ubicacion donde aplica este plan.">
            <select className={INPUT_CLASS} value={form.centro_costo} onChange={(e) => setForm((prev) => ({ ...prev, centro_costo: e.target.value }))}>
              <option value="">Sin sede</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>{location.code} - {location.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Descripcion" help="Objetivo, alcance o detalle operativo del plan.">
            <textarea className={`${INPUT_CLASS} min-h-[96px]`} value={form.descripcion} onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))} placeholder="Objetivo, alcance y consideraciones del plan" />
          </Field>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Entidad objetivo" help="Activo, sistema o area exacta sobre la que trabaja este plan.">
              <select className={INPUT_CLASS} value={form.entidad_objetivo_id} onChange={(e) => setForm((prev) => ({ ...prev, entidad_objetivo_id: e.target.value }))} required>
                <option value="">Selecciona una entidad</option>
                {entidades.map((item) => (
                  <option key={item.id} value={item.id}>{item.nombre}</option>
                ))}
              </select>
            </Field>
            <Field label="Proveedor / responsable" help="Persona o proveedor que ejecuta o coordina el cumplimiento del plan.">
              <select className={INPUT_CLASS} value={form.responsable_proveedor_id} onChange={(e) => setForm((prev) => ({ ...prev, responsable_proveedor_id: e.target.value }))}>
                <option value="">Sin proveedor asignado</option>
                {responsables.map((item) => (
                  <option key={item.id} value={item.id}>{item.nombre}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Inicio" help="Primera fecha desde la que el plan empieza a contar.">
              <input type="date" className={INPUT_CLASS} value={form.fecha_inicio} onChange={(e) => setForm((prev) => ({ ...prev, fecha_inicio: e.target.value }))} required />
            </Field>
            <Field label="Fin" help="Ultima fecha hasta la que se programaran ocurrencias.">
              <input type="date" className={INPUT_CLASS} value={form.fecha_fin} onChange={(e) => setForm((prev) => ({ ...prev, fecha_fin: e.target.value }))} required />
            </Field>
            <Field label="Frecuencia" help="Cada cuanto debe repetirse la actividad del plan.">
              <select className={INPUT_CLASS} value={form.frecuencia_tipo} onChange={(e) => setForm((prev) => ({ ...prev, frecuencia_tipo: e.target.value }))}>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensual</option>
                <option value="quarterly">Trimestral</option>
                <option value="yearly">Anual</option>
                <option value="custom_days">Personalizado</option>
              </select>
            </Field>
            <Field label="Intervalo" help="Cada cuantas unidades de la frecuencia se repetira el plan.">
              <input type="number" min="1" className={INPUT_CLASS} value={form.frecuencia_intervalo} onChange={(e) => setForm((prev) => ({ ...prev, frecuencia_intervalo: e.target.value }))} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Dias personalizados" help="Usalo solo cuando la frecuencia sea personalizada por dias.">
              <input type="number" min="1" className={INPUT_CLASS} value={form.custom_interval_days} onChange={(e) => setForm((prev) => ({ ...prev, custom_interval_days: e.target.value }))} />
            </Field>
            <Field label="Dia de semana" help="Para frecuencia semanal: 1 a 7 segun el dia programado.">
              <input type="number" min="1" max="7" className={INPUT_CLASS} value={form.dia_semana} onChange={(e) => setForm((prev) => ({ ...prev, dia_semana: e.target.value }))} />
            </Field>
            <Field label="Dia del mes" help="Para frecuencias mensuales o trimestrales: dia exacto del mes a programar.">
              <input type="number" min="1" max="31" className={INPUT_CLASS} value={form.dia_del_mes} onChange={(e) => setForm((prev) => ({ ...prev, dia_del_mes: e.target.value }))} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Moneda" help="Moneda base usada para el presupuesto planeado.">
              <input className={INPUT_CLASS} value={form.moneda} onChange={(e) => setForm((prev) => ({ ...prev, moneda: e.target.value }))} />
            </Field>
            <Field label="Presupuesto planeado" help="Monto total que se prorrateara en la agenda al sembrar el plan.">
              <input type="number" min="0" step="0.01" className={INPUT_CLASS} value={form.monto_total_planeado} onChange={(e) => setForm((prev) => ({ ...prev, monto_total_planeado: e.target.value }))} />
            </Field>
            <Field label="Esfuerzo planeado" help="Carga total estimada del plan en horas, jornadas o esfuerzo operativo.">
              <input type="number" min="0" step="0.01" className={INPUT_CLASS} value={form.esfuerzo_total_planeado} onChange={(e) => setForm((prev) => ({ ...prev, esfuerzo_total_planeado: e.target.value }))} />
            </Field>
          </div>

          {entidades.length === 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Necesitas al menos una entidad objetivo registrada para crear planes completos en planificacion.
            </div>
          ) : null}
          {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
                <button type="submit" disabled={submitting || entidades.length === 0} className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60">{submitting ? 'Creando...' : 'Crear y sembrar agenda'}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}

function Field({ label, help, children }: { label: string; help?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        <span>{label}</span>
        {help ? (
          <span className="group relative inline-flex items-center">
            <span
              tabIndex={0}
              aria-label={`Ayuda sobre ${label}`}
              className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full text-slate-400 outline-none transition hover:text-sky-600 focus-visible:text-sky-600"
            >
              <CircleHelp className="h-3.5 w-3.5" />
            </span>
            <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-56 -translate-x-1/2 rounded-xl border border-slate-200 bg-slate-900 px-3 py-2 text-[11px] font-medium normal-case tracking-normal text-slate-100 shadow-xl group-hover:block group-focus-within:block">
              {help}
            </span>
          </span>
        ) : null}
      </span>
      {children}
    </label>
  )
}

function ModalFrame({
  title,
  description,
  onClose,
  children,
  maxWidthClass = 'max-w-4xl',
}: {
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  maxWidthClass?: string
}) {
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm">
        <div className="flex min-h-full items-start justify-center py-4 sm:items-center sm:py-8">
          <div className={`flex w-full ${maxWidthClass} max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl`}>
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{title}</h2>
                {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
              </div>
              <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <span className="sr-only">Cerrar</span>
                <X className="h-5 w-5" />
              </button>
            </div>
            {children}
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}

function EventStatusTooltip({
  events,
  canManage,
  open,
  busyAgendaItemId,
  onClose,
  onOpenPlan,
  onStatusChange,
}: {
  events: MatrixEventDetail[]
  canManage: boolean
  open: boolean
  busyAgendaItemId: string | null
  onClose: () => void
  onOpenPlan: () => void
  onStatusChange: (agendaId: string, estado: OpsAgendaItem['estado']) => void
}) {
  return (
    <div className={`pointer-events-none absolute left-1/2 top-full z-30 mt-3 w-[26rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 ${open ? 'block' : 'hidden'}`}>
      <div className="pointer-events-auto overflow-hidden rounded-[1.6rem] border border-slate-300 bg-white text-left shadow-[0_28px_70px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-950/5">
        <div className="border-b border-slate-800 bg-slate-950 px-4 py-4 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Vista operativa</p>
              <h4 className="mt-2 text-sm font-semibold text-white">Eventos del mes</h4>
              <p className="mt-1 text-xs text-slate-400">{events.length} programado{events.length === 1 ? '' : 's'} para esta ventana.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar panel de eventos"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="max-h-[26rem] space-y-3 overflow-y-auto bg-slate-50/80 px-4 py-4">
          {events.map((event) => {
            const priorityStyle = getEventPriorityStyle(event.prioridad)

            return (
              <article
                key={event.agenda_id}
                className={`rounded-[1.35rem] border border-slate-200 border-l-4 ${priorityStyle.accent} bg-white p-4 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.8)]`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">
                        Ocurrencia {event.ocurrencia_nro}
                      </span>
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${STATUS_STYLES[event.estado] ?? STATUS_STYLES.pendiente}`}>
                        {formatAgendaStatusLabel(event.estado)}
                      </span>
                    </div>
                    <p className="mt-3 truncate text-sm font-semibold text-slate-950">{event.entidad_objetivo ?? 'Entidad por definir'}</p>
                    <p className="mt-1 text-xs text-slate-500">Programado para {formatDate(event.due_date)}</p>
                  </div>
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${priorityStyle.badge}`}>
                    {formatPriorityLabel(event.prioridad)}
                  </span>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-2.5 text-xs text-slate-600">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Monto estimado</dt>
                    <dd className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency(event.monto_estimado)}</dd>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Esfuerzo</dt>
                    <dd className="mt-1 text-sm font-semibold text-slate-900">{event.esfuerzo_estimado} hrs</dd>
                  </div>
                </dl>

                {canManage ? (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Actualizar estado</p>
                      {busyAgendaItemId === event.agenda_id ? <span className="text-[10px] font-semibold text-sky-700">Guardando cambios...</span> : null}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {EVENT_STATUS_OPTIONS.map((estado) => {
                        const isActive = event.estado === estado

                        return (
                          <button
                            key={estado}
                            type="button"
                            onClick={(eventClick) => {
                              eventClick.stopPropagation()
                              onStatusChange(event.agenda_id, estado)
                            }}
                            disabled={busyAgendaItemId === event.agenda_id || isActive}
                            className={`rounded-xl border px-3 py-2 text-left text-[11px] font-semibold transition ${
                              isActive
                                ? 'border-slate-950 bg-slate-950 text-white shadow-sm'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                            } disabled:cursor-not-allowed disabled:opacity-60`}
                          >
                            {formatAgendaStatusLabel(estado)}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] text-slate-500">
                    Vista rapida habilitada. La edicion de estado se mantiene restringida.
                  </div>
                )}
              </article>
            )
          })}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3.5">
          <p className="text-[11px] text-slate-500">{canManage ? 'Gestion directa desde la matriz anual.' : 'Consulta puntual sin salir del portafolio.'}</p>
          <button
            type="button"
            onClick={onOpenPlan}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-900 bg-slate-950 px-3.5 py-2 text-[11px] font-semibold text-white transition hover:bg-slate-800"
          >
            Abrir plan
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

function CatalogManagerCard({
  canManage,
  departments,
  locations,
  responsables,
  entidades,
  defaultDepartment,
  defaultLocationId,
  onCatalogsChanged,
  compact = false,
}: {
  canManage: boolean
  departments: DepartmentDef[]
  locations: LocationOption[]
  responsables: OpsResponsable[]
  entidades: OpsEntidad[]
  defaultDepartment: string
  defaultLocationId: string
  onCatalogsChanged: () => Promise<void>
  compact?: boolean
}) {
  const [tab, setTab] = useState<'responsables' | 'entidades'>('responsables')
  const [responsableForm, setResponsableForm] = useState<ResponsableFormState>(() => buildResponsableFormState(defaultDepartment))
  const [entidadForm, setEntidadForm] = useState<EntidadFormState>(() => buildEntidadFormState(defaultDepartment, defaultLocationId, locations))
  const [busy, setBusy] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!responsableForm.id) {
      setResponsableForm((current) => ({ ...current, departamento: defaultDepartment }))
    }
  }, [defaultDepartment, responsableForm.id])

  useEffect(() => {
    if (!entidadForm.id) {
      setEntidadForm((current) => ({
        ...current,
        departamento: defaultDepartment,
        centro_costo: resolveCentroCostoFromLocationId(defaultLocationId, locations),
      }))
    }
  }, [defaultDepartment, defaultLocationId, entidadForm.id, locations])

  async function submitResponsable(event: FormEvent) {
    event.preventDefault()
    if (!canManage) return

    try {
      setBusy(true)
      setError(null)
      const isEditing = Boolean(responsableForm.id)
      const response = await fetch('/api/ops/responsables', {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isEditing ? { id: responsableForm.id } : {}),
          nombre: responsableForm.nombre.trim(),
          tipo: responsableForm.tipo,
          departamento: responsableForm.departamento || null,
          email: responsableForm.email.trim() || null,
        }),
      })
      const json = await response.json()
      if (!response.ok || !json.ok) {
        throw new Error(json.error ?? 'No se pudo guardar el proveedor')
      }

      await onCatalogsChanged()
      setResponsableForm(buildResponsableFormState(defaultDepartment))
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo guardar el proveedor')
    } finally {
      setBusy(false)
    }
  }

  async function submitEntidad(event: FormEvent) {
    event.preventDefault()
    if (!canManage) return

    try {
      setBusy(true)
      setError(null)
      const isEditing = Boolean(entidadForm.id)
      const response = await fetch('/api/ops/entidades', {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isEditing ? { id: entidadForm.id } : {}),
          nombre: entidadForm.nombre.trim(),
          tipo_entidad: entidadForm.tipo_entidad.trim(),
          categoria: entidadForm.categoria.trim(),
          departamento: entidadForm.departamento,
          centro_costo: entidadForm.centro_costo || null,
          responsable_proveedor_id: entidadForm.responsable_proveedor_id || null,
        }),
      })
      const json = await response.json()
      if (!response.ok || !json.ok) {
        throw new Error(json.error ?? 'No se pudo guardar la entidad')
      }

      await onCatalogsChanged()
      setEntidadForm(buildEntidadFormState(defaultDepartment, defaultLocationId, locations))
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo guardar la entidad')
    } finally {
      setBusy(false)
    }
  }

  async function deleteResponsableById(id: string) {
    if (!canManage || !confirm('Se eliminara este proveedor del catalogo.')) return

    try {
      setDeletingId(id)
      setError(null)
      const response = await fetch(`/api/ops/responsables?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      const json = await response.json()
      if (!response.ok || !json.ok) {
        throw new Error(json.error ?? 'No se pudo eliminar el proveedor')
      }

      await onCatalogsChanged()
      if (responsableForm.id === id) {
        setResponsableForm(buildResponsableFormState(defaultDepartment))
      }
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo eliminar el proveedor')
    } finally {
      setDeletingId(null)
    }
  }

  async function deleteEntidadById(id: string) {
    if (!canManage || !confirm('Se eliminara esta entidad del catalogo.')) return

    try {
      setDeletingId(id)
      setError(null)
      const response = await fetch(`/api/ops/entidades?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      const json = await response.json()
      if (!response.ok || !json.ok) {
        throw new Error(json.error ?? 'No se pudo eliminar la entidad')
      }

      await onCatalogsChanged()
      if (entidadForm.id === id) {
        setEntidadForm(buildEntidadFormState(defaultDepartment, defaultLocationId, locations))
      }
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo eliminar la entidad')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className={`${compact ? '' : 'rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm'}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500">Catalogos de planificacion</h3>
          <p className="mt-2 text-sm text-slate-500">Gestiona aqui mismo los proveedores y entidades que alimentan los planes anuales.</p>
        </div>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {responsables.length} prov. | {entidades.length} ent.
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button type="button" onClick={() => setTab('responsables')} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${tab === 'responsables' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
          Proveedores
        </button>
        <button type="button" onClick={() => setTab('entidades')} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${tab === 'entidades' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
          Entidades
        </button>
      </div>

      {tab === 'responsables' ? (
        <>
          <form onSubmit={submitResponsable} className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">{responsableForm.id ? 'Editar proveedor' : 'Nuevo proveedor'}</p>
              {responsableForm.id ? <button type="button" onClick={() => setResponsableForm(buildResponsableFormState(defaultDepartment))} className="text-xs font-semibold text-slate-500 hover:text-slate-700">Cancelar edicion</button> : null}
            </div>
            <Field label="Nombre">
              <input className={INPUT_CLASS} value={responsableForm.nombre} onChange={(e) => setResponsableForm((current) => ({ ...current, nombre: e.target.value }))} required />
            </Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Tipo">
                <select className={INPUT_CLASS} value={responsableForm.tipo} onChange={(e) => setResponsableForm((current) => ({ ...current, tipo: e.target.value as ResponsableFormState['tipo'] }))}>
                  <option value="externo">Externo</option>
                  <option value="interno">Interno</option>
                </select>
              </Field>
              <Field label="Departamento">
                <select className={INPUT_CLASS} value={responsableForm.departamento} onChange={(e) => setResponsableForm((current) => ({ ...current, departamento: e.target.value }))}>
                  <option value="">Sin departamento</option>
                  {departments.map((department) => (
                    <option key={department.key} value={department.key}>{department.label}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Email">
              <input type="email" className={INPUT_CLASS} value={responsableForm.email} onChange={(e) => setResponsableForm((current) => ({ ...current, email: e.target.value }))} />
            </Field>
            <button type="submit" disabled={busy || !canManage} className="w-full rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60">
              {busy ? 'Guardando...' : responsableForm.id ? 'Guardar proveedor' : 'Agregar proveedor'}
            </button>
          </form>

          <div className="mt-4 space-y-3">
            {responsables.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">Aun no hay proveedores cargados.</div> : null}
            {responsables.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.nombre}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.tipo} | {item.departamento ?? 'Sin departamento'}{item.email ? ` | ${item.email}` : ''}</p>
                  </div>
                  {canManage ? (
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setResponsableForm({ id: item.id, nombre: item.nombre, tipo: item.tipo, departamento: item.departamento ?? '', email: item.email ?? '' })} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        Editar
                      </button>
                      <button type="button" onClick={() => void deleteResponsableById(item.id)} disabled={deletingId === item.id} className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60">
                        {deletingId === item.id ? 'Eliminando...' : 'Eliminar'}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <form onSubmit={submitEntidad} className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">{entidadForm.id ? 'Editar entidad' : 'Nueva entidad'}</p>
              {entidadForm.id ? <button type="button" onClick={() => setEntidadForm(buildEntidadFormState(defaultDepartment, defaultLocationId, locations))} className="text-xs font-semibold text-slate-500 hover:text-slate-700">Cancelar edicion</button> : null}
            </div>
            <Field label="Nombre">
              <input className={INPUT_CLASS} value={entidadForm.nombre} onChange={(e) => setEntidadForm((current) => ({ ...current, nombre: e.target.value }))} required />
            </Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Tipo">
                <input className={INPUT_CLASS} value={entidadForm.tipo_entidad} onChange={(e) => setEntidadForm((current) => ({ ...current, tipo_entidad: e.target.value }))} required />
              </Field>
              <Field label="Categoria">
                <input className={INPUT_CLASS} value={entidadForm.categoria} onChange={(e) => setEntidadForm((current) => ({ ...current, categoria: e.target.value }))} required />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Departamento">
                <select className={INPUT_CLASS} value={entidadForm.departamento} onChange={(e) => setEntidadForm((current) => ({ ...current, departamento: e.target.value }))}>
                  {departments.map((department) => (
                    <option key={department.key} value={department.key}>{department.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Sede">
                <select className={INPUT_CLASS} value={entidadForm.centro_costo} onChange={(e) => setEntidadForm((current) => ({ ...current, centro_costo: e.target.value }))}>
                  <option value="">Sin sede</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.code}>{location.code} - {location.name}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Proveedor ligado">
              <select className={INPUT_CLASS} value={entidadForm.responsable_proveedor_id} onChange={(e) => setEntidadForm((current) => ({ ...current, responsable_proveedor_id: e.target.value }))}>
                <option value="">Sin proveedor</option>
                {responsables.map((item) => (
                  <option key={item.id} value={item.id}>{item.nombre}</option>
                ))}
              </select>
            </Field>
            <button type="submit" disabled={busy || !canManage} className="w-full rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60">
              {busy ? 'Guardando...' : entidadForm.id ? 'Guardar entidad' : 'Agregar entidad'}
            </button>
          </form>

          <div className="mt-4 space-y-3">
            {entidades.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">Aun no hay entidades cargadas.</div> : null}
            {entidades.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.nombre}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.tipo_entidad} | {item.categoria} | {item.departamento}</p>
                  </div>
                  {canManage ? (
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setEntidadForm({ id: item.id, nombre: item.nombre, tipo_entidad: item.tipo_entidad, categoria: item.categoria, departamento: item.departamento, centro_costo: item.centro_costo ?? '', responsable_proveedor_id: item.responsable_proveedor_id ?? '' })} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        Editar
                      </button>
                      <button type="button" onClick={() => void deleteEntidadById(item.id)} disabled={deletingId === item.id} className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60">
                        {deletingId === item.id ? 'Eliminando...' : 'Eliminar'}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {error ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      {!canManage ? <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Tu perfil puede consultar catalogos, pero no crear ni editar registros.</div> : null}
    </div>
  )
}

function PlanWorkspaceModal({
  open,
  plan,
  agenda,
  agendaLoading,
  locations,
  canManage,
  canEdit,
  seedBusyPlanId,
  onClose,
  onEdit,
  onReseed,
  onUpdatePlanState,
  onUpdateAgendaStatus,
}: {
  open: boolean
  plan: PlanWithRelations | null
  agenda: OpsAgendaItem[]
  agendaLoading: boolean
  locations: LocationOption[]
  canManage: boolean
  canEdit: boolean
  seedBusyPlanId: string | null
  onClose: () => void
  onEdit: () => void
  onReseed: (planId: string) => void
  onUpdatePlanState: (planId: string, estado: OpsPlan['estado']) => void
  onUpdateAgendaStatus: (agendaId: string, estado: OpsAgendaItem['estado']) => void
}) {
  if (!open || !plan) return null

  return (
    <ModalFrame
      title={plan.nombre}
      description="Detalle operativo, agenda y acciones del plan seleccionado."
      onClose={onClose}
      maxWidthClass="max-w-5xl"
    >
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-lg font-bold text-slate-900">{plan.nombre}</p>
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${PLAN_STATE_STYLES[plan.estado] ?? PLAN_STATE_STYLES.activo}`}>{plan.estado}</span>
            </div>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <p><span className="font-semibold text-slate-900">Departamento:</span> {plan.departamento_dueno}</p>
              <p><span className="font-semibold text-slate-900">Sede:</span> {locationLabel(plan.centro_costo, locations)}</p>
              <p><span className="font-semibold text-slate-900">Entidad:</span> {plan.entidad?.nombre ?? 'Sin entidad'}</p>
              <p><span className="font-semibold text-slate-900">Proveedor:</span> {plan.responsable?.nombre ?? 'Sin proveedor'}</p>
              <p><span className="font-semibold text-slate-900">Inicio:</span> {formatDate(plan.fecha_inicio)}</p>
              <p><span className="font-semibold text-slate-900">Frecuencia:</span> {plan.frecuencia_tipo}</p>
              <p><span className="font-semibold text-slate-900">Presupuesto:</span> {formatCurrency(plan.monto_total_planeado)}</p>
            </div>

            <div className="mt-5 space-y-3">
              {canEdit ? (
                <button type="button" onClick={onEdit} className="w-full rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-700 hover:bg-sky-100">
                  Editar plan
                </button>
              ) : null}
              {canEdit ? (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Se reemplazara la agenda actual con una nueva distribucion basada en las fechas, frecuencia y presupuesto vigentes.')) {
                      onReseed(plan.id)
                    }
                  }}
                  disabled={seedBusyPlanId === plan.id}
                  className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                >
                  {seedBusyPlanId === plan.id ? 'Regenerando agenda...' : 'Regenerar agenda y montos'}
                </button>
              ) : null}
              {canManage ? (
                <div className="flex flex-wrap gap-2">
                  {(['activo', 'pausado', 'cerrado'] as const).map((state) => (
                    <button key={state} type="button" onClick={() => onUpdatePlanState(plan.id, state)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${plan.estado === state ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}>
                      {state}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500">Agenda del plan</h3>
              {agendaLoading ? <span className="text-xs text-slate-400">Actualizando...</span> : null}
            </div>
            <div className="mt-3 space-y-3">
              {agenda.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">No hay agenda cargada para este plan.</div>
              ) : (
                agenda.slice(0, 18).map((item) => (
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
                          <button key={state} type="button" onClick={() => onUpdateAgendaStatus(item.id, state)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${item.estado === state ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
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
        </div>
      </div>
    </ModalFrame>
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

  async function submit(reseedAgenda: boolean) {
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
          centro_costo: resolveCentroCostoFromLocationId(form.centro_costo, locations) || null,
          custom_interval_days: form.custom_interval_days || null,
          dia_semana: form.dia_semana || null,
          dia_del_mes: form.dia_del_mes || null,
        }),
      })
      const json = await response.json()
      if (!response.ok || !json.ok) {
        throw new Error(json.error ?? 'No se pudo actualizar el plan')
      }

      if (reseedAgenda) {
        const seedResponse = await fetch(`/api/ops/plans/${currentPlan.id}/seed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ replaceExisting: true }),
        })
        const seedJson = await seedResponse.json()
        if (!seedResponse.ok || !seedJson.ok) {
          throw new Error(seedJson.error ?? 'El plan se guardo, pero no se pudo regenerar la agenda')
        }
      }

      await onSaved()
      onClose()
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo actualizar el plan')
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    if (!open || !plan) return
    setForm({
      codigo_plan: plan.codigo_plan ?? '',
      nombre: plan.nombre ?? '',
      descripcion: plan.descripcion ?? '',
      departamento_dueno: plan.departamento_dueno ?? '',
      centro_costo: resolveLocationId(plan.centro_costo, locations),
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
  }, [open, plan?.id])

  if (!open || !plan) return null
  const currentPlan = plan

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    await submit(false)
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm">
        <div className="flex min-h-full items-start justify-center py-4 sm:items-center sm:py-8">
          <div className="flex w-full max-w-4xl max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
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
            <form onSubmit={handleSubmit} className="flex-1 min-h-0 space-y-4 overflow-y-auto px-6 py-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Codigo del plan" help="Clave unica interna para identificar el plan en reportes y seguimiento.">
              <input className={INPUT_CLASS} value={form.codigo_plan} onChange={(e) => setForm((prev) => ({ ...prev, codigo_plan: e.target.value }))} />
            </Field>
            <Field label="Nombre del plan" help="Nombre visible del plan dentro del tablero anual.">
              <input className={INPUT_CLASS} value={form.nombre} onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))} required />
            </Field>
            <Field label="Estado" help="Situacion actual del plan: activo, pausado o cerrado.">
              <select className={INPUT_CLASS} value={form.estado} onChange={(e) => setForm((prev) => ({ ...prev, estado: e.target.value as OpsPlan['estado'] }))}>
                <option value="activo">Activo</option>
                <option value="pausado">Pausado</option>
                <option value="cerrado">Cerrado</option>
              </select>
            </Field>
          </div>

          <Field label="Descripcion" help="Explica que se busca lograr y que cubre este plan.">
            <textarea className={`${INPUT_CLASS} min-h-[96px]`} value={form.descripcion} onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))} />
          </Field>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Departamento" help="Area responsable de operar y responder por el plan.">
              <select className={INPUT_CLASS} value={form.departamento_dueno} onChange={(e) => setForm((prev) => ({ ...prev, departamento_dueno: e.target.value }))}>
                {departments.map((department) => (
                  <option key={department.key} value={department.key}>{department.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Sede" help="Ubicacion o propiedad donde se ejecutara el plan.">
              <select className={INPUT_CLASS} value={form.centro_costo} onChange={(e) => setForm((prev) => ({ ...prev, centro_costo: e.target.value }))}>
                <option value="">Sin sede asignada</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>{location.code} - {location.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Moneda" help="Moneda base en la que se registrara el presupuesto.">
              <input className={INPUT_CLASS} value={form.moneda} onChange={(e) => setForm((prev) => ({ ...prev, moneda: e.target.value }))} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Entidad objetivo" help="Area, sistema o activo especifico al que apunta el plan.">
              <select className={INPUT_CLASS} value={form.entidad_objetivo_id} onChange={(e) => setForm((prev) => ({ ...prev, entidad_objetivo_id: e.target.value }))}>
                <option value="">Sin entidad</option>
                {entidades.map((item) => (
                  <option key={item.id} value={item.id}>{item.nombre}</option>
                ))}
              </select>
            </Field>
            <Field label="Proveedor / responsable" help="Persona o proveedor encargado de atender o coordinar la actividad.">
              <select className={INPUT_CLASS} value={form.responsable_proveedor_id} onChange={(e) => setForm((prev) => ({ ...prev, responsable_proveedor_id: e.target.value }))}>
                <option value="">Sin proveedor</option>
                {responsables.map((item) => (
                  <option key={item.id} value={item.id}>{item.nombre}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Inicio" help="Fecha a partir de la cual el plan queda vigente.">
              <input type="date" className={INPUT_CLASS} value={form.fecha_inicio} onChange={(e) => setForm((prev) => ({ ...prev, fecha_inicio: e.target.value }))} required />
            </Field>
            <Field label="Fin" help="Ultima fecha en la que el plan seguira programando eventos.">
              <input type="date" className={INPUT_CLASS} value={form.fecha_fin} onChange={(e) => setForm((prev) => ({ ...prev, fecha_fin: e.target.value }))} required />
            </Field>
            <Field label="Frecuencia" help="Regla principal con la que se repetira el plan.">
              <select className={INPUT_CLASS} value={form.frecuencia_tipo} onChange={(e) => setForm((prev) => ({ ...prev, frecuencia_tipo: e.target.value }))}>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensual</option>
                <option value="quarterly">Trimestral</option>
                <option value="yearly">Anual</option>
                <option value="custom_days">Personalizado</option>
              </select>
            </Field>
            <Field label="Intervalo" help="Cada cuantas unidades de la frecuencia se repite. Ejemplo: cada 2 meses.">
              <input type="number" min="1" className={INPUT_CLASS} value={form.frecuencia_intervalo} onChange={(e) => setForm((prev) => ({ ...prev, frecuencia_intervalo: e.target.value }))} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Dias personalizados" help="Usalo solo si la frecuencia es personalizada por numero de dias.">
              <input type="number" min="1" className={INPUT_CLASS} value={form.custom_interval_days} onChange={(e) => setForm((prev) => ({ ...prev, custom_interval_days: e.target.value }))} />
            </Field>
            <Field label="Dia de semana" help="Para frecuencia semanal: 1 a 7 segun el dia programado.">
              <input type="number" min="1" max="7" className={INPUT_CLASS} value={form.dia_semana} onChange={(e) => setForm((prev) => ({ ...prev, dia_semana: e.target.value }))} />
            </Field>
            <Field label="Dia del mes" help="Para frecuencia mensual: dia exacto del mes en que debe ocurrir.">
              <input type="number" min="1" max="31" className={INPUT_CLASS} value={form.dia_del_mes} onChange={(e) => setForm((prev) => ({ ...prev, dia_del_mes: e.target.value }))} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Presupuesto planeado" help="Monto total estimado para ejecutar este plan durante su vigencia.">
              <input type="number" min="0" step="0.01" className={INPUT_CLASS} value={form.monto_total_planeado} onChange={(e) => setForm((prev) => ({ ...prev, monto_total_planeado: e.target.value }))} />
            </Field>
            <Field label="Esfuerzo planeado" help="Carga estimada de trabajo, horas o esfuerzo operativo del plan.">
              <input type="number" min="0" step="0.01" className={INPUT_CLASS} value={form.esfuerzo_total_planeado} onChange={(e) => setForm((prev) => ({ ...prev, esfuerzo_total_planeado: e.target.value }))} />
            </Field>
          </div>

          {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
            Si cambias frecuencia, fechas, presupuesto o esfuerzo, usa la opcion de regenerar agenda para recalcular las ocurrencias y sus montos prorrateados.
          </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
                <button type="button" onClick={() => void submit(true)} disabled={submitting} className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-700 hover:bg-sky-100 disabled:opacity-60">{submitting ? 'Procesando...' : 'Guardar y regenerar agenda'}</button>
                <button type="submit" disabled={submitting} className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60">{submitting ? 'Procesando...' : 'Guardar cambios'}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}

export default function PlanningHubClient({
  userProfile,
  initialYear,
  mode = 'overview',
  demoMode = false,
  basePath = '/planificacion',
}: Props) {
  const isOverview = mode === 'overview'
  const isPortfolio = mode === 'portfolio'
  const isCatalogs = mode === 'catalogs'
  const initialDemoState: PlanningDemoData | null = demoMode ? buildPlanningDemoData(initialYear) : null
  const routeBase = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath
  const overviewHref = routeBase
  const portfolioHref = `${routeBase}/portafolio`
  const catalogsHref = `${routeBase}/catalogos`
  const canSeeAll = userProfile.isAdmin
  const canSelectAllAssignedLocations = userProfile.isAdmin || userProfile.isCorporate
  const canSelectAllAccessibleDepartments = userProfile.isAdmin || userProfile.isCorporate
  const canManage = !demoMode && (userProfile.isAdmin || userProfile.role === 'supervisor')

  const [year, setYear] = useState(initialYear)
  const [locations, setLocations] = useState<LocationOption[]>(() => initialDemoState?.locations ?? [])
  const [locationsLoading, setLocationsLoading] = useState(!demoMode)
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL')
  const [selectedLocationId, setSelectedLocationId] = useState<string>('ALL')
  const [portfolio, setPortfolio] = useState<PortfolioResponse>(() => initialDemoState?.portfolio ?? { plans: [], calendar: [], compliance: [], financial: [] })
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [agenda, setAgenda] = useState<OpsAgendaItem[]>([])
  const [loading, setLoading] = useState(!demoMode && !isCatalogs)
  const [refreshing, setRefreshing] = useState(false)
  const [agendaLoading, setAgendaLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPlanWorkspaceModal, setShowPlanWorkspaceModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState<PlanWithRelations | null>(null)
  const [entityOptions, setEntityOptions] = useState<OpsEntidad[]>(() => initialDemoState?.entidades ?? [])
  const [responsibleOptions, setResponsibleOptions] = useState<OpsResponsable[]>(() => initialDemoState?.responsables ?? [])
  const [seedBusyPlanId, setSeedBusyPlanId] = useState<string | null>(null)
  const [busyAgendaItemId, setBusyAgendaItemId] = useState<string | null>(null)
  const [activeMatrixTooltipKey, setActiveMatrixTooltipKey] = useState<string | null>(null)
  const activeMatrixTooltipRef = useRef<HTMLDivElement | null>(null)

  const accessibleDepartments = useMemo(() => {
    return buildDepartmentCatalog(userProfile, portfolio)
  }, [portfolio, userProfile])
  const preferredDept = accessibleDepartments[0]?.key ?? 'MANTENIMIENTO'
  const visibleDepartmentKeys = useMemo(() => new Set(accessibleDepartments.map((item) => item.key)), [accessibleDepartments])

  useEffect(() => {
    if (demoMode) {
      const demoState = buildPlanningDemoData(initialYear)
      setLocations(demoState.locations)
      setLocationsLoading(false)
      return
    }

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
  }, [demoMode, initialYear])

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
    if (isCatalogs) {
      setLoading(false)
      setRefreshing(false)
      return
    }

    if (demoMode) {
      const demoState = buildPlanningDemoData(year)
      setError(null)
      setLocations(demoState.locations)
      setPortfolio(demoState.portfolio)
      setEntityOptions(demoState.entidades)
      setResponsibleOptions(demoState.responsables)
      setLoading(false)
      setRefreshing(false)
      return
    }

    try {
      setError(null)
      setRefreshing(true)
      const bounds = isPortfolio ? monthBounds(year) : overviewBounds(year)
      const calendarLimit = isPortfolio ? 1200 : 240
      const [plansJson, calendarJson, complianceJson, financialJson] = await Promise.all([
        fetchJson<{ ok: true; data: PlanWithRelations[] }>('/api/ops/planes'),
        fetchJson<{ ok: true; data: OpsCalendarItem[] }>(`/api/ops/calendar?from=${bounds.from}&to=${bounds.to}&limit=${calendarLimit}`),
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
    if (isCatalogs) {
      setLoading(false)
      return
    }

    void loadPortfolio()
  }, [canSeeAll, isCatalogs, isPortfolio, visibleDepartmentKeys, year])

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
    if (selectedPlanId && !filteredPlans.some((plan) => plan.id === selectedPlanId)) {
      setSelectedPlanId(null)
      setShowPlanWorkspaceModal(false)
    }
  }, [filteredPlans, selectedPlanId])

  async function loadAgenda(planId: string) {
    if (demoMode) {
      const demoState = buildPlanningDemoData(year)
      setAgendaLoading(true)
      setAgenda(demoState.agendasByPlanId[planId] ?? [])
      setAgendaLoading(false)
      return
    }

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

  useEffect(() => {
    if (!isCatalogs) return

    async function bootstrapCatalogs() {
      try {
        setLoading(true)
        setError(null)
        await loadPlanningCatalogs()
      } catch (err: any) {
        setError(err?.message ?? 'No se pudieron cargar los catalogos de planificacion')
      } finally {
        setLoading(false)
      }
    }

    void bootstrapCatalogs()
  }, [isCatalogs])

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target
      if (target instanceof Node && activeMatrixTooltipRef.current?.contains(target)) {
        return
      }

      setActiveMatrixTooltipKey(null)
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setActiveMatrixTooltipKey(null)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const selectedPlan = useMemo(() => filteredPlans.find((plan) => plan.id === selectedPlanId) ?? null, [filteredPlans, selectedPlanId])
  const canEditSelectedPlan = useMemo(() => {
    if (!selectedPlan) return false
    if (userProfile.isAdmin) return true
    return visibleDepartmentKeys.has(normalize(selectedPlan.departamento_dueno))
  }, [selectedPlan, userProfile.isAdmin, visibleDepartmentKeys])

  const totalPlanned = scopedPortfolio.financial.reduce((sum, item) => sum + Number(item.monto_total_planeado || 0), 0)
  const activePlans = filteredPlans.filter((plan) => plan.estado === 'activo').length
  const totalEvents = scopedPortfolio.calendar.length
  const openEvents = scopedPortfolio.calendar.filter((item) => item.estado !== 'completado' && item.estado !== 'cancelado').length
  const totalCritical = scopedPortfolio.compliance.filter((item) => item.alert_flag === 'RED').length
  const selectedLocationLabel = selectedLocationId === 'ALL'
    ? (userProfile.isAdmin ? 'Todas las sedes' : 'Mis sedes')
    : (locations.find((location) => location.id === selectedLocationId)?.name ?? 'Sin sede')
  const selectedDepartmentLabel = selectedDepartment === 'ALL'
    ? 'Todos los departamentos'
    : (accessibleDepartments.find((department) => department.key === selectedDepartment)?.label ?? selectedDepartment)

  const highlightedAlerts = useMemo(() => {
    const red = scopedPortfolio.compliance
      .filter((item) => item.alert_flag === 'RED')
      .sort((left, right) => right.aging_days - left.aging_days)
    if (red.length > 0) return red.slice(0, 6)

    return scopedPortfolio.compliance
      .filter((item) => item.alert_flag === 'YELLOW')
      .sort((left, right) => right.aging_days - left.aging_days)
      .slice(0, 6)
  }, [scopedPortfolio.compliance])

  const upcomingAgendaItems = useMemo(() => {
    return scopedPortfolio.calendar
      .filter((item) => item.estado !== 'completado' && item.estado !== 'cancelado')
      .slice(0, 8)
  }, [scopedPortfolio.calendar])

  const departmentHealthRows = useMemo(() => {
    return accessibleDepartments
      .map((department) => {
        const plans = scopedPortfolio.plans.filter((item) => normalize(item.departamento_dueno) === department.key)
        const alerts = scopedPortfolio.compliance.filter((item) => normalize(item.departamento) === department.key)
        const budget = scopedPortfolio.financial
          .filter((item) => normalize(item.departamento_dueno) === department.key)
          .reduce((sum, item) => sum + Number(item.monto_total_planeado || 0), 0)
        const nextEvents = scopedPortfolio.calendar.filter((item) => normalize(item.departamento_dueno) === department.key).length

        return {
          department,
          activePlans: plans.filter((item) => item.estado === 'activo').length,
          criticalAlerts: alerts.filter((item) => item.alert_flag === 'RED').length,
          nextEvents,
          budget,
        }
      })
      .filter((row) => row.activePlans > 0 || row.criticalAlerts > 0 || row.nextEvents > 0 || row.budget > 0)
      .sort((left, right) => right.criticalAlerts - left.criticalAlerts || right.activePlans - left.activePlans)
  }, [accessibleDepartments, scopedPortfolio])

  const matrixRows = useMemo(() => {
    if (!isPortfolio) return []

    return filteredPlans.map((plan) => ({
      plan,
      matrix: getMatrixForPlan(plan, scopedPortfolio.calendar),
      eventDetails: getEventDetailsForPlan(plan, scopedPortfolio.calendar),
      annualBudget: scopedPortfolio.calendar
        .filter((item) => item.plan_maestro_id === plan.id)
        .reduce((sum, item) => sum + Number(item.monto_estimado || 0), 0),
    }))
  }, [filteredPlans, isPortfolio, scopedPortfolio.calendar])

  const exportQuery = useMemo(() => {
    const params = new URLSearchParams({
      year: String(year),
      department: selectedDepartment,
      locationId: selectedLocationId,
    })
    return params.toString()
  }, [selectedDepartment, selectedLocationId, year])

  const exportPdfInformativeHref = `/api/planificacion/export/pdf?${exportQuery}&reportMode=informative`
  const exportPdfAlertsHref = `/api/planificacion/export/pdf?${exportQuery}&reportMode=alerts`
  const exportExcelHref = `/api/planificacion/export/excel?${exportQuery}`

  function downloadPlanningPdf(baseHref: string, filename: string) {
    if (typeof window === 'undefined') return

    const storageKey = 'planning:pdf:brandLogo'
    const previous = window.localStorage.getItem(storageKey)
    const input = window.prompt(
      "Logo del cliente para el PDF (opcional).\n\n- Escribe una URL https://...\n- O una clave interna (ej: alzen)\n- O 'none' para no mostrar logo\n\nDeja vacío para usar el último/default.",
      previous ?? 'alzen'
    )

    const normalized = (input ?? '').trim()
    const selected = normalized.length > 0 ? normalized : (previous ?? 'alzen')
    window.localStorage.setItem(storageKey, selected)

    const lower = selected.toLowerCase()
    const isUrl = /^https?:\/\//i.test(selected)
    const url = new URL(baseHref, window.location.origin)

    url.searchParams.delete('brandLogoMode')
    url.searchParams.delete('brandLogoKey')
    url.searchParams.delete('brandLogoUrl')

    if (lower === 'none') {
      url.searchParams.set('brandLogoMode', 'none')
    } else if (isUrl) {
      url.searchParams.set('brandLogoUrl', selected)
    } else {
      url.searchParams.set('brandLogoKey', selected)
    }

    downloadPdfUrl(`${url.pathname}${url.search}`, filename)
  }

  async function updateAgendaStatus(id: string, estado: OpsAgendaItem['estado']) {
    if (demoMode) {
      setError('El demo es solo lectura y no depende de Supabase.')
      return
    }

    try {
      setBusyAgendaItemId(id)
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
      } else {
        await loadPortfolio()
      }
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo actualizar la agenda')
    } finally {
      setBusyAgendaItemId(null)
    }
  }

  async function updatePlanState(id: string, estado: OpsPlan['estado']) {
    if (demoMode) {
      setError('El demo es solo lectura y no depende de Supabase.')
      return
    }

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

  async function loadPlanningCatalogs() {
    if (demoMode) {
      const demoState = buildPlanningDemoData(year)
      setLocations(demoState.locations)
      setEntityOptions(demoState.entidades)
      setResponsibleOptions(demoState.responsables)
      return
    }

    const [entitiesJson, responsiblesJson] = await Promise.all([
      fetchJson<{ ok: true; data: OpsEntidad[] }>('/api/ops/entidades'),
      fetchJson<{ ok: true; data: OpsResponsable[] }>('/api/ops/responsables'),
    ])

    setEntityOptions(entitiesJson.data ?? [])
    setResponsibleOptions(responsiblesJson.data ?? [])
  }

  async function openEditPlanModal() {
    if (!selectedPlan) return
    if (demoMode) {
      setError('El demo es solo lectura y no depende de Supabase.')
      return
    }

    try {
      setError(null)
      setEditingPlan({ ...selectedPlan })
      await loadPlanningCatalogs()
      setShowEditModal(true)
    } catch (err: any) {
      setError(err?.message ?? 'No se pudieron cargar los catalogos para editar el plan')
    }
  }

  async function openEditPlanModalForPlan(plan: PlanWithRelations) {
    if (demoMode) {
      setError('El demo es solo lectura y no depende de Supabase.')
      return
    }

    try {
      setError(null)
      setSelectedPlanId(plan.id)
      setEditingPlan({ ...plan })
      await loadPlanningCatalogs()
      setShowEditModal(true)
    } catch (err: any) {
      setError(err?.message ?? 'No se pudieron cargar los catalogos para editar el plan')
    }
  }

  async function openCreatePlanModal() {
    if (demoMode) {
      setError('El demo es solo lectura y no depende de Supabase.')
      return
    }

    try {
      setError(null)
      await loadPlanningCatalogs()
      setShowCreateModal(true)
    } catch (err: any) {
      setError(err?.message ?? 'No se pudieron cargar los catalogos para crear el plan')
    }
  }

  function openPlanWorkspace(planId: string) {
    setSelectedPlanId(planId)
    setShowPlanWorkspaceModal(true)
  }

  async function reseedPlanAgenda(planId: string) {
    if (demoMode) {
      setError('El demo es solo lectura y no depende de Supabase.')
      return
    }

    try {
      setSeedBusyPlanId(planId)
      setError(null)

      const response = await fetch(`/api/ops/plans/${planId}/seed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replaceExisting: true }),
      })
      const json = await response.json()
      if (!response.ok || !json.ok) {
        throw new Error(json.error ?? 'No se pudo regenerar la agenda del plan')
      }

      await Promise.all([loadPortfolio(), loadAgenda(planId)])
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo regenerar la agenda del plan')
    } finally {
      setSeedBusyPlanId(null)
    }
  }

  async function refreshPlanningCatalogs() {
    if (demoMode) {
      const demoState = buildPlanningDemoData(year)
      setLocations(demoState.locations)
      setEntityOptions(demoState.entidades)
      setResponsibleOptions(demoState.responsables)
      if (!isCatalogs) {
        setPortfolio(demoState.portfolio)
      }
      return
    }

    await loadPlanningCatalogs()
    if (!isCatalogs) {
      await loadPortfolio()
    }
  }

  const viewTitle = isOverview
    ? 'Centro de control anual'
    : isPortfolio
      ? 'Portafolio anual de planes'
      : 'Catalogos de planeacion'
  const viewDescription = isOverview
    ? 'Resumen ejecutivo con alertas activas, proximos compromisos y accesos operativos. El portafolio detallado vive en su propia vista.'
    : isPortfolio
      ? 'Vista de trabajo para revisar la matriz anual, abrir planes, exportar y operar la cartera sin contaminar el dashboard.'
      : 'Datos maestros para responsables y entidades objetivo. Desde aqui se prepara la base para crear planes consistentes.'

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-[28px] border border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 px-6 py-5 text-white shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200">
                <Building2 className="h-3.5 w-3.5" />
                Planeacion anual corporativa
              </div>
              <h1 className="mt-3 text-[1.95rem] font-extrabold tracking-[-0.03em] text-white xl:text-[2.15rem]">{viewTitle}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{viewDescription}</p>
            </div>
            <div className="flex flex-col gap-3 xl:min-w-[360px] xl:items-end">
              <div className="grid gap-3 sm:grid-cols-[116px_1fr] sm:items-center xl:w-full">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">Ejercicio</p>
                  <p className="mt-1 text-xs text-slate-400">Ano de trabajo</p>
                </div>
                <select className="w-full rounded-xl border border-white/10 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                  {[initialYear - 1, initialYear, initialYear + 1, initialYear + 2].map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-2.5 xl:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (isCatalogs) {
                      void refreshPlanningCatalogs()
                      return
                    }
                    void loadPortfolio()
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/10"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  Actualizar
                </button>
                {!isCatalogs && !demoMode ? (
                  <button type="button" onClick={openCreatePlanModal} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100">
                    <FolderPlus className="h-4 w-4" />
                    Nuevo plan
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-4">
            <PlanningViewLink href={overviewHref} label="Dashboard" active={isOverview} />
            <PlanningViewLink href={portfolioHref} label="Portafolio" active={isPortfolio} />
            <PlanningViewLink href={catalogsHref} label="Catalogos" active={isCatalogs} />
          </div>
        </section>

        {demoMode ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            Modo demo publico: sin validacion de usuario ni conexion a Supabase. Los datos son de ejemplo y las acciones de edicion o exportacion quedan deshabilitadas para no tocar produccion.
          </div>
        ) : null}

        {!isCatalogs ? (
          <>
            <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard title="Planes activos" value={String(activePlans)} help="Planes visibles en la vista actual" accent="text-slate-900" icon={ClipboardList} />
              <SummaryCard title={isPortfolio ? 'Eventos del anio' : 'Ventana operativa'} value={String(isPortfolio ? totalEvents : openEvents)} help={isPortfolio ? 'Ocurrencias programadas en la matriz anual' : 'Compromisos abiertos dentro del horizonte cargado'} accent="text-sky-700" icon={CalendarDays} />
              <SummaryCard title="Presupuesto planeado" value={formatCurrency(totalPlanned)} help="Monto agregado desde control financiero" accent="text-emerald-700" icon={Banknote} />
              <SummaryCard title="Alertas criticas" value={String(totalCritical)} help="Planes con brecha operativa activa" accent="text-rose-700" icon={AlertTriangle} />
            </section>

            <section className="mt-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div className="max-w-2xl">
                  <h2 className="text-xl font-bold text-slate-900">Contexto de trabajo</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {isOverview
                      ? 'Acota la lectura del dashboard antes de entrar al detalle. La idea es revisar riesgo, compromisos proximos y decidir donde trabajar.'
                      : 'Define la sede y el departamento antes de abrir la matriz, exportar o intervenir un plan.'}
                  </p>
                </div>
                <div className="grid w-full gap-4 md:grid-cols-2 xl:w-auto xl:grid-cols-[280px_280px_240px]">
                  <Field label="Sede">
                    <select className={INPUT_CLASS} value={selectedLocationId} onChange={(e) => setSelectedLocationId(e.target.value)}>
                      {canSelectAllAssignedLocations ? (
                        <option value="ALL">{userProfile.isAdmin ? 'Todas las sedes' : 'Mis sedes'}</option>
                      ) : null}
                      {locations.map((location) => (
                        <option key={location.id} value={location.id}>{location.code} - {location.name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Departamento">
                    <select className={INPUT_CLASS} value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)}>
                      {canSelectAllAccessibleDepartments ? <option value="ALL">Todos los departamentos</option> : null}
                      {accessibleDepartments.map((department) => (
                        <option key={department.key} value={department.key}>{department.label}</option>
                      ))}
                    </select>
                  </Field>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Vista actual</p>
                    <p className="mt-2 text-sm font-bold text-slate-900">{selectedLocationLabel}</p>
                    <p className="mt-1 text-sm text-slate-500">{selectedDepartmentLabel}</p>
                  </div>
                </div>
              </div>

              {isPortfolio ? (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-700">Salida y cierre</h3>
                    <p className="mt-1 text-sm text-slate-500">Exporta la vista actual solo cuando los filtros representen exactamente el corte que quieres revisar.</p>
                  </div>
                  {demoMode ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      Exportacion deshabilitada en demo. Esta ruta sirve para revisar interfaz y navegacion sin depender de Supabase.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2.5">
                      <button
                        type="button"
                        onClick={() => downloadPlanningPdf(exportPdfInformativeHref, `planeacion-${year}-informativo.pdf`)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <FileText className="h-4 w-4" />
                        PDF informativo
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadPlanningPdf(exportPdfAlertsHref, `planeacion-${year}-alertas.pdf`)}
                        className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-900 hover:bg-rose-100"
                      >
                        <AlertTriangle className="h-4 w-4" />
                        PDF con alertas
                      </button>
                      <a href={exportExcelHref} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-900 hover:bg-emerald-100">
                        <FileSpreadsheet className="h-4 w-4" />
                        Excel de la vista actual
                      </a>
                    </div>
                  )}
                </div>
              ) : null}
            </section>
          </>
        ) : null}

        {error ? <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div> : null}

        {isOverview ? (
          <>
            <section className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_1fr]">
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Riesgo y cumplimiento</h2>
                    <p className="mt-1 text-sm text-slate-500">Lo que necesita intervención primero. Si aquí no está claro, el dashboard falla.</p>
                  </div>
                  <Link href={portfolioHref} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    Ver portafolio
                  </Link>
                </div>
                <div className="mt-4 space-y-3">
                  {highlightedAlerts.map((item) => (
                    <div key={item.agenda_id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{item.plan_nombre}</p>
                          <p className="mt-1 text-xs text-slate-500">{locationLabel(item.centro_costo, locations)} | {item.departamento} | {formatDate(item.due_date)}</p>
                        </div>
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${item.alert_flag === 'RED' ? 'border-rose-200 bg-rose-100 text-rose-800' : 'border-amber-200 bg-amber-100 text-amber-800'}`}>
                          {item.alert_flag}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600"><ArrowUpRight className="h-3.5 w-3.5" />Impacto {formatCurrency(item.impacto_financiero)}</span>
                        <button type="button" onClick={() => openPlanWorkspace(item.plan_id)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                          Abrir plan
                        </button>
                      </div>
                    </div>
                  ))}
                  {highlightedAlerts.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">Sin alertas activas para la vista actual.</div> : null}
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Proximos compromisos</h2>
                    <p className="mt-1 text-sm text-slate-500">Ventana operativa breve para saber qué toca intervenir sin entrar a la matriz anual.</p>
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                    {upcomingAgendaItems.length} visibles
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {upcomingAgendaItems.map((item) => (
                    <div key={item.agenda_id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{item.plan_nombre}</p>
                          <p className="mt-1 text-xs text-slate-500">{item.entidad_objetivo} | {locationLabel(item.centro_costo, locations)}</p>
                        </div>
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[item.estado] ?? STATUS_STYLES.pendiente}`}>{item.estado}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-600">{formatDate(item.due_date)} · {formatCurrency(item.monto_estimado)}</span>
                        <button type="button" onClick={() => openPlanWorkspace(item.plan_maestro_id)} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                          Abrir plan
                        </button>
                      </div>
                    </div>
                  ))}
                  {upcomingAgendaItems.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">Sin eventos pendientes dentro del horizonte cargado.</div> : null}
                </div>
              </div>
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Lectura por departamento</h3>
                    <p className="mt-1 text-sm text-slate-500">Resumen ejecutivo para detectar carga, presupuesto y riesgo sin duplicar tarjetas decorativas.</p>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  {departmentHealthRows.map((row) => (
                    <div key={row.department.key} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`rounded-2xl p-3 ${row.department.soft} ${row.department.accent}`}>
                            <row.department.icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{row.department.label}</p>
                            <p className="text-xs text-slate-500">{row.activePlans} planes activos · {row.nextEvents} eventos visibles</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 md:min-w-[320px] md:grid-cols-3">
                          <div className="rounded-xl bg-white px-3 py-2.5">
                            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Alertas</p>
                            <p className="mt-1 text-sm font-bold text-slate-900">{row.criticalAlerts}</p>
                          </div>
                          <div className="rounded-xl bg-white px-3 py-2.5">
                            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Eventos</p>
                            <p className="mt-1 text-sm font-bold text-slate-900">{row.nextEvents}</p>
                          </div>
                          <div className="rounded-xl bg-white px-3 py-2.5 col-span-2 md:col-span-1">
                            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Presupuesto</p>
                            <p className="mt-1 text-sm font-bold text-slate-900">{formatCurrency(row.budget)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {departmentHealthRows.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">No hay departamentos con actividad en la vista actual.</div> : null}
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900">Superficies operativas</h3>
                <p className="mt-1 text-sm text-slate-500">Cada flujo en su propio espacio para no mezclar lectura ejecutiva con trabajo transaccional.</p>
                <div className="mt-5 grid gap-4">
                  <PlanningActionCard
                    href={portfolioHref}
                    title="Portafolio anual"
                    description="Abre la matriz completa, exporta la vista actual y trabaja la cartera con sus meses y acciones."
                    icon={ClipboardList}
                  />
                  <PlanningActionCard
                    href={catalogsHref}
                    title="Catalogos maestros"
                    description="Gestiona responsables y entidades objetivo sin interrumpir la lectura del dashboard."
                    icon={Building2}
                  />
                  {demoMode ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-left text-amber-900">
                      <div className="flex items-start justify-between gap-4">
                        <div className="rounded-2xl bg-amber-100 p-3 text-amber-800">
                          <FolderPlus className="h-5 w-5" />
                        </div>
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-800">Solo lectura</span>
                      </div>
                      <h3 className="mt-4 text-lg font-bold">Nuevo plan</h3>
                      <p className="mt-2 text-sm leading-6 text-amber-800/90">En la demo no se crea ni se edita informacion. Usa esta ruta para revisar layout, filtros y navegacion sin autenticacion.</p>
                    </div>
                  ) : (
                    <button type="button" onClick={openCreatePlanModal} className="rounded-2xl border border-slate-200 bg-slate-900 p-5 text-left text-white transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md">
                      <div className="flex items-start justify-between gap-4">
                        <div className="rounded-2xl bg-white/10 p-3 text-white">
                          <FolderPlus className="h-5 w-5" />
                        </div>
                        <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200">Accion</span>
                      </div>
                      <h3 className="mt-4 text-lg font-bold">Nuevo plan</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-300">Crea un plan anual y siembra su agenda inicial desde un flujo dedicado, sin meterte primero a la matriz.</p>
                    </button>
                  )}
                </div>
              </div>
            </section>
          </>
        ) : null}

        {isPortfolio ? (
          <>
            <section className="mt-6">
              <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Matriz anual de planes</h2>
                    <p className="mt-1 text-sm text-slate-500">Portafolio real por mes, con lectura presupuestal y acceso directo al workspace del plan.</p>
                  </div>
                  <div className="flex items-center gap-3">
                      <Link href={catalogsHref} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                      Gestionar catalogos
                    </Link>
                    <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                      {filteredPlans.length} planes
                    </div>
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
                    <table className="w-full min-w-[1660px] text-left text-sm">
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
                          <th className="min-w-[220px] border-b border-slate-200 px-4 py-4 font-semibold text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {matrixRows.map(({ plan, matrix, eventDetails, annualBudget }) => {
                          const department = getDepartmentConfig(plan.departamento_dueno)
                          const canManagePlan = canManage && (userProfile.isAdmin || visibleDepartmentKeys.has(normalize(plan.departamento_dueno)))
                          return (
                            <tr key={plan.id} className="hover:bg-slate-50" onClick={() => openPlanWorkspace(plan.id)}>
                              <td className="sticky left-0 z-10 border-r border-slate-100 bg-white px-5 py-4">
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
                                const monthEvents = eventDetails.get(month) ?? []
                                const tooltipKey = `${plan.id}:${month}`
                                const isTooltipOpen = activeMatrixTooltipKey === tooltipKey
                                return (
                                  <td key={month} className="px-2 py-4 text-center">
                                    {cell ? (
                                      <div
                                        ref={isTooltipOpen ? activeMatrixTooltipRef : undefined}
                                        className="relative"
                                        onClick={(event) => event.stopPropagation()}
                                        onPointerDown={(event) => event.stopPropagation()}
                                      >
                                        <button
                                          type="button"
                                          onClick={(event) => {
                                            event.stopPropagation()
                                            if (monthEvents.length > 0) {
                                              setActiveMatrixTooltipKey((current) => current === tooltipKey ? null : tooltipKey)
                                              return
                                            }
                                            openPlanWorkspace(plan.id)
                                          }}
                                          aria-expanded={isTooltipOpen}
                                          aria-haspopup={monthEvents.length > 0 ? 'dialog' : undefined}
                                          className={`w-full rounded-2xl border px-2 py-2.5 text-center transition ${
                                            isTooltipOpen ? 'scale-[1.01] border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-900/20' : 'shadow-sm hover:-translate-y-0.5 hover:shadow-md'
                                          } ${!isTooltipOpen ? STATUS_STYLES[cell.status ?? 'pending'] ?? STATUS_STYLES.pendiente : ''}`}
                                        >
                                          <p className="text-[9px] font-bold uppercase tracking-[0.16em] opacity-80">{monthEvents.length > 0 ? 'Revisar' : 'Mes'}</p>
                                          <p className="mt-1 text-[11px] font-bold">{cell.count} evt</p>
                                          <p className="mt-1 text-[10px]">{formatCurrency(cell.budget)}</p>
                                        </button>
                                        {monthEvents.length > 0 ? (
                                          <EventStatusTooltip
                                            events={monthEvents}
                                            canManage={canManagePlan}
                                            open={isTooltipOpen}
                                            busyAgendaItemId={busyAgendaItemId}
                                            onClose={() => setActiveMatrixTooltipKey(null)}
                                            onOpenPlan={() => {
                                              setActiveMatrixTooltipKey(null)
                                              openPlanWorkspace(plan.id)
                                            }}
                                            onStatusChange={(agendaId, estado) => {
                                              void updateAgendaStatus(agendaId, estado)
                                            }}
                                          />
                                        ) : null}
                                      </div>
                                    ) : (
                                      <div className="rounded-xl border border-dashed border-slate-200 px-1.5 py-2 text-[10px] text-slate-300">-</div>
                                    )}
                                  </td>
                                )
                              })}
                              <td className="bg-slate-50/80 px-5 py-4 text-right font-bold text-slate-900">{formatCurrency(annualBudget)}</td>
                              <td className="px-4 py-4">
                                <div className="flex flex-wrap justify-center gap-2" onClick={(event) => event.stopPropagation()}>
                                  <button type="button" onClick={() => openPlanWorkspace(plan.id)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                                    Abrir
                                  </button>
                                  {canManagePlan ? (
                                    <button type="button" onClick={() => void openEditPlanModalForPlan(plan)} className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100">
                                      Editar
                                    </button>
                                  ) : null}
                                  {canManagePlan ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (confirm('Se reemplazara la agenda actual con una nueva distribucion basada en las fechas, frecuencia y presupuesto vigentes.')) {
                                          void reseedPlanAgenda(plan.id)
                                        }
                                      }}
                                      disabled={seedBusyPlanId === plan.id}
                                      className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                                    >
                                      {seedBusyPlanId === plan.id ? 'Regenerando...' : 'Agenda'}
                                    </button>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>

            <section className="mt-6">
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500">Riesgo y cumplimiento</h3>
                    <p className="mt-2 text-sm text-slate-500">Este bloque queda ya como complemento del portafolio, no enterrado dentro del dashboard ejecutivo.</p>
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                    {scopedPortfolio.compliance.length} alertas
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {scopedPortfolio.compliance.slice(0, 8).map((item) => (
                    <div key={item.agenda_id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{item.plan_nombre}</p>
                          <p className="mt-1 text-xs text-slate-500">{locationLabel(item.centro_costo, locations)} | {item.departamento} | {formatDate(item.due_date)}</p>
                        </div>
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${item.alert_flag === 'RED' ? 'bg-rose-100 text-rose-800 border-rose-200' : item.alert_flag === 'YELLOW' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'}`}>{item.alert_flag}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600"><ArrowUpRight className="h-3.5 w-3.5" />Impacto {formatCurrency(item.impacto_financiero)}</span>
                        <button type="button" onClick={() => openPlanWorkspace(item.plan_id)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                          Abrir plan
                        </button>
                      </div>
                    </div>
                  ))}
                  {scopedPortfolio.compliance.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">Sin alertas activas para la vista actual.</div> : null}
                </div>
              </div>
            </section>
          </>
        ) : null}

        {isCatalogs ? (
          <section className="mt-6">
            {loading ? (
              <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-16 text-center text-sm text-slate-500 shadow-sm">Cargando catalogos de planeacion...</div>
            ) : (
              <CatalogManagerCard
                canManage={canManage}
                departments={accessibleDepartments}
                locations={locations}
                responsables={responsibleOptions}
                entidades={entityOptions}
                defaultDepartment={selectedDepartment === 'ALL' ? preferredDept : selectedDepartment}
                defaultLocationId={selectedLocationId === 'ALL' ? (locations[0]?.id ?? '') : selectedLocationId}
                onCatalogsChanged={refreshPlanningCatalogs}
              />
            )}
          </section>
        ) : null}
      </div>

      <PlanWorkspaceModal
        open={showPlanWorkspaceModal}
        plan={selectedPlan}
        agenda={agenda}
        agendaLoading={agendaLoading}
        locations={locations}
        canManage={canManage}
        canEdit={canEditSelectedPlan}
        seedBusyPlanId={seedBusyPlanId}
        onClose={() => setShowPlanWorkspaceModal(false)}
        onEdit={() => void openEditPlanModal()}
        onReseed={(planId) => void reseedPlanAgenda(planId)}
        onUpdatePlanState={(planId, estado) => void updatePlanState(planId, estado)}
        onUpdateAgendaStatus={(agendaId, estado) => void updateAgendaStatus(agendaId, estado)}
      />

      <EditPlanModal
        open={showEditModal}
        plan={editingPlan}
        departments={accessibleDepartments}
        locations={locations}
        entidades={entityOptions}
        responsables={responsibleOptions}
        canEdit={canEditSelectedPlan}
        onClose={() => {
          setShowEditModal(false)
          setEditingPlan(null)
        }}
        onSaved={async () => {
          await Promise.all([loadPortfolio(), selectedPlanId ? loadAgenda(selectedPlanId) : Promise.resolve()])
        }}
      />

      <NewPlanModal
        open={showCreateModal}
        canManage={canManage}
        defaultDepartment={selectedDepartment === 'ALL' ? preferredDept : selectedDepartment}
        defaultLocationId={selectedLocationId === 'ALL' ? (locations[0]?.id ?? '') : selectedLocationId}
        year={year}
        departments={accessibleDepartments}
        locations={locations}
        entidades={entityOptions}
        responsables={responsibleOptions}
        onClose={() => setShowCreateModal(false)}
        onCreated={async (planId) => {
          setSelectedPlanId(planId)
          setShowPlanWorkspaceModal(true)
          await Promise.all([loadPortfolio(), loadAgenda(planId)])
        }}
      />
    </div>
  )
}
