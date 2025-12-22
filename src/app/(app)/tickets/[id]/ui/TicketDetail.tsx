import TicketActions from './TicketActions'
import TicketComments from './TicketComments'
import TicketAttachments from './TicketAttachments'
import { StatusBadge, PriorityBadge, LevelBadge } from '@/lib/ui/badges'

export default function TicketDetail({
  ticket,
  comments,
  currentAgentId,
  userRole,
}: {
  ticket: any
  comments: any[]
  currentAgentId: string | null
  userRole: string
}) {
  // Solo permitir acciones a agentes y superiores (no a usuarios ni solicitantes)
  const canPerformActions = ['agent_l1', 'agent_l2', 'supervisor', 'admin'].includes(userRole)
  
  return (
    <div className="space-y-6">
      {/* Header Card con gradiente - versión compacta */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 shadow-lg">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-24 -mt-24"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl -ml-32 -mb-32"></div>
        
        <div className="relative z-10 p-4">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30 flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span className="text-base font-bold text-white">#{ticket.ticket_number}</span>
              </div>
              <h1 className="text-xl font-bold text-white truncate">{ticket.title}</h1>
            </div>
            
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              <LevelBadge level={ticket.support_level} />
            </div>
          </div>
          
          {ticket.category_path ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white/10 backdrop-blur-sm rounded-md border border-white/20">
              <svg className="w-3 h-3 text-blue-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span className="text-xs text-blue-50">{ticket.category_path}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Layout principal */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Contenido principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Descripción mejorada */}
          <div className="card shadow-lg border-0">
            <div className="card-body">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Descripción</h3>
              </div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-xl p-6 border border-gray-200">
                {ticket.description}
              </div>
            </div>
          </div>

          {/* Archivos adjuntos */}
          <TicketAttachments ticketId={ticket.id} canDelete={canPerformActions} />

          {/* Comentarios */}
          <TicketComments 
            ticketId={ticket.id} 
            comments={comments}
            ticketStatus={ticket.status}
            ticketClosedAt={ticket.closed_at}
            isRequester={ticket.current_user_id === ticket.requester_id}
            userRole={userRole}
          />
        </div>

        {/* Sidebar de acciones */}
        <div className="lg:col-span-1">
          {!canPerformActions && (
            <div className="card shadow-lg border-0 mb-6 bg-gradient-to-br from-blue-50 to-indigo-50">
              <div className="card-body">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-blue-900 uppercase tracking-wider">Información</h3>
                </div>
                <p className="text-xs text-blue-800 leading-relaxed">
                  Puedes ver el progreso del ticket y agregar comentarios. Los cambios de estado los realiza el equipo de soporte.
                </p>
              </div>
            </div>
          )}
          {/* Resolución (solo si está cerrado) */}
          {ticket.status === 'CLOSED' && ticket.resolution && (
            <div className="card shadow-lg border-0 mb-6 bg-gradient-to-br from-green-50 to-emerald-50">
              <div className="card-body">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-green-900 uppercase tracking-wider">Resolución</h3>
                </div>
                <div className="text-sm text-green-900 whitespace-pre-wrap leading-relaxed bg-white/60 rounded-xl p-4 border border-green-200">
                  {ticket.resolution}
                </div>
              </div>
            </div>
          )}

          {/* Información del ticket */}
          <div className="card shadow-lg border-0 mb-6">
            <div className="card-body">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Información</h3>
              </div>

              <div className="space-y-4">
                {/* Solicitante */}
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Solicitado por</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {ticket.requester?.full_name?.[0]?.toUpperCase() || ticket.requester?.email?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {ticket.requester?.full_name || ticket.requester?.email || 'Desconocido'}
                      </div>
                      {ticket.requester?.full_name && (
                        <div className="text-xs text-gray-500 truncate">{ticket.requester.email}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Asignado a */}
                {ticket.assigned_agent ? (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Asignado a</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">
                          {ticket.assigned_agent.full_name?.[0]?.toUpperCase() || ticket.assigned_agent.email?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {ticket.assigned_agent.full_name || ticket.assigned_agent.email}
                        </div>
                        {ticket.assigned_agent.full_name && (
                          <div className="text-xs text-gray-500 truncate">{ticket.assigned_agent.email}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Asignado a</div>
                    <div className="text-sm text-gray-400 italic">Sin asignar</div>
                  </div>
                )}

                {/* Cerrado por */}
                {ticket.closed_by_user && (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Cerrado por</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-gray-500 to-gray-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">
                          {ticket.closed_by_user.full_name?.[0]?.toUpperCase() || ticket.closed_by_user.email?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {ticket.closed_by_user.full_name || ticket.closed_by_user.email}
                        </div>
                        {ticket.closed_by_user.full_name && (
                          <div className="text-xs text-gray-500 truncate">{ticket.closed_by_user.email}</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Fechas */}
                <div className="pt-3 border-t border-gray-200">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Fechas</div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Creado:</span>
                      <span className="text-gray-900 font-medium">
                        {new Date(ticket.created_at).toLocaleDateString('es-MX', { 
                          day: '2-digit', 
                          month: 'short', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Actualizado:</span>
                      <span className="text-gray-900 font-medium">
                        {new Date(ticket.updated_at).toLocaleDateString('es-MX', { 
                          day: '2-digit', 
                          month: 'short', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    {ticket.closed_at && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Cerrado:</span>
                        <span className="text-gray-900 font-medium">
                          {new Date(ticket.closed_at).toLocaleDateString('es-MX', { 
                            day: '2-digit', 
                            month: 'short', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {canPerformActions && (
            <TicketActions ticketId={ticket.id} currentStatus={ticket.status} supportLevel={ticket.support_level} currentAgentId={currentAgentId} />
          )}
        </div>
      </div>
    </div>
  )
}
