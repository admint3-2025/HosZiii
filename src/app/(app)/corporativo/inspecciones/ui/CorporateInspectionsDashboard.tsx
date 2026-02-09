'use client'

import { useEffect, useMemo, useState } from 'react'

import { createSupabaseBrowserClient, getSafeUser } from '@/lib/supabase/browser'
import { InspectionsRRHHService } from '@/lib/services/inspections-rrhh.service'

type Department = {
  id: string
  name: string
}

type LocationOption = {
  id: string
  code: string
  name: string
}

const DEPARTMENTS: Department[] = [
  { id: 'rrhh', name: 'RECURSOS HUMANOS' },
  { id: 'gsh', name: 'GSH' },
  { id: 'cuartos', name: 'DIV. CUARTOS' },
  { id: 'mantenimiento', name: 'MANTENIMIENTO' },
  { id: 'sistemas', name: 'SISTEMAS' },
  { id: 'marketing', name: 'MARKETING' },
  { id: 'alimentos', name: 'ALIMENTOS Y BEBIDAS' },
  { id: 'llaves', name: 'AMA DE LLAVES' },
  { id: 'contabilidad', name: 'CONTABILIDAD' },
]

const ALL_DEPARTMENTS_OPTION: Department = { id: 'all', name: 'TODOS' }

const normalizeDepartmentName = (value: string) => value.trim().toLowerCase()

