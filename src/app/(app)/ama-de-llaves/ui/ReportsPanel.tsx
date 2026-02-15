'use client'

import { useMemo } from 'react'
import type { Staff, Room } from './HousekeepingDashboard'

interface Props {
  staff: Staff[]
  rooms: Room[]
}

export default function ReportsPanel({ staff, rooms }: Props) {
  // Productivity calculations
  const productivityData = useMemo(() => {
    return staff
      .filter(s => s.status !== 'inactivo')
      .map(s => {
        const efficiency = s.roomsAssigned > 0 ? Math.round((s.roomsCleaned / s.roomsAssigned) * 100) : 0
        return { ...s, efficiency }
      })
      .sort((a, b) => b.roomsCleaned - a.roomsCleaned)
  }, [staff])

  const totalCleaned = staff.reduce((sum, s) => sum + s.roomsCleaned, 0)
  const totalAssigned = staff.reduce((sum, s) => sum + s.roomsAssigned, 0)
  const avgEfficiency = totalAssigned > 0 ? Math.round((totalCleaned / totalAssigned) * 100) : 0
  const avgTimeGlobal = staff.filter(s => s.status === 'activo').length > 0
    ? Math.round(staff.filter(s => s.status === 'activo').reduce((sum, s) => sum + s.avgMinutes, 0) / staff.filter(s => s.status === 'activo').length)
    : 0

  // Room status summary
  const statusSummary = useMemo(() => {
    const c = { limpia: 0, sucia: 0, en_limpieza: 0, mantenimiento: 0, inspeccion: 0, bloqueada: 0 }
    rooms.forEach(r => c[r.status]++)
    return c
  }, [rooms])

  // Top performer
  const topPerformer = productivityData.length > 0 ? productivityData[0] : null

  // Bar width helper
  const maxCleaned = Math.max(...productivityData.map(s => s.roomsCleaned), 1)

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card">
          <div className="card-body p-4">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Total Limpiadas</p>
            <p className="text-2xl font-extrabold text-emerald-700 mt-1">{totalCleaned}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">habitaciones hoy</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body p-4">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Eficiencia Global</p>
            <p className={`text-2xl font-extrabold mt-1 ${avgEfficiency >= 80 ? 'text-emerald-700' : avgEfficiency >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{avgEfficiency}%</p>
            <p className="text-[10px] text-slate-400 mt-0.5">limpiadas / asignadas</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body p-4">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Tiempo Promedio</p>
            <p className="text-2xl font-extrabold text-blue-700 mt-1">{avgTimeGlobal}<span className="text-sm font-normal text-slate-400"> min</span></p>
            <p className="text-[10px] text-slate-400 mt-0.5">por habitación</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body p-4">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Mejor Desempeño</p>
            <p className="text-lg font-extrabold text-violet-700 mt-1 truncate">{topPerformer?.name || '—'}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{topPerformer ? `${topPerformer.roomsCleaned} habitaciones` : ''}</p>
          </div>
        </div>
      </div>

      {/* Two columns layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Productivity chart */}
        <div className="lg:col-span-2 card">
          <div className="card-body">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">Productividad por Persona</h2>
            <div className="space-y-3">
              {productivityData.map((person, idx) => (
                <div key={person.id} className="flex items-center gap-3">
                  {/* Rank */}
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                    idx === 0 ? 'bg-amber-100 text-amber-700' : idx === 1 ? 'bg-slate-100 text-slate-600' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-50 text-slate-400'
                  }`}>
                    {idx + 1}
                  </span>

                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                    {person.avatar}
                  </div>

                  {/* Name & stats */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-slate-900 truncate">{person.name}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-500 flex-shrink-0">
                        <span><span className="font-bold text-emerald-600">{person.roomsCleaned}</span> limpias</span>
                        <span><span className="font-bold text-blue-600">{person.avgMinutes}m</span> prom.</span>
                        <span className={`font-bold ${person.efficiency >= 80 ? 'text-emerald-600' : person.efficiency >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                          {person.efficiency}%
                        </span>
                      </div>
                    </div>
                    {/* Bar */}
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-500 transition-all"
                        style={{ width: `${(person.roomsCleaned / maxCleaned) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Room status summary */}
        <div className="card">
          <div className="card-body">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">Estado Actual de Habitaciones</h2>
            <div className="space-y-3">
              {([
                { key: 'limpia', label: 'Limpias', color: 'bg-emerald-500', text: 'text-emerald-700' },
                { key: 'sucia', label: 'Sucias', color: 'bg-red-400', text: 'text-red-700' },
                { key: 'en_limpieza', label: 'En Limpieza', color: 'bg-amber-400', text: 'text-amber-700' },
                { key: 'inspeccion', label: 'Inspección', color: 'bg-violet-400', text: 'text-violet-700' },
                { key: 'mantenimiento', label: 'Mantenimiento', color: 'bg-orange-400', text: 'text-orange-700' },
                { key: 'bloqueada', label: 'Bloqueadas', color: 'bg-slate-400', text: 'text-slate-600' },
              ] as const).map(item => (
                <div key={item.key} className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${item.color} flex-shrink-0`} />
                  <span className="text-sm text-slate-600 flex-1">{item.label}</span>
                  <span className={`text-sm font-bold ${item.text}`}>{statusSummary[item.key]}</span>
                  <span className="text-[10px] text-slate-400 w-10 text-right">
                    {rooms.length > 0 ? `${Math.round((statusSummary[item.key] / rooms.length) * 100)}%` : '0%'}
                  </span>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Total habitaciones:</span>
                <span className="font-bold text-slate-900">{rooms.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Daily timeline (simulated) */}
      <div className="card">
        <div className="card-body">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">Actividad del Día</h2>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200" />
            <div className="space-y-4 pl-10">
              {[
                { time: '06:00', event: 'Inicio de turno matutino', detail: `${staff.filter(s => s.status === 'activo').length} personas`, tone: 'emerald' },
                { time: '07:15', event: 'Primera ronda de check-outs', detail: `${Math.floor(rooms.length * 0.15)} habitaciones`, tone: 'blue' },
                { time: '09:30', event: 'Asignación automática ejecutada', detail: `${Math.floor(rooms.length * 0.25)} sucias distribuidas`, tone: 'violet' },
                { time: '11:00', event: 'Inspección parcial completada', detail: `${statusSummary.inspeccion} en cola`, tone: 'amber' },
                { time: '13:00', event: 'Reporte de medio día', detail: `${totalCleaned} limpias, ${avgEfficiency}% eficiencia`, tone: 'slate' },
              ].map((entry, i) => (
                <div key={i} className="relative flex items-start gap-3">
                  <div className={`absolute -left-10 top-0.5 w-3 h-3 rounded-full border-2 border-white ${
                    entry.tone === 'emerald' ? 'bg-emerald-500' :
                    entry.tone === 'blue' ? 'bg-blue-500' :
                    entry.tone === 'violet' ? 'bg-violet-500' :
                    entry.tone === 'amber' ? 'bg-amber-500' :
                    'bg-slate-400'
                  }`} style={{ left: '-1.625rem' }} />
                  <div>
                    <p className="text-xs font-bold text-slate-500">{entry.time}</p>
                    <p className="text-sm font-semibold text-slate-900">{entry.event}</p>
                    <p className="text-xs text-slate-500">{entry.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
