import Link from 'next/link'
import { StatusBadge, PriorityBadge } from '@/lib/ui/badges'
import { formatTicketCode } from '@/lib/tickets/code'

type Ticket = {
  id: string
  ticket_number: number
  title: string
  status: string
  priority: number
  created_at: string
}

export default function RecentTickets({
  tickets,
  ticketsIndexHref,
  baseHref = '/tickets',
}: {
  tickets: Ticket[]
  ticketsIndexHref: string
  baseHref?: string
}) {
  return (
    <div className="card shadow-lg border-0">
      <div className="card-body">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Recientes</h3>
              <p className="text-xs text-gray-600">Últimos 5 tickets</p>
            </div>
          </div>
          <Link
            href={ticketsIndexHref}
            className="text-xs font-medium text-purple-600 hover:text-purple-700 flex items-center gap-1 transition-colors"
          >
            Ver todos
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
        <div className="space-y-2">
          {tickets.length === 0 ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-2">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-xs text-gray-500">No hay tickets todavía</p>
            </div>
          ) : (
            tickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`${baseHref}/${ticket.id}`}
                className="group block px-3 py-2 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-gradient-to-br hover:from-purple-50 hover:to-blue-50 transition-all hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded shrink-0">
                    {formatTicketCode({ ticket_number: ticket.ticket_number, created_at: ticket.created_at })}
                  </span>
                  <p className="text-sm font-medium text-gray-900 truncate flex-1 group-hover:text-purple-700 transition-colors">
                    {ticket.title}
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={ticket.status} />
                    <PriorityBadge priority={ticket.priority} />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 shrink-0">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {new Date(ticket.created_at).toLocaleDateString('es-MX', {
                      timeZone: 'America/Mexico_City',
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
