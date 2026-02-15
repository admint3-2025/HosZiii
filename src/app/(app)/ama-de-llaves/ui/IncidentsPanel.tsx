'use client'

import { useState, useMemo } from 'react'

export interface RoomIncident {
  ticketId: string
  source: 'it' | 'maintenance'
  roomId: string
  ticketNumber: string
  title: string
  description: string | null
  status: string
  priority: string
  requester: string | null
  assignedTo: string | null
  createdAt: string
  updatedAt: string
  closedAt: string | null
  resolution: string | null
}

interface IncidentRoom {
  id: string
  number: string
  floor: number
  status: string
  incidentCount: number
}

interface Props {
  incidents: RoomIncident[]
  rooms: IncidentRoom[]
  loading: boolean
}

const SOURCE_BADGE: Record<string, { label: string; className: string }> = {
  it: { label: 'IT', className: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  maintenance: { label: 'Mant.', className: 'bg-orange-100 text-orange-700 border-orange-200' },
}

const PRIORITY_BADGE: Record<string, { label: string; className: string }> = {
  '1': { label: 'Crítica', className: 'bg-red-100 text-red-700' },
  '2': { label: 'Alta', className: 'bg-orange-100 text-orange-700' },
  '3': { label: 'Media', className: 'bg-blue-100 text-blue-700' },
  '4': { label: 'Baja', className: 'bg-slate-100 text-slate-600' },
  CRITICAL: { label: 'Crítica', className: 'bg-red-100 text-red-700' },
  HIGH: { label: 'Alta', className: 'bg-orange-100 text-orange-700' },
  MEDIUM: { label: 'Media', className: 'bg-blue-100 text-blue-700' },
  LOW: { label: 'Baja', className: 'bg-slate-100 text-slate-600' },
}

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Nuevo',
  ASSIGNED: 'Asignado',
  IN_PROGRESS: 'En Progreso',
  NEEDS_INFO: 'Info Requerida',
  WAITING_THIRD_PARTY: 'Esperando Tercero',
  RESOLVED: 'Resuelto',
  CLOSED: 'Cerrado',
  REOPENED: 'Reabierto',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `hace ${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours}h`
  const days = Math.floor(hours / 24)
  return `hace ${days}d`
}

export default function IncidentsPanel({ incidents, rooms, loading }: Props) {
  const [filterSource, setFilterSource] = useState<'all' | 'it' | 'maintenance'>('all')
  const [filterRoom, setFilterRoom] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let result = incidents
    if (filterSource !== 'all') result = result.filter(i => i.source === filterSource)
    if (filterRoom !== 'all') result = result.filter(i => i.roomId === filterRoom)
    return result
  }, [incidents, filterSource, filterRoom])

  // Stats
  const itCount = incidents.filter(i => i.source === 'it').length
  const maintCount = incidents.filter(i => i.source === 'maintenance').length
  const openCount = incidents.filter(i => !['RESOLVED', 'CLOSED'].includes(i.status)).length

  // Room map for display
  const roomMap = useMemo(() => {
    const map: Record<string, IncidentRoom> = {}
    rooms.forEach(r => { map[r.id] = r })
    return map
  }, [rooms])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Cargando incidencias…</p>
        </div>
      </div>
    )
  }

  if (incidents.length === 0) {
    return (
      <div className="card">
        <div className="card-body p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Sin incidencias activas</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            No hay tickets de IT ni de Mantenimiento vinculados a habitaciones en esta propiedad. ¡Todo bien!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card">
          <div className="card-body p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Abiertas</span>
            </div>
            <p className="text-2xl font-extrabold text-red-700 leading-none">{openCount}</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">IT</span>
            </div>
            <p className="text-2xl font-extrabold text-indigo-700 leading-none">{itCount}</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Mantenimiento</span>
            </div>
            <p className="text-2xl font-extrabold text-orange-700 leading-none">{maintCount}</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Habs. Afectadas</span>
            </div>
            <p className="text-2xl font-extrabold text-amber-700 leading-none">{rooms.length}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="select w-auto text-sm"
          value={filterSource}
          onChange={e => setFilterSource(e.target.value as 'all' | 'it' | 'maintenance')}
        >
          <option value="all">Todas las fuentes</option>
          <option value="it">Solo IT ({itCount})</option>
          <option value="maintenance">Solo Mantenimiento ({maintCount})</option>
        </select>

        {rooms.length > 0 && (
          <select
            className="select w-auto text-sm"
            value={filterRoom}
            onChange={e => setFilterRoom(e.target.value)}
          >
            <option value="all">Todas las habitaciones</option>
            {rooms.map(r => (
              <option key={r.id} value={r.id}>
                Hab. {r.number} — Piso {r.floor} ({r.incidentCount})
              </option>
            ))}
          </select>
        )}

        <span className="text-xs text-slate-500 ml-auto">{filtered.length} incidencia(s)</span>
      </div>

      {/* Incident list */}
      <div className="space-y-2">
        {filtered.map(incident => {
          const room = roomMap[incident.roomId]
          const sourceBadge = SOURCE_BADGE[incident.source] || SOURCE_BADGE.it
          const priorityBadge = PRIORITY_BADGE[incident.priority] || PRIORITY_BADGE['3']
          const isOpen = !['RESOLVED', 'CLOSED'].includes(incident.status)
          const isExpanded = expandedId === incident.ticketId

          return (
            <div
              key={incident.ticketId}
              className={`card transition-all ${isOpen ? 'border-l-4 border-l-red-400' : 'border-l-4 border-l-emerald-400 opacity-75'}`}
            >
              <div className="card-body p-3">
                {/* Header row */}
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : incident.ticketId)}
                    className="mt-0.5 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <svg
                      className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${sourceBadge.className}`}>
                        {sourceBadge.label}
                      </span>
                      <span className="text-xs font-mono text-slate-500">
                        #{incident.ticketNumber}
                      </span>
                      {room && (
                        <span className="text-xs text-slate-400">
                          · Hab. {room.number} (P{room.floor})
                        </span>
                      )}
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${priorityBadge.className}`}>
                        {priorityBadge.label}
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-slate-900 mt-1 truncate">{incident.title}</p>

                    <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                      <span className={`font-semibold ${isOpen ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {STATUS_LABELS[incident.status] || incident.status}
                      </span>
                      {incident.assignedTo && (
                        <span>→ {incident.assignedTo}</span>
                      )}
                      <span className="text-slate-400">{timeAgo(incident.createdAt)}</span>
                    </div>
                  </div>

                  {/* Link to ticket */}
                  <a
                    href={incident.source === 'it' ? `/tickets/${incident.ticketId}` : `/mantenimiento/tickets/${incident.ticketId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 whitespace-nowrap"
                    title="Abrir ticket"
                  >
                    Ver →
                  </a>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 animate-in fade-in duration-200">
                    {incident.description && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Descripción</p>
                        <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                          {incident.description.length > 500
                            ? incident.description.slice(0, 500) + '…'
                            : incident.description}
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 font-semibold">Solicitante</span>
                        <p className="text-slate-700">{incident.requester || '—'}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold">Asignado</span>
                        <p className="text-slate-700">{incident.assignedTo || 'Sin asignar'}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold">Creado</span>
                        <p className="text-slate-700">{new Date(incident.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold">Última actualización</span>
                        <p className="text-slate-700">{new Date(incident.updatedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                    {incident.resolution && (
                      <div>
                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide mb-1">Resolución</p>
                        <p className="text-xs text-slate-600">{incident.resolution}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
