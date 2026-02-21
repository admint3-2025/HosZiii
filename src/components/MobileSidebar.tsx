"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useEffect, useCallback } from "react"

interface UserData {
  role: string | null
  canViewBeo: boolean
  assetCategory: string | null
  hubModules: Record<string, string | boolean> | null
}

interface MobileSidebarProps {
  userData: UserData
  profile: any
  user: any
  open: boolean
  onClose: () => void
}

export default function MobileSidebar({ userData, profile, user, open, onClose }: MobileSidebarProps) {
  const pathname = usePathname()
  const isActive = (href: string) => {
    const pathOnly = href.split("?")[0]
    return pathname === pathOnly || pathname.startsWith(pathOnly + "/")
  }

  // Cerrar al cambiar de ruta
  useEffect(() => {
    onClose()
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  // Escape key & body scroll lock
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    if (open) {
      document.addEventListener("keydown", handleKey)
      document.body.style.overflow = "hidden"
    }
    return () => {
      document.removeEventListener("keydown", handleKey)
      document.body.style.overflow = ""
    }
  }, [open, onClose])

  // Nivel de acceso a módulos
  const moduleAccess = useCallback(
    (moduleId: string): "user" | "supervisor" | false => {
      if (userData.role === "admin") return "supervisor"
      const v = userData.hubModules?.[moduleId]
      if (v === "supervisor") return "supervisor"
      if (v === "user" || v === true) return "user"
      return false
    },
    [userData.role, userData.hubModules]
  )

  const itAccess = moduleAccess("it-helpdesk")
  const mntAccess = moduleAccess("mantenimiento")
  const hkAccess = moduleAccess("ama-de-llaves")
  const corpAccess = moduleAccess("corporativo")
  const isAdmin = userData.role === "admin"
  const canAccessOps = isAdmin || userData.role === 'supervisor'
  const canManageIT = itAccess === "supervisor"
  const canManageMaintenance = mntAccess === "supervisor"

  // Build nav sections
  type NavLink = { label: string; href: string; icon: React.ReactNode }
  type NavSection = { title: string; links: NavLink[] }

  const sections: NavSection[] = []

  // Hub
  sections.push({
    title: "",
    links: [
      {
        label: "Hub Principal",
        href: "/hub",
        icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
      },
    ],
  })

  // Helpdesk IT
  if (itAccess) {
    const links: NavLink[] = []
    if (canManageIT) links.push({ label: "Dashboard IT", href: "/dashboard", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> })
    links.push({ label: "Mis Tickets", href: "/tickets?view=mine", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg> })
    links.push({ label: "Crear Ticket IT", href: "/tickets/new?area=it", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg> })
    if (canManageIT) {
      links.push({ label: "Bandeja IT", href: "/tickets?view=queue", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 19V5m0 14h16" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17V9m4 8V7m4 10v-5" /></svg> })
      links.push({ label: "Activos IT", href: "/assets", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> })
    }
    if (canManageIT && userData.canViewBeo) links.push({ label: "Eventos (BEO)", href: "/beo/dashboard", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> })
    sections.push({ title: "Helpdesk IT", links })
  }

  // Mantenimiento
  if (mntAccess) {
    const links: NavLink[] = []
    if (canManageMaintenance) links.push({ label: "Dashboard Mnt.", href: "/mantenimiento/dashboard", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> })
    links.push({ label: "Mis Tickets Mnt.", href: "/mantenimiento/tickets?view=mine", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg> })
    links.push({ label: "Crear Ticket Mnt.", href: "/mantenimiento/tickets/new", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg> })
    if (canManageMaintenance) {
      links.push({ label: "Bandeja Mnt.", href: "/mantenimiento/tickets?view=queue", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 19V5m0 14h16" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17V9m4 8V7m4 10v-5" /></svg> })
      links.push({ label: "Activos Mnt.", href: "/mantenimiento/assets", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 2.5a6.5 6.5 0 01-9.2 8.3L7 15.6V19H4v-3.4l4.8-4.8A6.5 6.5 0 1119.5 3l-3 3 2.5 2.5 2-2z" /></svg> })
    }
    sections.push({ title: "Mantenimiento", links })
  }

  // Ama de llaves
  if (hkAccess) {
    sections.push({
      title: "Ama de Llaves",
      links: [
        { label: "Dashboard", href: "/ama-de-llaves", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
        { label: "Tablero Habitaciones", href: "/ama-de-llaves/tablero-habitaciones", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18v9M5 19v-2m14 2v-2" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10V7a2 2 0 012-2h6a2 2 0 012 2v3" /></svg> },
        { label: "Plan Anual & Proyectos", href: "/ama-de-llaves/plan-anual", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
        { label: "Ropería", href: "/ama-de-llaves/roperia", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18v9M5 19v-2m14 2v-2" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10V7a2 2 0 012-2h6a2 2 0 012 2v3" /></svg> },
      ],
    })
  }

  // Corporativo
  if (corpAccess) {
    sections.push({
      title: "Corporativo",
      links: [
        { label: "Dashboard Corp.", href: "/corporativo/dashboard", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
        { label: "Inspecciones", href: "/corporativo/inspecciones", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l7 4v6c0 5-3 8-7 9-4-1-7-4-7-9V7l7-4z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" /></svg> },
        { label: "Bandeja Inspecciones", href: "/inspections/inbox", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 19V5m0 14h16" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17V9m4 8V7m4 10v-5" /></svg> },
      ],
    })
  }

  // Operaciones
  if (canAccessOps) {
    sections.push({
      title: 'Operaciones',
      links: [
        { label: 'Dashboard', href: '/ops', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
        { label: 'Gestión', href: '/ops/gestion', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 2.5a6.5 6.5 0 01-9.2 8.3L7 15.6V19H4v-3.4l4.8-4.8A6.5 6.5 0 1119.5 3l-3 3 2.5 2.5 2-2z" /></svg> },
        { label: 'Riesgo y Cumplimiento', href: '/ops?view=riesgo', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 19V5m0 14h16" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17V9m4 8V7m4 10v-5" /></svg> },
      ],
    })
  }

  // Admin
  if (isAdmin) {
    sections.push({
      title: "Administración",
      links: [
        { label: "Usuarios", href: "/admin/users", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> },
        { label: "Ubicaciones", href: "/admin/locations", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
        { label: "Reportes", href: "/reports", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
        { label: "Auditoría", href: "/audit", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
        { label: "Registro de sesiones", href: "/admin/login-audits", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
      ],
    })
  }

  // Mi cuenta
  sections.push({
    title: "Mi cuenta",
    links: [
      { label: "Mi Perfil", href: "/profile", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
    ],
  })

  return (
    <>
      {/* Overlay */}
      <div
        className={`lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
        className={`lg:hidden fixed inset-y-0 left-0 w-[280px] max-w-[85vw] bg-slate-900 z-[9999] flex flex-col transform transition-transform duration-300 ease-in-out shadow-2xl ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Drawer header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white rounded-xl shadow-lg p-1 flex-shrink-0">
              <Image
                src="https://systemach-sas.com/logo_ziii/ZIII%20logo.png"
                alt="ZIII Logo"
                width={32}
                height={32}
                className="w-8 h-8 object-contain"
                unoptimized
              />
            </div>
            <div>
              <span className="text-white font-bold tracking-wider text-base">ZIII <span className="font-light text-indigo-400">HoS</span></span>
              <p className="text-[9px] text-slate-500 font-normal">ITIL v4 Service Desk</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors" aria-label="Cerrar menú">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* User info compacto */}
        {profile && (
          <div className="px-4 py-3 border-b border-slate-800 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg ring-2 ring-violet-400/20">
                <span className="text-white text-sm font-bold">{(profile?.full_name || user?.email || "U").charAt(0).toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{profile?.full_name || user?.email?.split("@")[0] || "Usuario"}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar py-2">
          {sections.map((section, idx) => (
            <div key={idx} className={idx > 0 ? "mt-2" : ""}>
              {section.title && (
                <div className="px-4 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{section.title}</span>
                </div>
              )}
              <div className="px-2 space-y-0.5">
                {section.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive(link.href)
                        ? "bg-white/10 text-white"
                        : "text-slate-400 hover:bg-white/5 hover:text-white active:bg-white/10"
                    }`}
                  >
                    {isActive(link.href) && (
                      <div className="absolute left-0 w-1 h-6 bg-indigo-500 rounded-r-full shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                    )}
                    <span className={`flex-shrink-0 ${isActive(link.href) ? "text-indigo-400" : "text-slate-400"}`}>{link.icon}</span>
                    <span className="truncate">{link.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-800 p-4 flex-shrink-0">
          <div className="flex items-center gap-2 text-indigo-400/60 text-[10px] font-semibold">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            ITIL v4 Based
          </div>
        </div>
      </aside>
    </>
  )
}

