import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import Link from 'next/link'
import type { ReactNode } from 'react'
import SignOutButton from '@/components/SignOutButton'
import NotificationBell from '@/components/NotificationBell'
import { createSupabaseServerClient, getSafeServerUser } from '@/lib/supabase/server'
import { getAvatarInitial } from '@/lib/ui/avatar'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { isMaintenanceAssetCategory, isITAssetCategoryOrUnassigned } from '@/lib/permissions/asset-category'

// Tipos de actividad y sus configuraciones
const activityConfig: Record<string, { label: string; icon: string; color: string }> = {
  CREATE: { label: 'Nuevo', icon: '＋', color: 'text-emerald-400' },
  UPDATE: { label: 'Actualizado', icon: '✎', color: 'text-blue-400' },
  DELETE: { label: 'Eliminado', icon: '✕', color: 'text-red-400' },
  EXPORT: { label: 'Exportado', icon: '↓', color: 'text-violet-400' },
  ASSIGN: { label: 'Asignado', icon: '→', color: 'text-amber-400' },
  COMMENT: { label: 'Comentario en', icon: '💬', color: 'text-cyan-400' },
  CLOSE: { label: 'Cerrado', icon: '✓', color: 'text-green-400' },
  REOPEN: { label: 'Reabierto', icon: '↻', color: 'text-orange-400' },
  LOGIN: { label: 'Sesión iniciada', icon: '●', color: 'text-slate-400' },
}

const entityTypeLabels: Record<string, string> = {
  ticket: 'Ticket',
  tickets: 'Ticket',
  ticket_it: 'Ticket IT',
  ticket_maintenance: 'Ticket Mantenimiento',
  tickets_maintenance: 'Ticket Mantenimiento',
  user: 'Usuario',
  users: 'Usuario',
  asset: 'Activo',
  assets: 'Activo IT',
  assets_it: 'Activo IT',
  assets_maintenance: 'Activo Mantenimiento',
  asset_disposal_request: 'Solicitud de Baja',
  report: 'Reporte',
  location: 'Ubicación',
  locations: 'Ubicación',
  department: 'Departamento',
  departments: 'Departamento',
  profile: 'Perfil',
  profiles: 'Usuario',
  beo: 'Evento BEO',
  knowledge_base: 'Base de Conocimientos',
  inspection: 'Inspección',
  inspections: 'Inspección',
}

// Definición de módulos del sistema
type Module = {
  id: string
  name: string
  description: string
  icon: ReactNode
  href?: string
  getHref?: (profile: any) => string
  bgGradient: string
  iconBg: string
  textColor: string
  requiredRoles?: string[]
  checkPermission?: (profile: any) => boolean
}

const modules: Module[] = [
  {
    id: 'it-helpdesk',
    name: 'IT - HELPDESK',
    description: 'Mesa de Ayuda: Soporte Técnico y Desarrollo',
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    getHref: (profile: any) => {
      const isAdminOrSupervisor = profile?.role === 'admin' || profile?.role === 'supervisor'
      const isAgent = profile?.role === 'agent_l1' || profile?.role === 'agent_l2'
      const canManageIT = isITAssetCategoryOrUnassigned(profile?.asset_category)
      
      // Admin, supervisor IT, o agentes IT van al dashboard
      if (isAdminOrSupervisor && (profile?.role === 'admin' || canManageIT)) {
        return '/dashboard'
      }
      if (isAgent && canManageIT) {
        return '/dashboard'
      }
      // Usuarios normales (incluido corporate_admin) van a su bandeja de tickets
      return '/tickets?view=mine'
    },
    bgGradient: 'from-blue-500 via-indigo-500 to-purple-600',
    iconBg: 'bg-blue-100',
    textColor: 'text-blue-900',
    requiredRoles: ['admin', 'supervisor', 'agent_l1', 'agent_l2', 'requester', 'corporate_admin'],
  },
  {
    id: 'mantenimiento',
    name: 'MANTENIMIENTO',
    description: 'Órdenes de Trabajo: Ingeniería, Equipos e Infraestructura',
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    getHref: (profile: any) => {
      const isAdminOrSupervisor = profile?.role === 'admin' || profile?.role === 'supervisor'
      const canManageMaintenance = isMaintenanceAssetCategory(profile?.asset_category)
      
      // Admin o supervisor de mantenimiento van al dashboard
      if (isAdminOrSupervisor && (profile?.role === 'admin' || canManageMaintenance)) {
        return '/mantenimiento/dashboard'
      }
      // Usuarios normales (incluido corporate_admin) van a su bandeja de tickets
      return '/mantenimiento/tickets?view=mine'
    },
    bgGradient: 'from-emerald-500 via-teal-500 to-cyan-600',
    iconBg: 'bg-emerald-100',
    textColor: 'text-emerald-900',
    requiredRoles: ['admin', 'supervisor', 'agent_l1', 'agent_l2', 'requester', 'corporate_admin'],
  },
  {
    id: 'corporativo',
    name: 'CORPORATIVO',
    description: 'Inspecciones, Políticas, Procedimientos, Academia',
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    href: '/corporativo/dashboard',
    bgGradient: 'from-amber-500 via-orange-500 to-red-600',
    iconBg: 'bg-amber-100',
    textColor: 'text-amber-900',
    requiredRoles: ['admin', 'corporate_admin'],
  },
  {
    id: 'administracion',
    name: 'ADMINISTRACIÓN',
    description: 'Configuración del Sistema: Usuarios, Permisos, Auditoría',
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    href: '/admin',
    bgGradient: 'from-violet-500 via-purple-500 to-fuchsia-600',
    iconBg: 'bg-violet-100',
    textColor: 'text-violet-900',
    requiredRoles: ['admin'],
  },
]

