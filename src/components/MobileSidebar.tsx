"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

interface UserData {
  role: string | null
  canViewBeo: boolean
  assetCategory: string | null
}

export default function MobileSidebar({ userData }: { userData: UserData }) {
  const pathname = usePathname()
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/")

  const ticketsHref = (userData.role === 'admin' || userData.role === 'supervisor')
    ? '/tickets?view=queue'
    : '/tickets?view=mine'

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 shadow-2xl z-[9999]">
      <div className="flex items-center justify-around px-2 py-2">
        <Link
          href="/"
          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl min-w-[56px] transition-all ${
            isActive("/") 
              ? "bg-white/10 text-indigo-400" 
              : "text-slate-400 hover:text-white"
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="text-[9px] font-bold">Inicio</span>
        </Link>

        <Link
          href="/dashboard"
          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl min-w-[56px] transition-all ${
            isActive("/dashboard") 
              ? "bg-white/10 text-indigo-400" 
              : "text-slate-400 hover:text-white"
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="text-[9px] font-bold">Mesa</span>
        </Link>

        <Link
          href={ticketsHref}
          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl min-w-[56px] transition-all ${
            isActive("/tickets") 
              ? "bg-white/10 text-indigo-400" 
              : "text-slate-400 hover:text-white"
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-[9px] font-bold">Tickets</span>
        </Link>

        {(userData.role === "admin" || userData.role === "supervisor") && (
          <>
            {userData.role === 'admin' && (
              <Link
                href="/admin/users"
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl min-w-[56px] transition-all ${
                  isActive('/admin/users') ? 'bg-white/10 text-indigo-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className="text-[9px] font-bold">Usuarios</span>
              </Link>
            )}

            {userData.role === 'admin' && (
              <Link
                href="/admin/locations"
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl min-w-[56px] transition-all ${
                  isActive('/admin/locations') ? 'bg-white/10 text-indigo-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-[9px] font-bold">Ubicaciones</span>
              </Link>
            )}

            <Link
              href="/assets"
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl min-w-[56px] transition-all ${
                isActive('/assets') ? 'bg-white/10 text-indigo-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-[9px] font-bold">Activos IT</span>
            </Link>

            {userData.role === 'admin' && (
              <Link
                href="/reports"
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl min-w-[56px] transition-all ${
                  isActive('/reports') ? 'bg-white/10 text-indigo-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-[9px] font-bold">Reportes</span>
              </Link>
            )}

            {userData.role === 'admin' && (
              <Link
                href="/audit"
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl min-w-[56px] transition-all ${
                  isActive('/audit') ? 'bg-white/10 text-indigo-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-[9px] font-bold">Auditoría</span>
              </Link>
            )}

            {userData.role === 'admin' && (
              <Link
                href="/admin/login-audits"
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl min-w-[56px] transition-all ${
                  isActive('/admin/login-audits') ? 'bg-white/10 text-indigo-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-[9px] font-bold">Registro de sesiones</span>
              </Link>
            )}
          </>
        )}

        {/* Perfil eliminado del menú móvil para evitar duplicación con el header */}
      </div>
    </nav>
  )
}

