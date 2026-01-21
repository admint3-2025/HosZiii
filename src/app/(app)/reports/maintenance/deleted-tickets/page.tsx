import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getReportsLocationFilter } from '@/lib/supabase/reports-filter'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { StatusBadge } from '@/lib/ui/badges'

export default async function MaintenanceDeletedTicketsReportPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role,asset_category')
    .eq('id', user.id)
    .single()

  // Acceso a módulo Mantenimiento (gestión)
  const canManageMaintenance = profile?.role === 'admin' || profile?.asset_category === 'MAINTENANCE'
  if (!canManageMaintenance) redirect('/reports')

  // Este reporte es para supervisor/admin
  if (!profile || !['admin', 'supervisor'].includes(profile.role)) redirect('/reports/maintenance')

  const locationFilter = await getReportsLocationFilter()

  let query = supabase
    .from('tickets_maintenance')
    .select(
      `
      id,
      ticket_number,
      title,
      description,
      status,
      priority,
      created_at,
      deleted_at,
      location_id,
      locations(code,name)
    `
    )
    .not('deleted_at', 'is', null)

  // Filtro por sedes para supervisores sin permiso especial
  if (locationFilter.shouldFilter && locationFilter.locationIds.length > 0) {
    query = query.in('location_id', locationFilter.locationIds)
  } else if (locationFilter.shouldFilter && locationFilter.locationIds.length === 0) {
    query = query.eq('id', '00000000-0000-0000-0000-000000000000')
  }

  const { data: deletedTickets, error } = await query.order('deleted_at', { ascending: false }).limit(200)

  if (error) {
    console.error('[maintenance-deleted-tickets] Error fetching tickets_maintenance:', error)
  }

  return (
    <main className="p-6 space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-orange-900 via-orange-800 to-red-900 shadow-md">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-24 -mt-24"></div>
        <div className="relative z-10 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/reports/maintenance"
                className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white">Solicitudes Eliminadas</h1>
                <p className="text-orange-100 text-sm">Auditoría de solicitudes eliminadas (soft-delete)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card bg-gradient-to-br from-white to-red-50 border border-red-200">
          <div className="p-4">
            <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Total Eliminadas</div>
            <div className="text-2xl font-bold text-red-600 mt-1">{deletedTickets?.length ?? 0}</div>
            <div className="text-xs text-gray-500 mt-1">Últimos 200 registros</div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-white to-gray-50">
          <div className="p-4">
            <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Sedes</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {new Set((deletedTickets ?? []).map((t: any) => t.location_id).filter(Boolean)).size}
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-white to-blue-50 border border-blue-200">
          <div className="p-4">
            <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Filtro por sedes</div>
            <div className="text-lg font-bold text-blue-600 mt-1">✓ Aplicado</div>
            <div className="text-xs text-gray-500 mt-1">Según permisos del supervisor</div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Título</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Sede</th>
                <th className="px-4 py-3 font-medium">Fecha eliminación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(deletedTickets ?? []).map((ticket: any) => {
                const loc = Array.isArray(ticket.locations) ? ticket.locations[0] : ticket.locations
                return (
                  <tr key={ticket.id} className="hover:bg-red-50/30">
                    <td className="px-4 py-3 font-semibold text-gray-700">#{ticket.ticket_number}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{ticket.title}</div>
                      {ticket.description && (
                        <div className="text-xs text-gray-500 mt-1 line-clamp-1">{ticket.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={ticket.status} />
                    </td>
                    <td className="px-4 py-3">
                      {loc ? (
                        <div className="text-xs">
                          <div className="font-semibold text-orange-700">{loc.code}</div>
                          <div className="text-gray-600">{loc.name}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Sin sede</span>
                      )}
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
                  <td className="px-4 py-12 text-center text-gray-500" colSpan={5}>
                    <div className="text-4xl mb-2">✅</div>
                    <div className="font-medium">No hay solicitudes eliminadas</div>
                    <div className="text-xs mt-1">Todo está activo</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Nota */}
      <div className="card bg-orange-50 border-orange-200">
        <div className="card-body">
          <div className="flex gap-3">
            <div className="text-2xl">ℹ️</div>
            <div className="flex-1">
              <h3 className="font-semibold text-orange-900 mb-1">Nota</h3>
              <p className="text-sm text-orange-800 leading-relaxed">
                Este sistema utiliza <strong>soft-delete</strong>: las solicitudes no se eliminan físicamente. Si necesitas
                trazabilidad por motivo/responsable, se puede agregar un log específico para mantenimiento (si aún no existe en tu esquema).
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
