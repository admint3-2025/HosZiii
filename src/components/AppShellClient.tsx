'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import SignOutButton from './SignOutButton'
import NotificationBell from './NotificationBell'
import { getAvatarInitial } from '@/lib/ui/avatar'
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
  Wrench: (props: any) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 2.5a6.5 6.5 0 01-9.2 8.3L7 15.6V19H4v-3.4l4.8-4.8A6.5 6.5 0 1119.5 3l-3 3 2.5 2.5 2-2z"
      />
    </svg>
  ),
  Bell: (props: any) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 01-6 0"
      />
    </svg>
  ),
  BarChart: (props: any) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 19V5m0 14h16" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17V9m4 8V7m4 10v-5" />
    </svg>
  ),
  Bed: (props: any) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18v9M5 19v-2m14 2v-2" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10V7a2 2 0 012-2h6a2 2 0 012 2v3" />
    </svg>
  ),
  Utensils: (props: any) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 3v7a4 4 0 004 4v7" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 3v7" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 3v8a3 3 0 003 3v7" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 3v6" />
    </svg>
  ),
  ShieldCheck: (props: any) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 3l7 4v6c0 5-3 8-7 9-4-1-7-4-7-9V7l7-4z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
    </svg>
  ),
  GraduationCap: (props: any) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7l9-4 9 4-9 4-9-4z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10v5c0 1 2 3 5 3s5-2 5-3v-5" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10v6" />
    </svg>
  ),
  Briefcase: (props: any) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V6a2 2 0 012-2h4a2 2 0 012 2v1" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 10a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 13h18" />
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