export default function CorporateInspectionsDashboard({
  onNewInspection,
}: {
  onNewInspection: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accessWarning, setAccessWarning] = useState<string | null>(null)

  const [role, setRole] = useState<string | null>(null)
  const [allowedDepartments, setAllowedDepartments] = useState<string[] | null>(null)
  const [hubModules, setHubModules] = useState<Record<string, boolean> | null>(null)

  const [locations, setLocations] = useState<LocationOption[]>([])
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([])

  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null)

  const [statsLoading, setStatsLoading] = useState(false)
  const [stats, setStats] = useState<any>(null)

  const visibleDepartments = useMemo(() => {
    if (role === 'admin') {
      return [ALL_DEPARTMENTS_OPTION, ...DEPARTMENTS]
    }

    // Para corporate_admin, los departamentos visibles vienen del perfil (allowed_departments)
    if (!allowedDepartments || allowedDepartments.length === 0) {
      return []
    }

    const allowedSet = new Set(allowedDepartments.map(normalizeDepartmentName))
    const filtered = DEPARTMENTS.filter((d) => allowedSet.has(normalizeDepartmentName(d.name)))

    if (filtered.length <= 1) {
      return filtered
    }

    return [ALL_DEPARTMENTS_OPTION, ...filtered]
  }, [allowedDepartments, role])

  // Obtener ubicaciones asignadas al usuario (para mostrar sus inspecciones)
  const userLocationIds = useMemo(() => {
    if (role === 'admin') {
      // Admin ve todas las ubicaciones
      return locations.map(l => l.id)
    } else {
      // Corporate admin ve solo sus ubicaciones asignadas, no las del departamento
      return locations.map(l => l.id)
    }
  }, [role, locations])


  useEffect(() => {
    const load = async () => {
      const supabase = createSupabaseBrowserClient()
      const user = await getSafeUser(supabase)

      if (!user) {
        setError('Sesión inválida. Vuelve a iniciar sesión.')
        setLoading(false)
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, allowed_departments, location_id, hub_visible_modules')
        .eq('id', user.id)
        .single()

      if (profileError) {
        setError(profileError.message)
        setLoading(false)
        return
      }

      const profileRole = (profile?.role as string) || null
      setRole(profileRole)
      setAllowedDepartments((profile?.allowed_departments as string[]) || null)
      setHubModules((profile?.hub_visible_modules as Record<string, boolean>) || null)

      // Verificar permiso de inspecciones para corporate_admin
      const userHubModules = profile?.hub_visible_modules as Record<string, boolean> | null
      if (profileRole === 'corporate_admin' && userHubModules && userHubModules['inspecciones-rrhh'] === false) {
        setAccessWarning('No tienes permisos para acceder a las inspecciones corporativas.')
        setLoading(false)
        return
      }

      // Cargar ubicaciones según el rol
      let mapped: LocationOption[] = []

      if (profileRole === 'admin') {
        // Admin ve todas las ubicaciones
        const { data: allLocations, error: locError } = await supabase
          .from('locations')
          .select('id, code, name')
          .order('code')

        if (locError) {
          setError(locError.message)
          setLoading(false)
          return
        }

        mapped = (allLocations || []).map((l: any) => ({ id: l.id, code: l.code, name: l.name }))
      } else {
        // Corporate admin: primero intentar cargar desde user_locations
        const { data: userLocData, error: ulError } = await supabase
          .from('user_locations')
          .select('location_id, locations(id, code, name)')
          .eq('user_id', user.id)

        if (ulError) {
          setError(ulError.message)
          setLoading(false)
          return
        }

        mapped = (userLocData || [])
          .map((row: any) => row.locations)
          .filter(Boolean)
          .map((l: any) => ({ id: l.id, code: l.code, name: l.name }))

        // Si tiene location_id pero no está en user_locations, agregarlo
        if (profile?.location_id && !mapped.some(m => m.id === profile.location_id)) {
          const { data: locData } = await supabase
            .from('locations')
            .select('id, code, name')
            .eq('id', profile.location_id)
            .single()

          if (locData) {
            mapped.push({ id: locData.id, code: locData.code, name: locData.name })
          }
        }

        // Si no tiene ubicaciones asignadas, cargar todas las activas (corporate_admin global)
        if (mapped.length === 0 && !profile?.location_id) {
          const { data: allLocs, error: allLocsError } = await supabase
            .from('locations')
            .select('id, code, name')
            .eq('is_active', true)
            .order('code')

          if (allLocsError) {
            setError(allLocsError.message)
            setLoading(false)
            return
          }

          mapped = (allLocs || []).map((l: any) => ({ id: l.id, code: l.code, name: l.name }))
        }
      }

      setLocations(mapped)
      setSelectedLocationIds(mapped.map((l) => l.id))

      setSelectedDepartment((prev) => prev ?? null)
      setLoading(false)
    }

    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (loading) return

    if (!visibleDepartments || visibleDepartments.length === 0) {
      setSelectedDepartment(null)
      return
    }

    setSelectedDepartment((prev) => {
      if (!prev) return visibleDepartments[0]
      const stillVisible = visibleDepartments.some((d) => d.id === prev.id)
      return stillVisible ? prev : visibleDepartments[0]
    })
  }, [loading, visibleDepartments])

  useEffect(() => {
    const loadStats = async () => {
      if (loading) return

      setAccessWarning(null)

      if (!selectedDepartment) {
        // Si no hay departamentos visibles (p.ej. corporate_admin sin allowed_departments)
        if (role !== 'admin') {
          setAccessWarning('No tienes departamentos asignados. Solicita al administrador que te asigne permisos de inspección.')
          setStats({
            totalInspections: 0,
            pendingApproval: 0,
            averageScore: 0,
            recentInspections: [],
          })
        }
        return
      }

      if (!selectedLocationIds || selectedLocationIds.length === 0) {
        setStats({
          totalInspections: 0,
          pendingApproval: 0,
          averageScore: 0,
          recentInspections: [],
        })
        return
      }

      setStatsLoading(true)
      try {
        const isAllDepartments = selectedDepartment.id === ALL_DEPARTMENTS_OPTION.id

        let department: string | undefined
        let departments: string[] | undefined

        if (role === 'admin') {
          if (!isAllDepartments) {
            department = selectedDepartment.name
          }
        } else {
          // corporate_admin: restringir SIEMPRE a sus allowed_departments
          if (!allowedDepartments || allowedDepartments.length === 0) {
            setAccessWarning('No tienes departamentos asignados. Solicita al administrador que te asigne permisos de inspección.')
            setStats({
              totalInspections: 0,
              pendingApproval: 0,
              averageScore: 0,
              recentInspections: [],
            })
            return
          }

          const allowedSet = new Set(allowedDepartments.map(normalizeDepartmentName))
          const allowedCanonical = DEPARTMENTS.filter((d) => allowedSet.has(normalizeDepartmentName(d.name))).map((d) => d.name)

          if (allowedCanonical.length === 0) {
            setAccessWarning('No tienes departamentos asignados. Solicita al administrador que te asigne permisos de inspección.')
            setStats({
              totalInspections: 0,
              pendingApproval: 0,
              averageScore: 0,
              recentInspections: [],
            })
            return
          }

          if (isAllDepartments) {
            departments = allowedCanonical
          } else {
            const isAllowed = allowedSet.has(normalizeDepartmentName(selectedDepartment.name))
            if (!isAllowed) {
              setStats({
                totalInspections: 0,
                pendingApproval: 0,
                averageScore: 0,
                recentInspections: [],
              })
              return
            }
            department = selectedDepartment.name
          }
        }

        const { data, error } = await InspectionsRRHHService.getLocationsStats(selectedLocationIds, {
          department,
          departments,
          filterByCurrentUser: false,
          recentLimit: 12,
        })

        if (error) {
          setError(error.message || 'Error cargando estadísticas')
          setStats(null)
        } else {
          setStats(data)
        }
      } finally {
        setStatsLoading(false)
      }
    }

    loadStats()
  }, [allowedDepartments, loading, role, selectedDepartment, selectedLocationIds])

  const selectedLocationsLabel = useMemo(() => {
    if (role === 'admin' && selectedLocationIds.length === locations.length) return 'Todas las sedes'
    if (selectedLocationIds.length === 0) return 'Sin sedes'
    if (selectedLocationIds.length === 1) {
      const loc = locations.find((l) => l.id === selectedLocationIds[0])
      return loc ? `${loc.code}` : '1 sede'
    }
    return `${selectedLocationIds.length} sedes`
  }, [locations, role, selectedLocationIds])

  const toggleLocation = (id: string) => {
    setSelectedLocationIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      return [...prev, id]
    })
  }

  const selectAll = () => setSelectedLocationIds(locations.map((l) => l.id))
  const clearAll = () => setSelectedLocationIds([])

  if (loading) {
    return (
      <div className="p-6">
        <div className="inline-block w-6 h-6 border-2 border-slate-200 border-t-amber-500 rounded-full animate-spin"></div>
        <p className="text-slate-500 text-sm mt-2">Cargando tablero corporativo...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
          <p className="text-rose-800 text-sm font-semibold">Error</p>
          <p className="text-rose-700 text-sm mt-1">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-50">
      <div className="p-4 space-y-4">
        {/* Filtros */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          {accessWarning && (
            <div className="mb-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-amber-900 text-xs font-semibold">Permisos</p>
              <p className="text-amber-800 text-xs mt-1">{accessWarning}</p>
            </div>
          )}

          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-700">Departamento</label>
              <select
                value={selectedDepartment?.id || ''}
                onChange={(e) => {
                  const dept = visibleDepartments.find((d) => d.id === e.target.value) || null
                  setSelectedDepartment(dept)
                }}
                disabled={visibleDepartments.length === 0}
                className="mt-1 w-full md:max-w-sm border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
              >
                {visibleDepartments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onNewInspection}
                className="px-3 py-2 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
              >
                + Nueva Inspección
              </button>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-700">Sedes ({selectedLocationsLabel})</p>
                <p className="text-[11px] text-slate-500">Sedes inspeccionables: todas. El filtro de permisos es por departamentos.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-300 bg-white hover:bg-slate-50"
                >
                  Seleccionar todas
                </button>
                <button
                  onClick={clearAll}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-300 bg-white hover:bg-slate-50"
                >
                  Limpiar
                </button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {locations.map((loc) => {
                const checked = selectedLocationIds.includes(loc.id)
                return (
                  <label
                    key={loc.id}
                    className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer select-none ${
                      checked ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleLocation(loc.id)}
                      className="accent-amber-600"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 truncate">{loc.code}</div>
                      <div className="text-[10px] text-slate-500 truncate">{loc.name}</div>
                    </div>
                  </label>
                )
              })}
            </div>

            {locations.length === 0 && (
              <div className="mt-3 text-sm text-slate-600">No tienes sedes asignadas.</div>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="p-4 border border-slate-200 rounded-lg bg-white">
            <p className="text-slate-600 text-xs font-medium">Sedes Seleccionadas</p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-slate-900">{selectedLocationIds.length}</span>
              <span className="text-[10px] text-slate-400">sedes</span>
            </div>
          </div>
          <div className="p-4 border border-slate-200 rounded-lg bg-white">
            <p className="text-slate-600 text-xs font-medium">Total Inspecciones</p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-slate-900">{stats?.totalInspections ?? 0}</span>
              <span className="text-[10px] text-slate-400">inspecciones</span>
            </div>
          </div>
          <div className="p-4 border border-slate-200 rounded-lg bg-white">
            <p className="text-slate-600 text-xs font-medium">Promedio Histórico</p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-slate-900">{stats?.averageScore ?? 0}%</span>
              <span className="text-[10px] text-slate-400">desempeño</span>
            </div>
          </div>
          <div className="p-4 border border-slate-200 rounded-lg bg-white">
            <p className="text-slate-600 text-xs font-medium">Por Aprobar</p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-slate-900">{stats?.pendingApproval ?? 0}</span>
              <span className="text-[10px] text-slate-400">pendientes</span>
            </div>
          </div>
          <div className="p-4 border border-slate-200 rounded-lg bg-white">
            <p className="text-slate-600 text-xs font-medium">Últimas</p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-slate-900">{stats?.recentInspections?.length ?? 0}</span>
              <span className="text-[10px] text-slate-400">registros</span>
            </div>
          </div>
        </div>

        {/* Listado */}
        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Últimas Inspecciones</h2>
            {statsLoading && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <div className="inline-block w-4 h-4 border-2 border-slate-200 border-t-amber-500 rounded-full animate-spin"></div>
                Actualizando...
              </div>
            )}
          </div>

          {(!stats?.recentInspections || stats.recentInspections.length === 0) && !statsLoading ? (
            <div className="text-center py-10 px-4">
              <p className="text-slate-700 font-medium text-sm">No hay inspecciones para el filtro actual</p>
              <p className="text-slate-500 text-xs mt-1">Ajusta sedes/departamento o crea una nueva inspección.</p>
              <button
                onClick={onNewInspection}
                className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
              >
                Nueva Inspección
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {(stats?.recentInspections || []).map((insp: any) => (
                <div
                  key={insp.id}
                  className="px-4 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor:
                            insp.status === 'completed'
                              ? '#10b981'
                              : insp.status === 'approved'
                                ? '#3b82f6'
                                : insp.status === 'rejected'
                                  ? '#ef4444'
                                  : insp.status === 'draft'
                                    ? '#f59e0b'
                                    : '#6b7280',
                        }}
                      ></div>
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {insp.property_code ? `${insp.property_code} • ${insp.property_name || ''}` : (insp.property_name || 'Sede')}
                      </p>
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded"
                        style={{
                          backgroundColor:
                            insp.status === 'draft'
                              ? '#fef3c7'
                              : insp.status === 'completed'
                                ? '#d1fae5'
                                : insp.status === 'approved'
                                  ? '#dbeafe'
                                  : insp.status === 'rejected'
                                    ? '#fee2e2'
                                    : '#f3f4f6',
                          color:
                            insp.status === 'draft'
                              ? '#92400e'
                              : insp.status === 'completed'
                                ? '#065f46'
                                : insp.status === 'approved'
                                  ? '#1e40af'
                                  : insp.status === 'rejected'
                                    ? '#7f1d1d'
                                    : '#374151',
                        }}
                      >
                        {insp.status === 'draft'
                          ? 'Borrador'
                          : insp.status === 'completed'
                            ? 'Completada'
                            : insp.status === 'approved'
                              ? 'Aprobada'
                              : insp.status === 'rejected'
                                ? 'Rechazada'
                                : insp.status}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                      <span className="truncate">{insp.inspector_name || '—'}</span>
                      <span>•</span>
                      <span>
                        {insp.inspection_date
                          ? new Date(insp.inspection_date).toLocaleDateString('es-MX', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-900">
                        {insp.average_score ? `${Math.round(insp.average_score * 10)}%` : '—'}
                      </div>
                      <div className="text-[10px] text-slate-400">promedio</div>
                    </div>
                    <button
                      onClick={() => (window.location.href = `/inspections/rrhh/${insp.id}`)}
                      className="px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                    >
                      Ver
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
