import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getReportsLocationFilter } from '@/lib/supabase/reports-filter'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ReportsPage() {
  const supabase = await createSupabaseServerClient()

  // Verificar autenticación y rol del usuario
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdminOrSupervisor = profile?.role === 'admin' || profile?.role === 'supervisor'

  // Obtener filtro de ubicaciones para reportes
  const locationFilter = await getReportsLocationFilter()

  // Construir queries base con filtro de ubicaciones
  let ticketsQuery = supabase.from('tickets').select('id', { count: 'exact', head: true })
  let activeTicketsQuery = supabase.from('tickets').select('id', { count: 'exact', head: true }).is('deleted_at', null)
  let deletedTicketsQuery = supabase.from('tickets').select('id', { count: 'exact', head: true }).not('deleted_at', 'is', null)
  let assetsQuery = supabase.from('assets').select('id', { count: 'exact', head: true }).is('deleted_at', null)
  
  // Aplicar filtro de ubicación para supervisores sin permiso especial
  if (locationFilter.shouldFilter && locationFilter.locationIds.length > 0) {
    ticketsQuery = ticketsQuery.in('location_id', locationFilter.locationIds)
    activeTicketsQuery = activeTicketsQuery.in('location_id', locationFilter.locationIds)
    deletedTicketsQuery = deletedTicketsQuery.in('location_id', locationFilter.locationIds)
    assetsQuery = assetsQuery.in('location_id', locationFilter.locationIds)
  } else if (locationFilter.shouldFilter && locationFilter.locationIds.length === 0) {
    // Supervisor sin sedes: no mostrar nada
    ticketsQuery = ticketsQuery.eq('id', '00000000-0000-0000-0000-000000000000')
    activeTicketsQuery = activeTicketsQuery.eq('id', '00000000-0000-0000-0000-000000000000')
    deletedTicketsQuery = deletedTicketsQuery.eq('id', '00000000-0000-0000-0000-000000000000')
    assetsQuery = assetsQuery.eq('id', '00000000-0000-0000-0000-000000000000')
  }

  // Métricas para reportes (con filtro aplicado)
  const [
    { count: totalTickets },
    { count: activeTickets },
    { count: deletedTickets },
    { count: auditEvents },
    { count: totalAssets },
    { count: assetChanges },
  ] = await Promise.all([
    ticketsQuery,
    activeTicketsQuery,
    deletedTicketsQuery,
    supabase.from('audit_log').select('id', { count: 'exact', head: true }),
    assetsQuery,
    supabase.from('asset_changes').select('id', { count: 'exact', head: true }),
  ])

  const reports = [
    {
      title: 'Todos los Tickets',
      description: 'Reporte completo de tickets activos con detalles, filtros y estadísticas',
      icon: '📊',
      link: '/reports/all-tickets',
      count: activeTickets ?? 0,
      color: 'bg-blue-50 border-blue-200 text-blue-700',
      hoverColor: 'hover:bg-blue-100',
      enabled: true,
      requiresRole: 'all', // Visible para todos
    },
    {
      title: 'Tickets Eliminados',
      description: 'Auditoría completa de tickets eliminados con motivo, responsable y fecha',
      icon: '🗑️',
      link: '/reports/deleted-tickets',
      count: deletedTickets ?? 0,
      color: 'bg-red-50 border-red-200 text-red-700',
      hoverColor: 'hover:bg-red-100',
      enabled: true,
      requiresRole: 'supervisor', // Solo supervisores y admins
    },
    {
      title: 'Historial de Auditoría',
      description: 'Registro completo de todas las acciones en el sistema con enlaces directos',
      icon: '📋',
      link: '/audit',
      count: auditEvents ?? 0,
      color: 'bg-indigo-50 border-indigo-200 text-indigo-700',
      hoverColor: 'hover:bg-indigo-100',
      enabled: true,
      badge: 'Actualizado',
      requiresRole: 'admin', // Solo admins
    },
    {
      title: 'Inventario de Activos',
      description: 'Catálogo completo de activos con filtros por sede, tipo y estado. Exportable a Excel',
      icon: '💻',
      link: '/reports/asset-inventory',
      count: totalAssets ?? 0,
      color: 'bg-cyan-50 border-cyan-200 text-cyan-700',
      hoverColor: 'hover:bg-cyan-100',
      enabled: true,
      badge: 'Actualizado',
      requiresRole: 'supervisor', // Solo supervisores y admins
    },
    {
      title: 'Historial de Activos',
      description: 'Trazabilidad completa de cambios en activos: ubicación, responsable, specs técnicas',
      icon: '📝',
      link: '/reports/asset-changes',
      count: assetChanges ?? 0,
      color: 'bg-teal-50 border-teal-200 text-teal-700',
      hoverColor: 'hover:bg-teal-100',
      enabled: true,
      badge: 'Nuevo',
      requiresRole: 'admin', // Solo admins
    },
    {
      title: 'Cambios de Ubicación',
      description: 'Auditoría de traslados de activos entre sedes con justificación y responsable',
      icon: '🚚',
      link: '/reports/asset-locations',
      count: 0,
      color: 'bg-amber-50 border-amber-200 text-amber-700',
      hoverColor: 'hover:bg-amber-100',
      enabled: true,
      badge: 'Nuevo',
      requiresRole: 'admin', // Solo admins
    },
    {
      title: 'Activos por Especificaciones',
      description: 'Reporte técnico de PCs y Laptops: procesador, RAM, almacenamiento, SO',
      icon: '🔧',
      link: '/reports/asset-specs',
      count: 0,
      color: 'bg-violet-50 border-violet-200 text-violet-700',
      hoverColor: 'hover:bg-violet-100',
      enabled: true,
      badge: 'Nuevo',
      requiresRole: 'supervisor', // Solo supervisores y admins
    },
    {
      title: 'Actividad por Usuario',
      description: 'Análisis de tickets creados, modificados y cerrados por usuario',
      icon: '👥',
      link: '/reports/user-activity',
      count: 0,
      color: 'bg-purple-50 border-purple-200 text-purple-700',
      hoverColor: 'hover:bg-purple-100',
      badge: 'Nuevo',
      enabled: true,
      requiresRole: 'admin', // Solo admins
    },
    {
      title: 'Tiempos de Resolución',
      description: 'SLA y métricas de tiempo promedio por prioridad y categoría',
      icon: '⏱️',
      link: '/reports/resolution-times',
      count: 0,
      color: 'bg-green-50 border-green-200 text-green-700',
      hoverColor: 'hover:bg-green-100',
      badge: 'Próximamente',
      enabled: false,
      requiresRole: 'admin', // Solo admins
    },
    {
      title: 'Cambios de Estado',
      description: 'Historial completo de transiciones de estado en tickets',
      icon: '🔄',
      link: '/reports/state-changes',
      count: 0,
      color: 'bg-orange-50 border-orange-200 text-orange-700',
      hoverColor: 'hover:bg-orange-100',
      badge: 'Próximamente',
      enabled: false,
      requiresRole: 'admin', // Solo admins
    },
    {
      title: 'Escalamientos N1→N2',
      description: 'Análisis de tickets escalados a nivel 2 con motivos y tiempos',
      icon: '📈',
      link: '/reports/escalations',
      count: 0,
      color: 'bg-indigo-50 border-indigo-200 text-indigo-700',
      hoverColor: 'hover:bg-indigo-100',
      badge: 'Próximamente',
      enabled: false,
      requiresRole: 'admin', // Solo admins
    },
  ]

  // Filtrar reportes según el rol del usuario
  const visibleReports = reports.filter(report => {
    const userRole = profile?.role
    
    // Reportes para todos
    if (report.requiresRole === 'all') {
      return true
    }
    
    // Reportes solo para admin
    if (report.requiresRole === 'admin') {
      return userRole === 'admin'
    }
    
    // Reportes para supervisor y admin
    if (report.requiresRole === 'supervisor') {
      return userRole === 'admin' || userRole === 'supervisor'
    }
    
    return false
  })

  return (
    <main className="p-6 space-y-6">
      {/* Header compacto */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 shadow-md">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-24 -mt-24"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-400/20 rounded-full blur-3xl -ml-24 -mb-24"></div>

        <div className="relative z-10 px-5 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-md">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Reportes</h1>
                <p className="text-blue-100 text-[11px]">Trazabilidad, auditoría y exportación operativa</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-white/10 backdrop-blur-sm rounded-md border border-white/20">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-[11px] text-white font-medium">Tiempo real</span>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas compactas */}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card bg-gradient-to-br from-white to-gray-50">
          <div className="p-3">
            <div className="text-[11px] font-medium text-gray-600">Total de Tickets</div>
            <div className="text-xl font-bold text-gray-900 mt-0.5">{totalTickets ?? 0}</div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-white to-blue-50">
          <div className="p-3">
            <div className="text-[11px] font-medium text-gray-600">Tickets Activos</div>
            <div className="text-xl font-bold text-blue-600 mt-0.5">{activeTickets ?? 0}</div>
          </div>
        </div>
        {isAdminOrSupervisor && (
          <>
            <div className="card bg-gradient-to-br from-white to-cyan-50">
              <div className="p-3">
                <div className="text-[11px] font-medium text-gray-600">Activos en Inventario</div>
                <div className="text-xl font-bold text-cyan-600 mt-0.5">{totalAssets ?? 0}</div>
              </div>
            </div>
            <div className="card bg-gradient-to-br from-white to-indigo-50">
              <div className="p-3">
                <div className="text-[11px] font-medium text-gray-600">Eventos de Auditoría</div>
                <div className="text-xl font-bold text-indigo-600 mt-0.5">{auditEvents ?? 0}</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Grid de reportes compacto */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {visibleReports.map((report) => (
          report.enabled ? (
            <Link
              key={report.link}
              href={report.link}
              className={`card border ${report.color} ${report.hoverColor} transition-all duration-200 hover:shadow-md relative overflow-hidden`}
            >
              {report.badge && (
                <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                  report.badge === 'Nuevo' 
                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/50' 
                    : report.badge === 'Actualizado'
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50'
                    : 'bg-white/80 backdrop-blur-sm text-gray-700'
                }`}>
                  {report.badge === 'Nuevo' && '✨ '}{report.badge}
                </div>
              )}
              <div className="p-3">
                <div className="flex items-start justify-between mb-1.5">
                  <div className="text-xl">{report.icon}</div>
                  {report.count > 0 && <div className="text-lg font-bold">{report.count}</div>}
                </div>
                <h3 className="text-sm font-bold mb-0.5">{report.title}</h3>
                <p className="text-[11px] opacity-80 leading-relaxed">{report.description}</p>
                <div className="mt-2 flex items-center text-[11px] font-semibold">
                  Ver reporte
                  <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ) : (
            <div
              key={report.link}
              aria-disabled="true"
              className={`card border ${report.color} opacity-70 relative overflow-hidden`}
            >
              {report.badge && (
                <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-white/80 backdrop-blur-sm rounded-full text-[10px] font-semibold text-gray-700">
                  {report.badge}
                </div>
              )}
              <div className="p-3">
                <div className="flex items-start justify-between mb-1.5">
                  <div className="text-xl">{report.icon}</div>
                </div>
                <h3 className="text-sm font-bold mb-0.5">{report.title}</h3>
                <p className="text-[11px] opacity-80 leading-relaxed">{report.description}</p>
                <div className="mt-2 text-[11px] font-semibold text-gray-700">Próximamente</div>
              </div>
            </div>
          )
        ))}
      </div>
    </main>
  )
}
