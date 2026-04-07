import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ExportPDFButton from './ExportPDFButton'
import { formatImageHistoryValue } from '@/lib/assets/format-history'

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
  asset?: { id: string; asset_tag: string; asset_type: string; asset_code?: string } | null
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
  image_url: 'Imagen',
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

function formatChangeValue(fieldName: string, value: string | null | undefined): string {
  if (fieldName === 'image_url') return formatImageHistoryValue(value ?? null)
  return value || '(vacío)'
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
      reviewer:profiles!asset_disposal_requests_reviewed_by_fkey(full_name)
    `)
    .order('created_at', { ascending: false })
  
  console.log('[disposal-report] Query error:', error)
  console.log('[disposal-report] Requests count:', requests?.length)

  // Mapear para agregar asset desde snapshot
  const disposals = (requests ?? []).map(req => {
    const assetSnapshot = req.asset_snapshot as any
    return {
      ...req,
      asset: assetSnapshot ? {
        id: assetSnapshot.id,
        asset_tag: assetSnapshot.asset_tag,
        asset_type: assetSnapshot.asset_type,
        asset_code: assetSnapshot.asset_tag
      } : null
    }
  }) as DisposalRequest[]
  
  // Conteos por estado
  const pending = disposals.filter(d => d.status === 'pending').length
  const approved = disposals.filter(d => d.status === 'approved').length
  const rejected = disposals.filter(d => d.status === 'rejected').length

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="relative overflow-hidden rounded-xl bg-slate-900 border border-slate-700/60 shadow-lg mb-6">
          {/* Grid texture */}
          <div
            className="absolute inset-0 opacity-[0.035] pointer-events-none"
            style={{ backgroundImage: 'repeating-linear-gradient(0deg,#fff,#fff 1px,transparent 1px,transparent 44px),repeating-linear-gradient(90deg,#fff,#fff 1px,transparent 1px,transparent 44px)' }}
          />
          {/* Ambient glow */}
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
          {/* Left accent bar */}
          <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl bg-gradient-to-b from-rose-500 via-rose-600 to-slate-900" />

          <div className="relative z-10 px-6 py-5 pl-7">
            <div className="flex items-center justify-between gap-6">
              {/* Left: nav + title */}
              <div className="flex items-center gap-4 min-w-0">
                <Link
                  href="/reports"
                  className="flex-shrink-0 w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center hover:bg-slate-700 hover:border-slate-600 transition-all group"
                >
                  <svg className="w-4 h-4 text-slate-400 group-hover:text-slate-200 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Link>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center">
                    <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Reportes</span>
                      <span className="text-slate-700 text-[10px]">/</span>
                      <span className="text-[10px] font-semibold text-rose-400/70 uppercase tracking-widest">Activos</span>
                    </div>
                    <h1 className="text-base font-bold text-white leading-snug truncate">Solicitudes de Baja</h1>
                    <p className="text-slate-500 text-[11px] mt-px">Desincorporación de activos con snapshot y auditoría</p>
                  </div>
                </div>
              </div>

              {/* Right: stat pills */}
              <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
                <div className="flex flex-col items-center px-4 py-2 rounded-lg bg-slate-800/70 border border-slate-700/60 min-w-[60px]">
                  <span className="text-xl font-bold text-white tabular-nums leading-none">{disposals.length}</span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wide mt-1">Total</span>
                </div>
                <div className="flex flex-col items-center px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 min-w-[60px]">
                  <span className="text-xl font-bold text-amber-400 tabular-nums leading-none">{pending}</span>
                  <span className="text-[10px] text-amber-600/80 uppercase tracking-wide mt-1">Pendientes</span>
                </div>
                <div className="flex flex-col items-center px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 min-w-[60px]">
                  <span className="text-xl font-bold text-emerald-400 tabular-nums leading-none">{approved}</span>
                  <span className="text-[10px] text-emerald-600/80 uppercase tracking-wide mt-1">Aprobadas</span>
                </div>
                <div className="flex flex-col items-center px-4 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 min-w-[60px]">
                  <span className="text-xl font-bold text-rose-400 tabular-nums leading-none">{rejected}</span>
                  <span className="text-[10px] text-rose-600/80 uppercase tracking-wide mt-1">Rechazadas</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Estadísticas móvil (solo visible en sm-) */}
        <div className="grid grid-cols-4 gap-3 mb-6 sm:hidden">
          <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm text-center">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Total</div>
            <div className="text-2xl font-bold text-gray-900">{disposals.length}</div>
          </div>
          <div className="bg-white rounded-lg border border-amber-200 p-3 shadow-sm text-center">
            <div className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-1">Pendientes</div>
            <div className="text-2xl font-bold text-amber-600">{pending}</div>
          </div>
          <div className="bg-white rounded-lg border border-green-200 p-3 shadow-sm text-center">
            <div className="text-xs font-medium text-green-600 uppercase tracking-wide mb-1">Aprobadas</div>
            <div className="text-2xl font-bold text-green-600">{approved}</div>
          </div>
          <div className="bg-white rounded-lg border border-red-200 p-3 shadow-sm text-center">
            <div className="text-xs font-medium text-red-600 uppercase tracking-wide mb-1">Rechazadas</div>
            <div className="text-2xl font-bold text-red-600">{rejected}</div>
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
                              <span className="line-through">{formatChangeValue(change.field_name, change.old_value)}</span>
                              {' → '}
                              <span>{formatChangeValue(change.field_name, change.new_value)}</span>
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
              href="/assets/disposals"
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
