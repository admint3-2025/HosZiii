'use client'

import { ReactNode } from 'react'

// --- MODERN BADGE COMPONENT ---
type BadgeVariant = 
  | 'Alta' | 'Crítica' | 'Media' | 'Baja'
  | 'Atrasado' | 'Pendiente' | 'En Proceso' | 'En Curso' | 'Completado'
  | 'Bloqueado' | 'Aprobado' | 'Observaciones'
  | 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'NEEDS_INFO' | 'WAITING_THIRD_PARTY' | 'RESOLVED' | 'CLOSED'
  | 'primary' | 'success' | 'warning' | 'danger' | 'neutral'

interface ModernBadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
}

const badgeStyles: Record<string, string> = {
  // Prioridades
  Alta: "bg-rose-50 text-rose-600 border border-rose-100",
  Crítica: "bg-rose-600 text-white shadow-lg shadow-rose-500/30",
  Media: "bg-amber-50 text-amber-600 border border-amber-100",
  Baja: "bg-slate-50 text-slate-600 border border-slate-100",
  
  // Estados operativos
  Atrasado: "bg-rose-50 text-rose-600 font-bold border border-rose-200",
  Pendiente: "bg-slate-100 text-slate-600 border border-slate-200",
  "En Proceso": "bg-indigo-50 text-indigo-600 border border-indigo-100",
  "En Curso": "bg-blue-50 text-blue-600 border border-blue-100",
  Completado: "bg-emerald-50 text-emerald-600 border border-emerald-100",
  Bloqueado: "bg-slate-800 text-white",
  Aprobado: "bg-teal-50 text-teal-600 border border-teal-100",
  Observaciones: "bg-amber-50 text-amber-600 border border-amber-100",
  
  // Estados de tickets ITIL
  NEW: "bg-blue-100 text-blue-700 border border-blue-200",
  ASSIGNED: "bg-indigo-100 text-indigo-700 border border-indigo-200",
  IN_PROGRESS: "bg-violet-100 text-violet-700 border border-violet-200",
  NEEDS_INFO: "bg-amber-100 text-amber-700 border border-amber-200",
  WAITING_THIRD_PARTY: "bg-orange-100 text-orange-700 border border-orange-200",
  RESOLVED: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  CLOSED: "bg-slate-100 text-slate-600 border border-slate-200",
  
  // Genéricos
  primary: "bg-indigo-50 text-indigo-600 border border-indigo-100",
  success: "bg-emerald-50 text-emerald-600 border border-emerald-100",
  warning: "bg-amber-50 text-amber-600 border border-amber-100",
  danger: "bg-rose-50 text-rose-600 border border-rose-100",
  neutral: "bg-slate-50 text-slate-600 border border-slate-100",
}

export function ModernBadge({ children, variant, className = '' }: ModernBadgeProps) {
  const variantKey = variant || (typeof children === 'string' ? children : 'neutral')
  const style = badgeStyles[variantKey] || badgeStyles.neutral
  
  return (
    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold tracking-wide inline-flex items-center gap-1 ${style} ${className}`}>
      {children}
    </span>
  )
}

// --- MODERN STAT CARD ---
interface StatCardProps {
  label: string
  value: string | number
  trend?: string
  status?: 'positive' | 'negative' | 'neutral'
  sub?: string
  icon?: ReactNode
  history?: number[]
  onClick?: () => void
}

function AreaSparkline({ data, status }: { data: number[], status?: string }) {
  if (!data || data.length < 2) return null
  const width = 100
  const height = 40
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const points = data.map((d, i) => `${(i/(data.length-1))*width},${height-((d-min)/range)*height}`).join(' ')
  const colorClass = status === 'positive' ? 'text-emerald-500' : status === 'negative' ? 'text-rose-500' : 'text-slate-400'
  const fillId = `gradient-${Math.random().toString(36).substr(2, 9)}`

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible" preserveAspectRatio="none">
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" className={colorClass} />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" className={colorClass} />
        </linearGradient>
      </defs>
      <polyline fill={`url(#${fillId})`} stroke="none" points={`${points} ${width},${height} 0,${height}`} />
      <polyline fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} className={colorClass} />
    </svg>
  )
}

