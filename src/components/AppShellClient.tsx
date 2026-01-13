'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import SignOutButton from './SignOutButton'
import NotificationBell from './NotificationBell'
import MobileSidebar from './MobileSidebar'

// Iconos Lucide-style como SVG
const Icons = {
  Dashboard: (props: any) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  Ticket: (props: any) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
  Calendar: (props: any) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Reports: (props: any) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Book: (props: any) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  Audit: (props: any) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Users: (props: any) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  Location: (props: any) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Assets: (props: any) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  User: (props: any) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Menu: (props: any) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  ChevronLeft: (props: any) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  ),
  ChevronRight: (props: any) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  Check: (props: any) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  LogOut: (props: any) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
}

type NavItemProps = {
  href: string
  label: string
  icon: keyof typeof Icons
  isActive: boolean
  sidebarOpen: boolean
}

function NavItem({ href, label, icon, isActive, sidebarOpen }: NavItemProps) {
  const Icon = Icons[icon]
  
  return (
    <Link
      href={href}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative
        ${isActive 
          ? 'bg-white/10 text-white' 
          : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
      title={!sidebarOpen ? label : undefined}
    >
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-indigo-500 rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
      )}
      <Icon 
        className={`w-5 h-5 z-10 transition-colors flex-shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-white'}`}
      />
      {sidebarOpen && (
        <span className={`text-sm font-medium tracking-wide z-10 whitespace-nowrap ${isActive ? 'text-white font-semibold' : ''}`}>
          {label}
        </span>
      )}
    </Link>
  )
}

type MenuSection = {
  group: string
  items: {
    id: string
    label: string
    icon: keyof typeof Icons
    href: string
    roles?: string[]
    requireBeo?: boolean
  }[]
}

interface AppShellClientProps {
  children: React.ReactNode
  user: any
  profile: any
  locationCodes: string[]
  locationNames: string[]
  userData: {
    role: string | null
    canViewBeo: boolean
  }
}

