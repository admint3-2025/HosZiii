import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import SignOutButton from './SignOutButton'
import Footer from './Footer'
import NotificationBell from './NotificationBell'
import MobileSidebar from './MobileSidebar'

function NavItem({ href, label, icon, badge }: { href: string; label: string; icon: React.ReactNode; badge?: string }) {
  return (
    <Link
      href={href}
      className="group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-gray-700 transition-all hover:bg-gradient-to-r hover:from-blue-50 hover:via-indigo-50 hover:to-blue-50 hover:text-blue-700 hover:pl-4"
    >
      {/* Badge de color que aparece en hover */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
      
      <div className="relative flex-shrink-0">
        <div className="w-5 h-5 text-gray-500 group-hover:text-blue-600 transition-colors">
          {icon}
        </div>
        {/* Punto decorativo */}
        <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
      </div>
      
      <span className="flex-1 font-medium">{label}</span>
      
      {badge && (
        <span className="flex-shrink-0 px-2.5 py-1 text-[10px] font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-md">
          {badge}
        </span>
      )}
    </Link>
  )
}

function NavSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-3 pt-4 pb-2">
        <div className="w-2 h-2 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-sm"></div>
        <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">{title}</span>
        <div className="h-px flex-1 bg-gradient-to-r from-gray-300 to-transparent"></div>
      </div>
      {children}
    </div>
  )
}

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = user
    ? await supabase.from('profiles').select('role,location_id,can_view_beo,locations(name,code)').eq('id', user.id).single()
    : { data: null }

  // Cargar múltiples sedes del usuario desde user_locations
  const { data: userLocations } = user
    ? await supabase.from('user_locations').select('location_id,locations(name,code)').eq('user_id', user.id)
    : { data: null }

  const locationCodes = userLocations?.map((ul: any) => ul.locations?.code).filter(Boolean) || []
  const locationNames = userLocations?.map((ul: any) => ul.locations?.name).filter(Boolean) || []

  // Datos para el sidebar móvil
  const userData = {
    role: profile?.role || null,
    canViewBeo: profile?.can_view_beo || false,
  }

  return (
    <div className="min-h-screen bg-slate-50 relative flex flex-col">
      {/* Patrón de fondo con iconos de helpdesk */}
      <div 
        className="fixed inset-0 -z-10 opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%232563eb' fill-opacity='1'%3E%3C!-- Ticket icon --%3E%3Cpath d='M15 20 L15 25 L20 25 L20 30 L15 30 L15 35 L10 35 L10 20 Z' /%3E%3Ccircle cx='12.5' cy='22.5' r='1' /%3E%3C!-- Headset icon --%3E%3Cpath d='M85 25 Q85 20 90 20 Q95 20 95 25 L95 30 L90 30 L90 25 Q90 23 85 23 Z' /%3E%3Cpath d='M80 25 Q80 20 85 20 M95 20 Q100 20 100 25' stroke='%232563eb' stroke-width='1' fill='none'/%3E%3C!-- Message bubble --%3E%3Crect x='40' y='70' width='20' height='15' rx='3' /%3E%3Cpath d='M45 85 L50 88 L55 85' /%3E%3C!-- User icon --%3E%3Ccircle cx='50' cy='25' r='4' /%3E%3Cpath d='M43 35 Q43 30 50 30 Q57 30 57 35 L57 38 L43 38 Z' /%3E%3C!-- Checkmark --%3E%3Cpath d='M70 75 L73 78 L78 70' stroke='%232563eb' stroke-width='2' fill='none' stroke-linecap='round'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '100px 100px'
        }}
      />
      
      {/* Degradado sutil para profundidad */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-transparent via-blue-50/30 to-indigo-50/30" />
      
      <header className="sticky top-0 z-50 border-b border-blue-200/50 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 shadow-lg backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
          {/* Logo y título - compacto en móvil */}
          <div className="flex items-center gap-3 sm:gap-5 min-w-0">
            <div className="rounded-xl sm:rounded-2xl bg-white/[0.03] ring-1 ring-white/5 p-1.5 sm:p-2.5 backdrop-blur-sm flex-shrink-0">
              <img
                src="https://integrational3.com.mx/logorigen/ZIII%20logo.png"
                alt="ZIII Logo"
                className="h-10 sm:h-20 w-auto drop-shadow-xl"
              />
            </div>
            <div className="border-l border-white/30 pl-3 sm:pl-5 min-w-0">
              <div className="text-base sm:text-xl font-bold text-white tracking-wider font-[family-name:var(--font-orbitron)] truncate">ZIII Helpdesk</div>
              <div className="text-[10px] sm:text-xs text-blue-100 font-medium mt-0.5 hidden sm:block">Sistema de Gestión ITIL v4 · Service Desk</div>
              <div className="text-[10px] text-blue-100 font-medium mt-0.5 sm:hidden">ITIL v4 · Service Desk</div>
            </div>
          </div>
          {/* Controles del header */}
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            {/* Info usuario - solo desktop */}
            <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/5">
              <div className="flex-shrink-0 w-9 h-9 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full flex items-center justify-center ring-2 ring-white/30">
                <span className="text-white text-sm font-bold">
                  {user?.email?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold text-white">
                  {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'}
                </div>
                <div className="text-xs text-blue-100 flex items-center gap-1.5 flex-wrap">
                  <span>{user?.email}</span>
                  {profile?.role && (
                    <>
                      <span className="text-white/50">•</span>
                      <span className="px-1.5 py-0.5 bg-blue-500/30 rounded text-[10px] font-medium uppercase">
                        {profile.role === 'admin' ? 'Admin' : profile.role === 'agent_l1' ? 'Agente L1' : profile.role === 'agent_l2' ? 'Agente L2' : profile.role === 'supervisor' ? 'Supervisor' : 'Usuario'}
                      </span>
                    </>
                  )}
                  {locationCodes.length > 0 && (
                    <>
                      <span className="text-white/50">•</span>
                      <span className="px-1.5 py-0.5 bg-emerald-500/30 rounded text-[10px] font-medium flex items-center gap-1" title={locationNames.join(', ')}>
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {locationCodes.join(', ')}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            {/* Notificaciones */}
            <NotificationBell />
            
            {/* Perfil - solo desktop */}
            <Link
              href="/profile"
              className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] backdrop-blur-sm border border-white/5 text-white hover:bg-white/[0.08] transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Mi Perfil</span>
            </Link>
            
            {/* Salir */}
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 sm:py-6 pb-20 lg:pb-6 lg:grid lg:gap-6 lg:grid-cols-[240px_1fr]">
          {/* Sidebar - solo visible en desktop */}
          <aside className="hidden lg:block card shadow-sm border border-slate-200 sticky top-6 self-start max-h-[calc(100vh-8rem)] overflow-y-auto">
          <div className="card-body p-4">
            <nav className="flex flex-col space-y-1">
              {/* Sección Principal */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 px-3 pb-2">
                  <div className="w-2 h-2 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-sm"></div>
                  <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">Principal</span>
                  <div className="h-px flex-1 bg-gradient-to-r from-gray-300 to-transparent"></div>
                </div>
                <NavItem 
                  href="/dashboard" 
                  label="Dashboard" 
                  icon={
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  }
                />
                <NavItem 
                  href="/tickets" 
                  label="Mis Tickets" 
                  icon={
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  }
                />
                {/* Dashboard BEO - Solo usuarios con permiso can_view_beo */}
                {profile?.can_view_beo && (
                  <NavItem 
                    href="/beo/dashboard" 
                    label="Eventos (BEO)" 
                    icon={
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    }
                  />
                )}
              </div>

              {/* Sección Análisis */}
              <div className="space-y-1 mt-4">
                <div className="flex items-center gap-2 px-3 pt-4 pb-2">
                  <div className="w-2 h-2 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 shadow-sm"></div>
                  <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">Análisis</span>
                  <div className="h-px flex-1 bg-gradient-to-r from-gray-300 to-transparent"></div>
                </div>
                <NavItem 
                  href="/reports" 
                  label="Reportes" 
                  icon={
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  }
                />
                {/* Base de Conocimientos - solo técnicos, supervisores y admins */}
                {(profile?.role === 'admin' || profile?.role === 'supervisor' || profile?.role === 'agent_l1' || profile?.role === 'agent_l2') && (
                  <NavItem 
                    href="/admin/knowledge-base" 
                    label="Base de Conocimientos" 
                    icon={
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    }
                  />
                )}
                {/* Auditoría solo para admin */}
                {profile?.role === 'admin' && (
                  <NavItem 
                    href="/audit" 
                    label="Auditoría" 
                    icon={
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    }
                  />
                )}
              </div>

              {/* Sección Administración */}
              {(profile?.role === 'admin' || profile?.role === 'supervisor') && (
                <div className="space-y-1 mt-4">
                  <div className="flex items-center gap-2 px-3 pt-4 pb-2">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm"></div>
                    <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">Administración</span>
                    <div className="h-px flex-1 bg-gradient-to-r from-gray-300 to-transparent"></div>
                  </div>
                  {/* Usuarios solo para admin */}
                  {profile?.role === 'admin' && (
                    <>
                      <NavItem 
                        href="/admin/users" 
                        label="Usuarios" 
                        icon={
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        }
                      />
                      <NavItem 
                        href="/admin/locations" 
                        label="Ubicaciones" 
                        icon={
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        }
                      />
                    </>
                  )}
                  {/* Activos para admin y supervisor */}
                  <NavItem 
                    href="/admin/assets" 
                    label="Activos" 
                    icon={
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    }
                  />
                </div>
              )}

              {/* Badge ITIL */}
              <div className="mt-6 pt-4 border-t border-gray-200 space-y-2">
                <Link
                  href="/profile"
                  className="group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-gray-700 transition-all hover:bg-gradient-to-r hover:from-blue-50 hover:via-indigo-50 hover:to-blue-50 hover:text-blue-700 hover:pl-4"
                >
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="relative flex-shrink-0">
                    <div className="w-5 h-5 text-gray-500 group-hover:text-blue-600 transition-colors">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </div>
                  
                  <span className="flex-1 font-medium">Mi Perfil</span>
                </Link>
              </div>

              {/* Badge ITIL */}
              <div className="mt-3">
                <div className="mx-3 px-4 py-3 rounded-xl bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50 border-2 border-blue-200 shadow-sm relative overflow-hidden">
                  {/* Decoración de fondo */}
                  <div className="absolute top-0 right-0 w-16 h-16 bg-blue-200/30 rounded-full -mr-8 -mt-8"></div>
                  <div className="absolute bottom-0 left-0 w-12 h-12 bg-indigo-200/30 rounded-full -ml-6 -mb-6"></div>
                  
                  <div className="relative flex items-center gap-2 text-blue-700 mb-1.5">
                    <div className="p-1 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg shadow-sm">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-[11px] font-bold">ITIL v4 Based</span>
                  </div>
                  <p className="relative text-[10px] text-blue-600 leading-relaxed font-medium">
                    Sistema profesional de gestión de servicios
                  </p>
                </div>
              </div>
            </nav>
          </div>
        </aside>
        <section className="min-w-0">{children}</section>
        </div>
      </div>
      
      <Footer />
      <MobileSidebar userData={userData} />
    </div>
  )
}
