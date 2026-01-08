import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getLocationFilter } from '@/lib/supabase/locations'
import { unstable_noStore as noStore } from 'next/cache'
import StatusChart from './ui/StatusChart'
import PriorityChart from './ui/PriorityChart'
import TrendChart from './ui/TrendChart'
import RecentTickets from './ui/RecentTickets'
import AgingMetrics from './ui/AgingMetrics'
import InteractiveKPI from './ui/InteractiveKPI'
import AssignedAssets from './ui/AssignedAssets'
import LocationStatsTable from './ui/LocationStatsTable'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  noStore()
  const supabase = await createSupabaseServerClient()

  const OPEN_STATUSES = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'NEEDS_INFO', 'WAITING_THIRD_PARTY', 'RESOLVED'] as const

  const dashboardErrors: string[] = []

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

  // KPIs principales
  const [openRes, closedRes, escalatedRes, assignedRes, totalRes] = await Promise.all([
    applyFilter(supabase.from('tickets').select('id', { count: 'exact', head: true }).is('deleted_at', null).in('status', [...OPEN_STATUSES])),
    applyFilter(supabase.from('tickets').select('id', { count: 'exact', head: true }).is('deleted_at', null).in('status', ['CLOSED'])),
    applyFilter(supabase.from('tickets').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('support_level', 2)),
    applyFilter(supabase.from('tickets').select('id', { count: 'exact', head: true }).is('deleted_at', null).not('assigned_agent_id', 'is', null)),
    applyFilter(supabase.from('tickets').select('id', { count: 'exact', head: true }).is('deleted_at', null)),
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
      .from('tickets')
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
      .from('tickets')
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

  // Tendencia últimos 7 días (incluyendo hoy)
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
      .from('tickets')
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
      .from('tickets')
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
      // Tickets abiertos primero, cerrados al final
      return aClosed ? 1 : -1
    }

    const aCreated = a.created_at ? new Date(a.created_at as string).getTime() : 0
    const bCreated = b.created_at ? new Date(b.created_at as string).getTime() : 0
    return bCreated - aCreated
  })

  // Métricas de aging por estado
  const { data: agingData, error: agingError } = await applyFilter(
    supabase
      .from('tickets')
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

  // Estadísticas por sede (solo para admin/supervisor; RLS protege el resto)
  const { data: { user } } = await supabase.auth.getUser()
  let locationStats: any[] = []
  let isAdminOrSupervisor = false

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, location_id')
      .eq('id', user.id)
      .single()

    isAdminOrSupervisor = profile?.role === 'admin' || profile?.role === 'supervisor'

    if (isAdminOrSupervisor) {
      // Si es admin, ve todas las sedes. Si es supervisor, solo sus sedes asignadas
      let statsQuery = supabase
        .from('location_incident_stats')
        .select('*')
      
      let shouldExecuteQuery = true
      
      if (profile?.role === 'supervisor') {
        // Obtener las sedes asignadas al supervisor
        const { data: userLocs, error: userLocsError } = await supabase
          .from('user_locations')
          .select('location_id')
          .eq('user_id', user.id)
        
        const locationIds = userLocs?.map(ul => ul.location_id).filter(Boolean) || []
        
        // Incluir también la location_id del perfil si existe
        if (profile.location_id && !locationIds.includes(profile.location_id)) {
          locationIds.push(profile.location_id)
        }
        
        // Filtrar por las sedes del supervisor
        if (locationIds.length > 0) {
          statsQuery = statsQuery.in('location_id', locationIds)
        } else {
          // Si no tiene sedes asignadas, no mostrar nada
          shouldExecuteQuery = false
          locationStats = []
        }
      }

      if (shouldExecuteQuery) {
        const { data: statsData, error: statsError } = await statsQuery

        if (statsError) {
          dashboardErrors.push(statsError.message)
        } else {
          locationStats = statsData ?? []
        }
      }
    }
  }

  // Activos asignados al usuario actual
  let assignedAssets: any[] = []

  if (user) {
    const { data: assetsData, error: assetsError } = await supabase
      .from('assets')
      .select(`
        id,
        asset_tag,
        asset_type,
        status,
        asset_location:locations!location_id(code,name)
      `)
      .eq('assigned_to', user.id)
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
    <main className="min-h-screen space-y-4 sm:space-y-6">
      <div className="max-w-7xl mx-auto">
        {/* Header del Dashboard - Service Desk */}
        <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-blue-900 shadow-2xl border border-slate-700/50">
          {/* Patrón de fondo técnico */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, rgb(147 197 253) 1px, transparent 0)`,
              backgroundSize: '32px 32px'
            }}></div>
          </div>
          
          {/* Elementos decorativos */}
          <div className="absolute top-0 right-0 w-48 sm:w-96 h-48 sm:h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 sm:w-96 h-48 sm:h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 px-4 sm:px-8 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 sm:gap-4">
                {/* Icono principal */}
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 bg-blue-500 rounded-lg sm:rounded-xl blur-md opacity-50"></div>
                  <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 border border-blue-400/30 flex items-center justify-center shadow-xl">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                  </div>
                </div>
                
                <div className="min-w-0">
                  <h1 className="text-base sm:text-xl font-bold text-white tracking-tight truncate">Service Desk Dashboard</h1>
                  <p className="text-slate-400 text-[10px] sm:text-xs mt-0.5">
                    ITIL v4 Compliant
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Botón principal */}
                <a
                  href="/tickets/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all shadow-lg hover:shadow-xl hover:shadow-blue-500/25 hover:scale-[1.02]"
                >
                  <svg className="w-4 h-4 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Crear Ticket</span>
                </a>
                
                {/* Indicador de estado - solo desktop */}
                <div className="hidden lg:flex items-center gap-2 px-3 py-2 bg-slate-800/60 backdrop-blur-sm rounded-xl border border-slate-700/50">
                  <div className="relative">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <div className="absolute inset-0 w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
                  </div>
                  <span className="text-xs text-slate-300 font-medium">Sistema Operativo</span>
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

      {/* KPIs principales - Estilo técnico profesional */}
      <div className="pt-4 sm:pt-6">
        <div className="flex items-center gap-3 mb-4 sm:mb-6 pb-3 border-b-2 border-gray-200">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-gray-900 tracking-tight">Métricas Operativas</h2>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">Indicadores clave de rendimiento en tiempo real</p>
          </div>
        </div>
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <InteractiveKPI
          label="Tickets Activos"
          value={abiertos}
          total={total}
          icon="open"
          color="blue"
          description="Incidentes y solicitudes en proceso: Nuevos, Asignados, En Progreso, Requieren Información, Esperando Terceros y Pendientes de Cierre"
        />
        <InteractiveKPI
          label="Cerrados"
          value={cerrados}
          total={total}
          icon="closed"
          color="green"
          description="Tickets resueltos satisfactoriamente y cerrados por el equipo de soporte técnico"
        />
        <InteractiveKPI
          label="Escalado L2"
          value={escalados}
          total={total}
          icon="escalated"
          color="orange"
          description="Casos escalados a soporte nivel 2 por requerir especialización técnica avanzada"
        />
        <InteractiveKPI
          label="Asignados"
          value={asignados}
          total={total}
          icon="assigned"
          color="purple"
          description="Tickets con agente técnico asignado trabajando activamente en su resolución"
        />
      </div>
      </div>

      {isAdminOrSupervisor && locationStats.length > 0 && (
        <div className="pt-8">
          <div className="flex items-center justify-between mb-6 pb-3 border-b-2 border-gray-200">
            <div>
              <h2 className="text-base font-bold text-gray-900 tracking-tight">Estadísticas Multi-Sede</h2>
              <p className="text-xs text-gray-500 mt-0.5">Análisis comparativo por ubicaciones</p>
            </div>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <span className="text-xs font-medium text-emerald-700">Todas las ubicaciones</span>
            </div>
          </div>
          <LocationStatsTable rows={locationStats} />
        </div>
      )}

      <div className="pt-8">
        <div className="flex items-center justify-between mb-6 pb-3 border-b-2 border-gray-200">
          <div>
            <h2 className="text-base font-bold text-gray-900 tracking-tight">Análisis Detallado</h2>
            <p className="text-xs text-gray-500 mt-0.5">Tendencias, aging y activos asignados</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-lg">
            <svg className="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs font-medium text-purple-700">Últimos 7 días</span>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <TrendChart data={trendCounts} />
          <AgingMetrics metrics={agingMetrics} />
          <AssignedAssets assets={assignedAssets} />
        </div>
        <div className="mt-4">
          <RecentTickets tickets={recentTickets ?? []} />
        </div>
      </div>

      {/* Gráficos y distribución */}
      <div className="pt-8">
        <div className="flex items-center justify-between mb-6 pb-3 border-b-2 border-gray-200">
          <div>
            <h2 className="text-base font-bold text-gray-900 tracking-tight">Distribución y Patrones</h2>
            <p className="text-xs text-gray-500 mt-0.5">Estados y prioridades de tickets activos</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg">
            <svg className="w-3.5 h-3.5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z"/>
            </svg>
            <span className="text-xs font-medium text-indigo-700">Vista consolidada</span>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <StatusChart data={statusChartData} />
          <PriorityChart data={priorityChartData} />
        </div>
      </div>
      </div>
    </main>
  )
}
