'use client'

import React, { useId, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  ClipboardCheck,
  DollarSign,
  Globe,
  MapPin,
  Plus,
  Search,
  TrendingUp,
} from 'lucide-react'

type LocationOption = {
  id: string
  name: string
  code: string
}

type StatStatus = 'positive' | 'negative' | 'neutral'

type Stat = {
  label: string
  value: string
  trend: string
  status: StatStatus
  sub: string
  history: number[]
}

type MaintenanceItem = {
  id: string
  locationCode: string
  asset: string
  area: string
  type: string
  priority: 'Baja' | 'Media' | 'Alta' | 'Crítica'
  status: 'Pendiente' | 'En Proceso' | 'Completado' | 'Atrasado'
  aging: number
  assigned: string
}

type InspectionItem = {
  id: number
  locationCode: string
  area: string
  score: number
  status: 'Aprobado' | 'Observaciones' | 'Crítico'
  inspector: string
}

type AnnualPlanItem = {
  id: string
  title: string
  code: string
  quarter: string
  dueLabel: string
  budgetLabel: string
  status: 'En Progreso' | 'Atrasado' | 'Iniciando' | 'Finalizando'
  progress: number
  daysInProgress: number
}

const MOCK_STATS: Stat[] = [
  {
    label: 'Backlog IT/MTTO',
    value: '28',
    trend: '-3',
    status: 'positive',
    sub: 'Tickets abiertos',
    history: [35, 34, 32, 31, 30, 29, 28],
  },
  {
    label: 'Cumplimiento Preventivo',
    value: '91',
    trend: '+2',
    status: 'positive',
    sub: 'Actividades (mes)',
    history: [82, 84, 86, 87, 89, 90, 91],
  },
  {
    label: 'Calidad (Score)',
    value: '94',
    trend: '-1',
    status: 'neutral',
    sub: 'Promedio global',
    history: [96, 95, 95, 94, 93, 94, 94],
  },
  {
    label: 'Críticos > 48h',
    value: '8',
    trend: '-2',
    status: 'positive',
    sub: 'SLA en riesgo',
    history: [12, 10, 8, 9, 11, 9, 8],
  },
]

// Demo data (solo vista): se filtra por code de location.
const MOCK_MAINTENANCE_DASHBOARD: MaintenanceItem[] = [
  {
    id: 'MT-001',
    locationCode: 'CUN',
    asset: 'Chiller Principal #2',
    area: 'Cuarto Máquinas',
    type: 'Correctivo',
    priority: 'Alta',
    status: 'Atrasado',
    aging: 3,
    assigned: 'Ing. R. Méndez',
  },
  {
    id: 'MT-002',
    locationCode: 'CDMX',
    asset: 'Servidor Principal',
    area: 'Site IT',
    type: 'Preventivo',
    priority: 'Media',
    status: 'Pendiente',
    aging: 0,
    assigned: 'J. Pérez',
  },
  {
    id: 'MT-003',
    locationCode: 'PVR',
    asset: 'Fuga Lavabo 504',
    area: 'Habitaciones',
    type: 'Correctivo',
    priority: 'Baja',
    status: 'En Proceso',
    aging: 1,
    assigned: 'M. López',
  },
  {
    id: 'MT-004',
    locationCode: 'MTY',
    asset: 'Elevador Servicio',
    area: 'General',
    type: 'Preventivo',
    priority: 'Alta',
    status: 'Completado',
    aging: 0,
    assigned: 'KONE Ext.',
  },
  {
    id: 'MT-005',
    locationCode: 'SJD',
    asset: 'Bomba Piscina',
    area: 'Albercas',
    type: 'Correctivo',
    priority: 'Crítica',
    status: 'Atrasado',
    aging: 5,
    assigned: 'Ing. J. Soto',
  },
]

const MOCK_INSPECTIONS_DASHBOARD: InspectionItem[] = [
  { id: 1, locationCode: 'CUN', area: 'Cocina Fría', score: 98, status: 'Aprobado', inspector: 'Chef Corp.' },
  { id: 2, locationCode: 'CDMX', area: 'Habitación VIP', score: 85, status: 'Observaciones', inspector: 'Auditoría' },
  { id: 3, locationCode: 'PVR', area: 'Alberca Ppal', score: 65, status: 'Crítico', inspector: 'Gerente Reg.' },
  { id: 4, locationCode: 'SJD', area: 'Lobby Bar', score: 92, status: 'Aprobado', inspector: 'Gerente Gral.' },
]

