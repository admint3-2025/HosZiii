import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getLocationFilter } from '@/lib/supabase/locations'
import { StatusBadge } from '@/lib/ui/badges'
import { formatTicketCode } from '@/lib/tickets/code'
import MaintenanceTicketFilters from './ui/MaintenanceTicketFilters'

export default async function MaintenanceTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; search?: string; status?: string; priority?: string; location?: string }>
}) {
  const supabase = await createSupabaseServerClient()
  const params = await searchParams
  
  // Obtener usuario actual
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user ? await supabase
    .from('profiles')
    .select('role,asset_category')
    .eq('id', user.id)
    .single() : { data: null }

  // Validar acceso a mantenimiento
  const canAccessMaintenance = profile?.role === 'admin' || profile?.asset_category === 'MAINTENANCE'
  
  if (!canAccessMaintenance) {
    return (
      <main className="min-h-screen">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h2>
          <p className="text-gray-600">No tienes permisos para acceder a este módulo.</p>
        </div>
      </main>
    )
  }

  const canViewQueue = profile?.role === 'admin' || profile?.role === 'supervisor'
  const requestedView = params.view
  const defaultView = canViewQueue ? 'queue' : 'mine'
  const view = (requestedView === 'queue' || requestedView === 'mine')
    ? (requestedView === 'queue' && !canViewQueue ? 'mine' : requestedView)
    : defaultView

  const viewBadge = (() => {
    if (view === 'mine') return { label: 'Mis solicitudes', sub: null }
    if (profile?.role === 'admin') return { label: 'Bandeja', sub: 'Todas' }
    return { label: 'Bandeja', sub: 'Mantenimiento' }
  })()
  
  // Obtener filtro de ubicación
  const locationFilter = await getLocationFilter()
  
  // Construir query base - usando tabla tickets_maintenance
  let query = supabase
    .from('tickets_maintenance')
    .select('id,ticket_number,title,status,priority,support_level,created_at,description,location_id,locations!inner(code,name)')
    .is('deleted_at', null)

  // Aplicar filtro de ubicación
  if (locationFilter === null) {
    // Admin: sin filtro
  } else if (Array.isArray(locationFilter) && locationFilter.length > 0) {
    query = query.in('location_id', locationFilter)
  } else {
    query = query.eq('location_id', 'none')
  }

  // Aplicar filtros de vista
  if (view === 'mine') {
    if (user?.id) {
      query = query.eq('requester_id', user.id)
    } else {
      query = query.eq('id', 'none')
    }
  }

  if (view === 'queue') {
    if (user?.id) {
      query = query.neq('requester_id', user.id)
    }
  }

  if (params.search) {
    const searchTerm = params.search.toLowerCase()
    if (searchTerm.startsWith('#')) {
      const num = parseInt(searchTerm.substring(1))
      if (!isNaN(num)) {
        query = query.eq('ticket_number', num)
      }
    } else {
      query = query.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%`)
    }
  }
  
  if (params.status) {
    query = query.eq('status', params.status)
  }
  
  if (params.priority) {
    query = query.eq('priority', parseInt(params.priority))
  }

  if (params.location) {
    query = query.eq('location_id', params.location)
  }

  const [{ data: rawTickets, error }, { data: locations }] = await Promise.all([
    query.order('created_at', { ascending: false }).limit(100),
    supabase.from('locations').select('id,code,name').eq('is_active', true).order('code'),
  ])

  const tickets = (rawTickets ?? []).sort((a, b) => {
    const aClosed = a.status === 'CLOSED'
    const bClosed = b.status === 'CLOSED'

    if (aClosed !== bClosed) {
      return aClosed ? 1 : -1
    }

    const aCreated = a.created_at ? new Date(a.created_at as string).getTime() : 0
    const bCreated = b.created_at ? new Date(b.created_at as string).getTime() : 0
    return bCreated - aCreated
  })

  return (
    <main className="p-6 space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-600 via-red-600 to-red-700 p-6 shadow-lg">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-400/20 rounded-full blur-3xl -ml-32 -mb-32"></div>
        
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-white">Solicitudes de Mantenimiento</h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold text-white ring-1 ring-white/20">
                <span>{viewBadge.label}</span>
                {viewBadge.sub ? (
                  <span className="text-white/80">· {viewBadge.sub}</span>
                ) : null}
              </span>
            </div>
            <p className="text-orange-100 text-xs">Gestiona todas tus solicitudes de mantenimiento preventivo y correctivo</p>
          </div>
          <Link
            href="/mantenimiento/tickets/new"
            className="flex items-center gap-2 px-4 py-2 bg-white text-red-700 font-semibold rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva Solicitud
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white/80 p-1 shadow-sm">
        <Link
          href={`/mantenimiento/tickets?${(() => {
            const sp = new URLSearchParams()
            for (const [k, v] of Object.entries(params)) {
              if (k === 'view') continue
              if (typeof v === 'string' && v.length > 0) sp.set(k, v)
            }
            sp.set('view', 'mine')
            return sp.toString()
          })()}`}
          className={
            view === 'mine'
              ? 'px-4 py-2 rounded-lg text-sm font-semibold bg-orange-600 text-white shadow'
              : 'px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-white'
          }
        >
          Mis solicitudes
        </Link>

        {canViewQueue && (
          <Link
            href={`/mantenimiento/tickets?${(() => {
              const sp = new URLSearchParams()
              for (const [k, v] of Object.entries(params)) {
                if (k === 'view') continue
                if (typeof v === 'string' && v.length > 0) sp.set(k, v)
              }
              sp.set('view', 'queue')
              return sp.toString()
            })()}`}
            className={
              view === 'queue'
                ? 'px-4 py-2 rounded-lg text-sm font-semibold bg-orange-600 text-white shadow'
                : 'px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-white'
            }
          >
            Bandeja
          </Link>
        )}
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error.message}
          </div>
        </div>
      ) : null}

      {/* Filtros */}
      <MaintenanceTicketFilters locations={locations ?? []} />

      {/* Tabla */}
      <div className="card overflow-hidden shadow-lg border-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 py-4 text-center font-semibold text-gray-700 uppercase tracking-wider text-xs">
                  <svg className="w-4 h-4 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                  </svg>
                </th>
                <th className="px-6 py-4 text-left font-semibold text-gray-700 uppercase tracking-wider text-xs">#</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-700 uppercase tracking-wider text-xs">Título</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-700 uppercase tracking-wider text-xs">Estado</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-700 uppercase tracking-wider text-xs">Sede</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-700 uppercase tracking-wider text-xs">Creado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tickets.map((t) => {
                const priorityConfig: Record<number, { bg: string }> = {
                  1: { bg: 'bg-red-500' },
                  2: { bg: 'bg-orange-500' },
                  3: { bg: 'bg-blue-500' },
                  4: { bg: 'bg-gray-400' },
                }
                const config = priorityConfig[t.priority] || priorityConfig[3]
                
                return (
                  <tr key={t.id} className="hover:bg-orange-50/50 transition-colors duration-150 group">
                    <td className="px-4 py-4">
                      <div className="flex justify-center">
                        <div 
                          className={`w-8 h-8 ${config.bg} rounded-lg shadow-lg`}
                          title={`Prioridad: ${t.priority}`}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-800">
                      {formatTicketCode({ ticket_number: t.ticket_number, created_at: t.created_at })}
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/mantenimiento/tickets/${t.id}`} className="font-semibold text-gray-900 hover:text-orange-600 transition-colors">
                        {t.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex flex-col text-xs text-gray-700">
                        <span className="font-semibold">
                          {(t.locations as any)?.code || '—'}
                        </span>
                        {(t.locations as any)?.name && (
                          <span className="text-gray-500 text-[11px]">{(t.locations as any).name}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-600 text-xs">
                        {new Date(t.created_at).toLocaleString('es-MX', { 
                          timeZone: 'America/Mexico_City',
                          day: '2-digit', 
                          month: 'short', 
                          year: 'numeric',
                        })}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {tickets?.length === 0 ? (
                <tr>
                  <td className="px-6 py-16 text-center" colSpan={6}>
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-gray-100 rounded-full">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-gray-900 font-medium">No hay solicitudes</p>
                        <p className="text-gray-500 text-sm mt-1">Crea la primera solicitud de mantenimiento</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
