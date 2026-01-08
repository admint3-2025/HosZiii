'use client'

import { useState } from 'react'

type KPIProps = {
  label: string
  value: number
  total?: number
  icon: 'open' | 'closed' | 'escalated' | 'assigned'
  color: 'blue' | 'green' | 'orange' | 'purple'
  description: string
  trend?: number
}

const ICONS = {
  open: (
    <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  closed: (
    <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  escalated: (
    <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  assigned: (
    <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
}

const COLORS = {
  blue: {
    gradient: 'from-blue-500 to-indigo-600',
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    ring: 'ring-blue-200',
    iconBg: 'bg-blue-100',
  },
  green: {
    gradient: 'from-green-500 to-emerald-600',
    bg: 'bg-green-50',
    text: 'text-green-600',
    ring: 'ring-green-200',
    iconBg: 'bg-green-100',
  },
  orange: {
    gradient: 'from-orange-500 to-red-600',
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    ring: 'ring-orange-200',
    iconBg: 'bg-orange-100',
  },
  purple: {
    gradient: 'from-purple-500 to-pink-600',
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    ring: 'ring-purple-200',
    iconBg: 'bg-purple-100',
  },
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
  const [isExpanded, setIsExpanded] = useState(false)
  
  const colorScheme = COLORS[color]
  // Calcular porcentaje con validación robusta
  const percentage = (total > 0 && value >= 0) ? Math.min(Math.round((value / total) * 100), 100) : 0
  const circumference = 2 * Math.PI * 36
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div
      className="relative group"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div
        className={`card cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
          isExpanded ? 'ring-4 ' + colorScheme.ring : ''
        }`}
      >
        <div className="card-body relative overflow-hidden p-3 sm:p-4">
          {/* Background decoration */}
          <div className={`absolute top-0 right-0 w-20 h-20 sm:w-32 sm:h-32 ${colorScheme.bg} rounded-full blur-3xl opacity-50 -mr-10 -mt-10 sm:-mr-16 sm:-mt-16`}></div>
          
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-2 sm:mb-3">
              <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl ${colorScheme.iconBg} ${colorScheme.text} transition-transform group-hover:scale-110`}>
                {ICONS[icon]}
              </div>
              
              {/* Mini progress ring */}
              <svg className="w-10 h-10 sm:w-14 sm:h-14 -rotate-90" viewBox="0 0 80 80">
                {/* Background circle */}
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  className="text-gray-200"
                />
                {/* Progress circle */}
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className={`${colorScheme.text} transition-all duration-1000`}
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div className="space-y-0.5 sm:space-y-1">
              <div className="text-[11px] sm:text-sm font-medium text-gray-600 truncate">{label}</div>
              <div className="flex items-baseline gap-1 sm:gap-2 flex-wrap">
                <div className={`text-2xl sm:text-4xl font-extrabold bg-gradient-to-r ${colorScheme.gradient} bg-clip-text text-transparent`}>
                  {value}
                </div>
                {/* Porcentaje como badge separado */}
                <div className={`flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${colorScheme.bg} ${colorScheme.text}`}>
                  {percentage}%
                </div>
                {trend !== undefined && trend !== 0 && (
                  <div
                    className={`hidden sm:flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
                      trend > 0
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {trend > 0 ? '↑' : '↓'}
                    <span>{Math.abs(trend)}%</span>
                  </div>
                )}
              </div>
              
              {isExpanded && (
                <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-200 text-[10px] sm:text-xs text-gray-600 animate-in fade-in slide-in-from-top-2 duration-300">
                  {description}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {showTooltip && !isExpanded && (
        <div className="absolute z-50 left-1/2 -translate-x-1/2 -top-2 -translate-y-full px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl whitespace-nowrap animate-in fade-in slide-in-from-bottom-2 duration-200">
          {description}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  )
}