const MOCK_ANNUAL_PLAN: AnnualPlanItem[] = [
  {
    id: 'AP-001',
    title: 'Renovación Carpetas Habitaciones',
    code: 'MIGS',
    quarter: 'Q1 2026',
    dueLabel: '31 Mar',
    budgetLabel: '$45K',
    status: 'En Progreso',
    progress: 75,
    daysInProgress: 15,
  },
  {
    id: 'AP-002',
    title: 'Cambio Sistema HVAC Lobby',
    code: 'EAPTO',
    quarter: 'Q1 2026',
    dueLabel: '15 Feb',
    budgetLabel: '$85K',
    status: 'Atrasado',
    progress: 30,
    daysInProgress: 45,
  },
  {
    id: 'AP-003',
    title: 'Impermeabilización Azotea',
    code: 'MSLP',
    quarter: 'Q2 2026',
    dueLabel: '30 Jun',
    budgetLabel: '$120K',
    status: 'Iniciando',
    progress: 10,
    daysInProgress: 0,
  },
  {
    id: 'AP-004',
    title: 'Renovación Mobiliario Restaurante',
    code: 'EGDLS',
    quarter: 'Q1 2026',
    dueLabel: '28 Feb',
    budgetLabel: '$65K',
    status: 'Finalizando',
    progress: 90,
    daysInProgress: 5,
  },
  {
    id: 'AP-005',
    title: 'Upgrade Sistema PMS',
    code: 'FMTY',
    quarter: 'Q1 2026',
    dueLabel: '31 Mar',
    budgetLabel: '$35K',
    status: 'En Progreso',
    progress: 50,
    daysInProgress: 30,
  },
]

function AreaSparkline({ data, status }: { data: number[]; status: StatStatus }) {
  const gradientId = useId()
  if (!data || data.length < 2) return null

  const width = 100
  const height = 40
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const points = data
    .map((d, i) => `${(i / (data.length - 1)) * width},${height - ((d - min) / range) * height}`)
    .join(' ')

  const colorClass =
    status === 'positive' ? 'text-emerald-500' : status === 'negative' ? 'text-rose-500' : 'text-slate-400'

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" className={colorClass} />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" className={colorClass} />
        </linearGradient>
      </defs>
      <polyline fill={`url(#${gradientId})`} stroke="none" points={`${points} ${width},${height} 0,${height}`} />
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        className={colorClass}
      />
    </svg>
  )
}

function StatCard({ stat }: { stat: Stat }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-slate-100 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-slate-50 to-indigo-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-slate-500 text-sm font-semibold tracking-wide uppercase">{stat.label}</h3>
          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
              stat.status === 'positive'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                : stat.status === 'negative'
                  ? 'bg-rose-50 text-rose-700 border border-rose-100'
                  : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            {stat.status === 'positive' ? <TrendingUp size={12} /> : null}
            {stat.trend}
          </div>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <span className="text-3xl font-bold text-slate-900 tracking-tight">{stat.value}</span>
            <p className="text-xs text-slate-500 mt-1 font-medium">{stat.sub}</p>
          </div>
          <div className="w-24 h-10 -mb-1">
            <AreaSparkline data={stat.history} status={stat.status} />
          </div>
        </div>
      </div>
    </div>
  )
}

