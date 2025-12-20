import { createSupabaseServerClient } from '@/lib/supabase/server'
import { unstable_noStore as noStore } from 'next/cache'
import StatusChart from './ui/StatusChart'
import PriorityChart from './ui/PriorityChart'
import TrendChart from './ui/TrendChart'
import RecentTickets from './ui/RecentTickets'
import AgingMetrics from './ui/AgingMetrics'
import InteractiveKPI from './ui/InteractiveKPI'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  noStore()
  const supabase = await createSupabaseServerClient()

  const OPEN_STATUSES = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'NEEDS_INFO', 'WAITING_THIRD_PARTY', 'RESOLVED'] as const

  const dashboardErrors: string[] = []

  // KPIs principales
  const [openRes, closedRes, escalatedRes, assignedRes, totalRes] = await Promise.all([
    supabase.from('tickets').select('id', { count: 'exact', head: true }).is('deleted_at', null).in('status', [...OPEN_STATUSES]),
    supabase.from('tickets').select('id', { count: 'exact', head: true }).is('deleted_at', null).in('status', ['CLOSED']),
    supabase.from('tickets').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('support_level', 2),
    supabase.from('tickets').select('id', { count: 'exact', head: true }).is('deleted_at', null).not('assigned_agent_id', 'is', null),
    supabase.from('tickets').select('id', { count: 'exact', head: true }).is('deleted_at', null),
  ])

  ;[openRes, closedRes, escalatedRes, assignedRes, totalRes].forEach((r) => {
    if (r.error) dashboardErrors.push(r.error.message)
  })

  const abiertos = openRes.count ?? 0
  const cerrados = closedRes.count ?? 0
  const escalados = escalatedRes.count ?? 0
  const asignados = assignedRes.count ?? 0
  const total = totalRes.count ?? 0

  // Distribución por estado
  const { data: statusData, error: statusError } = await supabase
    .from('tickets')
    .select('status')
    .is('deleted_at', null)
  if (statusError) dashboardErrors.push(statusError.message)

  const statusCounts = (statusData ?? []).reduce((acc: Record<string, number>, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1
    return acc
  }, {})

  const statusChartData = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count: count as number,
  }))

  // Distribución por prioridad
  const { data: priorityData, error: priorityError } = await supabase
    .from('tickets')
    .select('priority')
    .is('deleted_at', null)
  if (priorityError) dashboardErrors.push(priorityError.message)

  const priorityCounts = (priorityData ?? []).reduce((acc: Record<number, number>, t) => {
    acc[t.priority] = (acc[t.priority] || 0) + 1
    return acc
  }, {})

  const priorityChartData = [1, 2, 3, 4].map((priority) => ({
    priority,
    count: priorityCounts[priority] || 0,
  }))

  // Tendencia últimos 7 días
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    return date.toISOString().split('T')[0]
  })

  const { data: trendData, error: trendError } = await supabase
    .from('tickets')
    .select('created_at')
    .gte('created_at', last7Days[0])
  if (trendError) dashboardErrors.push(trendError.message)

  const trendCounts = last7Days.map((date) => {
    const count = (trendData ?? []).filter((t) =>
      t.created_at.startsWith(date)
    ).length
    return { date, count }
  })

  // Tickets recientes
  const { data: recentTickets, error: recentError } = await supabase
    .from('tickets')
    .select('id,ticket_number,title,status,priority,created_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(5)
  if (recentError) dashboardErrors.push(recentError.message)

  // Métricas de aging por estado
  const { data: agingData, error: agingError } = await supabase
    .from('tickets')
    .select('status,created_at')
    .is('deleted_at', null)
    .in('status', [...OPEN_STATUSES])
  if (agingError) dashboardErrors.push(agingError.message)

  const agingByStatus = (agingData ?? []).reduce((acc: Record<string, number[]>, t) => {
    const daysSince = Math.floor((Date.now() - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24))
    if (!acc[t.status]) acc[t.status] = []
    acc[t.status].push(daysSince)
    return acc
  }, {})

  const agingMetrics = Object.entries(agingByStatus).map(([status, days]) => ({
    status,
    avgDays: days.reduce((a, b) => a + b, 0) / days.length,
    oldestDays: Math.max(...days),
  })).sort((a, b) => b.avgDays - a.avgDays)

  return (
    <main className="min-h-screen space-y-6">
      <div className="max-w-7xl mx-auto">
        {/* Header moderno */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 shadow-lg">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl -ml-32 -mb-32"></div>
          
          <div className="relative z-10 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-md">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Dashboard</h1>
                  <p className="text-blue-100 text-xs">KPIs operativos y métricas en tiempo real</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="/tickets/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg font-semibold text-sm hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl hover:scale-105"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Nuevo Ticket
                </a>
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-white font-medium">En vivo</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      {dashboardErrors.length ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 flex items-center gap-3 shadow-sm">
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>No fue posible cargar métricas del dashboard (RLS o sesión). Detalle: {dashboardErrors[0]}</span>
        </div>
      ) : null}

      {/* KPIs principales */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="h-1 w-1 rounded-full bg-blue-600"></div>
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Indicadores Principales</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InteractiveKPI
          label="Tickets Abiertos"
          value={abiertos}
          total={total}
          icon="open"
          color="blue"
          description="Tickets activos que requieren atención: Nuevos, Asignados, En Progreso, Requieren Info, Esperando Tercero y Resueltos pendientes de cierre"
        />
        <InteractiveKPI
          label="Tickets Cerrados"
          value={cerrados}
          total={total}
          icon="closed"
          color="green"
          description="Tickets resueltos y cerrados satisfactoriamente por el equipo de soporte"
        />
        <InteractiveKPI
          label="Escalados N2"
          value={escalados}
          total={total}
          icon="escalated"
          color="orange"
          description="Tickets escalados a soporte de nivel 2 por complejidad técnica o especialización requerida"
        />
        <InteractiveKPI
          label="Asignados"
          value={asignados}
          total={total}
          icon="assigned"
          color="purple"
          description="Tickets con agente asignado actualmente trabajando en ellos"
        />
      </div>
      </div>

      {/* Gráficos y análisis */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="h-1 w-1 rounded-full bg-indigo-600"></div>
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Distribución y Análisis</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
        <StatusChart data={statusChartData} />
        <PriorityChart data={priorityChartData} />
      </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="h-1 w-1 rounded-full bg-purple-600"></div>
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Métricas Detalladas</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <TrendChart data={trendCounts} />
          <AgingMetrics metrics={agingMetrics} />
        </div>
        <div className="mt-4">
          <RecentTickets tickets={recentTickets ?? []} />
        </div>
      </div>
      </div>
    </main>
  )
}
