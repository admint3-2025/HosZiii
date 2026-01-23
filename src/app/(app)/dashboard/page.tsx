import { createSupabaseServerClient, getSafeServerUser } from '@/lib/supabase/server'
import { getLocationFilter } from '@/lib/supabase/locations'
import { unstable_noStore as noStore } from 'next/cache'
import Link from 'next/link'
import { redirect } from 'next/navigation'
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
  const ALL_STATUSES = [...OPEN_STATUSES, 'CLOSED'] as const
  const PRIORITIES = [1, 2, 3, 4, 5] as const

  const dashboardErrors: string[] = []

  const user = await getSafeServerUser()
  const { data: profile } = user ? await supabase
    .from('profiles')
    .select('role,department,asset_category')
    .eq('id', user.id)
    .single() : { data: null }

  const normalizedRole = String(profile?.role ?? '').trim().toLowerCase()
  const isAdminOrSupervisor = normalizedRole === 'admin' || normalizedRole === 'supervisor'
  const isAgent = normalizedRole === 'agent_l1' || normalizedRole === 'agent_l2'
  
  // Si es usuario estándar (no admin/supervisor/agente), redirigir a sus tickets
  if (!isAdminOrSupervisor && !isAgent) {
    redirect('/tickets?view=mine')
  }
  
  // Inferir área de servicio: primero por asset_category (explícito), luego por departamento
  const inferredServiceArea = (() => {
    // Si tiene asset_category explícito, usarlo
    if (profile?.asset_category === 'IT') return 'it'
    if (profile?.asset_category === 'MAINTENANCE') return 'maintenance'
    
    // Fallback: inferir por departamento
    const dept = (profile?.department ?? '').toLowerCase()
    if (dept.includes('mantenim') || dept.includes('hvac') || dept.includes('infraestructura')) return 'maintenance'
    return 'it'
  })()

  const ticketsIndexHref = isAdminOrSupervisor ? '/tickets?view=queue' : '/tickets?view=mine'

  // Admin siempre ve TODO sin filtros de ubicación
  const isAdmin = normalizedRole === 'admin'
  
  // Obtener filtro de ubicación (null si es admin, array de location_ids si no lo es)
  const locationFilter = isAdmin ? null : await getLocationFilter()

  // Helper para aplicar filtro de ubicación
  const applyFilter = (query: any) => {
    // Admin SIEMPRE ve todo, sin excepciones
    if (isAdmin || locationFilter === null) {
      return query
    }
    if (Array.isArray(locationFilter) && locationFilter.length > 0) {
      // Múltiples sedes
      return query.in('location_id', locationFilter)
    }
    // Sin sedes: query imposible
    return query.eq('location_id', 'none')
  }

  // En dashboard, para supervisor/agentes mostramos vista operativa.
  // Admins ven TODO (IT + Maintenance), supervisores y agentes solo su área
  const applyOperationalScope = (query: any) => {
    // Admin ve ABSOLUTAMENTE TODO sin ningún filtro
    if (isAdmin) {
      return query
    }
    
    let q = query
    // Supervisores y agentes solo ven tickets de su área de servicio
    if (normalizedRole === 'supervisor' || isAgent) {
      // Si inferredServiceArea es válido, filtrar por él
      // Si es null o undefined, mostrar todos (fallback para datos legacy)
      if (inferredServiceArea === 'it' || inferredServiceArea === 'maintenance') {
        q = q.or(`service_area.eq.${inferredServiceArea},service_area.is.null`)
      }
    }
    return q
  }

  const baseTickets = () => applyOperationalScope(applyFilter(
    supabase
      .from('tickets')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
  ))

  // DEBUG: Admin count query sin filtros
  if (isAdmin) {
    const { count: adminTotalCount, error: adminCountError } = await supabase
      .from('tickets')
      .select('id', { count: 'exact', head: true })
    
    console.log('[ADMIN DEBUG] Total tickets sin filtros:', adminTotalCount, 'Error:', adminCountError)
  }

  // KPIs principales
  const [openRes, closedRes, escalatedRes, assignedRes, totalRes] = await Promise.all([
    baseTickets().in('status', [...OPEN_STATUSES]),
    baseTickets().eq('status', 'CLOSED'),
    baseTickets().eq('support_level', 2),
    baseTickets().not('assigned_agent_id', 'is', null),
    baseTickets(),
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
  // IMPORTANTE: no hacemos select('status') sin paginación (PostgREST puede limitar filas y distorsionar gráficas).
  const statusCountResults = await Promise.all(
    ALL_STATUSES.map((status) => baseTickets().eq('status', status))
  )
  statusCountResults.forEach((r) => {
    if (r.error) dashboardErrors.push(r.error.message)
  })
  const statusChartData = ALL_STATUSES.map((status, idx) => ({
    status,
    count: statusCountResults[idx]?.count ?? 0,
  })).filter((r) => r.count > 0)

  // Distribución por prioridad
  const priorityCountResults = await Promise.all(
    PRIORITIES.map((priority) => baseTickets().eq('priority', priority))
  )
  priorityCountResults.forEach((r) => {
    if (r.error) dashboardErrors.push(r.error.message)
  })
  const priorityChartData = PRIORITIES.map((priority, idx) => ({
    priority,
    count: priorityCountResults[idx]?.count ?? 0,
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

  // Tendencia últimos 7 días
  // Usamos conteos por rango de fechas para evitar límites de filas.
  const trendCountResults = await Promise.all(
    last7Days.map((date, idx) => {
      const start = new Date(`${date}T00:00:00.000Z`).toISOString()
      const end = new Date(`${idx < last7Days.length - 1 ? last7Days[idx + 1] : date}T00:00:00.000Z`).toISOString()
      const q = baseTickets().gte('created_at', start)
      return idx < last7Days.length - 1 ? q.lt('created_at', end) : q
    })
  )
  trendCountResults.forEach((r) => {
    if (r.error) dashboardErrors.push(r.error.message)
  })
  const trendCounts = last7Days.map((date, idx) => ({
    date,
    count: trendCountResults[idx]?.count ?? 0,
  }))

  // Tickets recientes
  const { data: rawRecentTickets, error: recentError } = await applyOperationalScope(applyFilter(
    supabase
      .from('tickets')
      .select('id,ticket_number,title,status,priority,created_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(5)
  ))
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
  const { data: agingData, error: agingError } = await applyOperationalScope(applyFilter(
    supabase
      .from('tickets')
      .select('status,created_at,updated_at,ticket_number')
      .is('deleted_at', null)
      .in('status', [...OPEN_STATUSES])
  ))
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

  // Estadísticas por sede (solo admin/supervisor)
  // IMPORTANTE: evitamos depender de views o selects completos sin paginación.
  // Construimos la tabla por sede con conteos exactos por ubicación.
  let locationStats: any[] = []
  if (user && isAdminOrSupervisor) {
    const { data: activeLocations, error: locationsError } = await supabase
      .from('locations')
      .select('id, code, name')
      .eq('is_active', true)
      .order('code')

    if (locationsError) {
      dashboardErrors.push(locationsError.message)
    } else {
      let allowedLocations = activeLocations ?? []

      // Supervisores: solo sedes asignadas (por filter de ubicación)
      if (!isAdmin) {
        const locationIds = await getLocationFilter()
        if (Array.isArray(locationIds)) {
          allowedLocations = allowedLocations.filter((l) => locationIds.includes(l.id))
        }
      }

      const openStatuses = [...OPEN_STATUSES] as unknown as string[]

      const rows = await Promise.all(
        allowedLocations.map(async (loc) => {
          const base = () => {
            let q = supabase
              .from('tickets')
              .select('id', { count: 'exact', head: true })
              .is('deleted_at', null)
              .eq('location_id', loc.id)
            q = applyOperationalScope(q)
            return q
          }

          const [totalR, openR, closedR] = await Promise.all([
            base(),
            base().in('status', openStatuses),
            base().eq('status', 'CLOSED'),
          ])

          ;[totalR, openR, closedR].forEach((r) => {
            if (r.error) dashboardErrors.push(r.error.message)
          })

          return {
            location_id: loc.id,
            location_code: loc.code,
            location_name: loc.name,
            total_tickets: totalR.count ?? 0,
            open_tickets: openR.count ?? 0,
            closed_tickets: closedR.count ?? 0,
            avg_resolution_days: 0,
          }
        })
      )

      locationStats = rows.sort((a, b) => b.total_tickets - a.total_tickets)
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
    <main className="min-h-screen space-y-6">
        {/* Header del Dashboard - Nuevo diseño moderno */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 shadow-2xl border border-slate-700/50">
          {/* Patrón de fondo */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, rgb(147 197 253) 1px, transparent 0)`,
              backgroundSize: '32px 32px'
            }}></div>
          </div>
          
          {/* Elementos decorativos */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 px-6 py-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Icono principal */}
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 bg-indigo-500 rounded-xl blur-md opacity-50"></div>
                  <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 border border-indigo-400/30 flex items-center justify-center shadow-xl">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                  </div>
                </div>
                
                <div className="min-w-0">
                  <h1 className="text-xl font-extrabold text-white tracking-tight">Panel de Service Desk</h1>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Gestión centralizada de solicitudes de TI
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Link
                  href="/tickets/new?area=it"
                  className="group relative flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg hover:shadow-xl hover:shadow-indigo-500/25 hover:scale-[1.02]"
                  aria-label="Crear ticket"
                >
                  <svg className="w-4 h-4 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Crear Ticket</span>
                </Link>
                
                {/* Indicador de estado */}
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

      {/* KPIs principales - Estilo moderno */}
      <div className="pt-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-50 rounded-xl">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-xl">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">Estadísticas Multi-Sede</h2>
                <p className="text-xs text-slate-500">Análisis comparativo por ubicaciones</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <span className="text-xs font-bold text-emerald-700">Todas las ubicaciones</span>
            </div>
          </div>
          <LocationStatsTable rows={locationStats} />
        </div>
      )}

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
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-violet-50 border border-violet-200 rounded-xl">
            <svg className="w-3.5 h-3.5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs font-bold text-violet-700">Últimos 7 días</span>
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

      {/* Gráficos y distribución */}
      <div className="pt-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-xl">
              <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Distribución y Patrones</h2>
              <p className="text-xs text-slate-500">Estados y prioridades de tickets activos</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-xl">
            <span className="text-xs font-bold text-indigo-700">Vista consolidada</span>
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
