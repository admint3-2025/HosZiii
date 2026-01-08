import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ExportPDFButton from './ExportPDFButton'

type DisposalRequest = {
  id: string
  asset_id: string
  requested_by: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  asset_snapshot: Record<string, unknown> | null
  tickets_snapshot: unknown[] | null
  changes_snapshot: unknown[] | null
  created_at: string
  updated_at: string
  reviewed_by: string | null
  reviewed_at: string | null
  review_notes: string | null
  requester?: { full_name: string } | null
  reviewer?: { full_name: string } | null
  asset?: { asset_tag: string; asset_type: string } | null
}

const fieldLabels: Record<string, string> = {
  asset_tag: 'Etiqueta',
  asset_type: 'Tipo',
  brand: 'Marca',
  model: 'Modelo',
  serial_number: 'Número de Serie',
  status: 'Estado',
  location: 'Sede',
  location_name: 'Sede',
  department: 'Departamento',
  assigned_to: 'Usuario Asignado',
  assigned_user_name: 'Usuario Asignado',
  responsible_user: 'Responsable',
  purchase_date: 'Fecha de Compra',
  warranty_end_date: 'Vencimiento Garantía',
  notes: 'Notas',
  processor: 'Procesador',
  ram_gb: 'RAM (GB)',
  storage_gb: 'Almacenamiento (GB)',
  os: 'Sistema Operativo',
  ip_address: 'IP',
  mac_address: 'MAC',
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'Aprobada', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rechazada', color: 'bg-red-100 text-red-800' },
}

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return ''
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (key.includes('date') || key.includes('_at')) {
    return new Date(value as string).toLocaleDateString('es-ES')
  }
  if (typeof value === 'object' && 'name' in (value as Record<string, unknown>)) {
    return (value as { name: string }).name
  }
  return String(value)
}

