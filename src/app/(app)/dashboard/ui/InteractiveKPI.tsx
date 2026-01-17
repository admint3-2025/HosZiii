'use client'

import { useState } from 'react'
import Link from 'next/link'

type KPIProps = {
  label: string
  value: number
  total?: number
  icon: 'open' | 'closed' | 'escalated' | 'assigned'
  color: 'blue' | 'green' | 'orange' | 'purple'
  description: string
  trend?: number
  href?: string
  sparklineData?: number[]
}

// Map color names to Tailwind types
const colorMap = {
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-200',
    bar: 'bg-blue-500',
    hover: 'group-hover:text-blue-700',
    iconBg: 'bg-blue-100',
    borderHover: 'hover:border-blue-300',
  },
  green: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-200',
    bar: 'bg-emerald-500',
    hover: 'group-hover:text-emerald-700',
    iconBg: 'bg-emerald-100',
    borderHover: 'hover:border-emerald-300',
  },
  orange: {
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    border: 'border-orange-200',
    bar: 'bg-orange-500',
    hover: 'group-hover:text-orange-700',
    iconBg: 'bg-orange-100',
    borderHover: 'hover:border-orange-300',
  },
  purple: {
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    border: 'border-purple-200',
    bar: 'bg-purple-500',
    hover: 'group-hover:text-purple-700',
    iconBg: 'bg-purple-100',
    borderHover: 'hover:border-purple-300',
  },
}

// Icons
const icons = {
  open: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  closed: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  escalated: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  assigned: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
}

function Sparkline({ data, colorName }: { data: number[]; colorName: keyof typeof colorMap }) {
  if (!data || data.length < 2) return null
  
  const width = 60
  const height = 24
  const padding = 2
  
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  
  const points = data.map((val, index) => {
    const x = padding + (index / (data.length - 1)) * (width - padding * 2)
    const y = height - padding - ((val - min) / range) * (height - padding * 2)
    return `${x},${y}`
  }).join(' ')

  const isPositive = data[data.length - 1] >= data[0]
  
  // Use explicit heavy colors for sparkline visibility
  const strokeColor = colorName === 'green' ? '#10B981' : 
                      colorName === 'blue' ? '#3B82F6' :
                      colorName === 'orange' ? '#F97316' : '#A855F7'

  return (
    <svg width={width} height={height} className="overflow-visible ml-auto">
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.8"
        points={points}
      />
    </svg>
  )
}

export default function InteractiveKPI({
  label,
  value,
  total = 0,
  icon,
  color,
  description,
  trend,
  href,
  sparklineData
}: KPIProps) {
  const styles = colorMap[color]
  const percentage = (total > 0 && value >= 0) ? Math.min(Math.round((value / total) * 100), 100) : 0
  
  const formattedValue = new Intl.NumberFormat('es-MX').format(value)

  const Content = (
    <div className={`
      relative overflow-hidden rounded-2xl bg-white border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)]
      hover:shadow-[0_8px_16px_rgba(0,0,0,0.06)] ${styles.borderHover}
      transition-all duration-200 h-full p-5 group
    `}>
      <div className="flex justify-between items-start mb-4">
        <div className={`
          w-10 h-10 rounded-xl flex items-center justify-center 
          ${styles.iconBg} ${styles.text} transition-colors
        `}>
          {icons[icon]}
        </div>
        
        {trend !== undefined && (
          <div className={`
            px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1
            ${trend >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}
          `}>
            <span>{trend > 0 ? '↑' : trend < 0 ? '↓' : '-'}</span>
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{label}</h3>
        <div className="flex items-end gap-3">
          <span className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
            {formattedValue}
          </span>
          {total > 0 && (
            <span className="text-xs font-medium text-slate-400 mb-1">
              de {total} total
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between gap-4">
         {/* Progress bar info for "measurable" aspect if total exists */}
         {total > 0 ? (
           <div className="w-full">
              <div className="flex justify-between text-[10px] font-medium text-slate-400 mb-1.5 Uppercase">
                <span>Capacidad</span>
                <span>{percentage}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${styles.bar} transition-all duration-1000 ease-out`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
           </div>
         ) : (
           <p className="text-xs text-slate-400 line-clamp-1 flex-1">{description}</p>
         )}
         
         {sparklineData && (
           <div className="flex-shrink-0">
             <Sparkline data={sparklineData} colorName={color} />
           </div>
         )}
      </div>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block h-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-2xl">
        {Content}
      </Link>
    )
  }

  return Content
}
