import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getLocationFilter } from '@/lib/supabase/locations'
import { getCategoryPathLabel } from '@/lib/categories/path'
import { StatusBadge } from '@/lib/ui/badges'
import { formatTicketCode } from '@/lib/tickets/code'
import TicketFilters from './ui/TicketFilters'
import { isITAssetCategoryOrUnassigned, isMaintenanceAssetCategory } from '@/lib/permissions/asset-category'

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; search?: string; status?: string; priority?: string; level?: string; category?: string; location?: string }>
}) {
  const supabase = await createSupabaseServerClient()
  const params = await searchParams
  
  // Obtener usuario actual para validar departamento
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user ? await supabase
    .from('profiles')
    .select('department, role, asset_category, is_it_supervisor, is_maintenance_supervisor, hub_visible_modules')
    .eq('id', user.id)
    .single() : { data: null }
  
  const isVentasDept = profile?.department?.toLowerCase().includes('ventas')

  const normalizedRole = String(profile?.role ?? '').trim().toLowerCase()
  const isAdmin = normalizedRole === 'admin'
  const isCorporateAdmin = normalizedRole === 'corporate_admin'
  const hubModules = profile?.hub_visible_modules as Record<string, boolean> | null
  
  // corporate_admin: verificar hub_visible_modules, otros roles: verificar asset_category
  const canManageIT = isAdmin || 
    (isCorporateAdmin && hubModules?.['it-helpdesk'] === true) ||
    (!isCorporateAdmin && isITAssetCategoryOrUnassigned(profile?.asset_category))
  
  // Verificar si tiene permisos de supervisor (rol supervisor O corporate_admin con permiso IT en hub_visible_modules)
  const isITSupervisor = isAdmin || 
    (normalizedRole === 'supervisor' && canManageIT) ||
    (isCorporateAdmin && hubModules?.['it-helpdesk'] === true)
  
  // Solo admin y supervisores IT pueden ver la bandeja completa
  const canViewQueue = isITSupervisor
  const requestedView = params.view
  const defaultView = canViewQueue ? 'queue' : 'mine'
  const view = (requestedView === 'queue' || requestedView === 'mine')
    ? (requestedView === 'queue' && !canViewQueue ? 'mine' : requestedView)
    : defaultView

  const inferredServiceArea = (() => {
    if (isMaintenanceAssetCategory(profile?.asset_category)) return 'maintenance'
    if (isITAssetCategoryOrUnassigned(profile?.asset_category)) return 'it'
    const dept = (profile?.department ?? '').toLowerCase()
    if (dept.includes('mantenim')) return 'maintenance'
    return 'it'
  })()

  const viewBadge = (() => {
    const areaLabel = inferredServiceArea === 'maintenance' ? 'Mantenimiento' : 'IT'
    if (view === 'mine') return { label: 'Mis tickets', sub: null }
    if (isITSupervisor && !isAdmin) return { label: 'Bandeja', sub: areaLabel }
    if (isAdmin) return { label: 'Bandeja', sub: 'IT + Mantenimiento' }
    return { label: 'Bandeja', sub: null }
  })()
  
  // Admin SIEMPRE ve todo sin filtros de ubicación
  const locationFilter = isAdmin ? null : await getLocationFilter()
  
  // Construir query base
  let query = supabase
    .from('tickets')
    // Importante: NO usar !inner aquí, porque puede excluir tickets con location_id NULL
    // o con sedes legacy eliminadas. Con left join, el ticket sigue visible (locations=null).
    .select('id,ticket_number,title,status,priority,support_level,created_at,category_id,description,location_id,locations(code,name)')
    .is('deleted_at', null)

  // Aplicar filtro de ubicación (Admin NO tiene filtros)
  if (isAdmin) {
    // Admin: sin ningún filtro de ubicación, ve TODAS las sedes
  } else if (locationFilter === null) {
    // Otro caso sin filtro (legacy)
  } else if (Array.isArray(locationFilter) && locationFilter.length > 0) {
    // Supervisor/Técnico con múltiples sedes
    query = query.in('location_id', locationFilter)
  } else {
    // Sin sedes asignadas: no mostrar tickets
    query = query.eq('location_id', 'none')
  }

  // Aplicar filtros
  if (view === 'mine') {
    if (user?.id) {
      // "Mis tickets" incluye tickets creados por mí o asignados a mí.
      // Esto evita que técnicos (agent_l1/agent_l2) queden sin visibilidad
      // de tickets asignados cuando no tienen acceso a la bandeja completa.
      query = query.or(`requester_id.eq.${user.id},assigned_agent_id.eq.${user.id}`)
    } else {
      // Sin usuario: no mostrar tickets
      query = query.eq('id', 'none')
    }
  }

  if (view === 'queue') {
    // Admin ve TODO en bandeja, incluyendo tickets propios y requester_id NULL.
    if (!isAdmin && user?.id) {
      // Evita mezclar solicitudes propias dentro de la cola operativa,
      // pero incluye tickets legacy sin solicitante.
      query = query.or(`requester_id.neq.${user.id},requester_id.is.null`)
    }

    // Admin ve TODO (IT + Mantenimiento), Supervisor solo ve su área
    if (normalizedRole === 'supervisor') {
      // Asegura que la cola sea solo del área del supervisor
      query = query.eq('service_area', inferredServiceArea)
    }
    // Admin NO tiene filtro de service_area, ve ambos
  }

  if (params.search) {
    const searchTerm = params.search.toLowerCase()
    // Buscar en ticket_number, título o descripción
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
  
  if (params.level) {
    query = query.eq('support_level', parseInt(params.level))
  }
  
  if (params.category) {
    query = query.eq('category_id', params.category)
  }
  
  if (params.location) {
    query = query.eq('location_id', params.location)
  }

  const [{ data: rawTickets, error }, { data: categories }, { data: locations }] = await Promise.all([
    query.order('created_at', { ascending: false }).limit(100),
    supabase.from('categories').select('id,name,parent_id'),
    supabase.from('locations').select('id,code,name').eq('is_active', true).order('code'),
  ])

  const tickets = (rawTickets ?? []).sort((a, b) => {
    const aClosed = a.status === 'CLOSED'
    const bClosed = b.status === 'CLOSED'

    if (aClosed !== bClosed) {
      // Tickets abiertos (no cerrados) primero, cerrados al final
      return aClosed ? 1 : -1
    }

    // Dentro del mismo grupo, más recientes primero
    const aCreated = a.created_at ? new Date(a.created_at as string).getTime() : 0
    const bCreated = b.created_at ? new Date(b.created_at as string).getTime() : 0
    return bCreated - aCreated
  })

  return (
    <main className="p-6 space-y-6">
      {/* Header con gradiente y mejor diseño */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-6 shadow-lg">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl -ml-32 -mb-32"></div>
        
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-white">Tickets</h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold text-white ring-1 ring-white/20">
                <span>{viewBadge.label}</span>
                {viewBadge.sub ? (
                  <span className="text-white/80">· {viewBadge.sub}</span>
                ) : null}
              </span>
            </div>
            <p className="text-blue-100 text-xs">Gestiona y da seguimiento a todas las solicitudes de soporte</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link
              href="/tickets/new?area=it"
              className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-700 font-semibold rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 text-sm ring-1 ring-white/40"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Crear Ticket
            </Link>

            {isVentasDept && (
              <Link
                href="/tickets/beo/new"
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Crear Ticket BEO
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white/80 p-1 shadow-sm">
        <Link
          href={`/tickets?${(() => {
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
              ? 'px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white shadow'
              : 'px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-white'
          }
        >
          Mis tickets
        </Link>

        {canViewQueue && (
          <Link
            href={`/tickets?${(() => {
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
                ? 'px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white shadow'
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
      <TicketFilters categories={categories ?? []} locations={locations ?? []} />

      {/* Tabla mejorada con diseño moderno */}
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
              <th className="px-6 py-4 text-left font-semibold text-gray-700 uppercase tracking-wider text-xs">Categoría</th>
              <th className="px-6 py-4 text-left font-semibold text-gray-700 uppercase tracking-wider text-xs">Estado</th>
              <th className="px-6 py-4 text-left font-semibold text-gray-700 uppercase tracking-wider text-xs">Sede</th>
              <th className="px-6 py-4 text-left font-semibold text-gray-700 uppercase tracking-wider text-xs">Creado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tickets.map((t) => {
              // Configuración del semáforo según prioridad (P1=Crítica, P2=Alta, P3=Media, P4=Baja)
              const priorityConfig: Record<number, { bg: string, border: string, glow: string, pulse: string }> = {
                1: { bg: 'bg-red-500', border: 'border-red-600', glow: 'shadow-red-500/50', pulse: 'animate-pulse' }, // Crítica
                2: { bg: 'bg-orange-500', border: 'border-orange-600', glow: 'shadow-orange-500/50', pulse: 'animate-pulse' }, // Alta
                3: { bg: 'bg-blue-500', border: 'border-blue-600', glow: 'shadow-blue-500/50', pulse: '' }, // Media
                4: { bg: 'bg-gray-400', border: 'border-gray-500', glow: 'shadow-gray-400/50', pulse: '' }, // Baja
                5: { bg: 'bg-purple-500', border: 'border-purple-600', glow: 'shadow-purple-500/50', pulse: 'animate-pulse' }, // Urgente (adicional)
              }
              const config = priorityConfig[t.priority] || priorityConfig[3]
              
              const priorityLabel: Record<number, string> = {
                1: 'Crítica',
                2: 'Alta', 
                3: 'Media',
                4: 'Baja',
                5: 'Urgente'
              }
              
              return (
                <tr key={t.id} className="hover:bg-blue-50/50 transition-colors duration-150 group">
                  <td className="px-4 py-4">
                    <div className="flex justify-center">
                      <div 
                        className={`relative flex items-center justify-center w-8 h-8 ${config.bg} rounded-lg shadow-lg ${config.glow} ${config.pulse} transform transition-transform group-hover:scale-110`}
                        title={`Prioridad: ${priorityLabel[t.priority] || 'N/A'}`}
                      >
                        {/* Icono según prioridad */}
                        {t.priority >= 3 && (
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        )}
                        {t.priority === 4 && (
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        )}
                        {/* Pulso adicional para prioridades altas */}
                        {t.priority <= 2 && (
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.bg} opacity-75`}></span>
                            <span className={`relative inline-flex rounded-full h-3 w-3 ${config.bg} border border-white`}></span>
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-800">
                    {formatTicketCode({ ticket_number: t.ticket_number, created_at: t.created_at })}
                  </td>
        <td className="px-6 py-4">
          <Link href={`/tickets/${t.id}`} className="font-semibold text-gray-900 hover:text-blue-600 transition-colors flex items-center gap-2 group/link">
          <span className="group-hover/link:underline">{t.title}</span>
          <svg className="w-4 h-4 opacity-0 group-hover/link:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          </Link>
        </td>
        <td className="px-6 py-4">
          <span className="inline-flex items-center gap-1.5 text-gray-700 text-xs">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    {getCategoryPathLabel(categories ?? [], t.category_id) || '—'}
                  </span>
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
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {new Date(t.created_at).toLocaleString('es-MX', { 
                      timeZone: 'America/Mexico_City',
                      day: '2-digit', 
                      month: 'short', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </td>
              </tr>
              )
            })}
            {tickets?.length === 0 ? (
              <tr>
					<td className="px-6 py-16 text-center" colSpan={7}>
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-4 bg-gray-100 rounded-full">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-gray-900 font-medium">No hay tickets todavía</p>
                      <p className="text-gray-500 text-sm mt-1">Crea el primer ticket para comenzar</p>
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