export const dynamic = 'force-dynamic'

export default async function HubPage() {
  const user = await getSafeServerUser()
  
  if (!user) {
    redirect('/login')
  }

  const supabase = await createSupabaseServerClient()
  
  const { data: profile } = await supabase
    .from('profiles')
    // NOTE: Avoid selecting hub_modules explicitly because older DBs may not have the column yet.
    // Selecting '*' will include hub_modules when present, and won't error when absent.
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  // Obtener actividades recientes del usuario
  const { data: recentActivities } = await supabase
    .from('audit_log')
    .select('id, action, entity_type, entity_id, metadata, created_at')
    .eq('actor_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  // Determinar módulos accesibles según el rol del usuario
  const accessibleByRole = modules.filter(module => {
    if (!module.requiredRoles) return true
    if (module.checkPermission) return module.checkPermission(profile)
    return module.requiredRoles.includes(profile.role)
  })

  const hubModules = (profile as any)?.hub_modules as Record<string, unknown> | null
  const accessibleModules =
    profile?.role === 'admin' && hubModules && typeof hubModules === 'object'
      ? accessibleByRole.filter((m) => hubModules[m.id] !== false)
      : accessibleByRole

  // NO redirigir automáticamente si es el único módulo
  // Los usuarios deben ver el hub para navegar entre sus módulos disponibles
  // (comentado porque causaba loops infinitos con corporate_admin)
  // if (accessibleModules.length === 1) {
  //   redirect(accessibleModules[0].href)
  // }

  // Si no tiene acceso a ningún módulo (caso raro), mostrar mensaje
  if (accessibleModules.length === 0) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
        <div className="card max-w-md text-center">
          <div className="card-body p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Sin Acceso a Módulos</h1>
            <p className="text-sm text-gray-600 mb-6">
              Tu cuenta no tiene permisos asignados. Contacta al administrador del sistema.
            </p>
            <Link href="/login" className="btn btn-primary">
              Cerrar Sesión
            </Link>
          </div>
        </div>
      </main>
    )
  }

  // Datos de header
  const hdrs = await headers()
  const forwardedFor = hdrs.get('x-forwarded-for') || hdrs.get('x-real-ip') || ''
  const clientIpRaw = forwardedFor.split(',')[0]?.trim() || ''
  const clientIp = clientIpRaw.replace(/^::ffff:/i, '') || '—'

  const roleLabel =
    profile?.role === 'admin'
      ? 'ADMINISTRADOR'
      : profile?.role === 'corporate_admin'
        ? 'ADMIN CORPORATIVO'
      : profile?.role === 'agent_l1'
        ? 'AGENTE L1'
        : profile?.role === 'agent_l2'
          ? 'AGENTE L2'
          : profile?.role === 'supervisor'
            ? (isMaintenanceAssetCategory(profile?.asset_category) ? 'MANTENIMIENTO - SUPERVISOR' : 'IT - SUPERVISOR')
            : profile?.role === 'requester'
              ? 'USUARIO'
              : profile?.role === 'auditor'
                ? 'AUDITOR'
                : 'USUARIO'

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header fijo */}
      <div className="sticky top-0 z-40 border-b border-slate-800/70 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-900/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 xl:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-6 min-w-0">
              <div className="flex items-center gap-3 flex-shrink-0">
                <img
                  src="https://systemach-sas.com/logo_ziii/ZIII%20logo.png"
                  alt="ZIII HoS"
                  className="h-10 w-10 object-contain rounded-xl bg-white shadow-lg shadow-slate-900/40"
                />
                <div className="leading-tight">
                  <p className="text-base font-bold text-white tracking-tight">ZIII HoS</p>
                  <p className="text-[11px] text-slate-400 font-medium">ITIL v4 Service Desk</p>
                </div>
              </div>

              <div className="h-12 w-px bg-slate-800/70 hidden lg:block" />

              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-violet-500/30 ring-2 ring-violet-400/20">
                  {getAvatarInitial({
                    fullName: profile?.full_name,
                    description: profile?.position,
                    email: user?.email,
                  })}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <p className="text-lg font-semibold text-white truncate" title={profile?.full_name || user?.email || ''}>
                      {profile?.full_name || user?.email?.split('@')[0] || 'Usuario'}
                    </p>
                    <span className="flex-shrink-0 inline-flex items-center rounded-full border border-violet-400/30 bg-violet-500/20 px-2.5 py-0.5 text-[11px] font-bold text-violet-200 uppercase tracking-wide">
                      {roleLabel}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span className="truncate" title={user?.email || ''}>{user?.email || '—'}</span>
                    <span className="text-slate-600">•</span>
                    <span className="uppercase truncate" title={profile?.position || ''}>{profile?.position || '—'}</span>
                    <span className="text-slate-600">•</span>
                    <span title={`IP: ${clientIp}`}>{clientIp}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <Link
                href="/profile"
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700 bg-slate-800/70 text-slate-200 hover:text-white hover:border-slate-600 transition-colors text-sm font-semibold"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A9 9 0 1112 21a9 9 0 01-6.879-3.196z" />
                </svg>
                Perfil
              </Link>
              <NotificationBell />
              <SignOutButton />
            </div>
          </div>
        </div>
      </div>

      {/* Módulos Grid */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {accessibleModules.map((module) => {
            const moduleHref = module.getHref ? module.getHref(profile) : (module.href || '#')
            return (
            <Link
              key={module.id}
              href={moduleHref}
              className="group relative overflow-hidden rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${module.bgGradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>

              <div className="relative z-10 p-8">
                <div className="flex items-start gap-6">
                  <div className={`${module.iconBg} p-4 rounded-2xl group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
                    <div className={module.textColor}>{module.icon}</div>
                  </div>

                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-white transition-colors">
                      {module.name}
                    </h2>
                    <p className="text-slate-400 text-sm leading-relaxed">{module.description}</p>
                  </div>

                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${module.bgGradient}`}></div>
              </div>
            </Link>
            )
          })}
        </div>

        {/* Footer con Actividad Reciente */}
        <footer className="mt-16 relative">
          {/* Línea decorativa superior */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent"></div>
          
          {/* Contenido principal del footer */}
          <div className="pt-12 pb-8">
            {/* Actividad Reciente */}
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-slate-500 text-xs">◷</span>
                <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">Actividad Reciente</h3>
                <div className="flex-1 h-px bg-slate-800"></div>
              </div>
              
              <div className="space-y-1">
                {recentActivities && recentActivities.length > 0 ? (
                  recentActivities.map((activity, idx) => {
                    const config = activityConfig[activity.action] || { label: activity.action, icon: '•', color: 'text-slate-400' }
                    const entityLabel = entityTypeLabels[activity.entity_type] || activity.entity_type.replace(/_/g, ' ')
                    const metadata = activity.metadata as Record<string, any> | null
                    // Mostrar nombre/título descriptivo, NO el ID
                    const detail = metadata?.email || metadata?.title || metadata?.name || metadata?.asset_tag || metadata?.code || null
                    const timeAgo = formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: es })
                    
                    return (
                      <div 
                        key={activity.id} 
                        className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-slate-800/40 transition-colors animate-in fade-in slide-in-from-left-2 duration-300"
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <span className={`text-sm ${config.color} flex-shrink-0 w-4 text-center`}>{config.icon}</span>
                        <span className="text-sm text-slate-300 truncate flex-1">
                          {config.label} {entityLabel}
                          {detail && <span className="text-slate-400"> — {detail}</span>}
                        </span>
                        <span className="text-[10px] text-slate-600 flex-shrink-0">{timeAgo}</span>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-sm text-slate-600 py-2 px-3">Sin actividad reciente</p>
                )}
              </div>
            </div>

            {/* Links y branding */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-t border-slate-800 pt-8">
              {/* Logo y descripción */}
              <div className="flex items-center gap-3">
                <img
                  src="https://systemach-sas.com/logo_ziii/ZIII%20logo.png"
                  alt="ZIII HoS"
                  className="h-8 w-8 object-contain"
                />
                <div>
                  <p className="text-sm font-semibold text-white tracking-tight">ZIII <span className="text-indigo-400 font-light">Hospitality OS</span></p>
                  <p className="text-[10px] text-slate-500">Sistema de Gestión Hotelera</p>
                </div>
              </div>

              {/* Links rápidos */}
              <div className="flex items-center gap-6 text-sm">
                <Link href="/profile" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 group">
                  <svg className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Mi Perfil
                </Link>
                <span className="text-slate-700">|</span>
                <Link href="/reports" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 group">
                  <svg className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Reportes
                </Link>
                <span className="text-slate-700">|</span>
                <Link href="/admin/knowledge-base" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 group">
                  <svg className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Ayuda
                </Link>
              </div>

              {/* Versión y copyright */}
              <div className="text-right">
                <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">Versión 2.1.0</p>
                <p className="text-xs text-slate-500">
                  © {new Date().getFullYear()} ZIII HoS
                </p>
              </div>
            </div>

            {/* Línea final con gradiente */}
            <div className="mt-8 flex items-center justify-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest">Sistema Activo</span>
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
            </div>
          </div>
        </footer>
      </div>
    </main>
  )
}
