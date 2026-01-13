'use client'

import { useState } from 'react'

type TrendData = {
  date: string
  count: number
}

export default function TrendChart({ data }: { data: TrendData[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  
  const maxCount = Math.max(...data.map((d) => d.count), 1)

  // Calcular métricas
  const totalTickets = data.reduce((sum, d) => sum + d.count, 0)
  const avgPerDay = (totalTickets / Math.max(data.length, 1)).toFixed(1)

  // Determinar la fecha "hoy" y "ayer"
  const now = new Date()
  const todayYear = now.getFullYear()
  const todayMonth = String(now.getMonth() + 1).padStart(2, '0')
  const todayDay = String(now.getDate()).padStart(2, '0')
  const todayKey = `${todayYear}-${todayMonth}-${todayDay}`

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const yYear = yesterday.getFullYear()
  const yMonth = String(yesterday.getMonth() + 1).padStart(2, '0')
  const yDay = String(yesterday.getDate()).padStart(2, '0')
  const yesterdayKey = `${yYear}-${yMonth}-${yDay}`

  const todayCount = data.find((d) => d.date === todayKey)?.count ?? 0
  const yesterdayCount = data.find((d) => d.date === yesterdayKey)?.count ?? 0
  const delta = todayCount - yesterdayCount

  let trendLabel = 'Sin cambios'
  let trendState: 'positive' | 'negative' | 'neutral' = 'neutral'

  if (delta > 0) {
    trendState = 'positive'
    trendLabel = `+${delta} vs ayer`
  } else if (delta < 0) {
    trendState = 'negative'
    trendLabel = `${delta} vs ayer`
  }

  const isPositive = trendState === 'positive'
  const isNeutral = trendState === 'neutral'

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow duration-300">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-xl">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Tendencia de Tickets</h3>
              <p className="text-xs text-slate-500">Últimos 7 días</p>
            </div>
          </div>
          
          {/* Badge de cambio */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
            isNeutral
              ? 'bg-slate-100 text-slate-600'
              : isPositive 
                ? 'bg-emerald-50 text-emerald-700' 
                : 'bg-red-50 text-red-600'
          }`}>
            {!isNeutral && (
              <svg className={`w-3 h-3 ${isPositive ? '' : 'rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            )}
            <span>{trendLabel}</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 mb-5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-slate-800">{totalTickets}</span>
            <span className="text-xs text-slate-500 font-medium">tickets</span>
          </div>
          <div className="h-8 w-px bg-slate-200"></div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-slate-600">{avgPerDay}</span>
            <span className="text-xs text-slate-400">/día</span>
          </div>
          <div className="h-8 w-px bg-slate-200"></div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-emerald-600">{todayCount}</span>
            <span className="text-xs text-slate-400">hoy</span>
          </div>
        </div>

        {/* Gráfico de barras */}
        <div className="flex items-end justify-between gap-3 h-28 mb-3 px-2">
          {data.map((item, idx) => {
            const isHovered = hoveredIndex === idx
            const isToday = item.date === todayKey
            // Calcular altura: mínimo 8px, máximo 100% del contenedor
            const barHeight = maxCount > 0 
              ? Math.max(8, (item.count / maxCount) * 100) 
              : 8
            
            return (
              <div 
                key={idx}
                className="flex-1 flex flex-col items-center justify-end cursor-pointer"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Valor sobre la barra */}
                <div className={`text-sm font-bold mb-1 transition-all ${
                  item.count > 0 
                    ? isToday 
                      ? 'text-indigo-600' 
                      : isHovered 
                        ? 'text-emerald-600' 
                        : 'text-slate-700'
                    : 'text-slate-300'
                }`}>
                  {item.count}
                </div>
                
                {/* Barra */}
                <div 
                  className={`w-full max-w-[40px] rounded-lg transition-all duration-200 ${
                    item.count === 0
                      ? 'bg-slate-100 border border-dashed border-slate-200'
                      : isToday 
                        ? 'bg-gradient-to-t from-indigo-600 to-indigo-400 shadow-md shadow-indigo-200' 
                        : isHovered 
                          ? 'bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-md shadow-emerald-200' 
                          : 'bg-gradient-to-t from-slate-400 to-slate-300'
                  } ${isHovered && item.count > 0 ? 'scale-105' : ''}`}
                  style={{ 
                    height: item.count === 0 ? '8px' : `${barHeight}%`,
                  }}
                ></div>
              </div>
            )
          })}
        </div>

        {/* Etiquetas de días */}
        <div className="flex justify-between gap-2">
          {data.map((item, idx) => {
            const isHovered = hoveredIndex === idx
            const isToday = item.date === todayKey
            const [year, month, day] = item.date.split('-').map(Number)
            const dateObj = new Date(year, month - 1, day)
            
            return (
              <div 
                key={idx} 
                className={`flex-1 text-center transition-all ${
                  isHovered ? 'transform scale-105' : ''
                }`}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div className={`text-[10px] uppercase font-semibold ${
                  isToday ? 'text-indigo-600' : isHovered ? 'text-emerald-600' : 'text-slate-400'
                }`}>
                  {dateObj.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '')}
                </div>
                <div className={`text-sm font-bold ${
                  isToday ? 'text-indigo-700' : isHovered ? 'text-emerald-700' : 'text-slate-600'
                }`}>
                  {dateObj.getDate()}
                </div>
                {isToday && (
                  <div className="text-[9px] font-bold text-indigo-500 uppercase">Hoy</div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
