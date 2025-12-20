'use client'

type PriorityData = {
  priority: number
  count: number
}

const PRIORITY_COLORS: Record<number, string> = {
  1: '#ef4444',
  2: '#f59e0b',
  3: '#3b82f6',
  4: '#9ca3af',
}

const PRIORITY_LABELS: Record<number, string> = {
  1: 'P1 - Crítica',
  2: 'P2 - Alta',
  3: 'P3 - Media',
  4: 'P4 - Baja',
}

export default function PriorityChart({ data }: { data: PriorityData[] }) {
  const total = data.reduce((acc, item) => acc + item.count, 0)
  const maxCount = Math.max(...data.map(d => d.count), 1)

  return (
    <div className="card shadow-lg border-0">
      <div className="card-body">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-red-100 rounded-lg">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Por Prioridad</h3>
            <p className="text-xs text-gray-600">{total} tickets clasificados</p>
          </div>
        </div>
        <div className="space-y-3">
          {data.map((item) => {
            const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0
            const barWidth = (item.count / maxCount) * 100
            return (
              <div key={item.priority} className="group">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full shadow-sm"
                      style={{ backgroundColor: PRIORITY_COLORS[item.priority] || '#6b7280' }}
                    />
                    <span className="text-xs font-medium text-gray-700">
                      {PRIORITY_LABELS[item.priority] || `P${item.priority}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{percentage}%</span>
                    <span className="text-sm font-bold text-gray-900 min-w-[2rem] text-right">{item.count}</span>
                  </div>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out group-hover:opacity-80"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: PRIORITY_COLORS[item.priority] || '#6b7280',
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