export default function AppShellClient({ 
  children, 
  user, 
  profile, 
  locationCodes, 
  locationNames,
  userData 
}: AppShellClientProps) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  // Estructura del menú basada en roles
  const menuStructure: MenuSection[] = [
    {
      group: 'Principal',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: 'Dashboard', href: '/dashboard' },
        { id: 'tickets', label: 'Mis Tickets', icon: 'Ticket', href: '/tickets' },
        { id: 'beo', label: 'Eventos (BEO)', icon: 'Calendar', href: '/beo/dashboard', requireBeo: true },
      ]
    },
    {
      group: 'Análisis',
      items: [
        { id: 'reports', label: 'Reportes', icon: 'Reports', href: '/reports' },
        { id: 'knowledge', label: 'Base de Conocimientos', icon: 'Book', href: '/admin/knowledge-base', roles: ['admin', 'supervisor', 'agent_l1', 'agent_l2'] },
        { id: 'audit', label: 'Auditoría', icon: 'Audit', href: '/audit', roles: ['admin'] },
      ]
    },
    {
      group: 'Administración',
      items: [
        { id: 'users', label: 'Usuarios', icon: 'Users', href: '/admin/users', roles: ['admin'] },
        { id: 'locations', label: 'Ubicaciones', icon: 'Location', href: '/admin/locations', roles: ['admin'] },
        { id: 'assets', label: 'Activos', icon: 'Assets', href: '/admin/assets', roles: ['admin', 'supervisor'] },
      ]
    }
  ]

  // Filtrar items según roles y permisos
  const filterItems = (items: MenuSection['items']) => {
    return items.filter(item => {
      if (item.requireBeo && !profile?.can_view_beo) return false
      if (item.roles && !item.roles.includes(profile?.role || '')) return false
      return true
    })
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} hidden lg:flex bg-slate-900 text-slate-300 transition-all duration-500 ease-in-out flex-col z-20 relative`}>
        <div className="absolute inset-0 bg-slate-900 z-0"></div>
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/50 to-transparent z-0"></div>

        {/* Logo Area */}
        <div className="h-20 flex items-center px-4 z-10 border-b border-slate-800">
          <div className="flex items-center gap-3 text-white font-bold tracking-tight overflow-hidden">
            <div className="bg-white rounded-xl shadow-lg shadow-indigo-500/20 flex items-center justify-center p-1 flex-shrink-0">
              <img 
                src="https://integrational3.com.mx/logorigen/ZIII%20logo.png" 
                alt="ZIII Logo" 
                className={`${sidebarOpen ? 'w-10 h-10' : 'w-9 h-9'} object-contain transition-all`}
              />
            </div>
            {sidebarOpen && (
              <div className="animate-in fade-in duration-300 min-w-0">
                <span className="tracking-wider text-lg block">ZIII <span className="font-light text-indigo-400">Helpdesk</span></span>
                <p className="text-[10px] text-slate-500 font-normal truncate">ITIL v4 Service Desk</p>
              </div>
            )}
          </div>
        </div>

        {/* Toggle button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-24 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all z-30 shadow-lg"
        >
          {sidebarOpen ? (
            <Icons.ChevronLeft className="w-3 h-3" />
          ) : (
            <Icons.ChevronRight className="w-3 h-3" />
          )}
        </button>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-4 custom-scrollbar z-10">
          {menuStructure.map((section) => {
            const filteredItems = filterItems(section.items)
            if (filteredItems.length === 0) return null
            
            return (
              <div key={section.group}>
                {sidebarOpen && (
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-3">
                    {section.group}
                  </h3>
                )}
                <div className="space-y-1">
                  {filteredItems.map((item) => (
                    <NavItem
                      key={item.id}
                      href={item.href}
                      label={item.label}
                      icon={item.icon}
                      isActive={isActive(item.href)}
                      sidebarOpen={sidebarOpen}
                    />
                  ))}
                </div>
              </div>
            )
          })}

          {/* Perfil en sidebar */}
          <div className="pt-4 border-t border-slate-800">
            <NavItem
              href="/profile"
              label="Mi Perfil"
              icon="User"
              isActive={isActive('/profile')}
              sidebarOpen={sidebarOpen}
            />
          </div>

          {/* Badge ITIL */}
          {sidebarOpen && (
            <div className="mx-1 mt-4 px-4 py-3 rounded-xl bg-gradient-to-br from-indigo-900/50 to-slate-800 border border-indigo-700/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/10 rounded-full -mr-8 -mt-8"></div>
              <div className="relative flex items-center gap-2 text-indigo-300 mb-1">
                <div className="p-1 bg-indigo-600/50 rounded-lg">
                  <Icons.Check className="w-3 h-3 text-indigo-300" />
                </div>
                <span className="text-[11px] font-bold">ITIL v4 Based</span>
              </div>
              <p className="relative text-[10px] text-slate-400 leading-relaxed">
                Sistema profesional de gestión de servicios
              </p>
            </div>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Decoración de fondo - movida al área de scroll */}
        
        {/* Header fijo - fuera del scroll */}
        <header className="h-16 lg:h-[68px] flex items-center justify-between px-4 lg:px-8 z-40 bg-slate-50 border-b border-slate-200 shadow-sm flex-shrink-0">
          {/* Izquierda - Sede actual */}
          <div className="flex items-center">
            {/* Logo móvil */}
            <div className="lg:hidden flex items-center gap-2 mr-4">
              <div className="bg-white rounded-lg shadow p-1 border border-slate-200">
                <img 
                  src="https://integrational3.com.mx/logorigen/ZIII%20logo.png" 
                  alt="ZIII Logo" 
                  className="w-8 h-8 object-contain"
                />
              </div>
            </div>

            {/* Sede activa - estilo simple */}
            {locationCodes.length > 0 && (
              <div className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-400 bg-white" title={locationNames.join(', ')}>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  {locationCodes.join(' · ')}
                </span>
              </div>
            )}
          </div>

          {/* Derecha - Todo agrupado */}
          <div className="flex items-center gap-3">
            {/* Grupo usuario + perfil juntos */}
            <div className="hidden lg:flex items-center gap-1 bg-white rounded-full border border-slate-200 shadow-sm pl-1.5 pr-1">
              {/* Avatar */}
              <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">
                  {user?.email?.[0]?.toUpperCase() || 'H'}
                </span>
              </div>
              {/* Nombre y rol */}
              <div className="text-left px-2 py-1.5 border-r border-slate-100">
                <div className="text-sm font-semibold text-slate-800 leading-tight">
                  {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'}
                </div>
                <div className="text-[10px] font-bold text-violet-500 uppercase">
                  {profile?.role === 'admin' ? 'Admin' : profile?.role === 'agent_l1' ? 'Agente L1' : profile?.role === 'agent_l2' ? 'Agente L2' : profile?.role === 'supervisor' ? 'Supervisor' : 'Usuario'}
                </div>
              </div>
              {/* Botón Perfil integrado */}
              <Link
                href="/profile"
                className="flex items-center gap-1.5 px-3 py-2 text-slate-500 hover:text-violet-600 transition-colors text-xs font-medium"
              >
                <Icons.User className="w-4 h-4" />
                <span>Perfil</span>
              </Link>
            </div>

            {/* Notificaciones */}
            <NotificationBell />
            
            {/* Salir */}
            <SignOutButton />
          </div>
        </header>

        {/* Main content area - con scroll independiente */}
        <main className="flex-1 overflow-y-auto px-4 lg:px-6 xl:px-8 py-4 lg:py-6 pb-24 lg:pb-6 scroll-smooth relative">
          {/* Decoración de fondo dentro del área scrolleable */}
          <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-indigo-200/20 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none z-0"></div>
          <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-blue-200/20 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none z-0"></div>
          
          <div className="relative z-10">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile navigation */}
      <MobileSidebar userData={userData} />
    </div>
  )
}
