'use client'

import { useState, useMemo, useCallback } from 'react'
import type { ReactNode } from 'react'
import RoomGrid from './RoomGrid'
import StaffPanel from './StaffPanel'
import InventoryPanel from './InventoryPanel'
import ReportsPanel from './ReportsPanel'

// ──────── Types ────────
export type RoomStatus = 'limpia' | 'sucia' | 'en_limpieza' | 'mantenimiento' | 'inspeccion' | 'bloqueada'

export interface Room {
  id: string
  number: string
  floor: number
  status: RoomStatus
  assignedTo: string | null
  lastCleaned: string | null
  hasIncident: boolean
  notes: string | null
  type: 'standard' | 'suite' | 'doble'
}

export interface Staff {
  id: string
  name: string
  avatar: string
  status: 'activo' | 'descanso' | 'inactivo'
  roomsAssigned: number
  roomsCleaned: number
  avgMinutes: number
}

export interface InventoryItem {
  id: string
  name: string
  category: 'amenidad' | 'blancos' | 'limpieza'
  stock: number
  minStock: number
  unit: string
}

type Tab = 'dashboard' | 'habitaciones' | 'personal' | 'inventario' | 'reportes'

interface Props {
  rooms: Room[]
  staff: Staff[]
  inventory: InventoryItem[]
  userName: string
}

// ──────── KPI Card ────────
function KPICard({ label, value, sub, tone }: { label: string; value: string | number; sub?: string; tone: 'emerald' | 'red' | 'amber' | 'blue' | 'slate' | 'violet' }) {
  const toneMap: Record<string, { dot: string; text: string }> = {
    emerald: { dot: 'bg-emerald-500', text: 'text-emerald-700' },
    red: { dot: 'bg-red-500', text: 'text-red-700' },
    amber: { dot: 'bg-amber-500', text: 'text-amber-700' },
    blue: { dot: 'bg-blue-500', text: 'text-blue-700' },
    slate: { dot: 'bg-slate-400', text: 'text-slate-700' },
    violet: { dot: 'bg-violet-500', text: 'text-violet-700' },
  }
  const t = toneMap[tone]

  return (
    <div className="card">
      <div className="card-body p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className={`w-2.5 h-2.5 rounded-full ${t.dot}`} />
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
        </div>
        <p className={`text-2xl font-extrabold ${t.text} leading-none mt-1`}>{value}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  )
}

