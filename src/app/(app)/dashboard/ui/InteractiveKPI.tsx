'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'

type KPIProps = {
  label: string
  value: number
  total?: number
  icon: 'open' | 'closed' | 'escalated' | 'assigned'
  color: 'blue' | 'green' | 'orange' | 'purple' | 'amber' | 'red'
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
    stroke: '#3b82f6',
    hover: 'group-hover:border-blue-300',
    trend: 'bg-blue-100',
    glow: 'bg-blue-500',
  },
  green: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-200',
    bar: 'bg-emerald-500',
    stroke: '#10b981',
    hover: 'group-hover:border-emerald-300',
    trend: 'bg-emerald-100',
    glow: 'bg-emerald-500',
  },
  orange: {
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    border: 'border-orange-200',
    bar: 'bg-orange-500',
    stroke: '#f97316',
    hover: 'group-hover:border-orange-300',
    trend: 'bg-orange-100',
    glow: 'bg-orange-500',
  },
  purple: {
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    border: 'border-purple-200',
    bar: 'bg-purple-500',
    stroke: '#a855f7',
    hover: 'group-hover:border-purple-300',
    trend: 'bg-purple-100',
    glow: 'bg-purple-500',
  },
  amber: {
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-200',
    bar: 'bg-amber-500',
    stroke: '#f59e0b',
    hover: 'group-hover:border-amber-300',
    trend: 'bg-amber-100',
    glow: 'bg-amber-500',
  },
  red: {
    bg: 'bg-red-50',
    text: 'text-red-600',
    border: 'border-red-200',
    bar: 'bg-red-500',
    stroke: '#ef4444',
    hover: 'group-hover:border-red-300',
    trend: 'bg-red-100',
    glow: 'bg-red-500',
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

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const safe = (data?.length ? data : [0]).slice(-12)
  const max = Math.max(...safe)
  const min = Math.min(...safe)

  const points = safe
    .map((d, i) => {
      const x = safe.length === 1 ? 0 : (i / (safe.length - 1)) * 100
      const y = 100 - ((d - min) / (max - min || 1)) * 100
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <linearGradient id={`grad-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`M0,100 L0,${100 - ((safe[0] - min) / (max - min || 1)) * 100} ${points.split(' ').map((p) => `L${p}`).join(' ')} L100,100 Z`}
        fill={`url(#grad-${color})`}
        className="opacity-0 group-hover:opacity-100 transition-opacity duration-500"
      />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={points}
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function generateSparklineData(value: number): number[] {
  return Array.from({ length: 7 }, (_, i) => Math.floor(value * (0.7 + (i * 0.3 / 6))))
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
  const [isHovered, setIsHovered] = useState(false)
  const styles = colorMap[color]
  const percentage = (total > 0 && value >= 0) ? Math.min(Math.round((value / total) * 100), 100) : 0
  
  const formattedValue = new Intl.NumberFormat('es-MX').format(value)
  const data = sparklineData || generateSparklineData(value)
  const trendValue = trend || (value > 0 ? 5 : 0)
  const trendDirection = trendValue >= 0 ? 'up' : 'down'

  const Content = (
    <div 
      className={`
        relative overflow-hidden rounded-xl bg-white border-2 ${styles.border} ${styles.hover}
        hover:shadow-lg h-full p-5 group cursor-default
      `}
      style={{
        transition: 'box-shadow 0.3s ease-out, border-color 0.3s ease-out, transform 0.2s ease-out'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Hover Glow Effect */}
      <div className={`absolute top-0 left-0 w-full h-[2px] transition-all duration-500 transform scale-x-0 group-hover:scale-x-100 ${styles.glow}`}></div>

      <div className="relative z-10 flex flex-col h-full justify-between">
        {/* Header */}
        <div className="flex justify-between items-start">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-gray-700 transition-colors">{label}</span>
          
          {/* Trend Badge */}
          <div className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded transition-colors duration-300 
            ${trendDirection === 'up' ? 'text-emerald-600 bg-emerald-50 group-hover:bg-emerald-100' : 'text-red-600 bg-red-50 group-hover:bg-red-100'}`}>
            {trendDirection === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {trendValue}%
          </div>
        </div>

        {/* Value */}
        <div className="flex items-end justify-between mt-2">
          <span className="text-3xl font-bold text-gray-900 tracking-tighter">
            {formattedValue}
          </span>
        </div>
        
        {/* Description - Fixed Height */}
        <div className="mt-2 pt-2 border-t border-dashed border-gray-300 min-h-[2.5rem]">
          <span className="text-[10px] text-gray-500 font-medium line-clamp-2">{description}</span>
        </div>

        {/* Percentage bar */}
        {total > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="text-gray-500 font-medium">{percentage}% del total</span>
              <span className="text-gray-400 font-semibold">{total}</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className={`h-full ${styles.bar} transition-all duration-700 rounded-full`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Sparkline Background */}
      {data.length > 0 && (
        <div className="absolute bottom-0 right-0 w-1/2 h-16 opacity-20 group-hover:opacity-40 transition-opacity duration-500 pointer-events-none">
          <Sparkline data={data} color={styles.stroke} />
        </div>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {Content}
      </Link>
    )
  }

  return Content
}