function ModernBadge({ children }: { children: string }) {
  const styles: Record<string, string> = {
    Alta: 'bg-rose-50 text-rose-700 border border-rose-100',
    'Crítica': 'bg-rose-600 text-white',
    Media: 'bg-amber-50 text-amber-700 border border-amber-100',
    Baja: 'bg-slate-50 text-slate-700 border border-slate-200',
    Atrasado: 'bg-rose-50 text-rose-700 font-bold border border-rose-100',
    Pendiente: 'bg-slate-100 text-slate-600 border border-slate-200',
    'En Proceso': 'bg-indigo-50 text-indigo-700 border border-indigo-100',
    'En Curso': 'bg-blue-50 text-blue-700 border border-blue-100',
    'En Progreso': 'bg-blue-50 text-blue-700 border border-blue-100',
    Iniciando: 'bg-cyan-50 text-cyan-700 border border-cyan-100',
    Finalizando: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    Completado: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    Bloqueado: 'bg-slate-900 text-white',
    Aprobado: 'bg-teal-50 text-teal-700 border border-teal-100',
    Observaciones: 'bg-amber-50 text-amber-700 border border-amber-100',
    Crítico: 'bg-rose-50 text-rose-700 border border-rose-100',
    'Por Autorizar': 'bg-slate-100 text-slate-700 border border-slate-200',
  }

  return (
    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold tracking-wide inline-flex ${styles[children] || styles.Baja}`}>
      {children}
    </span>
  )
}

function PlanProgressBar({ status, progress }: { status: AnnualPlanItem['status']; progress: number }) {
  const barColor =
    status === 'Atrasado'
      ? 'bg-rose-500'
      : status === 'Iniciando'
        ? 'bg-cyan-500'
        : status === 'Finalizando'
          ? 'bg-emerald-500'
          : progress >= 50
            ? 'bg-emerald-500'
            : 'bg-amber-500'

  return (
    <div className="mt-2">
      <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
        <div className={`h-full ${barColor} rounded-full`} style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
      </div>
    </div>
  )
}

function DashboardHome({
  selectedLocationId,
  selectedLocation,
  locations,
  locationsByCode,
}: {
  selectedLocationId: string
  selectedLocation: LocationOption | null
  locations: LocationOption[]
  locationsByCode: Map<string, LocationOption>
}) {
  const selectedCode = selectedLocation?.code

  const normalizedMaintenance = useMemo(() => {
    const availableCodes = locations.map((l) => l.code).filter(Boolean)
    if (availableCodes.length === 0) return MOCK_MAINTENANCE_DASHBOARD

    return MOCK_MAINTENANCE_DASHBOARD.map((item, idx) => {
      if (availableCodes.includes(item.locationCode)) return item
      return { ...item, locationCode: availableCodes[idx % availableCodes.length] }
    })
  }, [locations])

  const normalizedInspections = useMemo(() => {
    const availableCodes = locations.map((l) => l.code).filter(Boolean)
    if (availableCodes.length === 0) return MOCK_INSPECTIONS_DASHBOARD

    return MOCK_INSPECTIONS_DASHBOARD.map((insp, idx) => {
      if (availableCodes.includes(insp.locationCode)) return insp
      return { ...insp, locationCode: availableCodes[idx % availableCodes.length] }
    })
  }, [locations])

  const filteredMaintenance = useMemo(() => {
    if (selectedLocationId === 'all') return normalizedMaintenance
    if (!selectedCode) return []
    return normalizedMaintenance.filter((item) => item.locationCode === selectedCode)
  }, [selectedLocationId, selectedCode, normalizedMaintenance])

  const filteredInspections = useMemo(() => {
    if (selectedLocationId === 'all') return normalizedInspections
    if (!selectedCode) return []
    return normalizedInspections.filter((item) => item.locationCode === selectedCode)
  }, [selectedLocationId, selectedCode, normalizedInspections])

  const title =
    selectedLocationId === 'all'
      ? 'Visión Global Grupo'
      : selectedLocation?.name || 'Sede'

  const subtitle =
    selectedLocationId === 'all'
      ? 'Monitoreando sedes asignadas'
      : 'Detalle operativo de unidad'

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mb-1">{title}</h1>
          <p className="text-slate-600 font-medium">{subtitle} • Lunes, 12 de Enero 2026</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {MOCK_STATS.map((stat, idx) => (
          <StatCard key={idx} stat={stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6 md:mb-8 gap-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="p-2 bg-rose-100 text-rose-700 rounded-lg">
                  <AlertTriangle size={20} />
                </span>
                Riesgos Operativos
              </h3>
              <button className="text-indigo-700 text-sm font-bold hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
                Ver reporte completo
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                    <th className="pb-4 pl-2">Activo / Sede</th>
                    <th className="pb-4">Prioridad</th>
                    <th className="pb-4">Estado</th>
                    <th className="pb-4">Asignado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredMaintenance.length > 0 ? (
                    filteredMaintenance.map((item) => {
                      const loc = locationsByCode.get(item.locationCode)
                      const rowSub = selectedLocationId === 'all' ? loc?.name || item.locationCode : item.area

                      return (
                        <tr key={item.id} className="group hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 pl-2">
                            <div className="font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">{item.asset}</div>
                            <div className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                              {selectedLocationId === 'all' && <MapPin size={10} />} {rowSub}
                            </div>
                          </td>
                          <td className="py-4">
                            <ModernBadge>{item.priority}</ModernBadge>
                          </td>
                          <td className="py-4">
                            <div className={`text-sm font-bold ${item.aging > 2 ? 'text-rose-700' : 'text-slate-700'}`}>
                              {item.status} <span className="text-xs font-normal text-slate-400 ml-1">({item.aging}d)</span>
                            </div>
                          </td>
                          <td className="py-4">
                            <div className="flex -space-x-2 overflow-hidden">
                              <div className="inline-flex h-8 w-8 rounded-full ring-2 ring-white bg-indigo-100 items-center justify-center text-xs font-bold text-indigo-800">
                                {item.assigned.charAt(0)}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 text-sm">
                        No hay riesgos operativos en esta vista.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6 gap-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <DollarSign size={20} />
                </span>
                Rendimiento vs Presupuesto
              </h3>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button className="px-3 py-1 bg-white shadow-sm rounded-lg text-xs font-bold text-slate-800">Mensual</button>
                <button className="px-3 py-1 text-xs font-bold text-slate-600 hover:text-slate-800">Anual</button>
              </div>
            </div>

            <div className="h-56 w-full flex items-end justify-between gap-4 px-2">
              {[45, 70, 50, 85, 60, 95, 75, 85, 65, 90].map((h, i) => (
                <div key={i} className="w-full flex flex-col gap-2 group">
                  <div className="w-full bg-slate-100 rounded-xl relative h-full overflow-hidden">
                    <div
                      className="absolute bottom-0 w-full bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-xl transition-all duration-500 group-hover:opacity-90"
                      style={{ height: `${h}%` }}
                    ></div>
                  </div>
                  <span className="text-[10px] text-center text-slate-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                    S{i + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
              <ClipboardCheck size={20} className="text-indigo-600" /> Auditorías Recientes
            </h3>
            <div className="space-y-4">
              {filteredInspections.length > 0 ? (
                filteredInspections.map((insp) => (
                  <div
                    key={insp.id}
                    className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm group-hover:text-indigo-700 transition-colors">{insp.area}</h4>
                      <p className="text-xs text-slate-500 font-medium">{locationsByCode.get(insp.locationCode)?.name || insp.locationCode}</p>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-extrabold ${insp.score < 80 ? 'text-rose-600' : 'text-emerald-600'}`}>{insp.score}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-slate-400 text-sm">Sin auditorías recientes.</div>
              )}
            </div>
            <button className="w-full mt-6 py-3 text-sm text-indigo-700 font-bold bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors">
              Nueva Inspección
            </button>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between gap-4 mb-5">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <CalendarDays size={20} className="text-indigo-600" /> Plan Anual - Compromisos
              </h3>
            </div>

            <div className="space-y-4">
              {MOCK_ANNUAL_PLAN.map((item) => (
                <div key={item.id} className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{item.title}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 font-semibold">
                        <span className="text-indigo-600">{item.code}</span>
                        <span className="text-slate-400">•</span>
                        <span>{item.quarter}</span>
                        <span className="text-slate-400">•</span>
                        <span className="inline-flex items-center gap-1 text-slate-700">
                          <CalendarDays size={12} className="text-slate-400" /> {item.dueLabel}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <DollarSign size={12} className="text-emerald-500" /> {item.budgetLabel}
                        </span>
                      </div>
                    </div>

                    <ModernBadge>{item.status}</ModernBadge>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-semibold">Progreso</span>
                      <span className="text-slate-700 font-bold">{item.progress}%</span>
                    </div>
                    <PlanProgressBar status={item.status} progress={item.progress} />
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-amber-700">
                    <AlertTriangle size={14} className="text-amber-500" />
                    <span>{item.daysInProgress} días en curso</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="w-full mt-6 py-3 text-sm font-bold text-indigo-700 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors"
            >
              Ver Plan Anual Completo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MantenimientoClient({
  locations,
  canViewAll,
}: {
  locations: LocationOption[]
  canViewAll: boolean
}) {
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all')

  const selectedLocation = useMemo(() => {
    if (selectedLocationId === 'all') return null
    return locations.find((l) => l.id === selectedLocationId) || null
  }, [locations, selectedLocationId])

  const locationsByCode = useMemo(() => {
    const map = new Map<string, LocationOption>()
    locations.forEach((l) => map.set(l.code, l))
    return map
  }, [locations])

  const allLabel = canViewAll ? 'Todas las sedes' : 'Todas mis sedes'

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-50 p-2 rounded-xl border border-indigo-100">
              <Globe size={18} className="text-indigo-700" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Sede</div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm font-bold text-slate-800 cursor-pointer"
                  aria-label="Seleccionar sede"
                >
                  <option value="all">{allLabel}</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
              <Search size={18} className="text-slate-400" />
              <input
                type="text"
                placeholder="Buscar…"
                className="bg-transparent border-none outline-none text-sm text-slate-700 w-full font-medium"
              />
            </div>

            <button className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold rounded-2xl hover:shadow-lg transition-all">
              <Plus size={18} className="inline-block -mt-0.5" /> Reporte Rápido
            </button>
          </div>
        </div>
      </div>

      <DashboardHome
        selectedLocationId={selectedLocationId}
        selectedLocation={selectedLocation}
        locations={locations}
        locationsByCode={locationsByCode}
      />

      {locations.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 text-sm text-slate-600">
          No hay sedes disponibles para tu usuario.
        </div>
      )}
    </div>
  )
}
