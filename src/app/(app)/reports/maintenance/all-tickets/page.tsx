import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getReportsLocationFilter } from '@/lib/supabase/reports-filter'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { StatusBadge } from '@/lib/ui/badges'
import { formatTicketCode } from '@/lib/tickets/code'
import PageHeader, { SectionTitle, StatCard } from '@/components/ui/PageHeader'

export default async function MaintenanceAllTicketsPage() {
  const supabase = await createSupabaseServerClient()

  // Verificar autenticación y rol del usuario
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role,asset_category')
    .eq('id', user.id)
    .single()

  // Validar acceso a módulo Mantenimiento
  // Validar acceso a reportes de Mantenimiento (gestión)
  // Solo admin o usuarios cuya área principal sea MAINTENANCE
  const canManageMaintenance = profile?.role === 'admin' || profile?.asset_category === 'MAINTENANCE'
  if (!canManageMaintenance) {
    redirect('/reports')
  }

  // Obtener filtro de ubicaciones para reportes
  const locationFilter = await getReportsLocationFilter()

  // Construir query base
  let query = supabase
    .from('tickets_maintenance')
    .select(`
      id,
      ticket_number,
      title,
      status,
      priority,
      support_level,
      created_at,
      updated_at,
      location_id,
      requester_id,
      assigned_to,
      locations!inner(code,name),
      requester:profiles!tickets_maintenance_requester_id_fkey(full_name,email)
    `)
    .is('deleted_at', null)

  // Aplicar filtro de ubicación
  if (locationFilter.shouldFilter && locationFilter.locationIds.length > 0) {
    query = query.in('location_id', locationFilter.locationIds)
  } else if (locationFilter.shouldFilter && locationFilter.locationIds.length === 0) {
    query = query.eq('id', '00000000-0000-0000-0000-000000000000')
  }

  const { data: tickets, error } = await query
    .order('created_at', { ascending: false })
    .limit(500)

  // Calcular métricas
  const totalTickets = tickets?.length ?? 0
  const newTickets = tickets?.filter(t => t.status === 'NEW').length ?? 0
  const inProgressTickets = tickets?.filter(t => ['ASSIGNED', 'IN_PROGRESS'].includes(t.status)).length ?? 0
  const closedTickets = tickets?.filter(t => t.status === 'CLOSED').length ?? 0

  const priorityColors: Record<number, string> = {
    1: 'bg-red-500',
    2: 'bg-orange-500',
    3: 'bg-blue-500',
    4: 'bg-gray-400',
  }

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
        <Link href="/reports/maintenance" className="hover:text-orange-600 transition-colors">
          Mantenimiento
        </Link>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-slate-800 font-medium">Todas las Solicitudes</span>
      </nav>

      {/* Header */}
      <PageHeader
        title="Todas las Solicitudes de Mantenimiento"
        description="Reporte completo de solicitudes activas del módulo de mantenimiento"
        color="maintenance"
        icon={
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
      />

      {/* Estadísticas */}
      <div>
        <SectionTitle title="Resumen" subtitle="Estado actual de solicitudes" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Solicitudes"
            value={totalTickets}
            color="orange"
            icon={
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />
          <StatCard
            label="Nuevas"
            value={newTickets}
            color="blue"
            icon={
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            }
          />
          <StatCard
            label="En Progreso"
            value={inProgressTickets}
            color="purple"
            icon={
              <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            label="Cerradas"
            value={closedTickets}
            color="green"
            icon={
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error.message}
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="card overflow-hidden shadow-lg border-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 py-4 text-center font-semibold text-gray-700 uppercase tracking-wider text-xs">P</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-700 uppercase tracking-wider text-xs">#</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-700 uppercase tracking-wider text-xs">Título</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-700 uppercase tracking-wider text-xs">Solicitante</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-700 uppercase tracking-wider text-xs">Estado</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-700 uppercase tracking-wider text-xs">Sede</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-700 uppercase tracking-wider text-xs">Creado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tickets?.map((t) => (
                <tr key={t.id} className="hover:bg-orange-50/50 transition-colors duration-150">
                  <td className="px-4 py-4">
                    <div className="flex justify-center">
                      <div 
                        className={`w-6 h-6 ${priorityColors[t.priority] || priorityColors[3]} rounded-lg shadow`}
                        title={`Prioridad: P${t.priority}`}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-800">
                    {formatTicketCode({ ticket_number: t.ticket_number, created_at: t.created_at })}
                  </td>
                  <td className="px-6 py-4">
                    <Link 
                      href={`/mantenimiento/tickets/${t.id}`} 
                      className="font-semibold text-gray-900 hover:text-orange-600 transition-colors"
                    >
                      {t.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs">
                      <div className="font-medium text-gray-800">{(t.requester as any)?.full_name || '—'}</div>
                      <div className="text-gray-500">{(t.requester as any)?.email || ''}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="inline-flex flex-col text-xs text-gray-700">
                      <span className="font-semibold">{(t.locations as any)?.code || '—'}</span>
                      {(t.locations as any)?.name && (
                        <span className="text-gray-500 text-[11px]">{(t.locations as any).name}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-600 text-xs">
                      {new Date(t.created_at).toLocaleString('es-MX', { 
                        timeZone: 'America/Mexico_City',
                        day: '2-digit', 
                        month: 'short', 
                        year: 'numeric',
                      })}
                    </div>
                  </td>
                </tr>
              ))}
              {tickets?.length === 0 && (
                <tr>
                  <td className="px-6 py-16 text-center" colSpan={7}>
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-gray-100 rounded-full">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-gray-900 font-medium">No hay solicitudes</p>
                        <p className="text-gray-500 text-sm mt-1">No se encontraron solicitudes de mantenimiento</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Total */}
      <div className="text-sm text-gray-500 text-right">
        Mostrando {tickets?.length ?? 0} solicitudes
      </div>
    </main>
  )
}
