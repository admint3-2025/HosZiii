import { createSupabaseServerClient } from '@/lib/supabase/server'
import { StatusBadge, PriorityBadge } from '@/lib/ui/badges'

export default async function DeletedTicketsReportPage() {
  const supabase = await createSupabaseServerClient()

  // Obtener tickets eliminados con información completa
  const { data: deletedTickets } = await supabase
    .from('tickets')
    .select(`
      id,
      ticket_number,
      title,
      description,
      status,
      priority,
      category_id,
      created_at,
      deleted_at,
      deleted_by,
      deleted_reason
    `)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })
    .limit(100)

  // Obtener información de usuarios que eliminaron tickets
  const userIds = [...new Set((deletedTickets ?? []).map(t => t.deleted_by).filter(Boolean))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id,full_name,email')
    .in('id', userIds)

  const userMap = new Map((profiles ?? []).map(p => [p.id, p]))

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tickets Eliminados</h1>
          <p className="text-sm text-gray-600 mt-1">
            Auditoría completa de tickets eliminados con motivo y responsable
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a className="btn btn-secondary" href="/reports/deleted-tickets/export">
            Descargar CSV
          </a>
          <a href="/reports" className="btn btn-secondary">
            ← Volver a reportes
          </a>
        </div>
      </div>

      {/* Resumen */}
      <div className="card bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200">
        <div className="card-body">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center text-3xl">
              🗑️
            </div>
            <div>
              <div className="text-3xl font-bold text-red-700">
                {deletedTickets?.length ?? 0}
              </div>
              <div className="text-sm text-red-600 font-medium">
                Tickets eliminados (últimos 100)
              </div>
              <div className="text-xs text-red-500 mt-1">
                Todos los registros mantienen trazabilidad completa
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de tickets eliminados */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Título</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Prioridad</th>
                <th className="px-4 py-3 font-medium">Eliminado por</th>
                <th className="px-4 py-3 font-medium">Motivo</th>
                <th className="px-4 py-3 font-medium">Fecha eliminación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(deletedTickets ?? []).map((ticket) => {
                const deletedBy = ticket.deleted_by ? userMap.get(ticket.deleted_by) : null
                return (
                  <tr key={ticket.id} className="hover:bg-red-50/30">
                    <td className="px-4 py-3 font-semibold text-gray-700">
                      #{ticket.ticket_number}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{ticket.title}</div>
                      <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                        {ticket.description}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={ticket.status} />
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={ticket.priority} />
                    </td>
                    <td className="px-4 py-3">
                      {deletedBy ? (
                        <div>
                          <div className="font-medium text-gray-900">
                            {deletedBy.full_name || 'Sin nombre'}
                          </div>
                          <div className="text-xs text-gray-500">{deletedBy.email}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Sistema</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-xs">
                        {ticket.deleted_reason ? (
                          <div className="text-xs bg-red-50 border border-red-200 rounded px-2 py-1 text-red-700">
                            {ticket.deleted_reason}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-xs">Sin motivo</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {ticket.deleted_at
                        ? new Date(ticket.deleted_at).toLocaleString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </td>
                  </tr>
                )
              })}
              {deletedTickets?.length === 0 && (
                <tr>
                  <td className="px-4 py-12 text-center text-gray-500" colSpan={7}>
                    <div className="text-4xl mb-2">✅</div>
                    <div className="font-medium">No hay tickets eliminados</div>
                    <div className="text-xs mt-1">Todos los tickets están activos</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Nota de auditoría */}
      <div className="card bg-blue-50 border-blue-200">
        <div className="card-body">
          <div className="flex gap-3">
            <div className="text-2xl">ℹ️</div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-1">Nota sobre auditoría</h3>
              <p className="text-sm text-blue-700 leading-relaxed">
                Este sistema utiliza <strong>soft-delete</strong>: los tickets nunca se borran físicamente de la base de datos.
                Cada eliminación registra el usuario responsable, fecha y motivo. Los datos permanecen disponibles
                para auditoría y cumplimiento normativo indefinidamente.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
