'use client'

type StatusData = {
  status: string
  count: number
}

const STATUS_COLORS: Record<string, string> = {
  NEW: '#3b82f6',
  ASSIGNED: '#6366f1',
  IN_PROGRESS: '#eab308',
  NEEDS_INFO: '#6b7280',
  WAITING_THIRD_PARTY: '#6b7280',
  RESOLVED: '#22c55e',
  CLOSED: '#9ca3af',
}

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Nuevo',
  ASSIGNED: 'Asignado',
  IN_PROGRESS: 'En progreso',
  NEEDS_INFO: 'Info requerida',
  WAITING_THIRD_PARTY: 'Esperando 3ro',
  RESOLVED: 'Resuelto',
  CLOSED: 'Cerrado',
}

export default function StatusChart({ data }: { data: StatusData[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1)
  const total = data.reduce((sum, d) => sum + d.count, 0)

  return (
    <div className="card shadow-lg border-0">
      <div className="card-body">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z\" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Por Estado</h3>
            <p className="text-xs text-gray-600">{total} tickets totales</p>
          </div>
        </div>
        <div className="space-y-3">
          {data.map((item) => {
            const percentage = (item.count / maxCount) * 100
            const percentOfTotal = total > 0 ? Math.round((item.count / total) * 100) : 0
            return (
              <div key={item.status} className="group">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full shadow-sm"
                      style={{ backgroundColor: STATUS_COLORS[item.status] || '#6b7280' }}
                    ></div>
                    <span className="font-medium text-gray-700">
                      {STATUS_LABELS[item.status] || item.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">{percentOfTotal}%</span>
                    <span className="font-bold text-gray-900 min-w-[2rem] text-right">{item.count}</span>
                  </div>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out group-hover:opacity-80"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: STATUS_COLORS[item.status] || '#6b7280',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
