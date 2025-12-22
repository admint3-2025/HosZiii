'use client'

import Link from 'next/link'

type TicketHistoryRow = {
  ticket_id: string
  ticket_number: string
  ticket_title: string
  ticket_status: string
  ticket_priority: number
  ticket_created_at: string
  ticket_closed_at: string | null
  requester_name: string | null
  assigned_name: string | null
}

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-800',
  ASSIGNED: 'bg-purple-100 text-purple-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  WAITING: 'bg-orange-100 text-orange-800',
  RESOLVED: 'bg-teal-100 text-teal-800',
  CLOSED: 'bg-gray-100 text-gray-800',
}

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Nuevo',
  ASSIGNED: 'Asignado',
  IN_PROGRESS: 'En progreso',
  WAITING: 'Esperando',
  RESOLVED: 'Resuelto',
  CLOSED: 'Cerrado',
}

const PRIORITY_COLORS: Record<number, string> = {
  1: 'text-gray-600',
  2: 'text-blue-600',
  3: 'text-yellow-600',
  4: 'text-orange-600',
  5: 'text-red-600',
}

const PRIORITY_LABELS: Record<number, string> = {
  1: 'Muy baja',
  2: 'Baja',
  3: 'Media',
  4: 'Alta',
  5: 'Crítica',
}

export default function AssetTicketHistory({ history }: { history: TicketHistoryRow[] }) {
  if (history.length === 0) {
    return (
      <div className="card shadow-lg border-0">
        <div className="bg-gradient-to-br from-gray-50 to-slate-50 border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Historial de tickets</h3>
              <p className="text-xs text-gray-700">Incidencias relacionadas con este activo</p>
            </div>
          </div>
        </div>
        <div className="card-body">
          <div className="text-center py-8">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-gray-600 font-medium">No hay tickets vinculados a este activo</p>
            <p className="text-gray-500 text-sm mt-1">Los tickets aparecerán aquí cuando se creen</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card shadow-lg border-0">
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-b border-indigo-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-indigo-900 uppercase tracking-wider">Historial de tickets</h3>
            <p className="text-xs text-indigo-700">{history.length} {history.length === 1 ? 'ticket relacionado' : 'tickets relacionados'}</p>
          </div>
        </div>
      </div>
      <div className="card-body p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticket</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prioridad</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Solicitante</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asignado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {history.map((ticket) => (
                <tr key={ticket.ticket_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link 
                      href={`/tickets/${ticket.ticket_id}`}
                      className="text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      #{ticket.ticket_number}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 max-w-md truncate">
                      {ticket.ticket_title}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[ticket.ticket_status]}`}>
                      {STATUS_LABELS[ticket.ticket_status] || ticket.ticket_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-semibold ${PRIORITY_COLORS[ticket.ticket_priority]}`}>
                      {PRIORITY_LABELS[ticket.ticket_priority]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {ticket.requester_name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {ticket.assigned_name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(ticket.ticket_created_at).toLocaleDateString('es-MX')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
