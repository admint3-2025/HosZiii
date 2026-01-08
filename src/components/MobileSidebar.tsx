"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

interface UserData {
  role: string | null
  canViewBeo: boolean
}

export default function MobileSidebar({ userData }: { userData: UserData }) {
  const pathname = usePathname()
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/")

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-indigo-600 border-t-2 border-blue-700 shadow-2xl z-[9999]">
      <div className="flex items-center justify-around px-2 py-3">
        <Link
          href="/dashboard"
          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg min-w-[60px] transition-all ${
            isActive("/dashboard") ? "bg-white/20 text-white" : "text-white/80 hover:text-white"
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="text-[10px] font-bold">Inicio</span>
        </Link>

        <Link
          href="/tickets"
          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg min-w-[60px] transition-all ${
            isActive("/tickets") ? "bg-white/20 text-white" : "text-white/80 hover:text-white"
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <span className="text-[10px] font-bold">Tickets</span>
        </Link>

        <Link
          href="/reports"
          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg min-w-[60px] transition-all ${
            isActive("/reports") ? "bg-white/20 text-white" : "text-white/80 hover:text-white"
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-[10px] font-bold">Reportes</span>
        </Link>

        {(userData.role === "admin" || userData.role === "supervisor") && (
          <Link
            href="/admin/assets"
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg min-w-[60px] transition-all ${
              isActive("/admin") ? "bg-white/20 text-white" : "text-white/80 hover:text-white"
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-[10px] font-bold">Admin</span>
          </Link>
        )}

        <Link
          href="/profile"
          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg min-w-[60px] transition-all ${
            isActive("/profile") ? "bg-white/20 text-white" : "text-white/80 hover:text-white"
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-[10px] font-bold">Perfil</span>
        </Link>
      </div>
    </nav>
  )
}

