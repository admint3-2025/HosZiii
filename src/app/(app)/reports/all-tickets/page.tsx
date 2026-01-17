import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getReportsLocationFilter } from '@/lib/supabase/reports-filter'
import { StatusBadge, PriorityBadge, LevelBadge } from '@/lib/ui/badges'
import { getCategoryPathLabel } from '@/lib/categories/path'
import Link from 'next/link'

export default async function AllTicketsReportPage() {
  const supabase = await createSupabaseServerClient()

  // Obtener filtro de ubicación para reportes (supervisores sin permiso especial ven solo sus sedes)
  const locationFilter = await getReportsLocationFilter()

  // Construir query base
  let query = supabase
    .from('tickets')
    .select(`
      id,
      ticket_number,
      title,
      description,
      status,
      priority,
      support_level,
      category_id,
      requester_id,
      assigned_agent_id,
      created_at,
      updated_at
    `)
    .is('deleted_at', null)

  // Aplicar filtro de ubicación para supervisores sin permiso especial
  if (locationFilter.shouldFilter && locationFilter.locationIds.length > 0) {
    query = query.in('location_id', locationFilter.locationIds)
  } else if (locationFilter.shouldFilter && locationFilter.locationIds.length === 0) {
    // Supervisor sin sedes asignadas: no mostrar nada
    query = query.eq('id', '00000000-0000-0000-0000-000000000000')
  }

  // Obtener todos los tickets activos
  const { data: rawTickets } = await query.order('created_at', { ascending: false })

  // Ordenar: primero tickets abiertos, luego cerrados; dentro de cada grupo, más recientes primero
  const tickets = (rawTickets ?? []).sort((a, b) => {
    const aClosed = a.status === 'CLOSED'
    const bClosed = b.status === 'CLOSED'

    if (aClosed !== bClosed) {
      return aClosed ? 1 : -1
    }

    const aCreated = a.created_at ? new Date(a.created_at as string).getTime() : 0
    const bCreated = b.created_at ? new Date(b.created_at as string).getTime() : 0
    return bCreated - aCreated
  })

  // Obtener categorías para breadcrumbs
  const { data: categories } = await supabase
    .from('categories')
    .select('id,name,parent_id')

  // Obtener usuarios (requesters y agentes)
  const allUserIds = [
    ...new Set([
      ...(tickets ?? []).map(t => t.requester_id),
      ...(tickets ?? []).map(t => t.assigned_agent_id).filter(Boolean),
    ])
  ]

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id,full_name,email')
    .in('id', allUserIds)

  const userMap = new Map((profiles ?? []).map(p => [p.id, p]))

  // Estadísticas
  const byStatus = (tickets ?? []).reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const byPriority = (tickets ?? []).reduce((acc, t) => {
    acc[t.priority] = (acc[t.priority] || 0) + 1
    return acc
  }, {} as Record<number, number>)

  return (
    <main className="p-6 space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 shadow-md">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-24 -mt-24"></div>
        <div className="relative z-10 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/reports"
                className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white">Reporte Completo de Tickets</h1>
                <p className="text-blue-100 text-sm">Vista detallada de todos los tickets activos en el sistema</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas resumen */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <div className="card-body">
            <div className="text-sm font-medium text-blue-700">Total Activos</div>
            <div className="text-3xl font-bold text-blue-900 mt-1">
              {tickets?.length ?? 0}
            </div>
          </div>
        </div>

        {Object.entries(byPriority).map(([priority, count]) => {
          const colors = {
            1: { bg: 'from-red-50 to-red-100', text: 'text-red-900', label: 'text-red-700' },
            2: { bg: 'from-orange-50 to-orange-100', text: 'text-orange-900', label: 'text-orange-700' },
            3: { bg: 'from-blue-50 to-blue-100', text: 'text-blue-900', label: 'text-blue-700' },
            4: { bg: 'from-gray-50 to-gray-100', text: 'text-gray-900', label: 'text-gray-700' },
          }[priority] || { bg: 'from-gray-50 to-gray-100', text: 'text-gray-900', label: 'text-gray-700' }

          return (
            <div key={priority} className={`card bg-gradient-to-br ${colors.bg}`}>
              <div className="card-body">
                <div className={`text-sm font-medium ${colors.label}`}>
                  Prioridad P{priority}
                </div>
                <div className={`text-3xl font-bold ${colors.text} mt-1`}>{count}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Distribución por estado */}
      <div className="card">
        <div className="card-body">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Distribución por estado</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(byStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <StatusBadge status={status} />
                <span className="text-lg font-bold text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla completa de tickets */}
      <div className="card overflow-hidden">
        <div className="card-body pb-0">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Listado completo ({tickets?.length ?? 0} tickets)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Título</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Prioridad</th>
                <th className="px-4 py-3 font-medium">Nivel</th>
                <th className="px-4 py-3 font-medium">Solicitante</th>
                <th className="px-4 py-3 font-medium">Asignado a</th>
                <th className="px-4 py-3 font-medium">Creado</th>
                <th className="px-4 py-3 font-medium">Actualizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(tickets ?? []).map((ticket) => {
                const requester = userMap.get(ticket.requester_id)
                const agent = ticket.assigned_agent_id ? userMap.get(ticket.assigned_agent_id) : null

                return (
                  <tr key={ticket.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/tickets/${ticket.id}`}
                        className="font-semibold text-blue-600 hover:text-blue-700"
                      >
                        #{ticket.ticket_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 max-w-xs truncate">
                        {ticket.title}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs">
                      {getCategoryPathLabel(categories ?? [], ticket.category_id) || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={ticket.status} />
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={ticket.priority} />
                    </td>
                    <td className="px-4 py-3">
                      <LevelBadge level={ticket.support_level} />
                    </td>
                    <td className="px-4 py-3">
                      {requester ? (
                        <div>
                          <div className="font-medium text-gray-900 text-xs">
                            {requester.full_name || 'Sin nombre'}
                          </div>
                          <div className="text-xs text-gray-500">{requester.email}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {agent ? (
                        <div>
                          <div className="font-medium text-gray-900 text-xs">
                            {agent.full_name || 'Sin nombre'}
                          </div>
                          <div className="text-xs text-gray-500">{agent.email}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-xs">Sin asignar</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs whitespace-nowrap">
                      {new Date(ticket.created_at).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs whitespace-nowrap">
                      {new Date(ticket.updated_at).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                )
              })}
              {tickets?.length === 0 && (
                <tr>
                  <td className="px-4 py-12 text-center text-gray-500" colSpan={10}>
                    <div className="text-4xl mb-2">📋</div>
                    <div className="font-medium">No hay tickets en el sistema</div>
                    <div className="text-xs mt-1">Crea tu primer ticket para comenzar</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Botón de exportación (placeholder) */}
      <div className="card bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl">📊</div>
              <div>
                <h3 className="font-semibold text-green-900">Exportar reporte</h3>
                <p className="text-sm text-green-700">
                  Descarga este reporte en formato CSV
                </p>
              </div>
            </div>
            <a className="btn btn-secondary" href="/reports/all-tickets/export-csv">
              Descargar CSV
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