type CollapsibleMenu = {
  id: string
  label: string
  icon: keyof typeof Icons
  items: (MenuSection['items'][number] & { disabled?: boolean })[]
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
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({})
  const [clientIp, setClientIp] = useState<string | null>(null)
  
  const isActive = (href: string) => {
    const pathOnly = href.split('?')[0]
    return pathname === pathOnly || pathname.startsWith(pathOnly + '/')
  }

  // Links existentes de Helpdesk (se muestran dentro de "Mesa de Ayuda")
  const helpdeskItems: MenuSection['items'] = [
    { id: 'hd_dashboard', label: 'Dashboard', icon: 'Dashboard', href: '/dashboard' },
    { id: 'hd_tickets_mine', label: 'Mis Tickets', icon: 'Ticket', href: '/tickets?view=mine' },
    { id: 'hd_new_it', label: 'Crear Ticket IT', icon: 'Ticket', href: '/tickets/new?area=it' },
    { id: 'hd_new_maintenance', label: 'Crear Ticket Mantenimiento', icon: 'Wrench', href: '/tickets/new?area=maintenance' },
    ...(userData.role === 'admin' || userData.role === 'supervisor'
      ? ([{ id: 'hd_tickets_queue', label: 'Bandeja', icon: 'BarChart', href: '/tickets?view=queue', roles: ['admin', 'supervisor'] }] as MenuSection['items'])
      : []),
    { id: 'hd_beo', label: 'Eventos (BEO)', icon: 'Calendar', href: '/beo/dashboard', requireBeo: true },
    // reportes moved to Administración section
    {
      id: 'hd_knowledge',
      label: 'Base de Conocimientos',
      icon: 'Book',
      href: '/admin/knowledge-base',
      roles: ['admin', 'supervisor', 'agent_l1', 'agent_l2'],
    },
    { id: 'hd_audit', label: 'Auditoría', icon: 'Audit', href: '/audit', roles: ['admin'] },
  ]

  const topMenu: MenuSection[] = [
    {
      group: 'General',
      items: [{ id: 'ops_home', label: 'Dashboard', icon: 'Dashboard', href: '/' }],
    },
    {
      group: 'Administración',
      items: [
        { id: 'admin_users', label: 'Usuarios', icon: 'Users', href: '/admin/users', roles: ['admin'] },
        { id: 'admin_locations', label: 'Ubicaciones', icon: 'Location', href: '/admin/locations', roles: ['admin'] },
        { id: 'admin_assets', label: 'Activos', icon: 'Assets', href: '/admin/assets', roles: ['admin', 'supervisor'] },
        { id: 'admin_reports', label: 'Reportes', icon: 'Reports', href: '/reports', roles: ['admin'] },
        { id: 'admin_login_audits', label: 'Registro de sesiones', icon: 'Audit', href: '/admin/login-audits', roles: ['admin'] },
      ],
    },
  ]

  const collapsibleGroups: { group: string; menus: CollapsibleMenu[] }[] = [
    {
      group: 'Front Office',
      menus: [
        {
          id: 'recepcion',
          label: 'Recepción',
          icon: 'Bell',
          items: [
            { id: 'fo_desk', label: 'Front Desk', icon: 'Bell', href: '/mantenimiento#fo_desk', disabled: true },
            { id: 'fo_concierge', label: 'Concierge', icon: 'Bell', href: '/mantenimiento#fo_concierge', disabled: true },
          ],
        },
        {
          id: 'ventas',
          label: 'Ventas',
          icon: 'BarChart',
          items: [
            { id: 'sales_res', label: 'Reservas', icon: 'BarChart', href: '/mantenimiento#sales_res', disabled: true },
            { id: 'sales_groups', label: 'Grupos', icon: 'BarChart', href: '/mantenimiento#sales_groups', disabled: true },
          ],
        },
      ],
    },
    {
      group: 'Operación & Mantenimiento',
      menus: [
        {
          id: 'ingenieria',
          label: 'Ingeniería',
          icon: 'Wrench',
          items: [
            { id: 'eng_tickets', label: 'Ticketera', icon: 'Wrench', href: '/mantenimiento#eng_tickets', disabled: true },
            { id: 'eng_plan', label: 'Plan Anual', icon: 'Wrench', href: '/mantenimiento#eng_plan', disabled: true },
          ],
        },
        {
          id: 'housekeeping',
          label: 'Ama de Llaves',
          icon: 'Bed',
          items: [
            { id: 'hk_rooms', label: 'Tablero Habitaciones', icon: 'Bed', href: '/ama-de-llaves/tablero-habitaciones' },
            { id: 'hk_plan', label: 'Plan Anual & Proyectos', icon: 'Calendar', href: '/ama-de-llaves/plan-anual' },
            { id: 'hk_laundry', label: 'Ropería', icon: 'Bed', href: '/ama-de-llaves/roperia' },
          ],
        },
        {
          id: 'ayb',
          label: 'A y B',
          icon: 'Utensils',
          items: [
            { id: 'fb_pos', label: 'Puntos Venta', icon: 'Utensils', href: '/mantenimiento#fb_pos', disabled: true },
            { id: 'fb_kitchen', label: 'Cocina', icon: 'Utensils', href: '/mantenimiento#fb_kitchen', disabled: true },
          ],
        },
        {
          id: 'helpdesk',
          label: 'Mesa de Ayuda',
          icon: 'Ticket',
          items: helpdeskItems,
        },
      ],
    },
    {
      group: 'Corporativo',
      menus: [
        {
          id: 'calidad',
          label: 'Calidad',
          icon: 'ShieldCheck',
          items: [
            { id: 'qa_audit', label: 'Auditorías', icon: 'ShieldCheck', href: '/mantenimiento#qa_audit', disabled: true },
            { id: 'qa_guest', label: 'Quejas', icon: 'ShieldCheck', href: '/mantenimiento#qa_guest', disabled: true },
          ],
        },
        {
          id: 'academia',
          label: 'Academia',
          icon: 'GraduationCap',
          items: [{ id: 'lms_courses', label: 'Cursos', icon: 'GraduationCap', href: '/mantenimiento#lms_courses', disabled: true }],
        },
        {
          id: 'rrhh',
          label: 'RRHH',
          icon: 'Briefcase',
          items: [{ id: 'hr_staff', label: 'Personal', icon: 'Briefcase', href: '/mantenimiento#hr_staff', disabled: true }],
        },
      ],
    },
  ]

  // Filtrar items según roles y permisos
  const filterItems = (items: MenuSection['items']) => {
    return items.filter(item => {
      if (item.requireBeo && !profile?.can_view_beo) return false
      if (item.roles && !item.roles.includes(profile?.role || '')) return false
      return true
    })
  }

  const isAnyActive = (items: (MenuSection['items'][number] & { disabled?: boolean })[]) => {
    return filterItems(items as any).some((item) => isActive(item.href))
  }

  const toggleExpanded = (id: string) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  // Auto-expand solo el menú que contiene la ruta activa.
  // Por defecto, todos colapsados (evita que "Mesa de Ayuda" aparezca abierta al iniciar sesión).
  useEffect(() => {
    const nextExpanded: Record<string, boolean> = {}
    for (const group of collapsibleGroups) {
      for (const menu of group.menus) {
        if (isAnyActive(menu.items)) {
          nextExpanded[menu.id] = true
        }
      }
    }

    if (Object.keys(nextExpanded).length === 0) return
    setExpandedMenus((prev) => ({ ...prev, ...nextExpanded }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, profile?.role, profile?.can_view_beo])

  useEffect(() => {
    let mounted = true

    ;(async () => {
      try {
        const res = await fetch('/api/my-ip')
        if (!res.ok) return
        const data = await res.json()
        if (mounted && data?.ip && data.ip !== 'unknown') setClientIp(data.ip)
      } catch (e) {
        // ignore
      }
    })()

    return () => { mounted = false }
  }, [])

  const roleLabel =
    profile?.role === 'admin'
      ? 'Admin'
      : profile?.role === 'agent_l1'
        ? 'Agente L1'
        : profile?.role === 'agent_l2'
          ? 'Agente L2'
          : profile?.role === 'supervisor'
            ? 'Supervisor'
            : profile?.role
              ? 'Usuario'
              : 'Usuario'

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
              <Image
                src="https://integrational3.com.mx/logorigen/ZIII%20logo.png"
                alt="ZIII Logo"
                width={40}
                height={40}
                className={`${sidebarOpen ? 'w-10 h-10' : 'w-9 h-9'} object-contain transition-all`}
                unoptimized
              />
            </div>
            {sidebarOpen && (
              <div className="animate-in fade-in duration-300 min-w-0">
                <span className="tracking-wider text-lg block">ZIII <span className="font-light text-indigo-400">HoS</span></span>
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
          {topMenu.map((section) => {
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

          {collapsibleGroups.map((group) => (
            <div key={group.group}>
              {sidebarOpen && (
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-3">
                  {group.group}
                </h3>
              )}

              <div className="space-y-1">
                {group.menus.map((menu) => {
                  const Icon = Icons[menu.icon]
                  const active = isAnyActive(menu.items)
                  const expanded = !!expandedMenus[menu.id]

                  return (
                    <div key={menu.id}>
                      <button
                        type="button"
                        onClick={() => toggleExpanded(menu.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${
                          active ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                        }`}
                        title={!sidebarOpen ? menu.label : undefined}
                      >
                        {active && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-indigo-500 rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                        )}
                        <Icon
                          className={`w-5 h-5 z-10 transition-colors flex-shrink-0 ${
                            active ? 'text-indigo-400' : 'text-slate-400 group-hover:text-white'
                          }`}
                        />
                        {sidebarOpen && (
                          <>
                            <span
                              className={`text-sm font-medium tracking-wide z-10 whitespace-nowrap ${active ? 'text-white font-semibold' : ''}`}
                            >
                              {menu.label}
                            </span>
                            <Icons.ChevronRight
                              className={`ml-auto w-4 h-4 text-slate-500 transition-transform ${expanded ? 'rotate-90 text-white' : ''}`}
                            />
                          </>
                        )}
                      </button>

                      {sidebarOpen && (
                        <div
                          className={`overflow-hidden transition-all duration-300 ease-in-out ${
                            expanded ? 'max-h-[520px] opacity-100 mt-1' : 'max-h-0 opacity-0'
                          }`}
                        >
                          <div className="relative pl-4 ml-3 border-l border-slate-700/50 space-y-1 my-1">
                            {filterItems(menu.items as any).map((item: any) => {
                              const disabled = !!item.disabled

                              if (disabled) {
                                return (
                                  <div
                                    key={item.id}
                                    className="w-full text-left py-2 px-3 rounded-lg text-xs font-medium flex items-center gap-2 text-slate-500/70 cursor-not-allowed select-none"
                                    aria-disabled="true"
                                    title="Próximamente"
                                  >
                                    {item.label}
                                  </div>
                                )
                              }

                              return (
                                <Link
                                  key={item.id}
                                  href={item.href}
                                  className={`w-full text-left py-2 px-3 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 relative ${
                                    isActive(item.href)
                                      ? 'text-indigo-300 bg-white/5'
                                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                                  }`}
                                >
                                  {item.label}
                                  {isActive(item.href) && (
                                    <div className="absolute right-2 w-1.5 h-1.5 bg-indigo-400 rounded-full"></div>
                                  )}
                                </Link>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

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
        
        {/* Header fijo - Premium Dark Style */}
        <header className="h-[72px] lg:h-20 flex items-center justify-between px-4 lg:px-8 z-40 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700/50 shadow-xl flex-shrink-0">
          {/* Izquierda - Sede actual */}
          <div className="flex items-center">
            {/* Logo móvil */}
            <div className="lg:hidden flex items-center gap-2 mr-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg p-1 border border-white/20">
                <Image
                  src="https://integrational3.com.mx/logorigen/ZIII%20logo.png"
                  alt="ZIII Logo"
                  width={32}
                  height={32}
                  className="w-8 h-8 object-contain"
                  unoptimized
                />
              </div>
            </div>

            {/* Sede activa - Dark Style */}
            {locationCodes.length > 0 && (
              <div className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 backdrop-blur-sm" title={locationNames.join(', ')}>
                <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-500/50"></div>
                <span className="text-xs font-bold text-emerald-100 uppercase tracking-wider">
                  {locationCodes.join(' · ')}
                </span>
              </div>
            )}
          </div>

          {/* Derecha - Todo agrupado */}
          <div className="flex items-center gap-5">
            {/* Grupo usuario + perfil - Premium Dark */}
            <div className="hidden lg:flex items-center gap-4 bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-lg pl-2 pr-3 py-2 max-w-[720px] min-w-0">
              {/* Avatar Premium */}
              <div className="w-11 h-11 bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/30 ring-2 ring-violet-400/20">
                <span className="text-white text-base font-bold tracking-tight">
                  {getAvatarInitial({
                    fullName: profile?.full_name || user?.user_metadata?.full_name,
                    description: profile?.position,
                    email: user?.email,
                  })}
                </span>
              </div>
              {/* Identidad Premium */}
              <div className="min-w-0 text-left px-1 py-0.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="text-base font-semibold text-white leading-tight tracking-tight truncate min-w-0"
                    title={profile?.full_name || user?.user_metadata?.full_name || user?.email || ''}
                  >
                    {profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'}
                  </div>
                  <span className="flex-shrink-0 inline-flex items-center rounded-full border border-violet-400/30 bg-violet-500/20 px-2.5 py-0.5 text-[10px] font-bold text-violet-200 uppercase tracking-wider">
                    {roleLabel}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2.5 min-w-0">
                  <div className="text-[11px] text-slate-400 leading-tight truncate min-w-0 font-medium" title={user?.email || ''}>
                    {user?.email || ''}
                  </div>
                  <span className="text-slate-600">•</span>
                  <div
                    className="text-[11px] font-medium text-slate-400 leading-tight truncate min-w-0 uppercase tracking-wide"
                    title={profile?.position || ''}
                  >
                    {profile?.position || '—'}
                  </div>
                  {clientIp && (
                    <>
                      <span className="text-slate-600">•</span>
                      <div
                        className="text-[11px] font-medium text-slate-300 leading-tight truncate min-w-0 uppercase tracking-wide"
                        title={`IP: ${clientIp.replace?.(/^::ffff:/i, '')}`}
                      >
                        {clientIp.replace?.(/^::ffff:/i, '')}
                      </div>
                    </>
                  )}
                </div>
              </div>
              {/* Botón Perfil Premium */}
              <Link
                href="/profile"
                className="flex items-center gap-1.5 px-4 py-2.5 text-slate-300 hover:text-violet-300 hover:bg-violet-500/10 rounded-xl transition-all text-xs font-semibold flex-shrink-0 border border-transparent hover:border-violet-500/30"
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
