'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { createSupabaseBrowserClient, getSafeUser } from '@/lib/supabase/browser'
import { InspectionsCombinedService, type CombinedInspection } from '@/lib/services/inspections-combined.service'

type InspectionRRHHStatus = 'draft' | 'completed' | 'approved' | 'rejected'

type Property = {
  id: string
  code: string
  name: string
}

type Profile = {
  id: string
  role: string | null
}

type InboxFilters = {
  status: 'all' | InspectionRRHHStatus
  q: string
}

function formatDateShort(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function statusLabel(status: string) {
  switch (status) {
    case 'draft':
      return 'Borrador'
    case 'completed':
      return 'Completada'
    case 'approved':
      return 'Aprobada'
    case 'rejected':
      return 'Rechazada'
    default:
      return status
  }
}

function statusBadgeClass(status: string) {
  switch (status) {
    case 'draft':
      return 'bg-slate-100 text-slate-700 border-slate-200'
    case 'completed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'approved':
      return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'rejected':
      return 'bg-rose-50 text-rose-700 border-rose-200'
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}

export default function InspectionsInbox() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedLocationId = useMemo(() => searchParams?.get('locationId') || '', [searchParams])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [availableProperties, setAvailableProperties] = useState<Property[]>([])
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all')

  const [rowsLoading, setRowsLoading] = useState(false)
  const [rowsError, setRowsError] = useState<string | null>(null)
  const [inspections, setInspections] = useState<any[]>([])

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteAck, setDeleteAck] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)

  const [filters, setFilters] = useState<InboxFilters>({ status: 'all', q: '' })

  const canManageStatus = useMemo(() => {
    const role = profile?.role || ''
    return role === 'admin' || role === 'supervisor'
  }, [profile?.role])

  const canDelete = useMemo(() => {
    const role = profile?.role || ''
    return role === 'admin'
  }, [profile?.role])

  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true)
      setError(null)

      try {
        const supabase = createSupabaseBrowserClient()
        const user = await getSafeUser(supabase)

        if (!user) {
          // Don't force redirect on auth errors; user might still have valid session
          setError('No se pudo verificar la autenticación. Intenta recargar la página.')
          return
        }

        const { data: prof, error: profError } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('id', user.id)
          .single()

        if (profError) {
          setError(profError.message)
          return
        }

        setProfile((prof as any) || null)

        const isAdmin = (prof as any)?.role === 'admin' || (prof as any)?.role === 'corporate_admin'

        if (isAdmin) {
          const { data, error: locError } = await supabase
            .from('locations')
            .select('id, code, name')
            .eq('is_active', true)
            .order('code')

          if (locError) {
            setError(locError.message)
            setAvailableProperties([])
            return
          }

          const props = (data || []).map((l: any) => ({ id: l.id, code: l.code, name: l.name }))
          setAvailableProperties(props)
          const preferred = preselectedLocationId && props.some((p) => p.id === preselectedLocationId)
            ? preselectedLocationId
            : 'all'
          setSelectedPropertyId(preferred)
        } else {
          const { data, error: ulError } = await supabase
            .from('user_locations')
            .select('location_id, locations(id, code, name)')
            .eq('user_id', user.id)

          if (ulError) {
            setError(ulError.message)
            setAvailableProperties([])
            return
          }

          const props = (data || [])
            .map((row: any) => row.locations)
            .filter(Boolean)
            .map((l: any) => ({ id: l.id, code: l.code, name: l.name }))

          setAvailableProperties(props)
          const preferred = preselectedLocationId && props.some((p) => p.id === preselectedLocationId)
            ? preselectedLocationId
            : 'all'
          setSelectedPropertyId(preferred)
        }
      } catch (e: any) {
        setError(e?.message || 'Error inesperado cargando usuario')
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [preselectedLocationId, router])

  const loadInspections = async (propertyId: string, allProperties: Property[]) => {
    setRowsLoading(true)
    setRowsError(null)

    if (propertyId === 'all') {
      // Cargar todas las inspecciones de todas las propiedades del usuario (RRHH + GSH)
      const locationIds = allProperties.map((p) => p.id)
      const { data, error: listError } = await InspectionsCombinedService.listInspectionsMultiple(
        locationIds, 
        ['rrhh', 'gsh'], // Solo tipos implementados
        200, 
        0
      )

      if (listError) {
        setRowsError(listError.message || 'Error al listar inspecciones')
        setInspections([])
        setRowsLoading(false)
        return
      }

      setInspections(data || [])
      setRowsLoading(false)
    } else if (propertyId) {
      // Cargar inspecciones de una propiedad específica (RRHH + GSH)
      const { data, error: listError } = await InspectionsCombinedService.listInspections(
        propertyId,
        ['rrhh', 'gsh'], // Solo tipos implementados
        200,
        0
      )

      if (listError) {
        setRowsError(listError.message || 'Error al listar inspecciones')
        setInspections([])
        setRowsLoading(false)
        return
      }

      setInspections(data || [])
      setRowsLoading(false)
    } else {
      setInspections([])
      setRowsLoading(false)
    }
  }

  useEffect(() => {
    if (!loading && selectedPropertyId && availableProperties.length > 0) {
      loadInspections(selectedPropertyId, availableProperties)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, selectedPropertyId, availableProperties.length])

  const selectedProperty = useMemo(() => {
    return availableProperties.find((p) => p.id === selectedPropertyId) || null
  }, [availableProperties, selectedPropertyId])

  const filteredInspections = useMemo(() => {
    let rows = [...inspections]

    if (filters.status !== 'all') {
      rows = rows.filter((r) => r.status === filters.status)
    }

    const q = filters.q.trim().toLowerCase()
    if (q) {
      rows = rows.filter((r) => {
        const hay = [
          r.inspector_name,
          r.property_code,
          r.property_name,
          r.department,
          r.status,
          r.id,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        return hay.includes(q)
      })
    }

    return rows
  }, [filters.q, filters.status, inspections])

  const handleOpen = (inspection: CombinedInspection) => {
    // Redirigir a la página correcta según el tipo de inspección
    router.push(`/inspections/${inspection.inspection_type}/${inspection.id}`)
  }

  const handleSetStatus = async (inspection: CombinedInspection, status: InspectionRRHHStatus) => {
    const ok = window.confirm(`¿Cambiar estado a "${statusLabel(status)}"?`)
    if (!ok) return

    setRowsLoading(true)
    try {
      const { error: stError } = await InspectionsCombinedService.updateInspectionStatus(
        inspection.id,
        inspection.inspection_type,
        status
      )
      if (stError) {
        alert(stError.message || 'No se pudo actualizar el estado')
        return
      }
      await loadInspections(selectedPropertyId, availableProperties)
    } finally {
      setRowsLoading(false)
    }
  }

  const openDeleteModal = (row: any) => {
    setDeleteTarget(row)
    setDeleteAck('')
    setDeleteModalOpen(true)
  }

  const closeDeleteModal = () => {
    if (rowsLoading) return
    setDeleteModalOpen(false)
    setDeleteAck('')
    setDeleteTarget(null)
  }

  const confirmDeleteWithAck = async () => {
    const row = deleteTarget
    if (!row?.id) return

    const ack = deleteAck.trim()
    if (ack.length < 20) {
      alert('El acuse debe tener mínimo 20 caracteres.')
      return
    }

    setRowsLoading(true)
    try {
      const supabase = createSupabaseBrowserClient()

      // Determinar tabla de log según tipo de inspección
      const logTableName = `inspections_${row.inspection_type}_deletion_log`

      // Preparar snapshot de inspección
      const snapshot = {
        id: row.id,
        status: row.status,
        department: row.department,
        inspection_date: row.inspection_date,
        property_code: row.property_code,
        property_name: row.property_name,
        inspector_name: row.inspector_name,
        coverage_percentage: row.coverage_percentage,
        compliance_percentage: row.compliance_percentage,
        average_score: row.average_score,
      }

      // RRHH usa estructura diferente a GSH
      const logData = row.inspection_type === 'rrhh' 
        ? {
            inspection_id: row.id,
            deleted_by: profile?.id,
            deleted_by_role: profile?.role,
            acuse: ack,
            snapshot: snapshot
          }
        : {
            inspection_id: row.id,
            deleted_by_user_id: profile?.id,
            deleted_at: new Date().toISOString(),
            inspection_data: snapshot,
            reason: ack
          }

      // Registrar acuse (auditoría)
      const { error: logError } = await supabase
        .from(logTableName)
        .insert(logData)

      if (logError) {
        alert(logError.message || 'No se pudo registrar el acuse de eliminación')
        return
      }

      // Eliminar inspección usando servicio combinado (FK CASCADE elimina áreas/items)
      const { error: deleteError } = await InspectionsCombinedService.deleteInspection(
        row.id,
        row.inspection_type
      )

      if (deleteError) {
        alert(deleteError.message || 'No se pudo eliminar la inspección')
        return
      }

      closeDeleteModal()
      await loadInspections(selectedPropertyId, availableProperties)
    } catch (e: any) {
      alert(e?.message || 'Error al eliminar inspección')
    } finally {
      setRowsLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-3"></div>
          <p className="text-slate-600 text-sm">Cargando bandeja...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="max-w-lg w-full bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <h1 className="text-lg font-bold text-slate-900 mb-2">Bandeja de inspecciones</h1>
          <p className="text-sm text-slate-600 mb-4">{error}</p>
          <button
            onClick={() => router.refresh()}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors text-sm font-medium"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      {/* Header Profesional */}
      <div className="relative overflow-hidden rounded-xl bg-slate-900 border border-slate-800 shadow-lg mb-6 p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/5 to-transparent"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700">
              <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Bandeja de Inspecciones
              </h1>
              <p className="text-slate-400 text-sm">
                Consulte inspecciones realizadas por propiedad, estado y búsqueda.
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push('/inspections')}
            className="px-4 py-2 rounded-lg border border-slate-600 bg-slate-800 text-white hover:bg-slate-700 transition-colors text-sm font-medium"
          >
            Ir a Dashboard
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Propiedad</label>
              <select
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900"
              >
                <option value="all">Todas las propiedades</option>
                {availableProperties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} • {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Estado</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value as any }))}
                className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900"
              >
                <option value="all">Todos</option>
                <option value="draft">Borrador</option>
                <option value="completed">Completada</option>
                <option value="approved">Aprobada</option>
                <option value="rejected">Rechazada</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Buscar</label>
              <input
                value={filters.q}
                onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
                placeholder="Ej: inspector, departamento, código, ..."
                className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              {selectedPropertyId === 'all' ? (
                <>
                  <span className="font-semibold text-slate-700">Todas las propiedades</span> • {availableProperties.length} propiedades
                </>
              ) : selectedProperty ? (
                <>
                  <span className="font-semibold text-slate-700">{selectedProperty.code}</span> • {selectedProperty.name}
                </>
              ) : (
                '—'
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadInspections(selectedPropertyId, availableProperties)}
                disabled={rowsLoading}
                className="px-3 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-900 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rowsLoading ? 'Actualizando...' : 'Actualizar'}
              </button>
            </div>
          </div>
        </div>

        <div className="p-4">
          {rowsError && (
            <div className="mb-3 p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 text-sm">
              {rowsError}
            </div>
          )}

          {rowsLoading && filteredInspections.length === 0 ? (
            <div className="py-10 text-center text-slate-500 text-sm">Cargando inspecciones...</div>
          ) : filteredInspections.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-slate-700 font-semibold">Sin resultados</p>
              <p className="text-slate-500 text-sm">No hay inspecciones para los filtros seleccionados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                    <th className="py-2 pr-4">Fecha</th>
                    <th className="py-2 pr-4">Propiedad</th>
                    <th className="py-2 pr-4">Inspector</th>
                    <th className="py-2 pr-4">Departamento</th>
                    <th className="py-2 pr-4">Estado</th>
                    <th className="py-2 pr-4">Avance</th>
                    <th className="py-2 pr-4">Prom.</th>
                    <th className="py-2 pr-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInspections.map((r: CombinedInspection) => (
                    <tr key={`${r.inspection_type}-${r.id}`} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 pr-4 whitespace-nowrap">{formatDateShort(r.inspection_date)}</td>
                      <td className="py-2 pr-4 whitespace-nowrap">
                        <span className="font-medium text-slate-900">{r.property_code}</span>
                      </td>
                      <td className="py-2 pr-4">{r.inspector_name || '—'}</td>
                      <td className="py-2 pr-4">
                        <span className="inline-flex items-center gap-1">
                          {r.department || '—'}
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-semibold ${statusBadgeClass(r.status)}`}>
                          {statusLabel(r.status)}
                        </span>
                      </td>
                      <td className="py-2 pr-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${(r.coverage_percentage ?? 0) >= 100 ? 'bg-emerald-500' : (r.coverage_percentage ?? 0) >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                              style={{ width: `${Math.min(r.coverage_percentage || 0, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500">{Math.round(r.coverage_percentage || 0)}%</span>
                          {(r.items_pending ?? 0) > 0 && (
                            <span className="text-xs text-amber-600">({r.items_pending})</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 pr-4 whitespace-nowrap">
                        {(r.items_cumple ?? 0) > 0 ? (
                          <span className="font-semibold text-slate-700">{Math.round((r.average_score || 0) * 10)}%</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-0 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpen(r)}
                            className={`px-3 py-1.5 rounded-lg transition-colors text-xs font-semibold ${
                              r.status === 'draft' 
                                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                : r.status === 'completed'
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                : r.status === 'approved'
                                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {r.status === 'draft' ? 'Continuar' : r.status === 'completed' ? 'Ver completada' : r.status === 'approved' ? 'Ver aprobada' : 'Abrir'}
                          </button>

                          {canManageStatus && r.status === 'completed' && (
                            <>
                              <button
                                onClick={() => handleSetStatus(r, 'approved')}
                                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-xs font-semibold"
                              >
                                Aprobar
                              </button>
                              <button
                                onClick={() => handleSetStatus(r, 'rejected')}
                                className="px-3 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors text-xs font-semibold"
                              >
                                Rechazar
                              </button>
                            </>
                          )}

                          {canDelete && (
                            <button
                              onClick={() => openDeleteModal(r)}
                              className="px-3 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors text-xs font-semibold"
                              title="Eliminar inspección (requiere acuse)"
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 text-xs text-slate-500">
        Mostrando {filteredInspections.length} inspección(es). Filtros aplicables por propiedad, estado y búsqueda.
      </div>

      {deleteModalOpen && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeDeleteModal} />
          <div className="relative w-full max-w-lg rounded-xl bg-white border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h2 className="text-sm font-bold text-slate-900">Eliminar inspección</h2>
              <p className="text-xs text-slate-600 mt-1">
                Esta acción no se puede deshacer. Se requiere un acuse para registro.
              </p>
            </div>

            <div className="p-4 space-y-3">
              <div className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="font-semibold text-slate-900">{deleteTarget.property_code || '—'}</div>
                <div className="text-slate-600">
                  {deleteTarget.department || '—'} • {formatDateShort(deleteTarget.inspection_date)} • {statusLabel(deleteTarget.status)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Acuse (mínimo 20 caracteres)</label>
                <textarea
                  value={deleteAck}
                  onChange={(e) => setDeleteAck(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                  placeholder="Ej: Elimino por duplicado. Se creó una inspección correcta con folio ..."
                  disabled={rowsLoading}
                />
                <div className="mt-1 flex items-center justify-between text-[11px]">
                  <span className={deleteAck.trim().length >= 20 ? 'text-emerald-700' : 'text-slate-500'}>
                    {deleteAck.trim().length}/20
                  </span>
                  <span className="text-slate-500">Se registrará junto con la eliminación.</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-end gap-2">
              <button
                onClick={closeDeleteModal}
                disabled={rowsLoading}
                className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors text-sm font-semibold disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteWithAck}
                disabled={rowsLoading || deleteAck.trim().length < 20}
                className="px-3 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rowsLoading ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