export default async function AssetDisposalsReportPage() {
  const supabase = await createSupabaseServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  const { data: requests, error } = await supabase
    .from('asset_disposal_requests')
    .select(`
      *,
      requester:profiles!asset_disposal_requests_requested_by_fkey(full_name),
      reviewer:profiles!asset_disposal_requests_reviewed_by_fkey(full_name),
      asset:assets(asset_tag, asset_type)
    `)
    .order('created_at', { ascending: false })
  
  console.log('[disposal-report] Query error:', error)
  console.log('[disposal-report] Requests count:', requests?.length)

  const disposals = (requests ?? []) as DisposalRequest[]
  
  // Conteos por estado
  const pending = disposals.filter(d => d.status === 'pending').length
  const approved = disposals.filter(d => d.status === 'approved').length
  const rejected = disposals.filter(d => d.status === 'rejected').length

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/reports"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Volver a Reportes
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900 mt-2">
            Bajas de Activos
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Historial de solicitudes de baja con snapshot del activo
          </p>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-semibold text-gray-900">{disposals.length}</div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-semibold text-amber-600">{pending}</div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pendientes</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-semibold text-green-600">{approved}</div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Aprobadas</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-semibold text-red-600">{rejected}</div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Rechazadas</div>
          </div>
        </div>

        {/* Lista de solicitudes */}
        <div className="space-y-4">
          {disposals.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
              No hay solicitudes de baja registradas
            </div>
          ) : (
            disposals.map((disposal) => (
              <div
                key={disposal.id}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden"
              >
                {/* Cabecera */}
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {String(disposal.asset?.asset_tag ?? (disposal.asset_snapshot as Record<string, unknown>)?.asset_tag ?? 'Sin etiqueta')}
                        <span className="ml-2 text-gray-400 font-normal text-sm">
                          {String(disposal.asset?.asset_type ?? (disposal.asset_snapshot as Record<string, unknown>)?.asset_type ?? '')}
                        </span>
                      </h3>
                      <p className="text-xs text-gray-500">
                        {disposal.requester?.full_name ?? 'Desconocido'} •{' '}
                        {new Date(disposal.created_at).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      disposal.status === 'approved' ? 'bg-green-100 text-green-700' :
                      disposal.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {statusLabels[disposal.status].label}
                    </span>
                    <ExportPDFButton disposal={disposal} />
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  {/* Motivo */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Motivo</h4>
                    <p className="text-sm text-gray-700">{disposal.reason}</p>
                  </div>

                  {/* Resolución (si existe) */}
                  {disposal.status !== 'pending' && (
                    <div className="border-l-2 border-gray-200 pl-3">
                      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        {disposal.status === 'approved' ? 'Aprobación' : 'Rechazo'}
                      </h4>
                      <p className="text-sm text-gray-700">
                        {disposal.reviewer?.full_name ?? 'Desconocido'}
                        {disposal.reviewed_at && (
                          <span className="text-gray-400"> • {new Date(disposal.reviewed_at).toLocaleDateString('es-ES')}</span>
                        )}
                      </p>
                      {disposal.review_notes && (
                        <p className="text-sm text-gray-600 mt-1">{disposal.review_notes}</p>
                      )}
                    </div>
                  )}

                  {/* Snapshot del activo */}
                  {disposal.asset_snapshot && (
                    <details className="group">
                      <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1">
                        <span className="group-open:rotate-90 transition-transform text-xs">▶</span>
                        Ver snapshot del activo
                      </summary>
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                        {Object.entries(disposal.asset_snapshot).map(([key, value]) => {
                          const formatted = formatValue(key, value)
                          if (!formatted || key === 'id' || key === 'created_at' || key === 'updated_at') return null
                          const label = fieldLabels[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                          return (
                            <div key={key}>
                              <span className="text-gray-400">{label}:</span>{' '}
                              <span className="text-gray-700">{formatted}</span>
                            </div>
                          )
                        })}
                      </div>
                    </details>
                  )}

                  {/* Historial de incidencias */}
                  {disposal.tickets_snapshot && disposal.tickets_snapshot.length > 0 && (
                    <details className="group">
                      <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1">
                        <span className="group-open:rotate-90 transition-transform text-xs">▶</span>
                        Incidencias ({disposal.tickets_snapshot.length})
                      </summary>
                      <div className="mt-2 space-y-1">
                        {(disposal.tickets_snapshot as Array<{ id: string; number: number; title: string; status: string; created_at: string }>).map((ticket, idx) => (
                          <div key={idx} className="text-xs flex items-center justify-between py-1 border-b border-gray-100 last:border-0">
                            <div>
                              <span className="font-medium text-gray-700">#{ticket.number}</span>{' '}
                              <span className="text-gray-600">{ticket.title}</span>
                            </div>
                            <span className="text-gray-400">
                              {ticket.status} • {new Date(ticket.created_at).toLocaleDateString('es-ES')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {/* Historial de cambios */}
                  {disposal.changes_snapshot && disposal.changes_snapshot.length > 0 && (
                    <details className="group">
                      <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1">
                        <span className="group-open:rotate-90 transition-transform text-xs">▶</span>
                        Cambios ({disposal.changes_snapshot.length})
                      </summary>
                      <div className="mt-2 space-y-1">
                        {(disposal.changes_snapshot as Array<{ field_name: string; old_value: string; new_value: string; changed_at: string; changed_by_name?: string }>).map((change, idx) => (
                          <div key={idx} className="text-xs py-1 border-b border-gray-100 last:border-0">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-700">
                                {fieldLabels[change.field_name] ?? change.field_name}
                              </span>
                              <span className="text-gray-400">
                                {change.changed_by_name ?? 'Sistema'} • {new Date(change.changed_at).toLocaleDateString('es-ES')}
                              </span>
                            </div>
                            <div className="text-gray-500">
                              <span className="line-through">{change.old_value || '(vacío)'}</span>
                              {' → '}
                              <span>{change.new_value || '(vacío)'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Link a panel de autorización */}
        {pending > 0 && (
          <div className="mt-6">
            <Link
              href="/admin/assets/disposals"
              className="inline-flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700 font-medium"
            >
              {pending} solicitud(es) pendiente(s) de autorización →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
