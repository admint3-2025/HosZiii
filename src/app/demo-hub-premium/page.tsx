'use client'

import React from 'react'
import Image from 'next/image'
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

type ColorKey = 'blue' | 'emerald' | 'amber' | 'purple'

type ModuleCard = {
  title: string
  desc: string
  icon: React.ReactNode
  color: ColorKey
  glowClass: string
  iconWrapClass: string
}

const logoUrl = 'https://systemach-sas.com/logo_ziii/ZIII%20logo.png'

const modules: ModuleCard[] = [
  {
    title: 'IT - HELPDESK',
    desc: 'Mesa de Ayuda y Desarrollo Técnico',
    icon: <LifeBuoy className="w-10 h-10" />,
    color: 'blue',
    glowClass: 'from-blue-500/0 to-blue-500/10',
    iconWrapClass:
      'text-blue-400 shadow-blue-500/20 group-hover:bg-blue-500 group-hover:shadow-blue-500/40',
  },
  {
    title: 'MANTENIMIENTO',
    desc: 'Ingeniería e Infraestructura Hotelera',
    icon: <Wrench className="w-10 h-10" />,
    color: 'emerald',
    glowClass: 'from-emerald-500/0 to-emerald-500/10',
    iconWrapClass:
      'text-emerald-400 shadow-emerald-500/20 group-hover:bg-emerald-500 group-hover:shadow-emerald-500/40',
  },
  {
    title: 'CORPORATIVO',
    desc: 'Políticas, Academia y Cumplimiento',
    icon: <ShieldCheck className="w-10 h-10" />,
    color: 'amber',
    glowClass: 'from-amber-500/0 to-amber-500/10',
    iconWrapClass:
      'text-amber-400 shadow-amber-500/20 group-hover:bg-amber-500 group-hover:shadow-amber-500/40',
  },
  {
    title: 'ADMINISTRACIÓN',
    desc: 'Configuración de Sistema y Auditoría',
    icon: <Settings className="w-10 h-10" />,
    color: 'purple',
    glowClass: 'from-purple-500/0 to-purple-500/10',
    iconWrapClass:
      'text-purple-400 shadow-purple-500/20 group-hover:bg-purple-500 group-hover:shadow-purple-500/40',
  },
]

export default function DemoHubPremiumPage() {
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
            <button
              key={mod.title}
              type="button"
              className="group relative h-72 bg-gradient-to-b from-white/[0.06] to-transparent border border-white/10 rounded-[3.5rem] p-10 overflow-hidden transition-all duration-700 hover:scale-[1.02] hover:border-white/30 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] active:scale-95 text-left"
              onClick={() => {
                // demo only
                // eslint-disable-next-line no-alert
                alert(`Demo: abrir módulo ${mod.title}`)
              }}
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
            </button>
          ))}
        </div>

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