export function StatCard({ label, value, trend, status = 'neutral', sub, icon, history, onClick }: StatCardProps) {
  return (
    <div 
      className={`bg-white rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 border border-slate-100 relative overflow-hidden group ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {/* Decoración de fondo */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-slate-50 to-indigo-50/50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
      
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            {icon && (
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                {icon}
              </div>
            )}
            <h3 className="text-slate-500 text-xs font-semibold tracking-wide uppercase">{label}</h3>
          </div>
          {trend && (
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
              status === 'positive' ? 'bg-emerald-50 text-emerald-600' : 
              status === 'negative' ? 'bg-rose-50 text-rose-600' : 
              'bg-slate-100 text-slate-600'
            }`}>
              {status === 'positive' && (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              )}
              {status === 'negative' && (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
              )}
              {trend}
            </div>
          )}
        </div>
        
        <div className="flex items-end justify-between">
          <div>
            <span className="text-2xl font-bold text-slate-900 tracking-tight">{value}</span>
            {sub && <p className="text-[11px] text-slate-400 mt-0.5 font-medium">{sub}</p>}
          </div>
          {history && history.length > 1 && (
            <div className="w-20 h-8 -mb-1">
              <AreaSparkline data={history} status={status} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// --- MODERN CARD ---
interface ModernCardProps {
  children: ReactNode
  title?: string
  titleIcon?: ReactNode
  action?: ReactNode
  className?: string
  noPadding?: boolean
}

export function ModernCard({ children, title, titleIcon, action, className = '', noPadding = false }: ModernCardProps) {
  return (
    <div className={`bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden ${className}`}>
      {(title || action) && (
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
          {title && (
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              {titleIcon && (
                <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  {titleIcon}
                </span>
              )}
              {title}
            </h3>
          )}
          {action}
        </div>
      )}
      <div className={noPadding ? '' : 'p-6'}>
        {children}
      </div>
    </div>
  )
}

// --- MODERN TABLE ---
interface TableColumn<T> {
  key: string
  header: string
  render?: (item: T) => ReactNode
  className?: string
}

interface ModernTableProps<T> {
  columns: TableColumn<T>[]
  data: T[]
  emptyMessage?: string
  onRowClick?: (item: T) => void
}

export function ModernTable<T extends Record<string, any>>({ columns, data, emptyMessage = 'No hay datos disponibles', onRowClick }: ModernTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="font-medium text-sm">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="text-xs text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
            {columns.map(col => (
              <th key={col.key} className={`pb-3 px-2 first:pl-0 last:pr-0 ${col.className || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {data.map((item, idx) => (
            <tr 
              key={idx} 
              className={`group hover:bg-slate-50/80 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map(col => (
                <td key={col.key} className={`py-3 px-2 first:pl-0 last:pr-0 ${col.className || ''}`}>
                  {col.render ? col.render(item) : item[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// --- MODERN BUTTON ---
interface ModernButtonProps {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  icon?: ReactNode
  className?: string
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

export function ModernButton({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  icon, 
  className = '', 
  onClick, 
  disabled = false,
  type = 'button'
}: ModernButtonProps) {
  const variants = {
    primary: 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:shadow-lg hover:shadow-indigo-500/25 hover:scale-[1.02]',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
    danger: 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-4 py-2 text-sm rounded-xl',
    lg: 'px-6 py-3 text-base rounded-xl',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center gap-2 font-bold transition-all duration-200
        disabled:opacity-50 disabled:pointer-events-none
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
    >
      {icon}
      {children}
    </button>
  )
}

// --- SECTION HEADER ---
interface SectionHeaderProps {
  title: string
  subtitle?: string
  icon?: ReactNode
  action?: ReactNode
}

export function SectionHeader({ title, subtitle, icon, action }: SectionHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          {icon && (
            <span className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
              {icon}
            </span>
          )}
          {title}
        </h1>
        {subtitle && (
          <p className="text-slate-500 font-medium mt-1">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  )
}
