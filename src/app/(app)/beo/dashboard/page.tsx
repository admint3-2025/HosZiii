import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import BEOPdfThumbnail from '@/components/BEOPdfThumbnail'

export const metadata = {
  title: 'Dashboard BEO | Helpdesk',
  description: 'Gestión y seguimiento de eventos - Banquet Event Orders',
}

export default async function BEODashboardPage() {
  const supabase = await createSupabaseServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, full_name, location_id, can_view_beo')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  // Verificar permiso para ver BEO
  if (!profile.can_view_beo) {
    redirect('/tickets')
  }

  // Obtener estadísticas
  const { data: stats } = await supabase
    .rpc('get_beo_stats', { 
      user_id: profile.id, 
      user_role: profile.role 
    })

  // Obtener tickets BEO con filtro por sede
  let ticketsQuery = supabase
    .from('beo_tickets_view')
    .select('*')
    .neq('status', 'CLOSED')
    .order('urgency_level')
    .order('event_date', { ascending: true, nullsFirst: false })
    .limit(50)
  
  // Aplicar filtro de sede si no es admin
  if (profile.role !== 'admin' && profile.location_id) {
    ticketsQuery = ticketsQuery.eq('location_id', profile.location_id)
  }

  const { data: tickets } = await ticketsQuery

  const urgencyColors: Record<string, string> = {
    PASADO: 'bg-gray-100 text-gray-600 border-gray-300',
    CRITICO: 'bg-red-100 text-red-800 border-red-300',
    URGENTE: 'bg-orange-100 text-orange-800 border-orange-300',
    PROXIMO: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    NORMAL: 'bg-green-100 text-green-800 border-green-300',
  }

  const statusLabels: Record<string, string> = {
    OPEN: 'Abierto',
    IN_PROGRESS: 'En Progreso',
    PENDING: 'Pendiente',
    RESOLVED: 'Resuelto',
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Profesional y Sobrio */}
        <div className="relative overflow-hidden rounded-xl bg-white shadow-sm border border-gray-200">
          <div className="px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Icono minimalista */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Dashboard BEO</h1>
                  <p className="text-sm text-gray-600 mt-0.5">
                    Gestión de Eventos Técnicos · Banquet Event Orders
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2.5 px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span className="text-xs text-emerald-700 font-medium">Sistema Activo</span>
              </div>
            </div>

            {/* Info BEO - Sobrio */}
            <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-lg p-3.5">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-sm text-gray-700">
                  <p className="font-semibold text-gray-900 mb-0.5">📋 BEO = Banquet Event Order</p>
                  <p className="text-gray-600">
                    Sistema especializado para gestión de requerimientos técnicos de IT en eventos corporativos, con documentación BEO completa.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Estadísticas - Diseño limpio y profesional */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-1 w-1 rounded-full bg-indigo-600"></div>
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Métricas en Tiempo Real</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {/* Total Activos */}
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-[10px] text-gray-500 font-medium mb-1 uppercase tracking-wide">Total Activos</div>
              <div className="text-2xl font-bold text-gray-900">{stats?.total_active || 0}</div>
            </div>

            {/* Críticos */}
            <div className="bg-white rounded-lg p-4 border-l-4 border-rose-500 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-[10px] text-rose-600 font-semibold mb-1 uppercase tracking-wide flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                Críticos
              </div>
              <div className="text-2xl font-bold text-rose-600">{stats?.critical || 0}</div>
              <div className="text-[10px] text-rose-500 mt-0.5">&lt; 24 horas</div>
            </div>

            {/* Urgentes */}
            <div className="bg-white rounded-lg p-4 border-l-4 border-orange-500 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-[10px] text-orange-600 font-semibold mb-1 uppercase tracking-wide flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Urgentes
              </div>
              <div className="text-2xl font-bold text-orange-600">{stats?.urgent || 0}</div>
              <div className="text-[10px] text-orange-500 mt-0.5">24-48 horas</div>
            </div>

            {/* Próximos */}
            <div className="bg-white rounded-lg p-4 border-l-4 border-amber-500 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-[10px] text-amber-600 font-semibold mb-1 uppercase tracking-wide">Próximos</div>
              <div className="text-2xl font-bold text-amber-600">{stats?.upcoming || 0}</div>
              <div className="text-[10px] text-amber-500 mt-0.5">48-72 horas</div>
            </div>

            {/* Abiertos */}
            <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-[10px] text-blue-600 font-semibold mb-1 uppercase tracking-wide">Abiertos</div>
              <div className="text-2xl font-bold text-blue-600">{stats?.pending || 0}</div>
            </div>

            {/* En Progreso */}
            <div className="bg-white rounded-lg p-4 border-l-4 border-indigo-500 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-[10px] text-indigo-600 font-semibold mb-1 uppercase tracking-wide">En Progreso</div>
              <div className="text-2xl font-bold text-indigo-600">{stats?.in_progress || 0}</div>
            </div>

            {/* Hoy */}
            <div className="bg-white rounded-lg p-4 border-l-4 border-purple-500 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-[10px] text-purple-600 font-semibold mb-1 uppercase tracking-wide flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                Hoy
              </div>
              <div className="text-2xl font-bold text-purple-600">{stats?.today_events || 0}</div>
              <div className="text-[10px] text-purple-500 mt-0.5">Eventos hoy</div>
            </div>

            {/* Mañana */}
            <div className="bg-white rounded-lg p-4 border-l-4 border-pink-500 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-[10px] text-pink-600 font-semibold mb-1 uppercase tracking-wide flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                Mañana
              </div>
              <div className="text-2xl font-bold text-pink-600">{stats?.tomorrow_events || 0}</div>
              <div className="text-[10px] text-pink-500 mt-0.5">Eventos mañana</div>
            </div>
          </div>
        </div>

        {/* Tickets por urgencia */}
        {tickets && tickets.length > 0 ? (
          <>
            {/* Críticos - Diseño profesional sin saturación */}
            {tickets.filter(t => t.urgency_level === 'CRITICO').length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-2.5 h-2.5 bg-rose-500 rounded-full"></div>
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <span>Eventos Críticos</span>
                    <span className="text-xs font-medium text-rose-600 bg-rose-50 px-2 py-1 rounded border border-rose-200">&lt; 24 horas</span>
                  </h2>
                </div>
                <div className="space-y-3">
                  {tickets.filter(t => t.urgency_level === 'CRITICO').map((ticket) => (
                    <Link
                      key={ticket.id}
                      href={`/tickets/${ticket.id}`}
                      className="group block bg-white rounded-lg border-l-4 border-rose-500 shadow-sm hover:shadow-md transition-all p-5"
                    >
                      <div className="flex items-start gap-4">
                        {/* Miniatura PDF BEO */}
                        <div className="flex-shrink-0">
                          <BEOPdfThumbnail attachment={ticket.beo_attachment} />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3 flex-wrap">
                            <span className="px-2.5 py-1 text-xs font-mono font-bold rounded bg-gray-100 text-gray-700 border border-gray-200">
                              #{ticket.ticket_number}
                            </span>
                            <span className="px-2.5 py-1 text-xs font-bold rounded bg-rose-600 text-white uppercase">
                              ⚠️ Crítico
                            </span>
                            <span className="text-xs text-gray-600 font-medium">
                              {statusLabels[ticket.status]}
                            </span>
                          </div>
                          
                          <h3 className="font-bold text-gray-900 text-base mb-3">
                            {ticket.event_name}
                          </h3>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div className="bg-gray-50 rounded p-2 border border-gray-200">
                              <div className="text-gray-500 text-xs mb-0.5">BEO</div>
                              <div className="font-semibold text-gray-900">{ticket.beo_number}</div>
                            </div>
                            {ticket.event_date && (
                              <div className="bg-gray-50 rounded p-2 border border-gray-200">
                                <div className="text-gray-500 text-xs mb-0.5">Evento</div>
                                <div className="font-semibold text-gray-900">
                                  {new Date(ticket.event_date).toLocaleString('es-ES', { 
                                    month: 'short', 
                                    day: 'numeric', 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </div>
                              </div>
                            )}
                            {ticket.event_room && (
                              <div className="bg-gray-50 rounded p-2 border border-gray-200">
                                <div className="text-gray-500 text-xs mb-0.5">Salón</div>
                                <div className="font-semibold text-gray-900">{ticket.event_room}</div>
                              </div>
                            )}
                            <div className="bg-gray-50 rounded p-2 border border-gray-200">
                              <div className="text-gray-500 text-xs mb-0.5">Cliente</div>
                              <div className="font-semibold text-gray-900 truncate">{ticket.requester_name}</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex-shrink-0 w-8 h-8 rounded bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Otros eventos - Diseño limpio */}
            {tickets.filter(t => t.urgency_level !== 'CRITICO').length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-1 w-1 rounded-full bg-indigo-600"></div>
                  <h2 className="text-base font-bold text-gray-900">Próximos Eventos Programados</h2>
                </div>
                <div className="space-y-2.5">
                  {tickets.filter(t => t.urgency_level !== 'CRITICO').map((ticket) => {
                    const urgencyStyles: Record<string, { border: string, badge: string, bg: string }> = {
                      URGENTE: {
                        border: 'border-l-4 border-orange-500',
                        badge: 'bg-orange-600 text-white',
                        bg: 'bg-white'
                      },
                      PROXIMO: {
                        border: 'border-l-4 border-amber-500',
                        badge: 'bg-amber-600 text-white',
                        bg: 'bg-white'
                      },
                      NORMAL: {
                        border: 'border-l-4 border-emerald-500',
                        badge: 'bg-emerald-600 text-white',
                        bg: 'bg-white'
                      },
                      PASADO: {
                        border: 'border-l-4 border-gray-400',
                        badge: 'bg-gray-600 text-white',
                        bg: 'bg-white'
                      }
                    }

                    const style = urgencyStyles[ticket.urgency_level] || urgencyStyles.NORMAL

                    return (
                      <Link
                        key={ticket.id}
                        href={`/tickets/${ticket.id}`}
                        className={`group block ${style.bg} ${style.border} rounded-lg shadow-sm hover:shadow-md transition-all p-4`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Miniatura PDF BEO */}
                          <div className="flex-shrink-0">
                            <BEOPdfThumbnail attachment={ticket.beo_attachment} />
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="px-2 py-0.5 text-xs font-mono font-semibold rounded bg-gray-100 text-gray-700 border border-gray-200">
                                #{ticket.ticket_number}
                              </span>
                              <span className={`px-2 py-0.5 text-xs font-bold rounded ${style.badge} uppercase text-[10px]`}>
                                {ticket.urgency_level}
                              </span>
                              <span className="text-xs text-gray-600 font-medium">
                                {statusLabels[ticket.status]}
                              </span>
                            </div>
                            
                            <h3 className="font-semibold text-gray-900 mb-2 text-sm">
                              {ticket.event_name}
                            </h3>
                            
                            <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                              <span className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="font-medium">BEO:</span> {ticket.beo_number}
                              </span>
                              {ticket.event_date && (
                                <span className="flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  {new Date(ticket.event_date).toLocaleString('es-ES', { 
                                    month: 'short', 
                                    day: 'numeric', 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </span>
                              )}
                              {ticket.event_room && (
                                <span className="flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                  </svg>
                                  {ticket.event_room}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex-shrink-0 w-8 h-8 rounded bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-emerald-100 rounded-full mx-auto mb-4 flex items-center justify-center border-4 border-emerald-200">
              <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Todo Bajo Control</h3>
            <p className="text-gray-600">
              No hay tickets BEO pendientes en este momento
            </p>
            <p className="text-gray-500 text-sm mt-1">
              Todos los eventos están atendidos
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
