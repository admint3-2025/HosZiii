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
    <main className="p-6 space-y-6">

      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 shadow-md">
        <div className="absolute top-0 right-0 w-56 h-56 bg-rose-500/5 rounded-full blur-3xl -mr-28 -mt-28 pointer-events-none" />
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500/60 pointer-events-none" />
        <div className="relative z-10 px-5 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/reports"
              className="w-8 h-8 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center hover:bg-white/20 transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mb-0.5">Reportes · Activos</p>
              <h1 className="text-xl font-bold text-white">Solicitudes de Baja</h1>
              <p className="text-slate-400 text-sm mt-0.5">Desincorporación de activos con snapshot y auditoría completa</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── STATS GRID ──────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card border-gray-200">
          <div className="card-body">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</div>
            <div className="text-3xl font-bold text-gray-900 mt-1">{disposals.length}</div>
            <div className="text-xs text-gray-400 mt-1">Solicitudes registradas</div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
          <div className="card-body">
            <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Pendientes</div>
            <div className="text-3xl font-bold text-amber-700 mt-1">{pending}</div>
            <div className="text-xs text-amber-600/70 mt-1">Esperando autorización</div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
          <div className="card-body">
            <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Aprobadas</div>
            <div className="text-3xl font-bold text-emerald-700 mt-1">{approved}</div>
            <div className="text-xs text-emerald-600/70 mt-1">Bajas autorizadas</div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
          <div className="card-body">
            <div className="text-xs font-semibold text-red-700 uppercase tracking-wide">Rechazadas</div>
            <div className="text-3xl font-bold text-red-700 mt-1">{rejected}</div>
            <div className="text-xs text-red-600/70 mt-1">Solicitudes denegadas</div>
          </div>
        </div>
      </div>

      {/* ── ALERTA PENDIENTES ────────────────────────────────────────── */}
      {pending > 0 && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-2 text-amber-800 text-sm font-medium">
            <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            {pending} solicitud{pending > 1 ? 'es' : ''} pendiente{pending > 1 ? 's' : ''} de revisión
          </div>
          <Link href="/assets/disposals" className="btn btn-warning btn-sm">
            Revisar →
          </Link>
        </div>
      )}

      {/* ── LISTA DE SOLICITUDES ─────────────────────────────────────── */}
      {disposals.length === 0 ? (
        <div className="card">
          <div className="card-body items-center py-16 text-center text-gray-400">
            <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <p className="font-medium text-gray-500">No hay solicitudes de baja registradas</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {disposals.map((disposal) => {
            const snap = disposal.asset_snapshot as Record<string, unknown> | null
            const assetTag = String(disposal.asset?.asset_tag ?? snap?.asset_tag ?? 'Sin etiqueta')
            const assetType = String(disposal.asset?.asset_type ?? snap?.asset_type ?? '')
            const isApproved = disposal.status === 'approved'
            const isRejected = disposal.status === 'rejected'

            return (
              <div key={disposal.id} className="card overflow-hidden">
                {/* ── Banda de estado superior ── */}
                <div className={`h-1 w-full ${isApproved ? 'bg-emerald-400' : isRejected ? 'bg-red-400' : 'bg-amber-400'}`} />

                <div className="card-body p-0">
                  {/* ── Cabecera de la tarjeta ── */}
                  <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isApproved ? 'bg-emerald-100 text-emerald-600' :
                        isRejected ? 'bg-red-100 text-red-600' :
                        'bg-amber-100 text-amber-600'
                      }`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-gray-900 text-base">{assetTag}</h3>
                          {assetType && (
                            <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{assetType}</span>
                          )}
                          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                            isApproved ? 'bg-emerald-100 text-emerald-700' :
                            isRejected ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {statusLabels[disposal.status].label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Solicitado por <span className="text-gray-600 font-medium">{disposal.requester?.full_name ?? 'Desconocido'}</span>
                          {' · '}
                          {new Date(disposal.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <ExportPDFButton disposal={disposal} />
                    </div>
                  </div>

                  {/* ── Cuerpo: grid de 2 columnas ── */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-100">

                    {/* Columna izquierda: motivo + resolución */}
                    <div className="px-5 py-4 space-y-4">
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Motivo de la solicitud</p>
                        <p className="text-sm text-gray-700 leading-relaxed">{disposal.reason}</p>
                      </div>

                      {disposal.status !== 'pending' && (
                        <div className={`rounded-lg p-3 ${isApproved ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'}`}>
                          <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1 ${isApproved ? 'text-emerald-600' : 'text-red-600'}`}>
                            {isApproved ? 'Aprobado por' : 'Rechazado por'}
                          </p>
                          <p className={`text-sm font-medium ${isApproved ? 'text-emerald-800' : 'text-red-800'}`}>
                            {disposal.reviewer?.full_name ?? 'Desconocido'}
                            {disposal.reviewed_at && (
                              <span className="font-normal text-xs ml-2 opacity-70">
                                {new Date(disposal.reviewed_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                            )}
                          </p>
                          {disposal.review_notes && (
                            <p className={`text-xs mt-1 ${isApproved ? 'text-emerald-700' : 'text-red-700'}`}>{disposal.review_notes}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Columna derecha: snapshot resumido */}
                    {snap && (
                      <div className="px-5 py-4">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Datos del activo (snapshot)</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                          {(['brand','model','serial_number','status','location_name','department','assigned_user_name','purchase_date'] as const).map((key) => {
                            const val = formatValue(key, snap[key])
                            if (!val) return null
                            return (
                              <div key={key} className="min-w-0">
                                <p className="text-[10px] text-gray-400 leading-tight">{fieldLabels[key] ?? key}</p>
                                <p className="text-xs font-medium text-gray-800 truncate">{val}</p>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Footer: detalles colapsables ── */}
                  <div className="px-5 pb-4 pt-2 border-t border-gray-100 flex flex-wrap gap-3">
                    {snap && (
                      <details className="group w-full">
                        <summary className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 select-none list-none">
                          <svg className="w-3.5 h-3.5 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          Ver snapshot completo
                        </summary>
                        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-2 text-xs bg-gray-50 rounded-lg p-3 border border-gray-100">
                          {Object.entries(snap).map(([key, value]) => {
                            const formatted = formatValue(key, value)
                            if (!formatted || ['id','created_at','updated_at'].includes(key)) return null
                            const label = fieldLabels[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                            return (
                              <div key={key} className="min-w-0">
                                <p className="text-gray-400 text-[10px] leading-tight">{label}</p>
                                <p className="text-gray-700 font-medium truncate">{formatted}</p>
                              </div>
                            )
                          })}
                        </div>
                      </details>
                    )}

                    {disposal.changes_snapshot && disposal.changes_snapshot.length > 0 && (
                      <details className="group w-full">
                        <summary className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 select-none list-none">
                          <svg className="w-3.5 h-3.5 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          Cambios ({disposal.changes_snapshot.length})
                        </summary>
                        <div className="mt-2 divide-y divide-gray-100 text-xs rounded-lg border border-gray-100 overflow-hidden">
                          {(disposal.changes_snapshot as Array<{ field_name: string; old_value: string; new_value: string; changed_at: string; changed_by_name?: string }>).map((change, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-4 px-3 py-2 bg-white hover:bg-gray-50">
                              <div className="min-w-0">
                                <span className="font-semibold text-gray-700">{fieldLabels[change.field_name] ?? change.field_name}</span>
                                <span className="mx-1.5 text-gray-300">·</span>
                                <span className="text-gray-400 line-through">{formatChangeValue(change.field_name, change.old_value)}</span>
                                <span className="mx-1 text-gray-300">→</span>
                                <span className="text-gray-700">{formatChangeValue(change.field_name, change.new_value)}</span>
                              </div>
                              <span className="text-gray-400 flex-shrink-0 whitespace-nowrap">
                                {change.changed_by_name ?? 'Sistema'} · {new Date(change.changed_at).toLocaleDateString('es-ES')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
