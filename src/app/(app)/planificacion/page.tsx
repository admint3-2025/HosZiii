import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getOperationalCalendar, getComplianceAging } from '@/lib/ops/service'
import PlanningHubClient from './PlanningHubClient'

export const dynamic = 'force-dynamic'

export default async function PlanificacionPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0-indexed

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
      getOperationalCalendar(supabase, { from: monthStart, to: monthEnd }),
      getComplianceAging(supabase, { asOfDate: today }),
      getOperationalCalendar(supabase, { from: today, to: next60str, limit: 80 }),
    ])
  } catch (_) {
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
      stats={{ totalThisMonth, completedThisMonth, overdueCount, criticalCount }}
    />
  )
}
