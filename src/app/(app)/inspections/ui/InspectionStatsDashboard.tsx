'use client'

import { useRouter } from 'next/navigation'

interface InspectionStatsDashboardProps {
  departmentName: string
  propertyCode: string
  propertyName: string
  locationId: string
  stats?: any
  onNewInspection?: () => void
}

export default function InspectionStatsDashboard({
  departmentName,
  propertyCode,
  propertyName,
  locationId,
  stats,
  onNewInspection
}: InspectionStatsDashboardProps) {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Profesional - Temático */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 shadow-lg mb-8 mx-8 mt-8 p-6">
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
                Inspecciones {departmentName}
              </h1>
              <p className="text-slate-400 text-sm">
                {propertyCode} • {propertyName}
              </p>
            </div>
          </div>
          <button
            onClick={() => window.location.href = '/inspections'}
            className="px-4 py-2 rounded-lg border border-slate-600 bg-slate-800 text-white hover:bg-slate-700 transition-colors text-sm font-medium"
          >
            Volver a Inspecciones
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {stats ? (
          <div className="space-y-8">
            {/* KPIs - 4 Columnas Simples */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* KPI 1: Total */}
              <div className="p-6 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors bg-white">
                <p className="text-slate-600 text-sm font-medium">Total Inspecciones</p>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-3xl font-bold text-slate-900">{stats.totalInspections}</span>
                  <span className="text-xs text-slate-500">inspecciones</span>
                </div>
              </div>

              {/* KPI 2: Promedio */}
              <div className="p-6 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                <p className="text-slate-600 text-sm font-medium">Promedio Histórico</p>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-3xl font-bold text-slate-900">{stats.averageScore}%</span>
                  <span className="text-xs text-slate-500">desempeño</span>
                </div>
              </div>

              {/* KPI 3: Pendientes */}
              <div className="p-6 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                <p className="text-slate-600 text-sm font-medium">Por Aprobar</p>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-3xl font-bold text-slate-900">{stats.pendingApproval}</span>
                  <span className="text-xs text-slate-500">pendientes</span>
                </div>
              </div>

              {/* KPI 4: Recientes */}
              <div className="p-6 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                <p className="text-slate-600 text-sm font-medium">Últimas Realizadas</p>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-3xl font-bold text-slate-900">{stats.recentInspections?.length || 0}</span>
                  <span className="text-xs text-slate-500">registros</span>
                </div>
              </div>
            </div>

            {/* Historial de Inspecciones */}
            {stats.recentInspections && stats.recentInspections.length > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                {/* Encabezado */}
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                  <h2 className="text-base font-bold text-slate-900">
                    Últimas Inspecciones Realizadas
                  </h2>
                </div>

                {/* Tabla */}
                <div className="divide-y divide-slate-200">
                  {stats.recentInspections.map((insp: any) => (
                    <div
                      key={insp.id}
                      className="px-6 py-4 hover:bg-slate-50 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4 flex-1">
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
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">
                            {insp.inspector_name}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {new Date(insp.inspection_date).toLocaleDateString('es-MX', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                        </div>

                        {/* Puntuación */}
                        <div className="text-right mr-4">
                          <p className="text-lg font-bold text-slate-900">
                            {insp.average_score ? `${Math.round(insp.average_score * 10)}%` : '—'}
                          </p>
                        </div>

                        {/* Estado */}
                        <div>
                          <span className="inline-block text-xs font-medium px-2.5 py-1 rounded border"
                            style={{
                              backgroundColor: insp.status === 'draft' ? '#fef3c7' :
                                insp.status === 'completed' ? '#d1fae5' :
                                insp.status === 'approved' ? '#dbeafe' :
                                insp.status === 'rejected' ? '#fee2e2' : '#f3f4f6',
                              color: insp.status === 'draft' ? '#92400e' :
                                insp.status === 'completed' ? '#065f46' :
                                insp.status === 'approved' ? '#1e40af' :
                                insp.status === 'rejected' ? '#7f1d1d' : '#374151',
                              borderColor: insp.status === 'draft' ? '#fcd34d' :
                                insp.status === 'completed' ? '#6ee7b7' :
                                insp.status === 'approved' ? '#93c5fd' :
                                insp.status === 'rejected' ? '#fca5a5' : '#e5e7eb'
                            }}
                          >
                            {insp.status === 'draft' ? 'Borrador' :
                              insp.status === 'completed' ? 'Completada' :
                              insp.status === 'approved' ? 'Aprobada' :
                              insp.status === 'rejected' ? 'Rechazada' :
                              insp.status}
                          </span>
                        </div>
                      </div>

                      {/* Botón Ver */}
                      <button
                        onClick={() => (window.location.href = `/inspections/rrhh/${insp.id}`)}
                        className="ml-4 px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors whitespace-nowrap"
                      >
                        Ver
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {(!stats.recentInspections || stats.recentInspections.length === 0) && (
              <div className="text-center py-16 px-6 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50">
                <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-slate-700 font-medium">No hay inspecciones realizadas</p>
                <p className="text-slate-500 text-sm mt-1">Crea tu primera inspección para comenzar</p>
                <button
                  onClick={onNewInspection}
                  className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium inline-flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Nueva Inspección
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-slate-500">Cargando información...</p>
          </div>
        )}
      </div>
    </div>
  )
}
