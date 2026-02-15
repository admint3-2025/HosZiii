'use client'

import { useState, useMemo } from 'react'
import type { Room, RoomStatus, RoomIncidentInfo } from './HousekeepingDashboard'

interface Props {
  rooms: Room[]
  onStatusChange: (roomId: string, newStatus: RoomStatus) => void
  compact?: boolean
}

const STATUS_CONFIG: Record<RoomStatus, { label: string; color: string; bg: string; border: string; icon: string }> = {
  limpia: { label: 'Limpia', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: '✓' },
  sucia: { label: 'Sucia', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: '✗' },
  en_limpieza: { label: 'Limpiando', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: '⟳' },
  mantenimiento: { label: 'Mant.', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', icon: '⚙' },
  inspeccion: { label: 'Inspec.', color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200', icon: '◉' },
  bloqueada: { label: 'Bloqueada', color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-300', icon: '⊘' },
}

const STATUS_FLOW: Record<RoomStatus, RoomStatus[]> = {
  sucia: ['en_limpieza', 'mantenimiento', 'bloqueada'],
  en_limpieza: ['inspeccion', 'limpia', 'mantenimiento'],
  inspeccion: ['limpia', 'sucia'],
  limpia: ['sucia', 'bloqueada', 'mantenimiento'],
  mantenimiento: ['sucia', 'limpia', 'bloqueada'],
  bloqueada: ['sucia', 'limpia'],
}

export default function RoomGrid({ rooms, onStatusChange, compact }: Props) {
  const [filterStatus, setFilterStatus] = useState<RoomStatus | 'all'>('all')
  const [filterFloor, setFilterFloor] = useState<number | 'all'>('all')
  const [contextMenu, setContextMenu] = useState<{ roomId: string; x: number; y: number } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const floors = useMemo(() => [...new Set(rooms.map(r => r.floor))].sort(), [rooms])

  const filtered = useMemo(() => {
    let result = rooms
    if (filterStatus !== 'all') result = result.filter(r => r.status === filterStatus)
    if (filterFloor !== 'all') result = result.filter(r => r.floor === filterFloor)
    if (searchQuery) result = result.filter(r => r.number.includes(searchQuery))
    return result
  }, [rooms, filterStatus, filterFloor, searchQuery])

  const groupedByFloor = useMemo(() => {
    const map = new Map<number, Room[]>()
    filtered.forEach(r => {
      if (!map.has(r.floor)) map.set(r.floor, [])
      map.get(r.floor)!.push(r)
    })
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0])
  }, [filtered])

  // Context menu for quick status change
  const handleRoomClick = (roomId: string, e: React.MouseEvent) => {
    e.preventDefault()
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    setContextMenu({ roomId, x: rect.left, y: rect.bottom + 4 })
  }

  const handleStatusSelect = (roomId: string, status: RoomStatus) => {
    onStatusChange(roomId, status)
    setContextMenu(null)
  }

  const currentRoom = contextMenu ? rooms.find(r => r.id === contextMenu.roomId) : null
  const [hoveredIncidentRoom, setHoveredIncidentRoom] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      {/* Filters */}
      {!compact && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar habitación..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input pl-9 w-44"
            />
          </div>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as RoomStatus | 'all')}
            className="select w-auto"
          >
            <option value="all">Todos los estados</option>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>

          <select
            value={filterFloor === 'all' ? 'all' : filterFloor}
            onChange={e => setFilterFloor(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="select w-auto"
          >
            <option value="all">Todos los pisos</option>
            {floors.map(f => (
              <option key={f} value={f}>Piso {f}</option>
            ))}
          </select>

          <span className="text-xs text-slate-500 ml-auto">{filtered.length} habitaciones</span>
        </div>
      )}

      {/* Grid by floor */}
      {groupedByFloor.map(([floor, floorRooms]) => (
        <div key={floor}>
          {!compact && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Piso {floor}</span>
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-[10px] text-slate-400">{floorRooms.length} habs.</span>
            </div>
          )}
          {compact && floor === groupedByFloor[0]?.[0] && null}
          <div className={`grid gap-1.5 ${compact ? 'grid-cols-10 sm:grid-cols-15 lg:grid-cols-20' : 'grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-16 xl:grid-cols-20'}`}>
            {floorRooms.map(room => {
              const cfg = STATUS_CONFIG[room.status]
              const incidentTitle = room.incidents?.length > 0
                ? room.incidents.map(i => `[${i.source === 'it' ? 'IT' : 'Mant'}] ${i.ticketNumber}: ${i.title}`).join(' | ')
                : ''
              return (
                <div key={room.id} className="relative">
                  <button
                    onClick={(e) => handleRoomClick(room.id, e)}
                    onMouseEnter={() => room.hasIncident && setHoveredIncidentRoom(room.id)}
                    onMouseLeave={() => setHoveredIncidentRoom(null)}
                    className={`relative w-full rounded-lg border ${cfg.border} ${cfg.bg} px-1 py-1.5 text-center transition-all hover:scale-105 hover:shadow-md group ${compact ? 'text-[10px]' : 'text-xs'}`}
                    title={`${room.number} — ${cfg.label}${room.assignedTo ? ` · ${room.assignedTo}` : ''}${room.notes ? ` · ${room.notes}` : ''}${incidentTitle ? ` · 🚨 ${incidentTitle}` : ''}`}
                  >
                    <span className={`font-bold ${cfg.color} block leading-tight`}>{room.number}</span>
                    {!compact && (
                      <span className={`text-[9px] ${cfg.color} opacity-70`}>{cfg.icon}</span>
                    )}
                    {room.hasIncident && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border border-white flex items-center justify-center">
                        <span className="text-[6px] text-white font-bold">{room.incidents?.length || '!'}</span>
                      </span>
                    )}
                  </button>
                  {/* Incident tooltip popup */}
                  {hoveredIncidentRoom === room.id && room.incidents?.length > 0 && !compact && (
                    <div className="absolute z-30 left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 bg-white rounded-lg shadow-xl border border-red-200 p-2 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                      <p className="text-[10px] font-bold text-red-700 uppercase mb-1">🚨 Incidencias ({room.incidents.length})</p>
                      {room.incidents.slice(0, 3).map((inc, i) => (
                        <div key={i} className="text-[10px] text-slate-700 py-0.5 border-t border-red-50">
                          <span className={`inline-block px-1 rounded text-[8px] font-bold mr-1 ${inc.source === 'it' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                            {inc.source === 'it' ? 'IT' : 'MANT'}
                          </span>
                          <span className="font-semibold">{inc.ticketNumber}</span>
                          <p className="text-[9px] text-slate-500 truncate">{inc.title}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Context menu overlay */}
      {contextMenu && currentRoom && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-50 bg-white rounded-xl shadow-xl border border-slate-200 p-2 min-w-[180px] animate-in fade-in zoom-in-95 duration-150"
            style={{ left: Math.min(contextMenu.x, window.innerWidth - 200), top: Math.min(contextMenu.y, window.innerHeight - 200) }}
          >
            <div className="px-3 py-1.5 border-b border-slate-100 mb-1">
              <p className="text-xs font-bold text-slate-900">Habitación {currentRoom.number}</p>
              <p className="text-[10px] text-slate-500">Estado actual: {STATUS_CONFIG[currentRoom.status].label}</p>
            </div>
            <p className="px-3 py-1 text-[10px] text-slate-400 uppercase font-semibold tracking-wide">Cambiar a:</p>
            {STATUS_FLOW[currentRoom.status].map(nextStatus => {
              const ncfg = STATUS_CONFIG[nextStatus]
              return (
                <button
                  key={nextStatus}
                  onClick={() => handleStatusSelect(currentRoom.id, nextStatus)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-2 ${ncfg.color}`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${ncfg.bg} border ${ncfg.border}`} />
                  {ncfg.label}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
