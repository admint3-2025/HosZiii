import { redirect } from 'next/navigation'
import { createSupabaseServerClient, getSafeServerUser } from '@/lib/supabase/server'
import { getOperationalCalendar, getComplianceAging } from '@/lib/ops/service'
import PlanningHubClient from './PlanningHubClient'

export const dynamic = 'force-dynamic'

export type UserPlanningProfile = {
  role: string
  isAdmin: boolean
  isCorporate: boolean
  departamento: string | null
  allowed_departments: string[] | null
  full_name: string | null
}

export default async function PlanificacionPage() {
  const supabase = await createSupabaseServerClient()
  const user = await getSafeServerUser()
  if (!user) redirect('/login')

  // ── Perfil del usuario ────────────────────────────────────────────────
  const { data: profileRow } = await supabase
    .from('profiles')
    .select('role, is_corporate, departamento, allowed_departments, full_name')
    .eq('id', user.id)
    .single()

  // Evita rebotes /login -> /hub cuando el perfil falla por RLS/transitorio.
  const role = profileRow?.role ?? 'supervisor'
  const isCorporate = Boolean(profileRow?.is_corporate)
  const isAdmin = role === 'admin'
  const userProfile: UserPlanningProfile = {
    role,
    isAdmin,
    isCorporate,
    departamento: profileRow?.departamento ?? null,
    allowed_departments: (profileRow?.allowed_departments as string[] | null) ?? null,
    full_name: profileRow?.full_name ?? null,
  }

  // ── Determinar filtro de departamento ─────────────────────────────────
  // Admin/corporativo → sin filtro (ven todo)
  // Supervisor de departamento → solo su departamento
  // Si tiene allowed_departments, el primero es el principal
  let deptFilter: string | null = null
  if (!isAdmin && !isCorporate) {
    const allowed = profileRow?.allowed_departments as string[] | null
    if (allowed && allowed.length > 0) {
      deptFilter = allowed[0]
    } else if (profileRow?.departamento) {
      deptFilter = profileRow.departamento
    }
  }

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const pad = (n: number) => String(n).padStart(2, '0')
  const today = `${year}-${pad(month + 1)}-${pad(now.getDate())}`
  const monthStart = `${year}-${pad(month + 1)}-01`
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthEnd = `${year}-${pad(month + 1)}-${pad(daysInMonth)}`
  const next60 = new Date(now)
  next60.setDate(next60.getDate() + 60)
  const next60str = `${next60.getFullYear()}-${pad(next60.getMonth() + 1)}-${pad(next60.getDate())}`

  let calendarMonth: any[] = []
  let compliance: any[] = []
  let upcoming: any[] = []

  try {
    ;[calendarMonth, compliance, upcoming] = await Promise.all([
      getOperationalCalendar(supabase, { from: monthStart, to: monthEnd, departamento: deptFilter }),
      getComplianceAging(supabase, { asOfDate: today, departamento: deptFilter }),
      getOperationalCalendar(supabase, { from: today, to: next60str, departamento: deptFilter, limit: 80 }),
    ])
  } catch {
    // empty — show blank state
  }

  const totalThisMonth = calendarMonth.length
  const completedThisMonth = calendarMonth.filter((x) => x.estado === 'completado').length
  const overdueCount = compliance.filter(
    (x) => x.aging_days > 0 && x.estado !== 'completado' && x.estado !== 'cancelado',
  ).length
  const criticalCount = compliance.filter((x) => x.alert_flag === 'RED').length

  return (
    <PlanningHubClient
      calendarMonth={calendarMonth}
      compliance={compliance}
      upcoming={upcoming}
      today={today}
      currentYear={year}
      currentMonth={month}
      userProfile={userProfile}
      stats={{ totalThisMonth, completedThisMonth, overdueCount, criticalCount }}
    />
  )
}
