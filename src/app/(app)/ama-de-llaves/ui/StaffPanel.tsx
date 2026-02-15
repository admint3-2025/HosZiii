'use client'

import type { Staff, Room } from './HousekeepingDashboard'

interface Props {
  staff: Staff[]
  rooms: Room[]
  onSmartAssign: () => void
  dirtyCount: number
}

const statusConfig: Record<Staff['status'], { label: string; dot: string; badge: string }> = {
  activo: { label: 'Activo', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  descanso: { label: 'Descanso', dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  inactivo: { label: 'Inactivo', dot: 'bg-slate-400', badge: 'bg-slate-50 text-slate-600 border-slate-200' },
}

export default function StaffPanel({ staff, rooms, onSmartAssign, dirtyCount }: Props) {
  const activeCount = staff.filter(s => s.status === 'activo').length
  const totalCleaned = staff.reduce((sum, s) => sum + s.roomsCleaned, 0)
  const avgTime = staff.filter(s => s.status === 'activo').length > 0
    ? Math.round(staff.filter(s => s.status === 'activo').reduce((sum, s) => sum + s.avgMinutes, 0) / staff.filter(s => s.status === 'activo').length)
    : 0

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card">
          <div className="card-body p-4">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Personal Activo</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{activeCount}<span className="text-sm font-normal text-slate-400">/{staff.length}</span></p>
          </div>
        </div>
        <div className="card">
          <div className="card-body p-4">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Habs. Limpiadas Hoy</p>
            <p className="text-2xl font-extrabold text-emerald-700 mt-1">{totalCleaned}</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body p-4">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Tiempo Promedio</p>
            <p className="text-2xl font-extrabold text-blue-700 mt-1">{avgTime}<span className="text-sm font-normal text-slate-400"> min</span></p>
          </div>
        </div>
        <div className="card">
          <div className="card-body p-4">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Sucias Sin Asignar</p>
            <p className="text-2xl font-extrabold text-red-600 mt-1">{dirtyCount}</p>
            {dirtyCount > 0 && (
              <button onClick={onSmartAssign} className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                Asignar automático →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Staff cards */}
      <div>
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3">Equipo de Housekeeping</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {staff.map(member => {
            const cfg = statusConfig[member.status]
            const assignedRooms = rooms.filter(r => r.assignedTo?.startsWith(member.name.split(' ')[0]))
            
            return (
              <div key={member.id} className="card">
                <div className="card-body p-4">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-sm font-bold text-slate-600 flex-shrink-0">
                      {member.avatar}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 truncate">{member.name}</p>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-lg font-extrabold text-slate-900">{member.roomsAssigned}</p>
                      <p className="text-[10px] text-slate-500 leading-tight">Asignadas</p>
                    </div>
                    <div>
                      <p className="text-lg font-extrabold text-emerald-600">{member.roomsCleaned}</p>
                      <p className="text-[10px] text-slate-500 leading-tight">Limpiadas</p>
                    </div>
                    <div>
                      <p className="text-lg font-extrabold text-blue-600">{member.avgMinutes}<span className="text-xs font-normal">m</span></p>
                      <p className="text-[10px] text-slate-500 leading-tight">Promedio</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {member.roomsAssigned > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                        <span>Progreso</span>
                        <span className="font-bold text-slate-700">{Math.min(100, Math.round((member.roomsCleaned / member.roomsAssigned) * 100))}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${Math.min(100, (member.roomsCleaned / member.roomsAssigned) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Assigned rooms preview */}
                  {assignedRooms.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <p className="text-[10px] text-slate-500 mb-1.5">Asignadas ahora:</p>
                      <div className="flex flex-wrap gap-1">
                        {assignedRooms.slice(0, 8).map(r => (
                          <span key={r.id} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                            {r.number}
                          </span>
                        ))}
                        {assignedRooms.length > 8 && (
                          <span className="text-[10px] text-slate-400">+{assignedRooms.length - 8}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
