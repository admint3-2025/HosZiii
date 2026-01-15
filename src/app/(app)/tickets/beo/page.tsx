import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const metadata = {
  title: 'Mis Tickets BEO | ZIII HoS',
  description: 'Tickets BEO (Banquet Event Orders) creados',
}

export default async function MyBEOTicketsPage() {
  const supabase = await createSupabaseServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, full_name, department')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  // Obtener tickets BEO del usuario
  const { data: tickets } = await supabase
    .from('beo_tickets_view')
    .select('*')
    .eq('requester_id', profile.id)
    .order('event_date', { ascending: true, nullsFirst: false })

  const statusLabels: Record<string, string> = {
    OPEN: 'Abierto',
    IN_PROGRESS: 'En Progreso',
    PENDING: 'Pendiente',
    RESOLVED: 'Resuelto',
    CLOSED: 'Cerrado',
  }

  const priorityColors: Record<string, string> = {
    LOW: 'bg-gray-100 text-gray-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    HIGH: 'bg-red-100 text-red-800',
  }

  const urgencyColors: Record<string, string> = {
    PASADO: 'bg-gray-100 text-gray-600',
    CRITICO: 'bg-red-100 text-red-800 animate-pulse',
    URGENTE: 'bg-orange-100 text-orange-800',
    PROXIMO: 'bg-yellow-100 text-yellow-800',
    NORMAL: 'bg-green-100 text-green-800',
  }

  const activeTickets = tickets?.filter(t => t.status !== 'CLOSED') || []
  const closedTickets = tickets?.filter(t => t.status === 'CLOSED') || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mis Tickets BEO</h1>
              <p className="text-sm text-gray-600 mt-1">
                Requerimientos técnicos para eventos
              </p>
            </div>
            <Link
              href="/tickets/beo/new"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo Ticket BEO
            </Link>
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
            <div className="text-sm text-gray-600 mb-1">Total Activos</div>
            <div className="text-2xl font-bold text-gray-900">{activeTickets.length}</div>
          </div>
          <div className="bg-red-50 rounded-xl shadow-sm p-4 border border-red-200">
            <div className="text-sm text-red-600 mb-1">Críticos</div>
            <div className="text-2xl font-bold text-red-900">
              {activeTickets.filter(t => t.urgency_level === 'CRITICO').length}
            </div>
          </div>
          <div className="bg-orange-50 rounded-xl shadow-sm p-4 border border-orange-200">
            <div className="text-sm text-orange-600 mb-1">Urgentes</div>
            <div className="text-2xl font-bold text-orange-900">
              {activeTickets.filter(t => t.urgency_level === 'URGENTE').length}
            </div>
          </div>
          <div className="bg-green-50 rounded-xl shadow-sm p-4 border border-green-200">
            <div className="text-sm text-green-600 mb-1">Cerrados</div>
            <div className="text-2xl font-bold text-green-900">{closedTickets.length}</div>
          </div>
        </div>

        {/* Tickets Activos */}
        {activeTickets.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Eventos Activos</h2>
            <div className="space-y-3">
              {activeTickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/tickets/${ticket.id}`}
                  className="block bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-mono text-gray-500">
                          #{ticket.ticket_number}
                        </span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${urgencyColors[ticket.urgency_level] || 'bg-gray-100 text-gray-800'}`}>
                          {ticket.urgency_level}
                        </span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${priorityColors[ticket.priority]}`}>
                          {ticket.priority}
                        </span>
                        <span className="text-xs text-gray-600">
                          {statusLabels[ticket.status]}
                        </span>
                      </div>
                      
                      <h3 className="font-semibold text-gray-900 mb-2">
                        {ticket.event_name}
                      </h3>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">BEO:</span>
                          <span className="ml-2 font-medium text-gray-900">{ticket.beo_number}</span>
                        </div>
                        {ticket.event_date && (
                          <div>
                            <span className="text-gray-500">Fecha:</span>
                            <span className="ml-2 font-medium text-gray-900">
                              {new Date(ticket.event_date).toLocaleDateString('es-ES')}
                            </span>
                          </div>
                        )}
                        {ticket.event_room && (
                          <div>
                            <span className="text-gray-500">Salón:</span>
                            <span className="ml-2 font-medium text-gray-900">{ticket.event_room}</span>
                          </div>
                        )}
                        {ticket.days_until_event !== null && (
                          <div>
                            <span className="text-gray-500">Tiempo:</span>
                            <span className="ml-2 font-medium text-gray-900">
                              {ticket.days_until_event < 0 
                                ? 'Evento pasado'
                                : ticket.days_until_event < 1
                                ? `${Math.round(ticket.days_until_event * 24)}h`
                                : `${Math.round(ticket.days_until_event)}d`
                              }
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {ticket.agent_name && (
                        <div className="mt-2 text-xs text-gray-500">
                          Asignado a: {ticket.agent_name}
                        </div>
                      )}
                    </div>
                    
                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Tickets Cerrados */}
        {closedTickets.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Eventos Completados</h2>
            <div className="space-y-2">
              {closedTickets.slice(0, 5).map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/tickets/${ticket.id}`}
                  className="block bg-gray-50 rounded-lg border border-gray-200 p-4 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm font-mono text-gray-500">
                          #{ticket.ticket_number}
                        </span>
                        <span className="text-xs text-gray-500">BEO: {ticket.beo_number}</span>
                      </div>
                      <div className="font-medium text-gray-700">{ticket.event_name}</div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Estado vacío */}
        {tickets?.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-purple-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No tienes tickets BEO</h3>
            <p className="text-gray-600 mb-6">
              Crea tu primer ticket BEO para registrar requerimientos técnicos de eventos
            </p>
            <Link
              href="/tickets/beo/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Crear Ticket BEO
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
