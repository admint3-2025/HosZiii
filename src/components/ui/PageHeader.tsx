'use client'

import Link from 'next/link'

type PageHeaderProps = {
  title: string
  description: string
  icon: React.ReactNode
  color?: 'blue' | 'purple' | 'emerald' | 'orange' | 'rose'
  action?: {
    label: string
    href: string
    icon?: React.ReactNode
  }
  secondaryAction?: {
    label: string
    href: string
    icon?: React.ReactNode
  }
}

const gradients = {
  blue: 'from-blue-600 via-indigo-600 to-violet-700',
  purple: 'from-violet-600 via-purple-600 to-fuchsia-600',
  emerald: 'from-emerald-600 via-teal-600 to-cyan-600',
  orange: 'from-orange-500 via-amber-500 to-yellow-500',
  rose: 'from-rose-500 via-pink-500 to-fuchsia-500',
}

export default function PageHeader({
  title,
  description,
  icon,
  color = 'blue',
  action,
  secondaryAction,
}: PageHeaderProps) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradients[color]} p-6 shadow-xl`}>
      {/* Decoraciones de fondo */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl -mr-36 -mt-36"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-3xl -ml-24 -mb-24"></div>
      
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Título y descripción */}
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg">
            {icon}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            <p className="text-white/80 text-sm mt-0.5">{description}</p>
          </div>
        </div>
        
        {/* Acciones */}
        {(action || secondaryAction) && (
          <div className="flex items-center gap-2 sm:gap-3">
            {secondaryAction && (
              <Link
                href={secondaryAction.href}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-sm"
              >
                {secondaryAction.icon}
                <span>{secondaryAction.label}</span>
              </Link>
            )}
            {action && (
              <Link
                href={action.href}
                className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-800 font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 text-sm"
              >
                {action.icon}
                <span>{action.label}</span>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Componente para secciones con título
export function SectionTitle({ 
  title, 
  subtitle,
  action 
}: { 
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="h-8 w-1 bg-gradient-to-b from-indigo-500 to-violet-500 rounded-full"></div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

// Card moderna para contenido
export function ContentCard({ 
  children, 
  className = '',
  noPadding = false 
}: { 
  children: React.ReactNode
  className?: string
  noPadding?: boolean
}) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-sm ${noPadding ? '' : 'p-6'} ${className}`}>
      {children}
    </div>
  )
}

// Stat card moderna
export function StatCard({
  label,
  value,
  icon,
  color = 'blue',
}: {
  label: string
  value: number | string
  icon?: React.ReactNode
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'rose'
}) {
  const colors = {
    blue: 'from-blue-500 to-indigo-600 text-blue-600 bg-blue-50',
    green: 'from-emerald-500 to-teal-600 text-emerald-600 bg-emerald-50',
    orange: 'from-orange-500 to-amber-500 text-orange-600 bg-orange-50',
    purple: 'from-violet-500 to-purple-600 text-violet-600 bg-violet-50',
    rose: 'from-rose-500 to-pink-600 text-rose-600 bg-rose-50',
  }
  
  const [, textColor, bgColor] = colors[color].split(' ')
  
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</div>
          <div className={`text-2xl font-bold ${textColor}`}>{value}</div>
        </div>
        {icon && (
          <div className={`p-2 rounded-lg ${bgColor}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
