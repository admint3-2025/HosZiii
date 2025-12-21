import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import SignOutButton from './SignOutButton'
import Footer from './Footer'

function NavItem({ href, label, icon, badge }: { href: string; label: string; icon: React.ReactNode; badge?: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-700"
    >
      <div className="flex-shrink-0 w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors">
        {icon}
      </div>
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded-full">
          {badge}
        </span>
      )}
    </Link>
  )
}

function NavSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {title}
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
    ? await supabase.from('profiles').select('role').eq('id', user.id).single()
    : { data: null }

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
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/5 p-2.5 backdrop-blur-sm">
              <img
                src="https://integrational3.com.mx/logorigen/ZIII%20logo.png"
                alt="ZIII Logo"
                className="h-20 w-auto drop-shadow-xl"
              />
            </div>
            <div className="border-l border-white/30 pl-5">
              <div className="text-xl font-bold text-white tracking-wider font-[family-name:var(--font-orbitron)]">ZIII Helpdesk</div>
              <div className="text-xs text-blue-100 font-medium mt-0.5">Sistema de Gestión ITIL v4 · Service Desk</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/5">
              <div className="flex-shrink-0 w-9 h-9 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full flex items-center justify-center ring-2 ring-white/30">
                <span className="text-white text-sm font-bold">
                  {user?.email?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold text-white">
                  {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'}
                </div>
                <div className="text-xs text-blue-100 flex items-center gap-1.5">
                  <span>{user?.email}</span>
                  {profile?.role && (
                    <>
                      <span className="text-white/50">•</span>
                      <span className="px-1.5 py-0.5 bg-blue-500/30 rounded text-[10px] font-medium uppercase">
                        {profile.role === 'admin' ? 'Admin' : profile.role === 'agent_l1' ? 'Agente L1' : profile.role === 'agent_l2' ? 'Agente L2' : profile.role === 'supervisor' ? 'Supervisor' : 'Usuario'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="flex-1">
        <div className="mx-auto max-w-7xl px-6 py-6 grid gap-6 lg:grid-cols-[240px_1fr]">
          <aside className="card h-fit shadow-sm border border-slate-200">
          <div className="card-body p-3">
            <nav className="flex flex-col space-y-4">
              {/* Sección Principal */}
              <div className="space-y-0.5">
                <div className="px-2 py-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  Principal
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
                  label="Tickets" 
                  icon={
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  }
                />
              </div>

              {/* Sección Análisis */}
              <div className="space-y-0.5">
                <div className="px-2 py-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  Análisis
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
                <NavItem 
                  href="/audit" 
                  label="Auditoría" 
                  icon={
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  }
                />
              </div>

              {/* Sección Administración */}
              {profile?.role === 'admin' && (
                <div className="space-y-0.5">
                  <div className="px-2 py-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                    Administración
                  </div>
                  <NavItem 
                    href="/admin/users" 
                    label="Usuarios" 
                    icon={
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    }
                  />
                </div>
              )}

              {/* Badge ITIL */}
              <div className="pt-3 border-t border-gray-200">
                <div className="px-2 py-2 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
                  <div className="flex items-center gap-1.5 text-blue-700 mb-0.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-[10px] font-semibold">ITIL v4</span>
                  </div>
                  <p className="text-[10px] text-blue-600">
                    Mesa de ayuda certificada
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
    </div>
  )
}
