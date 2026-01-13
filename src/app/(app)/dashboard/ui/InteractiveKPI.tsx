'use client'

import { useState, useMemo } from 'react'

type KPIProps = {
  label: string
  value: number
  total?: number
  icon: 'open' | 'closed' | 'escalated' | 'assigned'
  color: 'blue' | 'green' | 'orange' | 'purple'
  description: string
  trend?: number
}

// Genera datos de sparkline determinísticos basados en el valor actual
function generateSparklineData(currentValue: number): number[] {
  const points = 8
  const data: number[] = []
  const variance = Math.max(currentValue * 0.2, 1)
  
  // Usar un patrón determinístico basado en el valor
  for (let i = 0; i < points - 1; i++) {
    const factor = ((i * 3 + currentValue) % 10) / 10 - 0.5 // -0.5 a 0.5 determinístico
    data.push(Math.max(0, currentValue + factor * variance))
  }
  data.push(currentValue) // El último punto es el valor actual
  return data
}

// Componente Sparkline SVG
function Sparkline({ data, color, isPositive }: { data: number[]; color: string; isPositive: boolean }) {
  const width = 80
  const height = 32
  const padding = 2
  
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  
  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - padding * 2)
    const y = height - padding - ((value - min) / range) * (height - padding * 2)
    return `${x},${y}`
  }).join(' ')

  const strokeColor = isPositive ? '#10B981' : '#EF4444'

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  )
}

// Indicador de tendencia
function TrendBadge({ trend, showPercent = false }: { trend: number; showPercent?: boolean }) {
  const isPositive = trend >= 0
  const bgColor = isPositive ? 'bg-emerald-50' : 'bg-red-50'
  const textColor = isPositive ? 'text-emerald-600' : 'text-red-500'
  const icon = isPositive ? '↗' : '↘'
  
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${bgColor} ${textColor} text-xs font-semibold`}>
      <span>{icon}</span>
      <span>{isPositive && trend > 0 ? '+' : ''}{trend}{showPercent ? '%' : ''}</span>
    </div>
  )
}

export default function InteractiveKPI({
  label,
  value,
  total = 100,
  icon,
  color,
  description,
  trend,
}: KPIProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  
  const percentage = (total > 0 && value >= 0) ? Math.min(Math.round((value / total) * 100), 100) : 0
  
  // Usar trend proporcionado o calcular uno determinístico basado en el valor
  const displayTrend = trend ?? (value > 0 ? Math.round(((value % 10) - 5)) : 0)
  const isPositive = displayTrend >= 0
  
  // Generar datos de sparkline (memoizado para evitar regeneración)
  const sparklineData = useMemo(() => generateSparklineData(value), [value])

  return (
    <div
      className="relative group"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgb(0,0,0,0.08)] transition-all duration-300 border border-slate-100/80 cursor-pointer h-full">
        {/* Header: Label + Trend Badge */}
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide leading-tight max-w-[60%]">
            {label}
          </h3>
          <TrendBadge trend={displayTrend} showPercent={false} />
        </div>

        {/* Valor grande - siempre número absoluto */}
        <div className="text-4xl font-extrabold text-slate-800 tracking-tight mb-1">
          {value}
        </div>
        
        {/* Descripción + Sparkline */}
        <div className="flex items-end justify-between">
          <span className="text-xs text-slate-400 font-medium">
            {description}
          </span>
          <Sparkline data={sparklineData} color={color} isPositive={isPositive} />
        </div>
      </div>

      {/* Tooltip informativo */}
      {showTooltip && (
        <div className="absolute z-50 left-1/2 -translate-x-1/2 -top-2 -translate-y-full px-4 py-3 bg-slate-900 text-white text-xs rounded-xl shadow-xl max-w-[220px] text-center animate-in fade-in duration-200 leading-relaxed">
          {total > 0 && <span>{value} de {total} tickets • </span>}
          {percentage}% del total
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-slate-900"></div>
        </div>
      )}
    </div>
  )
}
