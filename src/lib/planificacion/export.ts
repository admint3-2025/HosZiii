import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  OpsAgendaItem,
  OpsCalendarItem,
  OpsComplianceItem,
  OpsEntidad,
  OpsFinancialItem,
  OpsPlan,
  OpsResponsable,
} from '@/lib/ops/service'
import {
  getComplianceAging,
  getFinancialControl,
  getOperationalCalendar,
  listPlanes,
} from '@/lib/ops/service'

export type PlanningExportLocation = {
  id: string
  code: string
  name: string
}

export type PlanningExportProfile = {
  role: string
  isAdmin: boolean
  isCorporate: boolean
  department: string | null
  allowedDepartments: string[]
  fullName: string | null
  locationId: string | null
}

export type PlanningPlanWithRelations = OpsPlan & {
  entidad?: Pick<OpsEntidad, 'nombre'> | null
  responsable?: Pick<OpsResponsable, 'nombre'> | null
}

export type PlanningExportFilters = {
  year: number
  department: string
  locationId: string
}

export type PlanningDepartmentDef = {
  key: string
  label: string
  shortLabel: string
  aliases?: string[]
}

export type PlanningMatrixCell = {
  count: number
  budget: number
  status: OpsAgendaItem['estado'] | OpsCalendarItem['estado'] | 'mixed' | null
}

export type PlanningExportRow = {
  plan: PlanningPlanWithRelations
  department: PlanningDepartmentDef
  locationLabel: string
  matrix: Map<number, PlanningMatrixCell>
  annualBudget: number
}

export type PlanningExportBundle = {
  generatedAt: Date
  year: number
  profile: PlanningExportProfile
  filters: {
    department: string
    departmentLabel: string
    locationId: string
    locationLabel: string
  }
  locations: PlanningExportLocation[]
  rows: PlanningExportRow[]
  summary: {
    activePlans: number
    totalEvents: number
    totalPlanned: number
    totalCritical: number
  }
}

type PortfolioResponse = {
  plans: PlanningPlanWithRelations[]
  calendar: OpsCalendarItem[]
  compliance: OpsComplianceItem[]
  financial: OpsFinancialItem[]
}

export const PLANNING_MONTHS = ['ENE', 'FEB', 'MZO', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEPT', 'OCT', 'NOV', 'DIC']

const DEPARTMENTS: PlanningDepartmentDef[] = [
  {
    key: 'RECURSOS HUMANOS',
    label: 'Recursos Humanos',
    shortLabel: 'RRHH',
    aliases: ['RRHH', 'RH'],
  },
  {
    key: 'GSH',
    label: 'GSH',
    shortLabel: 'GSH',
  },
  {
    key: 'DIV. CUARTOS',
    label: 'Div. Cuartos',
    shortLabel: 'Cuartos',
    aliases: ['CUARTOS', 'DIV CUARTOS', 'DIVISION CUARTOS'],
  },
  {
    key: 'MANTENIMIENTO',
    label: 'Mantenimiento',
    shortLabel: 'Mantenimiento',
  },
  {
    key: 'SISTEMAS',
    label: 'Sistemas',
    shortLabel: 'Sistemas',
    aliases: ['IT'],
  },
  {
    key: 'ALIMENTOS Y BEBIDAS',
    label: 'Alimentos y Bebidas',
    shortLabel: 'AyB',
    aliases: ['AYB', 'A&B', 'ALIMENTOS Y BEBIDAS (A&B)'],
  },
  {
    key: 'AMA DE LLAVES',
    label: 'Ama de Llaves',
    shortLabel: 'ADL',
    aliases: ['HOUSEKEEPING', 'AMA DE LLAVES (HOUSEKEEPING)'],
  },
  {
    key: 'CONTABILIDAD',
    label: 'Contabilidad',
    shortLabel: 'Conta',
    aliases: ['CONTA'],
  },
  {
    key: 'MARKETING',
    label: 'Marketing',
    shortLabel: 'Mkt',
    aliases: ['MKT'],
  },
]

export function normalizePlanningValue(value: string | null | undefined) {
  return (value ?? '').trim().toUpperCase()
}

export function formatPlanningCurrency(amount: number | null | undefined) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(Number(amount ?? 0))
}

