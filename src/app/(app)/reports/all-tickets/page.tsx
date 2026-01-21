import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getReportsLocationFilter } from '@/lib/supabase/reports-filter'
import { StatusBadge, PriorityBadge, LevelBadge } from '@/lib/ui/badges'
import { getCategoryPathLabel } from '@/lib/categories/path'
import { formatTicketCode } from '@/lib/tickets/code'
import Link from 'next/link'

export default async function AllTicketsReportPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string
    status?: string
    priority?: string
    level?: string
    location?: string
    assigned?: string
    from?: string
    to?: string
  }>
}) {
  const supabase = await createSupabaseServerClient()
  const params = await searchParams

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
      updated_at,
      location_id
    `)
    .is('deleted_at', null)

  // Aplicar filtro de ubicación para supervisores sin permiso especial
  if (locationFilter.shouldFilter && locationFilter.locationIds.length > 0) {
    query = query.in('location_id', locationFilter.locationIds)
  } else if (locationFilter.shouldFilter && locationFilter.locationIds.length === 0) {
    // Supervisor sin sedes asignadas: no mostrar nada
    query = query.eq('id', '00000000-0000-0000-0000-000000000000')
  }

  // Filtros a criterio
  if (params.search) {
    const searchTerm = params.search.toLowerCase().trim()
    if (searchTerm.startsWith('#')) {
      const num = parseInt(searchTerm.substring(1))
      if (!isNaN(num)) {
        query = query.eq('ticket_number', num)
      }
    } else {
      query = query.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%`)
    }
  }

  if (params.status) {
    query = query.eq('status', params.status)
  }

  if (params.priority) {
    const p = parseInt(params.priority)
    if (!isNaN(p)) query = query.eq('priority', p)
  }

  if (params.level) {
    const lvl = parseInt(params.level)
    if (!isNaN(lvl)) query = query.eq('support_level', lvl)
  }

  if (params.location) {
    query = query.eq('location_id', params.location)
  }

  if (params.assigned === 'assigned') {
    query = query.not('assigned_agent_id', 'is', null)
  } else if (params.assigned === 'unassigned') {
    query = query.is('assigned_agent_id', null)
  }

  if (params.from) {
    const fromIso = new Date(`${params.from}T00:00:00.000Z`).toISOString()
    query = query.gte('created_at', fromIso)
  }

  if (params.to) {
    const d = new Date(`${params.to}T00:00:00.000Z`)
    d.setUTCDate(d.getUTCDate() + 1)
    query = query.lt('created_at', d.toISOString())
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
    ...new Set(
      [
        ...(tickets ?? []).map((t) => t.requester_id),
        ...(tickets ?? []).map((t) => t.assigned_agent_id),
      ].filter(Boolean),
    ),
  ]

  // Nota: `profiles` suele tener RLS (usuarios normales no pueden leer otros perfiles).
  // Para reportes necesitamos resolver nombres/emails, así que usamos service-role.
  const adminSupabase = createSupabaseAdminClient()

  let profiles: any[] = []
  if (allUserIds.length) {
    const primary = await adminSupabase.from('profiles').select('id,full_name,email').in('id', allUserIds)
    if (!primary.error) {
      profiles = primary.data ?? []
    } else {
      // En algunos despliegues `profiles` no tiene columna `email`.
      const fallback = await adminSupabase.from('profiles').select('id,full_name').in('id', allUserIds)
      profiles = fallback.data ?? []
    }
  }

  // Fallback: si falta perfil, intentar resolver email desde auth.users
  // Nota: `auth.users` normalmente NO está expuesto por PostgREST.
  // Si se requiere email, hay que usar GoTrue admin API; aquí dejamos vacío.
  const authUsers: any[] = []

  const combinedUsers = [
    ...(profiles ?? []),
    ...(authUsers ?? []).map((u: any) => ({ id: u.id, full_name: null, email: u.email })),
  ]

  const userMap = new Map((combinedUsers ?? []).map((p: any) => [p.id, p]))

  // Estadísticas
  const byStatus = (tickets ?? []).reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const totalTickets = tickets?.length ?? 0
  const newTickets = byStatus.NEW || 0
  const inProgressTickets = (byStatus.ASSIGNED || 0) + (byStatus.IN_PROGRESS || 0)
  const closedTickets = byStatus.CLOSED || 0

  const allowedLocations = await (async () => {
    if (locationFilter.shouldFilter) {
      if (!locationFilter.locationIds.length) return [] as any[]
      const { data } = await supabase
        .from('locations')
        .select('id,code,name')
        .eq('is_active', true)
        .in('id', locationFilter.locationIds)
        .order('code')
      return data ?? []
    }

    const { data } = await supabase.from('locations').select('id,code,name').eq('is_active', true).order('code')
    return data ?? []
  })()

  const qs = (() => {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) {
      if (typeof v === 'string' && v.trim().length > 0) sp.set(k, v)
    }
    return sp.toString()
  })()

  const exportCsvHref = `/reports/all-tickets/export-csv${qs ? `?${qs}` : ''}`
  const exportPdfHref = `/reports/all-tickets/export-pdf${qs ? `?${qs}` : ''}`

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
            <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Total</div>
            <div className="text-3xl font-bold text-blue-900 mt-1">{totalTickets}</div>
            <div className="text-xs text-blue-700/80 mt-1">Tickets en el sistema</div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-sky-50 to-blue-50 border-sky-200">
          <div className="card-body">
            <div className="text-xs font-semibold text-sky-700 uppercase tracking-wide">Nuevos</div>
            <div className="text-3xl font-bold text-sky-900 mt-1">{newTickets}</div>
            <div className="text-xs text-sky-700/80 mt-1">Sin iniciar atención</div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200">
          <div className="card-body">
            <div className="text-xs font-semibold text-violet-700 uppercase tracking-wide">En progreso</div>
            <div className="text-3xl font-bold text-violet-900 mt-1">{inProgressTickets}</div>
            <div className="text-xs text-violet-700/80 mt-1">Asignados / trabajando</div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
          <div className="card-body">
            <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Cerrados</div>
            <div className="text-3xl font-bold text-emerald-900 mt-1">{closedTickets}</div>
            <div className="text-xs text-emerald-700/80 mt-1">Resueltos</div>
          </div>
        </div>
      </div>

      {/* Filtros para generar reporte */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Filtros</h3>
              <p className="text-xs text-gray-500">Genera el reporte según tu criterio</p>
            </div>
            <Link href="/reports/all-tickets" className="btn btn-ghost btn-sm">
              Limpiar
            </Link>
          </div>

          <form method="GET" className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6 items-end">
            <div className="lg:col-span-2">
              <label className="text-xs font-medium text-gray-600">Buscar</label>
              <input
                name="search"
                defaultValue={params.search ?? ''}
                placeholder="#123, título o descripción"
                className="input input-bordered w-full"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600">Estado</label>
              <select name="status" defaultValue={params.status ?? ''} className="select select-bordered w-full">
                <option value="">Todos</option>
                <option value="NEW">Nuevo</option>
                <option value="ASSIGNED">Asignado</option>
                <option value="IN_PROGRESS">En progreso</option>
                <option value="NEEDS_INFO">Requiere info</option>
                <option value="WAITING_THIRD_PARTY">Esperando 3ro</option>
                <option value="RESOLVED">Resuelto</option>
                <option value="CLOSED">Cerrado</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600">Prioridad</label>
              <select name="priority" defaultValue={params.priority ?? ''} className="select select-bordered w-full">
                <option value="">Todas</option>
                <option value="1">P1</option>
                <option value="2">P2</option>
                <option value="3">P3</option>
                <option value="4">P4</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600">Asignación</label>
              <select name="assigned" defaultValue={params.assigned ?? ''} className="select select-bordered w-full">
                <option value="">Todos</option>
                <option value="assigned">Asignados</option>
                <option value="unassigned">Sin asignar</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600">Sede</label>
              <select name="location" defaultValue={params.location ?? ''} className="select select-bordered w-full">
                <option value="">Todas</option>
                {(allowedLocations ?? []).map((l: any) => (
                  <option key={l.id} value={l.id}>
                    {l.code}
                    {l.name ? ` - ${l.name}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600">Desde</label>
              <input name="from" type="date" defaultValue={params.from ?? ''} className="input input-bordered w-full" />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600">Hasta</label>
              <input name="to" type="date" defaultValue={params.to ?? ''} className="input input-bordered w-full" />
            </div>

            <div className="sm:col-span-2 lg:col-span-6 flex justify-end">
              <button className="btn btn-primary" type="submit">Aplicar</button>
            </div>
          </form>
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
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link
                        href={`/tickets/${ticket.id}`}
                        className="font-semibold text-blue-600 hover:text-blue-700"
                      >
                        {formatTicketCode({ ticket_number: ticket.ticket_number, created_at: ticket.created_at })}
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
                            {requester.full_name || requester.email || 'Sin nombre'}
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
                            {agent.full_name || agent.email || 'Sin nombre'}
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
            <div className="flex items-center gap-2">
              <a className="btn btn-secondary" href={exportCsvHref}>
                Descargar CSV
              </a>
              <a className="btn btn-primary" href={exportPdfHref}>
                Descargar PDF
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
