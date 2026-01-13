import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getReportsLocationFilter } from '@/lib/supabase/reports-filter'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PageHeader, { SectionTitle, StatCard } from '@/components/ui/PageHeader'

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
    { count: disposalRequests },
  ] = await Promise.all([
    ticketsQuery,
    activeTicketsQuery,
    deletedTicketsQuery,
    supabase.from('audit_log').select('id', { count: 'exact', head: true }),
    assetsQuery,
    supabase.from('asset_changes').select('id', { count: 'exact', head: true }),
    supabase.from('asset_disposal_requests').select('id', { count: 'exact', head: true }),
  ])

  const reports = [
    {
      title: 'Todos los Tickets',
      description: 'Reporte completo de tickets activos con detalles, filtros y estadísticas',
      icon: '📊',
      link: '/reports/all-tickets',
      count: activeTickets ?? 0,
      enabled: true,
      requiresRole: 'all',
    },
    {
      title: 'Tickets Eliminados',
      description: 'Auditoría completa de tickets eliminados con motivo, responsable y fecha',
      icon: '🗑️',
      link: '/reports/deleted-tickets',
      count: deletedTickets ?? 0,
      enabled: true,
      requiresRole: 'supervisor',
    },
    {
      title: 'Historial de Auditoría',
      description: 'Registro completo de todas las acciones en el sistema con enlaces directos',
      icon: '📋',
      link: '/audit',
      count: auditEvents ?? 0,
      enabled: true,
      requiresRole: 'admin',
    },
    {
      title: 'Inventario de Activos',
      description: 'Catálogo completo de activos con filtros por sede, tipo y estado. Exportable a Excel',
      icon: '💻',
      link: '/reports/asset-inventory',
      count: totalAssets ?? 0,
      enabled: true,
      requiresRole: 'supervisor',
    },
    {
      title: 'Historial de Activos',
      description: 'Trazabilidad completa de cambios en activos: ubicación, responsable, specs técnicas',
      icon: '📝',
      link: '/reports/asset-changes',
      count: assetChanges ?? 0,
      enabled: true,
      requiresRole: 'admin',
    },
    {
      title: 'Cambios de Ubicación',
      description: 'Auditoría de traslados de activos entre sedes con justificación y responsable',
      icon: '🚚',
      link: '/reports/asset-locations',
      count: 0,
      enabled: true,
      requiresRole: 'admin',
    },
    {
      title: 'Activos por Especificaciones',
      description: 'Reporte técnico de PCs y Laptops: procesador, RAM, almacenamiento, SO',
      icon: '🔧',
      link: '/reports/asset-specs',
      count: 0,
      enabled: true,
      requiresRole: 'supervisor',
    },
    {
      title: 'Bajas de Activos',
      description: 'Historial de solicitudes de baja: pendientes, aprobadas y rechazadas',
      icon: '📦',
      link: '/reports/asset-disposals',
      count: disposalRequests ?? 0,
      enabled: true,
      requiresRole: 'admin',
    },
    {
      title: 'Actividad por Usuario',
      description: 'Análisis de tickets creados, modificados y cerrados por usuario',
      icon: '👥',
      link: '/reports/user-activity',
      count: 0,
      enabled: true,
      requiresRole: 'admin',
    },
    {
      title: 'Tiempos de Resolución',
      description: 'SLA y métricas de tiempo promedio por prioridad y categoría',
      icon: '⏱️',
      link: '/reports/resolution-times',
      count: 0,
      enabled: false,
      requiresRole: 'admin',
    },
    {
      title: 'Cambios de Estado',
      description: 'Historial completo de transiciones de estado en tickets',
      icon: '🔄',
      link: '/reports/state-changes',
      count: 0,
      enabled: false,
      requiresRole: 'admin',
    },
    {
      title: 'Escalamientos N1→N2',
      description: 'Análisis de tickets escalados a nivel 2 con motivos y tiempos',
      icon: '📈',
      link: '/reports/escalations',
      count: 0,
      enabled: false,
      requiresRole: 'admin',
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
    <main className="space-y-6">
      {/* Header moderno */}
      <PageHeader
        title="Reportes"
        description="Consulta y exportación de datos operativos del sistema"
        color="purple"
        icon={
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
      />

      {/* Estadísticas */}
      <div>
        <SectionTitle title="Resumen General" subtitle="Métricas del sistema" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Tickets"
            value={totalTickets ?? 0}
            color="blue"
            icon={
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />
          <StatCard
            label="Tickets Activos"
            value={activeTickets ?? 0}
            color="green"
            icon={
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          {isAdminOrSupervisor && (
            <>
              <StatCard
                label="Activos IT"
                value={totalAssets ?? 0}
                color="purple"
                icon={
                  <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                }
              />
              <StatCard
                label="Eventos Auditoría"
                value={auditEvents ?? 0}
                color="orange"
                icon={
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
              />
            </>
          )}
        </div>
      </div>

      {/* Grid de reportes */}
      <div>
        <SectionTitle title="Reportes Disponibles" subtitle="Selecciona un reporte para ver detalles" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visibleReports.map((report) => (
            report.enabled ? (
              <Link
                key={report.link}
                href={report.link}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-100/50 transition-all duration-300 group"
              >
                <div className="flex items-start gap-4">
                  <div className="text-3xl group-hover:scale-110 transition-transform">{report.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">{report.title}</h3>
                      {report.count > 0 && (
                        <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{report.count}</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-1.5 line-clamp-2">{report.description}</p>
                  </div>
                </div>
              </Link>
            ) : (
              <div
                key={report.link}
                className="bg-slate-50 rounded-2xl border border-slate-200 p-5 opacity-60"
              >
                <div className="flex items-start gap-4">
                  <div className="text-3xl grayscale">{report.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-slate-500">{report.title}</h3>
                      <span className="text-[10px] text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full font-medium">Próximamente</span>
                    </div>
                    <p className="text-sm text-slate-400 mt-1.5 line-clamp-2">{report.description}</p>
                  </div>
                </div>
              </div>
            )
          ))}
        </div>
      </div>
    </main>
  )
}