// ──────── Status mini bar ────────
function StatusBar({ rooms }: { rooms: Room[] }) {
  const counts = useMemo(() => {
    const c: Record<RoomStatus, number> = { limpia: 0, sucia: 0, en_limpieza: 0, mantenimiento: 0, inspeccion: 0, bloqueada: 0 }
    rooms.forEach(r => c[r.status]++)
    return c
  }, [rooms])

  const total = rooms.length
  const segments: { status: RoomStatus; label: string; color: string; count: number }[] = [
    { status: 'limpia', label: 'Limpias', color: 'bg-emerald-500', count: counts.limpia },
    { status: 'sucia', label: 'Sucias', color: 'bg-red-400', count: counts.sucia },
    { status: 'en_limpieza', label: 'En Limpieza', color: 'bg-amber-400', count: counts.en_limpieza },
    { status: 'inspeccion', label: 'Inspección', color: 'bg-violet-400', count: counts.inspeccion },
    { status: 'mantenimiento', label: 'Mantenimiento', color: 'bg-orange-400', count: counts.mantenimiento },
    { status: 'bloqueada', label: 'Bloqueadas', color: 'bg-slate-400', count: counts.bloqueada },
  ]

  return (
    <div className="card">
      <div className="card-body p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Distribución de estados</p>
        <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-3">
          {segments.map(s => (
            s.count > 0 && (
              <div
                key={s.status}
                className={`${s.color} transition-all`}
                style={{ width: `${(s.count / total) * 100}%` }}
                title={`${s.label}: ${s.count}`}
              />
            )
          ))}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {segments.map(s => (
            <div key={s.status} className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className={`w-2 h-2 rounded-full ${s.color}`} />
              <span>{s.label}</span>
              <span className="font-bold text-slate-800">{s.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ──────── Main Dashboard ────────
export default function HousekeepingDashboard({ rooms: initialRooms, staff: initialStaff, inventory: initialInventory, userName }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [rooms, setRooms] = useState<Room[]>(initialRooms)
  const [staff, setStaff] = useState<Staff[]>(initialStaff)
  const [inventory] = useState<InventoryItem[]>(initialInventory)

  // KPI counts
  const counts = useMemo(() => {
    const c: Record<RoomStatus, number> = { limpia: 0, sucia: 0, en_limpieza: 0, mantenimiento: 0, inspeccion: 0, bloqueada: 0 }
    rooms.forEach(r => c[r.status]++)
    return c
  }, [rooms])

  const activeStaff = staff.filter(s => s.status === 'activo').length
  const lowStockItems = inventory.filter(i => i.stock <= i.minStock).length

  // ─── Room status change ───
  const handleStatusChange = useCallback((roomId: string, newStatus: RoomStatus) => {
    setRooms(prev =>
      prev.map(r =>
        r.id === roomId
          ? { ...r, status: newStatus, lastCleaned: newStatus === 'limpia' ? new Date().toISOString() : r.lastCleaned }
          : r
      )
    )
  }, [])

  // ─── Smart assignment ───
  const handleSmartAssign = useCallback(() => {
    const dirtyRooms = rooms.filter(r => r.status === 'sucia')
    const available = staff.filter(s => s.status === 'activo')
    if (available.length === 0 || dirtyRooms.length === 0) return

    const perPerson = Math.ceil(dirtyRooms.length / available.length)
    const newRooms = [...rooms]
    const newStaff = available.map(s => ({ ...s, roomsAssigned: s.roomsAssigned }))
    let staffIdx = 0
    let assignedCount = 0

    dirtyRooms.forEach(dr => {
      const idx = newRooms.findIndex(r => r.id === dr.id)
      if (idx !== -1) {
        newRooms[idx] = { ...newRooms[idx], status: 'en_limpieza', assignedTo: available[staffIdx].name.split(' ')[0] + ' ' + available[staffIdx].name.split(' ')[1]?.charAt(0) + '.' }
        newStaff[staffIdx].roomsAssigned += 1
        assignedCount++
        if (assignedCount >= perPerson) {
          staffIdx = Math.min(staffIdx + 1, available.length - 1)
          assignedCount = 0
        }
      }
    })

    setRooms(newRooms)
    setStaff(prev => prev.map(s => {
      const updated = newStaff.find(ns => ns.id === s.id)
      return updated ? { ...s, roomsAssigned: updated.roomsAssigned } : s
    }))
  }, [rooms, staff])

  const tabs: { key: Tab; label: string; icon: ReactNode }[] = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      key: 'habitaciones',
      label: 'Habitaciones',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18v9M5 19v-2m14 2v-2" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10V7a2 2 0 012-2h6a2 2 0 012 2v3" />
        </svg>
      ),
    },
    {
      key: 'personal',
      label: 'Personal',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      key: 'inventario',
      label: 'Inventario',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      key: 'reportes',
      label: 'Reportes',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
  ]

  return (
    <main className="p-4 md:p-6 space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Ama de Llaves</h1>
          <p className="text-sm text-slate-500 font-medium">Módulo operativo de Housekeeping</p>
        </div>
        {counts.sucia > 0 && (
          <button
            onClick={handleSmartAssign}
            className="btn btn-primary gap-2 self-start sm:self-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Asignar Automático ({counts.sucia} sucias)
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap
              ${activeTab === tab.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
              }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Dashboard Tab ─── */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KPICard label="Limpias" value={counts.limpia} sub={`${((counts.limpia / rooms.length) * 100).toFixed(0)}% del total`} tone="emerald" />
            <KPICard label="Sucias" value={counts.sucia} sub="Pendientes" tone="red" />
            <KPICard label="En Limpieza" value={counts.en_limpieza} sub="En proceso" tone="amber" />
            <KPICard label="Inspección" value={counts.inspeccion} sub="Esperando revisión" tone="violet" />
            <KPICard label="Personal Activo" value={`${activeStaff}/${staff.length}`} sub="Trabajando ahora" tone="blue" />
            <KPICard label="Stock Bajo" value={lowStockItems} sub={lowStockItems > 0 ? '¡Atención!' : 'Todo OK'} tone={lowStockItems > 0 ? 'red' : 'slate'} />
          </div>

          {/* Status distribution bar */}
          <StatusBar rooms={rooms} />

          {/* Quick preview: Room Grid (first 2 floors) */}
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Vista Rápida — Habitaciones</h2>
                <button onClick={() => setActiveTab('habitaciones')} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                  Ver todas →
                </button>
              </div>
              <RoomGrid
                rooms={rooms.filter(r => r.floor <= 2)}
                onStatusChange={handleStatusChange}
                compact
              />
            </div>
          </div>

          {/* Alerts */}
          {(lowStockItems > 0 || rooms.some(r => r.hasIncident)) && (
            <div className="card border-amber-200 bg-amber-50/50">
              <div className="card-body p-4">
                <h3 className="text-sm font-bold text-amber-800 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Alertas Activas
                </h3>
                <ul className="space-y-1">
                  {lowStockItems > 0 && (
                    <li className="text-xs text-amber-700">
                      • {lowStockItems} artículo{lowStockItems > 1 ? 's' : ''} de inventario por debajo del mínimo
                    </li>
                  )}
                  {rooms.filter(r => r.hasIncident).length > 0 && (
                    <li className="text-xs text-amber-700">
                      • {rooms.filter(r => r.hasIncident).length} habitación(es) con incidencia reportada
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Habitaciones Tab ─── */}
      {activeTab === 'habitaciones' && (
        <div className="animate-in fade-in duration-300">
          <RoomGrid rooms={rooms} onStatusChange={handleStatusChange} />
        </div>
      )}

      {/* ─── Personal Tab ─── */}
      {activeTab === 'personal' && (
        <div className="animate-in fade-in duration-300">
          <StaffPanel staff={staff} rooms={rooms} onSmartAssign={handleSmartAssign} dirtyCount={counts.sucia} />
        </div>
      )}

      {/* ─── Inventario Tab ─── */}
      {activeTab === 'inventario' && (
        <div className="animate-in fade-in duration-300">
          <InventoryPanel items={inventory} />
        </div>
      )}

      {/* ─── Reportes Tab ─── */}
      {activeTab === 'reportes' && (
        <div className="animate-in fade-in duration-300">
          <ReportsPanel staff={staff} rooms={rooms} />
        </div>
      )}
    </main>
  )
}
