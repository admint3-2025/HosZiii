import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getLocationFilter } from '@/lib/supabase/locations'
import { unstable_noStore as noStore } from 'next/cache'
import Link from 'next/link'
import StatusChart from '../../dashboard/ui/StatusChart'
import PriorityChart from '../../dashboard/ui/PriorityChart'
import TrendChart from '../../dashboard/ui/TrendChart'
import RecentTickets from '../../dashboard/ui/RecentTickets'
import AgingMetrics from '../../dashboard/ui/AgingMetrics'
import InteractiveKPI from '../../dashboard/ui/InteractiveKPI'
import AssignedAssets from '../../dashboard/ui/AssignedAssets'
import LocationStatsTable from '../../dashboard/ui/LocationStatsTable'

export const dynamic = 'force-dynamic'

export default async function MaintenanceDashboardPage() {
  noStore()
  const supabase = await createSupabaseServerClient()

  const OPEN_STATUSES = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'NEEDS_INFO', 'WAITING_THIRD_PARTY', 'RESOLVED'] as const

  const dashboardErrors: string[] = []

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user ? await supabase
    .from('profiles')
    .select('role,department,asset_category')
    .eq('id', user.id)
    .single() : { data: null }

  // Validar acceso al DASHBOARD de mantenimiento (gestión)
  // Solo admin o usuarios cuya área principal sea MAINTENANCE
  // (supervisores/agentes de IT pueden crear tickets pero NO gestionar)
  const canManageMaintenance = profile?.role === 'admin' || profile?.asset_category === 'MAINTENANCE'
  
  if (!canManageMaintenance) {
    return (
      <main className="min-h-screen">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h2>
          <p className="text-gray-600">No tienes permisos para gestionar este módulo.</p>
        </div>
      </main>
    )
  }

  const isAdminOrSupervisor = profile?.role === 'admin' || profile?.role === 'supervisor'
  const isAgent = profile?.role === 'agent_l1' || profile?.role === 'agent_l2'

  const ticketsIndexHref = isAdminOrSupervisor ? '/mantenimiento/tickets?view=queue' : '/mantenimiento/tickets?view=mine'

  // Obtener filtro de ubicación (null si es admin, array de location_ids si no lo es)
  const locationFilter = await getLocationFilter()

  // Helper para aplicar filtro de ubicación
  const applyFilter = (query: any) => {
    if (locationFilter === null) {
      // Admin: sin filtro
      return query
    }
    if (Array.isArray(locationFilter) && locationFilter.length > 0) {
      // Múltiples sedes
      return query.in('location_id', locationFilter)
    }
    // Sin sedes: query imposible
    return query.eq('location_id', 'none')
  }

  // KPIs principales - usando tabla tickets_maintenance
  const [openRes, closedRes, escalatedRes, assignedRes, totalRes] = await Promise.all([
    applyFilter(supabase.from('tickets_maintenance').select('id', { count: 'exact', head: true }).is('deleted_at', null).in('status', [...OPEN_STATUSES])),
    applyFilter(supabase.from('tickets_maintenance').select('id', { count: 'exact', head: true }).is('deleted_at', null).in('status', ['CLOSED'])),
    applyFilter(supabase.from('tickets_maintenance').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('support_level', 2)),
    applyFilter(supabase.from('tickets_maintenance').select('id', { count: 'exact', head: true }).is('deleted_at', null).not('assigned_agent_id', 'is', null)),
    applyFilter(supabase.from('tickets_maintenance').select('id', { count: 'exact', head: true }).is('deleted_at', null)),
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
  const { data: statusData, error: statusError } = await applyFilter(
    supabase
      .from('tickets_maintenance')
      .select('status')
      .is('deleted_at', null)
  )
  if (statusError) dashboardErrors.push(statusError.message)

  const statusCounts = (statusData ?? []).reduce((acc: Record<string, number>, t: { status: string }) => {
    acc[t.status] = (acc[t.status] || 0) + 1
    return acc
  }, {})

  const statusChartData = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count: count as number,
  }))

  // Distribución por prioridad
  const { data: priorityData, error: priorityError } = await applyFilter(
    supabase
      .from('tickets_maintenance')
      .select('priority')
      .is('deleted_at', null)
  )
  if (priorityError) dashboardErrors.push(priorityError.message)

  const priorityCounts = (priorityData ?? []).reduce((acc: Record<number, number>, t: { priority: number }) => {
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
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - (6 - i))
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  })

  const { data: trendData, error: trendError } = await applyFilter(
    supabase
      .from('tickets_maintenance')
      .select('created_at')
      .gte('created_at', last7Days[0])
  )
  if (trendError) dashboardErrors.push(trendError.message)

  const trendCountMap = new Map<string, number>()

  ;(trendData ?? []).forEach((t: { created_at: string }) => {
    const createdUtc = new Date(t.created_at)
    const local = new Date(
      createdUtc.toLocaleString('en-US', { timeZone: 'America/Mexico_City' })
    )
    const year = local.getFullYear()
    const month = String(local.getMonth() + 1).padStart(2, '0')
    const day = String(local.getDate()).padStart(2, '0')
    const key = `${year}-${month}-${day}`
    trendCountMap.set(key, (trendCountMap.get(key) || 0) + 1)
  })

  const trendCounts = last7Days.map((date) => ({
    date,
    count: trendCountMap.get(date) || 0,
  }))

  // Tickets recientes
  const { data: rawRecentTickets, error: recentError } = await applyFilter(
    supabase
      .from('tickets_maintenance')
      .select('id,ticket_number,title,status,priority,created_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(5)
  )
  if (recentError) dashboardErrors.push(recentError.message)

  const recentTickets = (rawRecentTickets ?? []).sort((
    a: { status: string; created_at: string | null },
    b: { status: string; created_at: string | null }
  ) => {
    const aClosed = a.status === 'CLOSED'
    const bClosed = b.status === 'CLOSED'

    if (aClosed !== bClosed) {
      return aClosed ? 1 : -1
    }

    const aCreated = a.created_at ? new Date(a.created_at as string).getTime() : 0
    const bCreated = b.created_at ? new Date(b.created_at as string).getTime() : 0
    return bCreated - aCreated
  })

  // Métricas de aging
  const { data: agingData, error: agingError } = await applyFilter(
    supabase
      .from('tickets_maintenance')
      .select('status,created_at,updated_at,ticket_number')
      .is('deleted_at', null)
      .in('status', [...OPEN_STATUSES])
  )
  if (agingError) dashboardErrors.push(agingError.message)

  const now = new Date()
  const agingByStatus = (agingData ?? []).reduce((acc: Record<string, { days: number; ticketNumber: number }[]>, t: { status: string; created_at: string; ticket_number: number }) => {
    const createdDate = new Date(t.created_at)
    const daysSince = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
    if (!acc[t.status]) acc[t.status] = []
    acc[t.status].push({ days: daysSince, ticketNumber: t.ticket_number })
    return acc
  }, {})

  const agingMetrics = (Object.entries(agingByStatus) as [string, { days: number; ticketNumber: number }[]][])
    .map(([status, items]) => {
      const days = items.map((i) => i.days)
      const oldest = items.reduce((max, item) => item.days > max.days ? item : max, items[0])
      return {
        status,
        avgDays: days.reduce((a, b) => a + b, 0) / days.length,
        oldestDays: Math.max(...days),
        count: items.length,
        oldestTicketNumber: oldest.ticketNumber
      }
    })
    .sort((a, b) => b.avgDays - a.avgDays)

  // Activos asignados (usando tabla assets_maintenance)
  let assignedAssets: any[] = []

  if (user) {
    const { data: assetsData, error: assetsError } = await supabase
      .from('assets_maintenance')
      .select(`
        id,
        asset_code,
        name,
        status,
        location_id
      `)
      .eq('assigned_to_user_id', user.id)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(5)

    if (assetsError) {
      dashboardErrors.push(assetsError.message)
    } else {
      assignedAssets = assetsData ?? []
    }
  }

  return (
    <main className="min-h-screen space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-900 via-orange-800 to-red-900 shadow-2xl border border-orange-700/50">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, rgb(251 146 60) 1px, transparent 0)`,
              backgroundSize: '32px 32px'
            }}></div>
          </div>
          
          <div className="absolute top-0 right-0 w-72 h-72 bg-orange-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-red-500/10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 px-6 py-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 bg-orange-500 rounded-xl blur-md opacity-50"></div>
                  <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 border border-orange-400/30 flex items-center justify-center shadow-xl">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m6 2a8 8 0 11-16 0 8 8 0 0116 0zm-6 6v4m-2-2h4" />
                    </svg>
                  </div>
                </div>
                
                <div className="min-w-0">
                  <h1 className="text-xl font-extrabold text-white tracking-tight">Panel de Mantenimiento</h1>
                  <p className="text-orange-200 text-xs mt-0.5">
                    Gestión centralizada de solicitudes de mantenimiento
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Link
                  href="/mantenimiento/tickets/new"
                  className="group relative flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg hover:shadow-xl hover:shadow-orange-500/25 hover:scale-[1.02]"
                  aria-label="Crear ticket de Mantenimiento"
                >
                  <svg className="w-4 h-4 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Nuevo Ticket</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

      {dashboardErrors.length ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 flex items-center gap-3 shadow-sm">
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>Error cargando métricas: {dashboardErrors[0]}</span>
        </div>
      ) : null}

      {/* KPIs */}
      <div className="pt-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-orange-50 rounded-xl">
            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Métricas Operativas</h2>
            <p className="text-xs text-slate-500">Indicadores clave de rendimiento en tiempo real</p>
          </div>
        </div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <InteractiveKPI
            label="Tickets Activos"
            value={abiertos}
            total={total}
            icon="open"
            color="blue"
            description="Incidentes y solicitudes en proceso"
          />
          <InteractiveKPI
            label="Cerrados"
            value={cerrados}
            total={total}
            icon="closed"
            color="green"
            description="Tickets resueltos satisfactoriamente"
          />
          <InteractiveKPI
            label="Escalado L2"
            value={escalados}
            total={total}
            icon="escalated"
            color="orange"
            description="Casos escalados a especialistas"
          />
          <InteractiveKPI
            label="Asignados"
            value={asignados}
            total={total}
            icon="assigned"
            color="purple"
            description="Tickets con técnico asignado"
          />
        </div>
      </div>

      <div className="pt-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-50 rounded-xl">
              <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Análisis Detallado</h2>
              <p className="text-xs text-slate-500">Tendencias, aging y activos asignados</p>
            </div>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <TrendChart data={trendCounts} />
          <AgingMetrics metrics={agingMetrics} />
          <AssignedAssets assets={assignedAssets} />
        </div>
        <div className="mt-4">
          <RecentTickets tickets={recentTickets ?? []} ticketsIndexHref={ticketsIndexHref} />
        </div>
      </div>

      {/* Gráficos */}
      <div className="pt-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-xl">
              <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Distribución y Patrones</h2>
              <p className="text-xs text-slate-500">Estados y prioridades de tickets activos</p>
            </div>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <StatusChart data={statusChartData} />
          <PriorityChart data={priorityChartData} />
        </div>
      </div>
    </main>
  )
}
