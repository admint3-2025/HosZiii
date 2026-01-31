import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  ShieldCheck,
  Settings,
  Wrench,
  LifeBuoy,
  Bell,
  LogOut,
  Activity,
  ArrowRight,
} from 'lucide-react'
import { getSafeServerUser } from '@/lib/supabase/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  isMaintenanceAssetCategory,
  isITAssetCategoryOrUnassigned,
} from '@/lib/permissions/asset-category'

export const dynamic = 'force-dynamic'

type ColorKey = 'blue' | 'emerald' | 'amber' | 'purple'

type ModuleCard = {
  id: 'it-helpdesk' | 'mantenimiento' | 'corporativo' | 'administracion'
  title: string
  desc: string
  icon: React.ReactNode
  color: ColorKey
  glowClass: string
  iconWrapClass: string
  href: string
}

const logoUrl = 'https://systemach-sas.com/logo_ziii/ZIII%20logo.png'

type AuditRow = {
  id: string
  created_at: string
  action: string
  entity_type: string | null
  entity_id: string | null
}

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    CREATE: 'Nuevo',
    UPDATE: 'Actualizado',
    DELETE: 'Eliminado',
    EXPORT: 'Exportado',
    ASSIGN: 'Asignado',
    COMMENT: 'Comentario',
    CLOSE: 'Cerrado',
    REOPEN: 'Reabierto',
    LOGIN: 'Sesión iniciada',
  }
  return map[action] ?? action
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function DemoHubPremiumPage() {
  const user = await getSafeServerUser()
  if (!user) {
    redirect('/login')
  }

  const supabase = await createSupabaseServerClient()

  let profile: {
    id: string
    role: string
    asset_category: string | null
    hub_visible_modules: Record<string, boolean> | null
  } | null = null

  try {
    const { data } = await supabase
      .from('profiles')
      .select('id, role, asset_category, hub_visible_modules')
      .eq('id', user.id)
      .maybeSingle()
    profile = (data as any) ?? null
  } catch {
    profile = null
  }

  if (!profile) {
    // Worst-case: don't crash the page in prod.
    // Send user back to login so they can recover their session.
    redirect('/login?recover=1')
  }

  const role = (profile as any).role as string
  const assetCategory = (profile as any).asset_category as string | null
  const hubVisibleModules = ((profile as any).hub_visible_modules ?? null) as
    | Record<string, boolean>
    | null

  const isAdmin = role === 'admin'
  const isCorporateAdmin = role === 'corporate_admin'
  const isSupervisor = role === 'supervisor'
  const isAgent = role === 'agent_l1' || role === 'agent_l2'

  const canManageIT = isITAssetCategoryOrUnassigned(assetCategory)
  const canManageMaintenance = isMaintenanceAssetCategory(assetCategory)

  const itHref =
    (isAdmin || isSupervisor) && (isAdmin || canManageIT)
      ? '/dashboard'
      : isAgent && canManageIT
        ? '/dashboard'
        : '/tickets?view=mine'

  const maintenanceHref =
    (isAdmin || isSupervisor) && (isAdmin || canManageMaintenance)
      ? '/mantenimiento/dashboard'
      : '/mantenimiento/tickets?view=mine'

  const baseModules: ModuleCard[] = [
    {
      id: 'it-helpdesk',
      title: 'IT - HELPDESK',
      desc: 'Mesa de Ayuda y Desarrollo Técnico',
      icon: <LifeBuoy className="w-10 h-10" />,
      color: 'blue',
      glowClass: 'from-blue-500/0 to-blue-500/10',
      iconWrapClass:
        'text-blue-400 shadow-blue-500/20 group-hover:bg-blue-500 group-hover:shadow-blue-500/40',
      href: itHref,
    },
    {
      id: 'mantenimiento',
      title: 'MANTENIMIENTO',
      desc: 'Ingeniería e Infraestructura Hotelera',
      icon: <Wrench className="w-10 h-10" />,
      color: 'emerald',
      glowClass: 'from-emerald-500/0 to-emerald-500/10',
      iconWrapClass:
        'text-emerald-400 shadow-emerald-500/20 group-hover:bg-emerald-500 group-hover:shadow-emerald-500/40',
      href: maintenanceHref,
    },
    {
      id: 'corporativo',
      title: 'CORPORATIVO',
      desc: 'Políticas, Academia y Cumplimiento',
      icon: <ShieldCheck className="w-10 h-10" />,
      color: 'amber',
      glowClass: 'from-amber-500/0 to-amber-500/10',
      iconWrapClass:
        'text-amber-400 shadow-amber-500/20 group-hover:bg-amber-500 group-hover:shadow-amber-500/40',
      href: '/corporativo/dashboard',
    },
    {
      id: 'administracion',
      title: 'ADMINISTRACIÓN',
      desc: 'Configuración de Sistema y Auditoría',
      icon: <Settings className="w-10 h-10" />,
      color: 'purple',
      glowClass: 'from-purple-500/0 to-purple-500/10',
      iconWrapClass:
        'text-purple-400 shadow-purple-500/20 group-hover:bg-purple-500 group-hover:shadow-purple-500/40',
      href: '/admin',
    },
  ]

  const allowedByRole = (m: ModuleCard) => {
    if (m.id === 'administracion') return isAdmin
    if (m.id === 'corporativo') return isAdmin || isCorporateAdmin
    return true
  }

  const modules = baseModules
    .filter(allowedByRole)
    .filter((m) => (hubVisibleModules ? hubVisibleModules[m.id] !== false : true))

  const { data: recent } = await supabase
    .from('audit_log')
    .select('id, created_at, action, entity_type, entity_id')
    .eq('actor_id', user.id)
    .order('created_at', { ascending: false })
    .limit(6)

  const recentActivities: AuditRow[] = ((recent as any) ?? []) as AuditRow[]

  return (
    <div className="min-h-screen bg-[#06080d] text-slate-200 font-sans selection:bg-blue-500/30 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Fondos difuminados para dar profundidad (Efecto Aurora) */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-indigo-600/10 blur-[150px] rounded-full" />
      </div>

      <div className="w-full max-w-6xl relative z-10">
        {/* --- ENCABEZADO --- */}
        <header className="flex flex-col md:flex-row items-center justify-between mb-16 gap-8 px-4">
          <div className="flex items-center gap-6">
            <Image
              src={logoUrl}
              alt="ZIII Logo"
              width={256}
              height={256}
              unoptimized
              className="h-16 w-auto drop-shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-transform hover:scale-105 duration-500"
            />
            <div className="h-12 w-[1px] bg-gradient-to-b from-transparent via-white/20 to-transparent hidden md:block" />
            <div className="text-center md:text-left">
              <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic leading-none">
                Centro de Trabajo
              </h1>
              <p className="text-[10px] text-blue-400 font-bold uppercase tracking-[0.5em] mt-1">
                Hospitality Operations System
              </p>
            </div>
          </div>

          {/* Perfil de Usuario Premium */}
          <div className="flex items-center gap-4 bg-white/[0.03] border border-white/10 p-2 pr-6 rounded-[2rem] backdrop-blur-xl shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-xl border-2 border-white/10 shadow-lg">
              A
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black text-white uppercase tracking-tight">Admin ZIII HoS</span>
              <span className="text-[10px] text-slate-500 font-mono tracking-tighter">IP: 10.10.1.7 • ONLINE</span>
            </div>
            <div className="flex gap-1 ml-4 border-l border-white/10 pl-4">
              <button
                type="button"
                className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-all"
                aria-label="Notificaciones"
                title="Notificaciones"
              >
                <Bell size={18} />
              </button>
              <button
                type="button"
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-all"
                aria-label="Salir"
                title="Salir"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* --- HUB DE ACCESOS (GRID) --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          {modules.map((mod) => (
            <Link
              key={mod.title}
              href={mod.href}
              className="group relative h-60 md:h-64 bg-gradient-to-b from-white/[0.06] to-transparent border border-white/10 rounded-[3.5rem] p-8 md:p-9 overflow-hidden transition-all duration-700 hover:scale-[1.02] hover:border-white/30 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] active:scale-95 text-left"
            >
              {/* Resplandor de color interno en hover */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${mod.glowClass} opacity-0 group-hover:opacity-100 transition-opacity duration-700`}
              />

              <div className="relative z-10 flex flex-col h-full justify-between items-start">
                {/* Contenedor del Icono con Neomorfismo */}
                <div
                  className={`p-6 rounded-[2.2rem] bg-[#1a1f2b] border border-white/10 group-hover:text-white transition-all duration-500 shadow-xl group-hover:-translate-y-2 ${mod.iconWrapClass}`}
                >
                  {mod.icon}
                </div>

                <div className="w-full">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic group-hover:translate-x-2 transition-transform duration-500">
                      {mod.title}
                    </h2>
                    <div className="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all duration-500">
                      <ArrowRight size={20} />
                    </div>
                  </div>
                  <p className="text-slate-400 font-medium text-sm group-hover:text-slate-200 transition-colors">
                    {mod.desc}
                  </p>
                </div>
              </div>

              {/* MARCA DE AGUA DEL LOGO */}
              <Image
                src={logoUrl}
                alt=""
                width={512}
                height={512}
                unoptimized
                className="absolute right-[-10%] top-[-10%] h-64 w-auto opacity-[0.03] grayscale brightness-200 group-hover:opacity-[0.08] group-hover:scale-110 transition-all duration-1000 pointer-events-none select-none"
              />
            </Link>
          ))}
        </div>

        {/* --- ACTIVIDAD RECIENTE --- */}
        <section className="mb-16">
          <div className="flex items-center justify-between px-2 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center">
                <Activity size={18} className="text-blue-400" />
              </div>
              <div>
                <div className="text-sm font-black text-white uppercase tracking-tight">Mis actividades recientes</div>
                <div className="text-[10px] text-slate-500 font-mono tracking-tight">
                  {user.email}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
              <span className="inline-flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)] animate-pulse" />
                Activas
              </span>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] backdrop-blur-xl overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]">
            <div className="divide-y divide-white/5">
              {recentActivities.length > 0 ? (
                recentActivities.map((r) => (
                  <div key={r.id} className="px-6 py-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            r.action === 'DELETE'
                              ? 'inline-flex items-center px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-500/10 text-red-300 border border-red-500/20'
                              : r.action === 'CREATE'
                                ? 'inline-flex items-center px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                : 'inline-flex items-center px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-300 border border-blue-500/20'
                          }
                        >
                          {r.action}
                        </span>
                        <span className="text-xs font-bold text-white truncate">
                          {actionLabel(r.action)}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500 font-mono truncate">
                        {formatDateTime(r.created_at)}
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-600 font-mono truncate hidden sm:block">
                      {r.entity_type ? `${r.entity_type}${r.entity_id ? `:${r.entity_id}` : ''}` : '—'}
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-6 py-10 text-center text-slate-500">
                  No hay actividad reciente para mostrar.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* --- FOOTER INFORMATIVO --- */}
        <footer className="flex flex-col md:flex-row items-center justify-between gap-8 px-6 py-8 border-t border-white/5">
          <div className="flex items-center gap-6 text-slate-500">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-blue-500" />
              <span className="text-[11px] font-black uppercase tracking-[0.4em]">Operaciones Activas</span>
            </div>
            <div className="hidden sm:flex gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
              <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
            </div>
          </div>

          <div className="flex items-center gap-12 text-center md:text-right">
            <div className="flex flex-col items-center md:items-end">
              <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest mb-1">
                Sistema de Operaciones Hoteleras
              </span>
              <span className="text-xs font-mono text-slate-500 tracking-tighter uppercase">v2.1.0-GOLD-STABLE</span>
            </div>
            <div className="h-10 w-[1px] bg-white/5 hidden md:block" />
            <div className="flex flex-col items-center gap-1">
              <Image
                src={logoUrl}
                alt="ZIII"
                width={128}
                height={64}
                unoptimized
                className="h-7 w-auto opacity-20 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500 cursor-pointer"
              />
              <span className="text-[8px] font-bold text-slate-700 uppercase tracking-widest">© 2026 ZIII HoS</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
