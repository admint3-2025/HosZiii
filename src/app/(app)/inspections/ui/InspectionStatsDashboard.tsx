'use client'

import { useRouter } from 'next/navigation'

interface InspectionStatsDashboardProps {
  departmentName: string
  propertyCode: string
  propertyName: string
  locationId: string
  stats?: any
  onNewInspection?: () => void
  isAdmin?: boolean
  isRRHH?: boolean
  isGSH?: boolean
  onChangeProperty?: () => void
  onChangeDepartment?: () => void
}

export default function InspectionStatsDashboard({
  departmentName,
  propertyCode,
  propertyName,
  locationId,
  stats,
  onNewInspection,
  isAdmin,
  isRRHH,
  isGSH,
  onChangeProperty,
  onChangeDepartment
}: InspectionStatsDashboardProps) {
  const router = useRouter()

  return (
    <div className="bg-slate-50">
      {/* Header compacto integrado */}
      <div className="sticky top-0 z-20 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 border-b border-slate-600 px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">{departmentName}</span>
                <span className="text-slate-500">•</span>
                <span className="text-sm font-medium text-emerald-400">{propertyCode}</span>
                {isAdmin && (
                  <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 text-[10px] font-semibold rounded">
                    ADMIN
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">{propertyName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.location.href = `/inspections/inbox?locationId=${encodeURIComponent(locationId)}`}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              Bandeja
            </button>
            {onChangeProperty && (
              <button
                onClick={onChangeProperty}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-slate-300 text-xs hover:text-white hover:bg-white/10 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Cambiar
              </button>
            )}
            {onNewInspection && (
              <button
                onClick={onNewInspection}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nueva
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {stats ? (
          <>
            {/* KPIs - 4 Columnas compactas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* KPI 1: Total */}
              <div className="p-4 border border-slate-200 rounded-lg bg-white">
                <p className="text-slate-600 text-xs font-medium">Total Inspecciones</p>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-slate-900">{stats.totalInspections}</span>
                  <span className="text-[10px] text-slate-400">inspecciones</span>
                </div>
              </div>

              {/* KPI 2: Promedio */}
              <div className="p-4 border border-slate-200 rounded-lg bg-white">
                <p className="text-slate-600 text-xs font-medium">Promedio Histórico</p>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-slate-900">{stats.averageScore}%</span>
                  <span className="text-[10px] text-slate-400">desempeño</span>
                </div>
              </div>

              {/* KPI 3: Pendientes */}
              <div className="p-4 border border-slate-200 rounded-lg bg-white">
                <p className="text-slate-600 text-xs font-medium">Por Aprobar</p>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-slate-900">{stats.pendingApproval}</span>
                  <span className="text-[10px] text-slate-400">pendientes</span>
                </div>
              </div>

              {/* KPI 4: Recientes */}
              <div className="p-4 border border-slate-200 rounded-lg bg-white">
                <p className="text-slate-600 text-xs font-medium">Últimas Realizadas</p>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-slate-900">{stats.recentInspections?.length || 0}</span>
                  <span className="text-[10px] text-slate-400">registros</span>
                </div>
              </div>
            </div>

            {/* Historial de Inspecciones */}
            {stats.recentInspections && stats.recentInspections.length > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                {/* Encabezado */}
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Últimas Inspecciones
                  </h2>
                </div>

                {/* Tabla */}
                <div className="divide-y divide-slate-100">
                  {stats.recentInspections.map((insp: any) => (
                    <div
                      key={insp.id}
                      className="px-4 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Indicador de estado */}
                        <div className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor:
                              insp.status === 'completed' ? '#10b981' :
                              insp.status === 'approved' ? '#3b82f6' :
                              insp.status === 'rejected' ? '#ef4444' :
                              insp.status === 'draft' ? '#f59e0b' : '#6b7280'
                          }}
                        ></div>

                        {/* Información */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {insp.inspector_name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(insp.inspection_date).toLocaleDateString('es-MX', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                        </div>

                        {/* Puntuación */}
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900">
                            {insp.average_score ? `${Math.round(insp.average_score * 10)}%` : '—'}
                          </p>
                        </div>

                        {/* Estado */}
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded"
                          style={{
                            backgroundColor: insp.status === 'draft' ? '#fef3c7' :
                              insp.status === 'completed' ? '#d1fae5' :
                              insp.status === 'approved' ? '#dbeafe' :
                              insp.status === 'rejected' ? '#fee2e2' : '#f3f4f6',
                            color: insp.status === 'draft' ? '#92400e' :
                              insp.status === 'completed' ? '#065f46' :
                              insp.status === 'approved' ? '#1e40af' :
                              insp.status === 'rejected' ? '#7f1d1d' : '#374151'
                          }}
                        >
                          {insp.status === 'draft' ? 'Borrador' :
                            insp.status === 'completed' ? 'Completada' :
                            insp.status === 'approved' ? 'Aprobada' :
                            insp.status === 'rejected' ? 'Rechazada' :
                            insp.status}
                        </span>

                        {/* Botón Ver */}
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
              </div>
            )}

            {/* Empty State */}
            {(!stats.recentInspections || stats.recentInspections.length === 0) && (
              <div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-lg bg-white">
                <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-slate-700 font-medium text-sm">No hay inspecciones realizadas</p>
                <p className="text-slate-500 text-xs mt-1">Crea tu primera inspección para comenzar</p>
                <button
                  onClick={onNewInspection}
                  className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium inline-flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Nueva Inspección
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <div className="inline-block w-6 h-6 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="text-slate-500 text-sm mt-2">Cargando...</p>
          </div>
        )}
      </div>
    </div>
  )
}