export function formatPlanningDate(date: string | null | undefined) {
  if (!date) return '-'
  const parsed = new Date(`${date}T00:00:00`)
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
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function statusRank(status: string) {
  if (status === 'en_proceso') return 3
  if (status === 'pendiente') return 2
  if (status === 'cancelado') return 1
  return 0
}

export function getPlanningDepartmentConfig(value: string | null | undefined) {
  const normalized = normalizePlanningValue(value)
  if (!normalized) return null

  return DEPARTMENTS.find((item) => {
    if (item.key === normalized || normalizePlanningValue(item.label) === normalized) return true
    return item.aliases?.some((alias) => normalizePlanningValue(alias) === normalized) ?? false
  }) ?? null
}

function getDepartmentConfigOrFallback(department: string | null | undefined) {
  return getPlanningDepartmentConfig(department) ?? {
    key: normalizePlanningValue(department),
    label: department || 'Sin departamento',
    shortLabel: department || 'Sin depto',
  }
}

function getAccessibleDepartments(profile: PlanningExportProfile) {
  if (profile.isAdmin) return DEPARTMENTS

  const allowed = new Map<string, PlanningDepartmentDef>()

  if (profile.department) {
    const department = getDepartmentConfigOrFallback(profile.department)
    allowed.set(department.key, department)
  }

  for (const departmentName of profile.allowedDepartments) {
    const department = getDepartmentConfigOrFallback(departmentName)
    allowed.set(department.key, department)
  }

  if (profile.isCorporate && allowed.size === 0) {
    return DEPARTMENTS
  }

  const filtered = Array.from(allowed.values()).sort((left, right) => left.label.localeCompare(right.label, 'es-MX'))
  return filtered.length > 0 ? filtered : [getDepartmentConfigOrFallback(profile.department || 'MANTENIMIENTO')]
}

function buildDepartmentCatalog(profile: PlanningExportProfile, portfolio: PortfolioResponse) {
  const known = new Map(DEPARTMENTS.map((department) => [department.key, department]))
  const discovered = new Set<string>()

  if (profile.department) discovered.add(normalizePlanningValue(profile.department))
  for (const department of profile.allowedDepartments) {
    discovered.add(normalizePlanningValue(department))
  }

  for (const plan of portfolio.plans) discovered.add(normalizePlanningValue(plan.departamento_dueno))
  for (const item of portfolio.calendar) discovered.add(normalizePlanningValue(item.departamento_dueno))
  for (const item of portfolio.financial) discovered.add(normalizePlanningValue(item.departamento_dueno))
  for (const item of portfolio.compliance) discovered.add(normalizePlanningValue(item.departamento))

  const departments = Array.from(discovered)
    .filter(Boolean)
    .map((department) => known.get(department) ?? getDepartmentConfigOrFallback(department))
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

function locationMatches(centroCosto: string | null | undefined, location: PlanningExportLocation) {
  const value = normalizePlanningValue(centroCosto)
  if (!value) return false
  return value === normalizePlanningValue(location.code) || value === normalizePlanningValue(location.name) || value === normalizePlanningValue(location.id)
}

export function getPlanningLocationLabel(centroCosto: string | null | undefined, locations: PlanningExportLocation[]) {
  if (!centroCosto) return 'Sin sede asignada'
  const matched = locations.find((location) => locationMatches(centroCosto, location))
  return matched ? `${matched.code} - ${matched.name}` : centroCosto
}

function matchesSelectedLocation(
  centroCosto: string | null | undefined,
  selectedLocationId: string,
  locations: PlanningExportLocation[],
) {
  if (selectedLocationId === 'ALL') return true
  const selected = locations.find((location) => location.id === selectedLocationId)
  if (!selected) return false
  return locationMatches(centroCosto, selected)
}

function getMatrixForPlan(plan: PlanningPlanWithRelations, calendar: OpsCalendarItem[]) {
  const map = new Map<number, PlanningMatrixCell>()
  const planRows = calendar.filter((item) => item.plan_maestro_id === plan.id)

  for (const row of planRows) {
    const month = new Date(`${row.due_date}T00:00:00`).getMonth() + 1
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

async function getPlanningProfile(supabase: SupabaseClient, userId: string): Promise<PlanningExportProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role, is_corporate, department, allowed_departments, full_name, location_id')
    .eq('id', userId)
    .single()

  if (error) throw error
  if (!data) throw new Error('Perfil no encontrado')

  const role = data.role ?? 'supervisor'

  return {
    role,
    isAdmin: role === 'admin',
    isCorporate: Boolean(data.is_corporate),
    department: data.department ?? null,
    allowedDepartments: Array.isArray(data.allowed_departments) ? data.allowed_departments.filter(Boolean) : [],
    fullName: data.full_name ?? null,
    locationId: data.location_id ?? null,
  }
}

async function getPlanningLocations(params: {
  supabase: SupabaseClient
  adminSupabase?: SupabaseClient
  userId: string
  profile: PlanningExportProfile
}) {
  const { supabase, adminSupabase, userId, profile } = params

  if (profile.isAdmin) {
    const locationsClient = adminSupabase ?? supabase
    const { data, error } = await locationsClient
      .from('locations')
      .select('id, code, name')
      .order('code', { ascending: true })

    if (error) throw error
    return (data ?? []) as PlanningExportLocation[]
  }

  const { data: userLocations, error: userLocationsError } = await supabase
    .from('user_locations')
    .select('location_id')
    .eq('user_id', userId)

  if (userLocationsError) throw userLocationsError

  const locationIds = Array.from(new Set((userLocations ?? []).map((item) => item.location_id).filter(Boolean)))
  if (!locationIds.length && profile.locationId) {
    locationIds.push(profile.locationId)
  }

  if (!locationIds.length) return []

  const { data, error } = await supabase
    .from('locations')
    .select('id, code, name')
    .in('id', locationIds)
    .order('code', { ascending: true })

  if (error) throw error
  return (data ?? []) as PlanningExportLocation[]
}

function sanitizeDepartmentFilter(value: string | null, departments: PlanningDepartmentDef[]) {
  const normalized = normalizePlanningValue(value)
  if (!normalized || normalized === 'ALL') return 'ALL'
  return departments.some((department) => department.key === normalized) ? normalized : 'ALL'
}

function sanitizeLocationFilter(value: string | null, locations: PlanningExportLocation[]) {
  if (!value || value === 'ALL') return 'ALL'
  return locations.some((location) => location.id === value) ? value : 'ALL'
}

export async function getPlanningExportBundle(params: {
  supabase: SupabaseClient
  adminSupabase?: SupabaseClient
  userId: string
  filters: PlanningExportFilters
}): Promise<PlanningExportBundle> {
  const { supabase, adminSupabase, userId, filters } = params
  const profile = await getPlanningProfile(supabase, userId)
  const locations = await getPlanningLocations({ supabase, adminSupabase, userId, profile })
  const visibleDepartmentKeys = new Set(getAccessibleDepartments(profile).map((item) => item.key))
  const bounds = monthBounds(filters.year)

  const [plans, calendar, compliance, financial] = await Promise.all([
    listPlanes(supabase),
    getOperationalCalendar(supabase, { from: bounds.from, to: bounds.to, limit: 1200 }),
    getComplianceAging(supabase, { asOfDate: todayIso() }),
    getFinancialControl(supabase, {}),
  ])

  const portfolio: PortfolioResponse = {
    plans: plans.filter((item) => profile.isAdmin || visibleDepartmentKeys.has(normalizePlanningValue(item.departamento_dueno))),
    calendar: calendar.filter((item) => profile.isAdmin || visibleDepartmentKeys.has(normalizePlanningValue(item.departamento_dueno))),
    compliance: compliance.filter((item) => profile.isAdmin || visibleDepartmentKeys.has(normalizePlanningValue(item.departamento))),
    financial: financial.filter((item) => profile.isAdmin || visibleDepartmentKeys.has(normalizePlanningValue(item.departamento_dueno))),
  }

  const availableDepartments = buildDepartmentCatalog(profile, portfolio)
  const selectedDepartment = sanitizeDepartmentFilter(filters.department, availableDepartments)
  const selectedLocationId = sanitizeLocationFilter(filters.locationId, locations)

  const byLocation = {
    plans: portfolio.plans.filter((item) => matchesSelectedLocation(item.centro_costo, selectedLocationId, locations)),
    calendar: portfolio.calendar.filter((item) => matchesSelectedLocation(item.centro_costo, selectedLocationId, locations)),
    compliance: portfolio.compliance.filter((item) => matchesSelectedLocation(item.centro_costo, selectedLocationId, locations)),
    financial: portfolio.financial.filter((item) => matchesSelectedLocation(item.centro_costo, selectedLocationId, locations)),
  }

  const scopedPortfolio = {
    plans: byLocation.plans.filter((plan) => selectedDepartment === 'ALL' || normalizePlanningValue(plan.departamento_dueno) === selectedDepartment),
    calendar: byLocation.calendar.filter((item) => selectedDepartment === 'ALL' || normalizePlanningValue(item.departamento_dueno) === selectedDepartment),
    compliance: byLocation.compliance.filter((item) => selectedDepartment === 'ALL' || normalizePlanningValue(item.departamento) === selectedDepartment),
    financial: byLocation.financial.filter((item) => selectedDepartment === 'ALL' || normalizePlanningValue(item.departamento_dueno) === selectedDepartment),
  }

  const rows = scopedPortfolio.plans.map((plan) => ({
    plan,
    department: getDepartmentConfigOrFallback(plan.departamento_dueno),
    locationLabel: getPlanningLocationLabel(plan.centro_costo, locations),
    matrix: getMatrixForPlan(plan, scopedPortfolio.calendar),
    annualBudget: scopedPortfolio.calendar
      .filter((item) => item.plan_maestro_id === plan.id)
      .reduce((sum, item) => sum + Number(item.monto_estimado || 0), 0),
  }))

  const departmentLabel = selectedDepartment === 'ALL'
    ? 'Todos los departamentos'
    : (availableDepartments.find((department) => department.key === selectedDepartment)?.label ?? selectedDepartment)

  const locationLabel = selectedLocationId === 'ALL'
    ? (profile.isAdmin ? 'Todas las sedes' : 'Mis sedes asignadas')
    : (locations.find((location) => location.id === selectedLocationId)?.code
      ? `${locations.find((location) => location.id === selectedLocationId)?.code} - ${locations.find((location) => location.id === selectedLocationId)?.name}`
      : 'Sin sede asignada')

  return {
    generatedAt: new Date(),
    year: filters.year,
    profile,
    filters: {
      department: selectedDepartment,
      departmentLabel,
      locationId: selectedLocationId,
      locationLabel,
    },
    locations,
    rows,
    summary: {
      activePlans: scopedPortfolio.plans.filter((plan) => plan.estado === 'activo').length,
      totalEvents: scopedPortfolio.calendar.length,
      totalPlanned: scopedPortfolio.financial.reduce((sum, item) => sum + Number(item.monto_total_planeado || 0), 0),
      totalCritical: scopedPortfolio.compliance.filter((item) => item.alert_flag === 'RED').length,
    },
  }
}