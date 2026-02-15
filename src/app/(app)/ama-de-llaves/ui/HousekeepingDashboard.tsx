'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import type { ReactNode } from 'react'
import RoomGrid from './RoomGrid'
import StaffPanel from './StaffPanel'
import InventoryPanel from './InventoryPanel'
import ReportsPanel from './ReportsPanel'
import IncidentsPanel from './IncidentsPanel'
import RoomManagementPanel from './RoomManagementPanel'
import type { RoomIncident } from './IncidentsPanel'

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
  type: 'standard' | 'doble' | 'suite' | 'accesible' | 'conectada'
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

interface HotelLocation {
  id: string
  name: string
  code: string
  total_rooms: number | null
  total_floors: number | null
  brand: string | null
}

type Tab = 'dashboard' | 'habitaciones' | 'gestion' | 'incidencias' | 'personal' | 'inventario' | 'reportes'

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

  if (total === 0) return null

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

// ──────── Empty state ────────
function EmptyState({ locationName, locationId, totalRooms, totalFloors, onGenerated }: {
  locationName: string
  locationId: string
  totalRooms: number | null
  totalFloors: number | null
  onGenerated: () => void
}) {
  const [seeding, setSeeding] = useState(false)
  const [seedResult, setSeedResult] = useState<string | null>(null)
  const [seedError, setSeedError] = useState<string | null>(null)

  const canSeed = (totalRooms ?? 0) > 0 && (totalFloors ?? 0) > 0

  async function handleSeed() {
    setSeeding(true)
    setSeedError(null)
    setSeedResult(null)
    try {
      const res = await fetch('/api/housekeeping/seed-rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location_id: locationId }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setSeedError(json.message || json.error || 'Error generando habitaciones')
        return
      }
      setSeedResult(json.message)
      // Recargar datos después de 1s
      setTimeout(() => onGenerated(), 1000)
    } catch (e: any) {
      setSeedError(e?.message || 'Error de conexión')
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="card">
      <div className="card-body p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18v9M5 19v-2m14 2v-2M7 10V7a2 2 0 012-2h6a2 2 0 012 2v3" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">Sin habitaciones registradas</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto mb-4">
          La propiedad <span className="font-semibold">{locationName}</span> no tiene habitaciones configuradas todavía.
          {canSeed
            ? ` Puedes generar automáticamente ${totalRooms} habitaciones en ${totalFloors} pisos.`
            : ' Configura total_rooms y total_floors en la sede desde Administración → Ubicaciones.'}
        </p>

        {canSeed && !seedResult && (
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="btn btn-primary gap-2 mx-auto"
          >
            {seeding ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generando {totalRooms} habitaciones…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Generar {totalRooms} habitaciones ({totalFloors} pisos)
              </>
            )}
          </button>
        )}

        {seedResult && (
          <div className="mt-3 inline-flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {seedResult}
          </div>
        )}

        {seedError && (
          <div className="mt-3 inline-flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {seedError}
          </div>
        )}
      </div>
    </div>
  )
}

