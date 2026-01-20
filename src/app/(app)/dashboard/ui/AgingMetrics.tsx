'use client'

import Link from 'next/link'
import { useState } from 'react'

type AgingMetric = {
  status: string
  avgDays: number
  oldestDays: number
  count?: number
  oldestTicketNumber?: string | number
}

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Nuevo',
  ASSIGNED: 'Asignado',
  IN_PROGRESS: 'En progreso',
  NEEDS_INFO: 'Info requerida',
  WAITING_THIRD_PARTY: 'Esperando 3ro',
  RESOLVED: 'Resuelto',
}

export default function AgingMetrics({
  metrics,
  baseHref = '/tickets',
}: {
  metrics: AgingMetric[]
  baseHref?: string
}) {
  const [hoveredStatus, setHoveredStatus] = useState<string | null>(null)

  return (
    <div className="card shadow-lg border-0">
      <div className="card-body">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-amber-100 rounded-lg">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Aging</h3>
            <p className="text-xs text-gray-600">Tiempo promedio por estado</p>
          </div>
        </div>
        <div className="space-y-2">
          {metrics.length === 0 ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-2">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-xs text-gray-500">No hay datos suficientes</p>
            </div>
          ) : (
            metrics.map((metric) => (
              <Link
                key={metric.status}
                href={`${baseHref}?status=${metric.status}`}
                className="group relative block"
                onMouseEnter={() => setHoveredStatus(metric.status)}
                onMouseLeave={() => setHoveredStatus(null)}
              >
                <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 hover:shadow-md hover:border-amber-300 transition-all cursor-pointer">
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-gray-900">
                      {STATUS_LABELS[metric.status] || metric.status}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" />
                      </svg>
                      <span>Más antiguo: <span className="font-medium">{metric.oldestDays}d</span></span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold bg-gradient-to-br from-amber-600 to-orange-600 bg-clip-text text-transparent">
                      {metric.avgDays.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-500 font-medium">días</div>
                  </div>
                </div>

                {/* Tooltip al hover */}
                {hoveredStatus === metric.status && (
                  <div className="absolute z-50 left-0 right-0 mt-1 p-3 bg-gray-900 text-white rounded-lg shadow-xl text-xs animate-fadeIn">
                    <div className="font-semibold mb-1">
                      {STATUS_LABELS[metric.status] || metric.status}
                    </div>
                    <div className="space-y-1 text-gray-300">
                      {metric.count != null && <div>📊 Total: {metric.count} ticket{metric.count !== 1 ? 's' : ''}</div>}
                      <div>📈 Promedio: {metric.avgDays.toFixed(1)} días</div>
                      <div>⏰ Más antiguo: {metric.oldestDays} días</div>
                      {metric.oldestTicketNumber && (
                        <div>🎫 Ticket {metric.oldestTicketNumber}</div>
                      )}
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-700 text-amber-400">
                      👆 Clic para ver tickets filtrados
                    </div>
                  </div>
                )}
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
