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
    <main className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header simple */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Reportes</h1>
          <p className="text-sm text-gray-500 mt-1">Consulta y exportación de datos operativos</p>
        </div>
      </div>

      {/* Estadísticas en fila */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Tickets</div>
          <div className="text-2xl font-semibold text-gray-900 mt-1">{totalTickets ?? 0}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tickets Activos</div>
          <div className="text-2xl font-semibold text-gray-900 mt-1">{activeTickets ?? 0}</div>
        </div>
        {isAdminOrSupervisor && (
          <>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Activos</div>
              <div className="text-2xl font-semibold text-gray-900 mt-1">{totalAssets ?? 0}</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Eventos Auditoría</div>
              <div className="text-2xl font-semibold text-gray-900 mt-1">{auditEvents ?? 0}</div>
            </div>
          </>
        )}
      </div>

      {/* Grid de reportes */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visibleReports.map((report) => (
          report.enabled ? (
            <Link
              key={report.link}
              href={report.link}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{report.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{report.title}</h3>
                    {report.count > 0 && (
                      <span className="text-sm font-medium text-gray-500">{report.count}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{report.description}</p>
                </div>
              </div>
            </Link>
          ) : (
            <div
              key={report.link}
              className="bg-gray-50 rounded-lg border border-gray-200 p-4 opacity-60"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl grayscale">{report.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-600">{report.title}</h3>
                    <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded">Próximamente</span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1 line-clamp-2">{report.description}</p>
                </div>
              </div>
            </div>
          )
        ))}
      </div>
    </main>
  )
}
