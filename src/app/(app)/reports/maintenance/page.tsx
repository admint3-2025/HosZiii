import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getReportsLocationFilter } from '@/lib/supabase/reports-filter'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PageHeader, { SectionTitle, StatCard } from '@/components/ui/PageHeader'

export default async function MaintenanceReportsPage() {
  const supabase = await createSupabaseServerClient()

  // Verificar autenticación y rol del usuario
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role,asset_category')
    .eq('id', user.id)
    .single()

  // Validar acceso a reportes de Mantenimiento (gestión)
  // Solo admin o usuarios cuya área principal sea MAINTENANCE
  const canManageMaintenance = profile?.role === 'admin' || profile?.asset_category === 'MAINTENANCE'
  if (!canManageMaintenance) {
    redirect('/reports')
  }

  // corporate_admin también tiene permisos de supervisor
  const isAdminOrSupervisor = profile?.role === 'admin' || profile?.role === 'supervisor' || profile?.role === 'corporate_admin'

  // Obtener filtro de ubicaciones para reportes
  const locationFilter = await getReportsLocationFilter()

  // Construir queries base con filtro de ubicaciones - usando tablas de mantenimiento
  let ticketsQuery = supabase.from('tickets_maintenance').select('id', { count: 'exact', head: true })
  let activeTicketsQuery = supabase.from('tickets_maintenance').select('id', { count: 'exact', head: true }).is('deleted_at', null)
  let deletedTicketsQuery = supabase.from('tickets_maintenance').select('id', { count: 'exact', head: true }).not('deleted_at', 'is', null)
  let assetsQuery = supabase.from('assets_maintenance').select('id', { count: 'exact', head: true }).is('deleted_at', null)
  
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
    { count: totalAssets },
  ] = await Promise.all([
    ticketsQuery,
    activeTicketsQuery,
    deletedTicketsQuery,
    assetsQuery,
  ])

  const reports = [
    {
      title: 'Todas las Solicitudes',
      description: 'Reporte completo de solicitudes de mantenimiento activas con detalles y filtros',
      icon: '📊',
      link: '/reports/maintenance/all-tickets',
      count: activeTickets ?? 0,
      enabled: true,
      requiresRole: 'all',
    },
    {
      title: 'Solicitudes Eliminadas',
      description: 'Auditoría completa de solicitudes eliminadas con motivo, responsable y fecha',
      icon: '🗑️',
      link: '/reports/maintenance/deleted-tickets',
      count: deletedTickets ?? 0,
      enabled: true,
      requiresRole: 'supervisor',
    },
    {
      title: 'Inventario de Equipos',
      description: 'Catálogo completo de equipos de mantenimiento con filtros por sede, tipo y estado',
      icon: '🔧',
      link: '/reports/maintenance/asset-inventory',
      count: totalAssets ?? 0,
      enabled: true,
      requiresRole: 'supervisor',
    },
    {
      title: 'Mantenimiento Preventivo',
      description: 'Programación y seguimiento de mantenimientos preventivos planificados',
      icon: '📅',
      link: '/reports/maintenance/preventive',
      count: 0,
      enabled: false,
      requiresRole: 'supervisor',
    },
    {
      title: 'Mantenimiento Correctivo',
      description: 'Análisis de fallas y reparaciones realizadas por equipo y tipo',
      icon: '🛠️',
      link: '/reports/maintenance/corrective',
      count: 0,
      enabled: false,
      requiresRole: 'supervisor',
    },
    {
      title: 'Costos de Mantenimiento',
      description: 'Análisis de costos por equipo, sede y tipo de mantenimiento',
      icon: '💰',
      link: '/reports/maintenance/costs',
      count: 0,
      enabled: false,
      requiresRole: 'admin',
    },
    {
      title: 'Tiempo de Respuesta',
      description: 'Métricas de tiempo de atención y resolución de solicitudes',
      icon: '⏱️',
      link: '/reports/maintenance/response-times',
      count: 0,
      enabled: false,
      requiresRole: 'admin',
    },
    {
      title: 'Actividad por Técnico',
      description: 'Análisis de solicitudes atendidas por técnico de mantenimiento',
      icon: '👷',
      link: '/reports/maintenance/technician-activity',
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
    <main className="space-y-6 p-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/reports" className="hover:text-orange-600 transition-colors">
          Centro de Reportes
        </Link>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-slate-800 font-medium">Service Desk Mantenimiento</span>
      </nav>

      {/* Header moderno */}
      <PageHeader
        title="Reportes Service Desk Mantenimiento"
        description="Consulta y exportación de datos operativos del módulo de mantenimiento"
        color="maintenance"
        icon={
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        }
      />

      {/* Estadísticas */}
      <div>
        <SectionTitle title="Resumen General" subtitle="Métricas del módulo Mantenimiento" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Solicitudes"
            value={totalTickets ?? 0}
            color="orange"
            icon={
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />
          <StatCard
            label="Solicitudes Activas"
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
                label="Equipos Mtto"
                value={totalAssets ?? 0}
                color="purple"
                icon={
                  <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  </svg>
                }
              />
              <StatCard
                label="Eliminadas"
                value={deletedTickets ?? 0}
                color="rose"
                icon={
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
                className="bg-white rounded-2xl border border-slate-200/80 p-5 hover:border-orange-300 hover:shadow-lg hover:shadow-orange-100/50 transition-all duration-300 group"
              >
                <div className="flex items-start gap-4">
                  <div className="text-3xl group-hover:scale-110 transition-transform">{report.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-slate-800 group-hover:text-orange-600 transition-colors">{report.title}</h3>
                      {report.count > 0 && (
                        <span className="text-sm font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">{report.count}</span>
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

      {/* Nota informativa */}
      <div className="bg-orange-50 rounded-xl border border-orange-200 p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="font-semibold text-orange-800 mb-1">Módulo en Desarrollo</h4>
            <p className="text-sm text-orange-700">
              Los reportes de mantenimiento están siendo implementados. Por ahora puedes acceder al reporte de todas las solicitudes.
              Próximamente se agregarán reportes de mantenimiento preventivo, correctivo y análisis de costos.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
