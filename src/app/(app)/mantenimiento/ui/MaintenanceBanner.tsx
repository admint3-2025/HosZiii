'use client'

import Link from 'next/link'

interface MaintenanceBannerProps {
  title: string
  subtitle: string
  icon?: React.ReactNode
  actionLabel?: string
  actionHref?: string
  badge?: { label: string; sub?: string | null }
  children?: React.ReactNode
}

export default function MaintenanceBanner({
  title,
  subtitle,
  icon,
  actionLabel,
  actionHref,
  badge,
  children,
}: MaintenanceBannerProps) {
  const defaultIcon = (
    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m6 2a8 8 0 11-16 0 8 8 0 0116 0zm-6 6v4m-2-2h4" />
    </svg>
  )

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-900 via-orange-800 to-red-900 shadow-2xl border border-orange-700/50">
      {/* Patrón de fondo */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgb(251 146 60) 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }}></div>
      </div>
      
      {/* Efectos de brillo */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-orange-500/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-red-500/10 rounded-full blur-3xl"></div>
      
      <div className="relative z-10 px-6 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Icono con glow */}
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 bg-orange-500 rounded-xl blur-md opacity-50"></div>
              <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 border border-orange-400/30 flex items-center justify-center shadow-xl">
                {icon || defaultIcon}
              </div>
            </div>
            
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-extrabold text-white tracking-tight">{title}</h1>
                {badge && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold text-white ring-1 ring-white/20">
                    <span>{badge.label}</span>
                    {badge.sub && (
                      <span className="text-white/80">· {badge.sub}</span>
                    )}
                  </span>
                )}
              </div>
              <p className="text-orange-200 text-xs mt-0.5">{subtitle}</p>
            </div>
          </div>
          
          {/* Acción principal o children */}
          <div className="flex items-center gap-3">
            {children}
            {actionLabel && actionHref && (
              <Link
                href={actionHref}
                className="group relative flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg hover:shadow-xl hover:shadow-orange-500/25 hover:scale-[1.02]"
              >
                <svg className="w-4 h-4 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                <span>{actionLabel}</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