// ──────── Main Dashboard ────────
export default function HousekeepingDashboard() {
  // ─── Location state ───
  const [locations, setLocations] = useState<HotelLocation[]>([])
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [loadingLocations, setLoadingLocations] = useState(true)

  // ─── Data state ───
  const [rooms, setRooms] = useState<Room[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ─── Incidents state ───
  const [incidents, setIncidents] = useState<RoomIncident[]>([])
  const [incidentRooms, setIncidentRooms] = useState<{ id: string; number: string; floor: number; status: string; incidentCount: number }[]>([])
  const [loadingIncidents, setLoadingIncidents] = useState(false)

  // ─── UI state ───
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [actionBusy, setActionBusy] = useState(false)

  const selectedLocation = locations.find(l => l.id === selectedLocationId)

  // ─── Load hotel locations ───
  useEffect(() => {
    async function fetchLocations() {
      try {
        const res = await fetch('/api/housekeeping/locations')
        if (!res.ok) throw new Error(await res.text())
        const json = await res.json()
        const locs: HotelLocation[] = json.locations ?? []
        setLocations(locs)

        // Auto-select: user's location if hotel, else first
        if (locs.length > 0) {
          const userLoc = locs.find((l: HotelLocation) => l.id === json.userLocationId)
          setSelectedLocationId(userLoc ? userLoc.id : locs[0].id)
        }
      } catch (e: any) {
        setError(e?.message ?? 'Error cargando sedes')
      } finally {
        setLoadingLocations(false)
      }
    }
    fetchLocations()
  }, [])

  // ─── Load HK data when location changes ───
  const loadData = useCallback(async (locationId: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/housekeeping?location_id=${locationId}`)
      if (!res.ok) throw new Error(await res.text())
      const json = await res.json()
      setRooms(json.rooms ?? [])
      setStaff(json.staff ?? [])
      setInventory(json.inventory ?? [])
    } catch (e: any) {
      setError(e?.message ?? 'Error cargando datos')
    } finally {
      setLoading(false)
    }

    // Fetch incidents in parallel (non-blocking)
    setLoadingIncidents(true)
    fetch(`/api/housekeeping/room-incidents?location_id=${locationId}`)
      .then(r => r.ok ? r.json() : { incidents: [], rooms: [] })
      .then(json => {
        setIncidents(json.incidents ?? [])
        setIncidentRooms(json.rooms ?? [])
      })
      .catch(() => {
        setIncidents([])
        setIncidentRooms([])
      })
      .finally(() => setLoadingIncidents(false))
  }, [])

  useEffect(() => {
    if (selectedLocationId) loadData(selectedLocationId)
  }, [selectedLocationId, loadData])

  // ─── KPI counts ───
  const counts = useMemo(() => {
    const c: Record<RoomStatus, number> = { limpia: 0, sucia: 0, en_limpieza: 0, mantenimiento: 0, inspeccion: 0, bloqueada: 0 }
    rooms.forEach(r => c[r.status]++)
    return c
  }, [rooms])

  const activeStaff = staff.filter(s => s.status === 'activo').length
  const lowStockItems = inventory.filter(i => i.stock <= i.minStock).length

  // ─── Room status change (calls API) ───
  const handleStatusChange = useCallback(async (roomId: string, newStatus: RoomStatus) => {
    // Optimistic update
    setRooms(prev =>
      prev.map(r =>
        r.id === roomId
          ? { ...r, status: newStatus, lastCleaned: newStatus === 'limpia' ? new Date().toISOString() : r.lastCleaned }
          : r
      )
    )

    try {
      const res = await fetch('/api/housekeeping/room-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: roomId, new_status: newStatus }),
      })
      if (!res.ok) {
        // Revert on error
        if (selectedLocationId) loadData(selectedLocationId)
        console.error('Error cambiando estado:', await res.text())
      }
    } catch {
      if (selectedLocationId) loadData(selectedLocationId)
    }
  }, [selectedLocationId, loadData])

  // ─── Smart assignment (calls API) ───
  const handleSmartAssign = useCallback(async () => {
    if (!selectedLocationId || actionBusy) return
    setActionBusy(true)
    try {
      const res = await fetch('/api/housekeeping/smart-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location_id: selectedLocationId }),
      })
      if (!res.ok) throw new Error(await res.text())
      const json = await res.json()
      // Reload after assignment
      await loadData(selectedLocationId)
      if (json.count === 0) {
        setError('No hay personal activo o habitaciones sucias para asignar')
        setTimeout(() => setError(null), 3000)
      }
    } catch (e: any) {
      setError(e?.message ?? 'Error en asignación')
    } finally {
      setActionBusy(false)
    }
  }, [selectedLocationId, actionBusy, loadData])

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
      key: 'gestion',
      label: 'Gestión',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      key: 'incidencias',
      label: `Incidencias${incidents.length > 0 ? ` (${incidents.filter(i => !['RESOLVED', 'CLOSED'].includes(i.status)).length})` : ''}`,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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

  // ─── Loading state ───
  if (loadingLocations) {
    return (
      <main className="p-4 md:p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Cargando propiedades…</p>
        </div>
      </main>
    )
  }

  if (locations.length === 0) {
    return (
      <main className="p-4 md:p-6">
        <div className="card">
          <div className="card-body p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Sin propiedades hoteleras</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              No hay ubicaciones de tipo &quot;Hotel&quot; registradas. Ve a Administración → Ubicaciones para crear una sede hotelera.
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="p-4 md:p-6 space-y-6 pb-24">
      {/* Header + Location selector */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Ama de Llaves</h1>
          <p className="text-sm text-slate-500 font-medium">
            {selectedLocation?.brand && <span className="text-indigo-600">{selectedLocation.brand} · </span>}
            {selectedLocation?.name}
            {selectedLocation?.total_rooms && (
              <span className="text-slate-400"> · {selectedLocation.total_rooms} habitaciones · {selectedLocation.total_floors ?? '?'} pisos</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Location selector */}
          {locations.length > 1 && (
            <select
              className="select text-sm"
              value={selectedLocationId ?? ''}
              onChange={(e) => setSelectedLocationId(e.target.value)}
            >
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>
                  🏨 {loc.name} ({loc.code}){loc.total_rooms ? ` · ${loc.total_rooms} hab.` : ''}
                </option>
              ))}
            </select>
          )}

          {/* Refresh */}
          <button
            onClick={() => selectedLocationId && loadData(selectedLocationId)}
            disabled={loading}
            className="btn btn-secondary gap-1.5"
            title="Actualizar datos"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? 'Cargando…' : 'Actualizar'}
          </button>

          {/* Smart assign */}
          {counts.sucia > 0 && (
            <button
              onClick={handleSmartAssign}
              disabled={actionBusy}
              className="btn btn-primary gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {actionBusy ? 'Asignando…' : `Asignar (${counts.sucia} sucias)`}
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">✕</button>
        </div>
      )}

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

      {/* Loading overlay */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">Cargando datos de {selectedLocation?.name ?? 'propiedad'}…</p>
          </div>
        </div>
      )}

      {/* Content */}
      {!loading && rooms.length === 0 && selectedLocationId && (
        <EmptyState
          locationName={selectedLocation?.name ?? 'esta propiedad'}
          locationId={selectedLocationId}
          totalRooms={selectedLocation?.total_rooms ?? null}
          totalFloors={selectedLocation?.total_floors ?? null}
          onGenerated={() => selectedLocationId && loadData(selectedLocationId)}
        />
      )}

      {!loading && rooms.length > 0 && (
        <>
          {/* ─── Dashboard Tab ─── */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                <KPICard label="Limpias" value={counts.limpia} sub={`${((counts.limpia / rooms.length) * 100).toFixed(0)}% del total`} tone="emerald" />
                <KPICard label="Sucias" value={counts.sucia} sub="Pendientes" tone="red" />
                <KPICard label="En Limpieza" value={counts.en_limpieza} sub="En proceso" tone="amber" />
                <KPICard label="Inspección" value={counts.inspeccion} sub="Esperando revisión" tone="violet" />
                <KPICard label="Personal Activo" value={`${activeStaff}/${staff.length}`} sub="Trabajando ahora" tone="blue" />
                <KPICard label="Incidencias" value={incidents.filter(i => !['RESOLVED', 'CLOSED'].includes(i.status)).length} sub={incidents.length > 0 ? `${incidentRooms.length} hab. afectadas` : 'Sin incidencias'} tone={incidents.filter(i => !['RESOLVED', 'CLOSED'].includes(i.status)).length > 0 ? 'red' : 'slate'} />
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
              {(lowStockItems > 0 || rooms.some(r => r.hasIncident) || incidents.length > 0) && (
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
                      {incidents.filter(i => !['RESOLVED', 'CLOSED'].includes(i.status)).length > 0 && (
                        <li className="text-xs text-amber-700">
                          • {incidents.filter(i => !['RESOLVED', 'CLOSED'].includes(i.status)).length} incidencia(s) activa(s) en habitaciones
                          {' '}
                          <button onClick={() => setActiveTab('incidencias')} className="text-indigo-600 font-semibold hover:underline">
                            Ver detalle →
                          </button>
                        </li>
                      )}
                      {rooms.filter(r => r.hasIncident).length > 0 && !incidents.length && (
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

          {/* ─── Gestión Tab ─── */}
          {activeTab === 'gestion' && selectedLocationId && (
            <div className="animate-in fade-in duration-300">
              <RoomManagementPanel
                rooms={rooms}
                locationId={selectedLocationId}
                onRefresh={() => selectedLocationId && loadData(selectedLocationId)}
              />
            </div>
          )}

          {/* ─── Incidencias Tab ─── */}
          {activeTab === 'incidencias' && (
            <div className="animate-in fade-in duration-300">
              <IncidentsPanel incidents={incidents} rooms={incidentRooms} loading={loadingIncidents} />
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
        </>
      )}
    </main>
  )
}
