import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getLocationFilter } from '@/lib/supabase/locations'
import { StatusBadge } from '@/lib/ui/badges'
import { formatMaintenanceTicketCode as formatTicketCode } from '@/lib/tickets/code'
import MaintenanceTicketFilters from './ui/MaintenanceTicketFilters'
import { isMaintenanceAssetCategory } from '@/lib/permissions/asset-category'
import MaintenanceBanner from '../ui/MaintenanceBanner'

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
    .select('role, asset_category, is_maintenance_supervisor')
    .eq('id', user.id)
    .single() : { data: null }

  const normalizedRole = String(profile?.role ?? '').trim().toLowerCase()
  const isAdmin = normalizedRole === 'admin'

  // Verificar si tiene permisos de supervisor de mantenimiento
  const isMaintenanceSupervisor = isAdmin || 
    (normalizedRole === 'supervisor' && isMaintenanceAssetCategory(profile?.asset_category)) ||
    (normalizedRole === 'corporate_admin' && profile?.is_maintenance_supervisor === true)

  // Admin, supervisores de mantenimiento y técnicos (L1/L2) de mantenimiento pueden ver la bandeja
  const canManageMaintenance = isAdmin || 
    isMaintenanceSupervisor ||
    ((normalizedRole === 'agent_l1' || normalizedRole === 'agent_l2') && 
     isMaintenanceAssetCategory(profile?.asset_category))
  
  // Determinar vista permitida
  const canViewQueue = canManageMaintenance
  const requestedView = params.view
  const defaultView = canViewQueue ? 'queue' : 'mine'
  const view = (requestedView === 'queue' || requestedView === 'mine')
    ? (requestedView === 'queue' && !canViewQueue ? 'mine' : requestedView)
    : defaultView

  const viewBadge = (() => {
    if (view === 'mine') return { label: 'Mis solicitudes', sub: null }
    if (isAdmin) return { label: 'Bandeja', sub: 'Todas' }
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
    // Ver solo tickets donde soy el solicitante
    if (user?.id) {
      query = query.eq('requester_id', user.id)
    } else {
      query = query.eq('id', 'none')
    }
  }

  if (view === 'queue') {
    // Bandeja: Ver tickets que NO soy el solicitante (pueden estar asignados a mí o sin asignar)
    // Los técnicos de mantenimiento ven todos los tickets de su sede (filtrados por locationFilter arriba)
    // IMPORTANTE: Manejar NULL correctamente (tickets sin solicitante también se muestran)
    if (user?.id) {
      query = query.or(`requester_id.neq.${user.id},requester_id.is.null`)
    }
  }

  if (params.search) {
    const searchTerm = params.search.toLowerCase()
    if (searchTerm.startsWith('#')) {
      const raw = searchTerm.substring(1).trim().toUpperCase()
      if (raw.startsWith('MANT-')) {
        query = query.eq('ticket_number', raw)
      } else if (/^\d+$/.test(raw)) {
        const seq = raw.padStart(4, '0').slice(-4)
        // Compatibilidad: buscar por secuencia (XXXX) en tickets formateados
        // y también por igualdad exacta por si existen tickets legacy numéricos.
        query = query.or(`ticket_number.eq.${raw},ticket_number.ilike.MANT-%-${seq}`)
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
      <MaintenanceBanner
        title="Solicitudes de Mantenimiento"
        subtitle="Gestiona todas tus solicitudes de mantenimiento preventivo y correctivo"
        badge={viewBadge}
        actionLabel="Nueva Solicitud"
        actionHref="/mantenimiento/tickets/new"
        icon={
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        }
      />

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
