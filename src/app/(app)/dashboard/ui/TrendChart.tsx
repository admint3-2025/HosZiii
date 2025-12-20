'use client'

type TrendData = {
  date: string
  count: number
}

export default function TrendChart({ data }: { data: TrendData[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1)
  const chartHeight = 80
  const chartWidth = 100

  const points = data.map((item, index) => {
    const x = (index / (data.length - 1)) * chartWidth
    const y = chartHeight - (item.count / maxCount) * chartHeight
    return `${x},${y}`
  })

  const pathD = `M ${points.join(' L ')}`
  const areaD = `${pathD} L ${chartWidth},${chartHeight} L 0,${chartHeight} Z`

  return (
    <div className="card shadow-lg border-0">
      <div className="card-body">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-green-100 rounded-lg">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Tendencia</h3>
            <p className="text-xs text-gray-600">Últimos 7 días</p>
          </div>
        </div>
        <div>
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-24"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
              </linearGradient>
            </defs>
            <path d={areaD} fill="url(#areaGradient)" />
            <path
              d={pathD}
              fill="none"
              stroke="#10b981"
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
              className="drop-shadow-sm"
            />
            {data.map((item, index) => {
              const x = (index / (data.length - 1)) * chartWidth
              const y = chartHeight - (item.count / maxCount) * chartHeight
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="2.5"
                  fill="#10b981"
                  className="drop-shadow"
                />
              )
            })}
          </svg>
          <div className="grid grid-cols-7 gap-1 text-xs text-gray-500 mt-3">
            {data.map((item, idx) => (
              <div key={idx} className="text-center">
                <div className="font-medium text-gray-700">{item.count}</div>
                <div className="text-[10px]">
                  {new Date(item.date).toLocaleDateString('es-ES', { weekday: 'short' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
