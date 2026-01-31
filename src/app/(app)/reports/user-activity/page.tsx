import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getReportsLocationFilter } from '@/lib/supabase/reports-filter'
import { hasSupervisorPermissions } from '@/lib/permissions'
import Link from 'next/link'

export const metadata = {
  title: 'Actividad por Usuario | Reportes',
  description: 'Análisis de tickets creados, modificados y cerrados por usuario',
}

export default async function UserActivityReportPage() {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_it_supervisor, is_maintenance_supervisor')
    .eq('id', user.id)
    .single()

  if (!profile || !hasSupervisorPermissions(profile as any)) {
    redirect('/dashboard')
  }

  // Obtener filtro de ubicaciones para reportes
  const locationFilter = await getReportsLocationFilter()

  // Usar admin client para consultas sin restricciones RLS
  const adminClient = createSupabaseAdminClient()

  // Obtener todos los usuarios (profiles)
  const { data: users, error: usersError } = await adminClient
    .from('profiles')
    .select('id, full_name, role, department, location_id, created_at')
    .order('full_name')

  if (usersError) {
    console.error('[UserActivity] Error cargando usuarios:', JSON.stringify(usersError, null, 2))
    console.error('[UserActivity] Error code:', usersError.code)
    console.error('[UserActivity] Error message:', usersError.message)
    console.error('[UserActivity] Error details:', usersError.details)
  }

  console.log('[UserActivity] Total usuarios cargados:', users?.length || 0)
  
  // Verificar si hay datos en users
  if (users && users.length > 0) {
    console.log('[UserActivity] Primer usuario:', JSON.stringify(users[0], null, 2))
  }

  // Construir métricas manualmente (RLS bypass con admin client)
  let userActivityData: any[] = []
  // Contadores globales independientes de la asignación a agente
  let globalResolvedCount = 0

  {
    // Obtener todos los tickets con información completa
    let ticketsQuery = adminClient
      .from('tickets')
      .select('id, requester_id, assigned_agent_id, status, created_at, updated_at, location_id')
      .is('deleted_at', null)

    // Aplicar filtro de ubicación para supervisores sin permiso especial
    if (locationFilter.shouldFilter && locationFilter.locationIds.length > 0) {
      ticketsQuery = ticketsQuery.in('location_id', locationFilter.locationIds)
    } else if (locationFilter.shouldFilter && locationFilter.locationIds.length === 0) {
      // Supervisor sin sedes: no mostrar nada
      ticketsQuery = ticketsQuery.eq('id', '00000000-0000-0000-0000-000000000000')
    }

    const { data: allTickets, error: ticketsError } = await ticketsQuery

    if (ticketsError) {
      console.error('[UserActivity] Error cargando tickets:', JSON.stringify(ticketsError, null, 2))
    }

    // Obtener comentarios
    const { data: comments } = await adminClient
      .from('ticket_comments')
      .select('author_id, created_at')
      .is('deleted_at', null)

    // Obtener eventos de auditoría (acciones generales)
    const { data: auditEvents } = await adminClient
      .from('audit_log')
      .select('actor_id, action, created_at')
      .in('action', ['UPDATE', 'STATUS_CHANGE', 'RESOLVE', 'CLOSE'])

    // Obtener historial de cambios de estado (quién resuelve/cierra)
    const { data: statusHistory } = await adminClient
      .from('ticket_status_history')
      .select('actor_id, to_status')

    // Construir map de métricas por usuario
    const metricsMap = new Map<string, any>()

    users?.forEach(user => {
      metricsMap.set(user.id, {
        user_id: user.id,
        full_name: user.full_name,
        role: user.role,
        department: user.department,
        tickets_created: 0,
        tickets_assigned: 0,
        tickets_resolved: 0,
        tickets_closed: 0,
        comments_count: 0,
        actions_count: 0,
        avg_resolution_time_minutes: 0,
      })
    })

    // Procesar todos los tickets
    
    console.log('[UserActivity] Procesando tickets. Total allTickets:', allTickets?.length || 0)
    if (allTickets && allTickets.length > 0) {
      console.log('[UserActivity] Primer ticket:', JSON.stringify(allTickets[0], null, 2))
    }
    
    allTickets?.forEach(ticket => {
      // Contar tickets creados por el requester
      const requesterMetrics = metricsMap.get(ticket.requester_id)
      if (requesterMetrics) {
        requesterMetrics.tickets_created++
      } else {
        console.log('[UserActivity] ⚠️ No se encontró requester:', ticket.requester_id)
      }

      // Contador global de tickets resueltos (RESOLVED o CLOSED),
      // independiente de si tienen agente asignado o no
      if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
        globalResolvedCount++
      }

      // Contar tickets asignados por agente (independiente de quién cierra)
      if (ticket.assigned_agent_id) {
        const agentMetrics = metricsMap.get(ticket.assigned_agent_id)
        if (agentMetrics) {
          agentMetrics.tickets_assigned++
        }
      }
    })

    // Contar resoluciones y cierres por actor (quién cambia el estado)
    statusHistory?.forEach(event => {
      const metrics = metricsMap.get(event.actor_id)
      if (!metrics) return

      if (event.to_status === 'RESOLVED' || event.to_status === 'CLOSED') {
        metrics.tickets_resolved++
      }
      if (event.to_status === 'CLOSED') {
        metrics.tickets_closed++
      }
    })

    // Contar comentarios
    comments?.forEach(comment => {
      const metrics = metricsMap.get(comment.author_id)
      if (metrics) metrics.comments_count++
    })

    // Contar acciones de auditoría
    auditEvents?.forEach(event => {
      const metrics = metricsMap.get(event.actor_id)
      if (metrics) metrics.actions_count++
    })

    userActivityData = Array.from(metricsMap.values())

    console.log('[UserActivity] Total tickets cargados:', allTickets?.length || 0)
    console.log('[UserActivity] Comentarios cargados:', comments?.length || 0)
    console.log('[UserActivity] Eventos auditoría cargados:', auditEvents?.length || 0)
    console.log('[UserActivity] Total métricas procesadas:', userActivityData.length)
  }

  // Calcular totales
  const totalCreated = userActivityData.reduce((sum, u) => sum + (u.tickets_created || 0), 0)
  const totalAssigned = userActivityData.reduce((sum, u) => sum + (u.tickets_assigned || 0), 0)
  // Para "resueltos" usamos el contador global basado en el estado real
  // de los tickets (RESOLVED o CLOSED), para que coincida con el dashboard.
  const totalResolved = globalResolvedCount
  const totalComments = userActivityData.reduce((sum, u) => sum + (u.comments_count || 0), 0)

  // Top performers
  const topCreators = [...userActivityData]
    .filter(u => u.tickets_created > 0)
    .sort((a, b) => b.tickets_created - a.tickets_created)
    .slice(0, 5)

  const topResolvers = [...userActivityData]
    .filter(u => u.tickets_resolved > 0 && u.role !== 'requester')
    .sort((a, b) => b.tickets_resolved - a.tickets_resolved)
    .slice(0, 5)

  const mostActive = [...userActivityData]
    .filter(u => u.actions_count > 0)
    .sort((a, b) => b.actions_count - a.actions_count)
    .slice(0, 5)

  // Estadísticas por rol
  const roleStats = userActivityData.reduce((acc, user) => {
    const role = user.role || 'unknown'
    if (!acc[role]) {
      acc[role] = {
        count: 0,
        created: 0,
        assigned: 0,
        resolved: 0,
        comments: 0,
      }
    }
    acc[role].count++
    acc[role].created += user.tickets_created || 0
    acc[role].assigned += user.tickets_assigned || 0
    acc[role].resolved += user.tickets_resolved || 0
    acc[role].comments += user.comments_count || 0
    return acc
  }, {} as Record<string, any>)

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    supervisor: 'Supervisor',
    agent_l1: 'Agente N1',
    agent_l2: 'Agente N2',
    requester: 'Solicitante',
  }

  return (
    <main className="p-6 space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 shadow-md">
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
                <h1 className="text-xl font-bold text-white">Actividad por Usuario</h1>
                <p className="text-violet-100 text-sm">Análisis detallado de tickets creados, modificados y cerrados por usuario</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Métricas globales */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">📝</span>
              <span className="text-xs font-semibold text-blue-600 bg-white px-2 py-1 rounded">CREADOS</span>
            </div>
            <div className="text-2xl font-bold text-blue-900">{totalCreated}</div>
            <div className="text-xs text-blue-700 mt-1">Tickets creados en total</div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">👔</span>
              <span className="text-xs font-semibold text-indigo-600 bg-white px-2 py-1 rounded">ASIGNADOS</span>
            </div>
            <div className="text-2xl font-bold text-indigo-900">{totalAssigned}</div>
            <div className="text-xs text-indigo-700 mt-1">Tickets asignados a agentes</div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">✅</span>
              <span className="text-xs font-semibold text-green-600 bg-white px-2 py-1 rounded">RESUELTOS</span>
            </div>
            <div className="text-2xl font-bold text-green-900">{totalResolved}</div>
            <div className="text-xs text-green-700 mt-1">Tickets resueltos</div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">💬</span>
              <span className="text-xs font-semibold text-purple-600 bg-white px-2 py-1 rounded">COMENTARIOS</span>
            </div>
            <div className="text-2xl font-bold text-purple-900">{totalComments}</div>
            <div className="text-xs text-purple-700 mt-1">Comentarios agregados</div>
          </div>
        </div>
      </div>

      {/* Top Performers */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Top Creadores */}
        <div className="card border-l-4 border-blue-500">
          <div className="p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span>🏆</span>
              <span>Top Creadores</span>
            </h3>
            <div className="space-y-2">
              {topCreators.map((user, idx) => (
                <div key={user.user_id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-400">#{idx + 1}</span>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{user.full_name}</div>
                      <div className="text-xs text-gray-500">{user.department || 'Sin departamento'}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-blue-600">{user.tickets_created}</div>
                    <div className="text-xs text-gray-500">tickets</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Resolvedores */}
        <div className="card border-l-4 border-green-500">
          <div className="p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span>⚡</span>
              <span>Top Resolvedores</span>
            </h3>
            <div className="space-y-2">
              {topResolvers.map((user, idx) => (
                <div key={user.user_id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-400">#{idx + 1}</span>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{user.full_name}</div>
                      <div className="text-xs text-gray-500">{roleLabels[user.role] || user.role}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-green-600">{user.tickets_resolved}</div>
                    <div className="text-xs text-gray-500">tickets</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Más Activos */}
        <div className="card border-l-4 border-purple-500">
          <div className="p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span>🔥</span>
              <span>Más Activos</span>
            </h3>
            <div className="space-y-2">
              {mostActive.map((user, idx) => (
                <div key={user.user_id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-400">#{idx + 1}</span>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{user.full_name}</div>
                      <div className="text-xs text-gray-500">{user.comments_count} comentarios</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-purple-600">{user.actions_count}</div>
                    <div className="text-xs text-gray-500">acciones</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas por rol */}
      <div className="card">
        <div className="p-4">
          <h3 className="text-sm font-bold text-gray-900 mb-4">📊 Actividad por Rol</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Object.keys(roleStats).map(role => {
              const stats = roleStats[role]
              return (
                <div key={role} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-xs font-semibold text-gray-600 uppercase mb-1">
                    {roleLabels[role] || role}
                  </div>
                  <div className="text-lg font-bold text-gray-900 mb-2">{stats.count} usuarios</div>
                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>Creados:</span>
                      <span className="font-semibold">{stats.created}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Resueltos:</span>
                      <span className="font-semibold">{stats.resolved}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Comentarios:</span>
                      <span className="font-semibold">{stats.comments}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Tabla detallada */}
      <div className="card">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-bold text-gray-900">Detalle por Usuario</h3>
          <p className="text-xs text-gray-600 mt-1">
            {userActivityData.length} usuarios · Mostrando toda la actividad registrada
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 uppercase tracking-wider">Usuario</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 uppercase tracking-wider">Rol</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 uppercase tracking-wider">Departamento</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-700 uppercase tracking-wider">Creados</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-700 uppercase tracking-wider">Asignados</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-700 uppercase tracking-wider">Resueltos</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-700 uppercase tracking-wider">Cerrados</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-700 uppercase tracking-wider">Comentarios</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-700 uppercase tracking-wider">Acciones</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-700 uppercase tracking-wider">Tiempo Prom.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {userActivityData
                .sort((a, b) => {
                  const aTotal = (a.tickets_created || 0) + (a.tickets_resolved || 0) + (a.actions_count || 0)
                  const bTotal = (b.tickets_created || 0) + (b.tickets_resolved || 0) + (b.actions_count || 0)
                  return bTotal - aTotal
                })
                .map(user => {
                  return (
                    <tr key={user.user_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2">
                        <div>
                          <div className="font-semibold text-gray-900">{user.full_name}</div>
                          <div className="text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700">
                          {roleLabels[user.role] || user.role}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {user.department || '-'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="font-semibold text-blue-600">{user.tickets_created || 0}</span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="font-semibold text-indigo-600">{user.tickets_assigned || 0}</span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="font-semibold text-green-600">{user.tickets_resolved || 0}</span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="font-semibold text-gray-600">{user.tickets_closed || 0}</span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="font-semibold text-purple-600">{user.comments_count || 0}</span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="font-semibold text-orange-600">{user.actions_count || 0}</span>
                      </td>
                      <td className="px-3 py-2 text-center text-gray-600">
                        {user.avg_resolution_time_minutes > 0 
                          ? `${Math.round(user.avg_resolution_time_minutes / 60)}h` 
                          : '-'}
                      </td>
                    </tr>
                  )
                }).filter(Boolean)}
            </tbody>
          </table>
        </div>
      </div>

      {/* Nota informativa */}
      <div className="card bg-blue-50 border-blue-200">
        <div className="p-4">
          <div className="flex gap-3">
            <div className="text-2xl">ℹ️</div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 text-sm mb-1">Sobre este reporte</h3>
              <p className="text-xs text-blue-700 leading-relaxed">
                Este reporte muestra la actividad detallada de cada usuario en el sistema. Incluye tickets creados, 
                asignados, resueltos, cerrados, comentarios agregados y acciones realizadas. El tiempo promedio de 
                resolución se calcula solo para agentes que han cerrado tickets. Los usuarios sin actividad no se muestran.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
