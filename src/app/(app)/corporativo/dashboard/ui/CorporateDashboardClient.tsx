'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { CorporateStatsService, CorporateStats } from '@/lib/services/corporate-stats.service'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Check,
  X,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  MapPin,
  User,
  Calendar
} from 'lucide-react'

// Tipo para hub_visible_modules
type HubVisibleModules = {
  'it-helpdesk'?: boolean
  'mantenimiento'?: boolean
  'inspecciones-rrhh'?: boolean
  'academia'?: boolean
  'beo'?: boolean
  'ama-de-llaves'?: boolean
  [key: string]: boolean | undefined
}

interface CorporateDashboardClientProps {
  hubModules: HubVisibleModules | null // null = admin con acceso total
  isAdmin: boolean
}

// Iconos SVG inline
const Icons = {
  Building: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  Users: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  ClipboardCheck: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  Star: () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const safe = (data?.length ? data : [0]).slice(-12)
  const max = Math.max(...safe)
  const min = Math.min(...safe)

  const points = safe
    .map((d, i) => {
      const x = safe.length === 1 ? 0 : (i / (safe.length - 1)) * 100
      const y = 100 - ((d - min) / (max - min || 1)) * 100
      return `${x},${y}`
    })
    .join(' ')

  // Animación simple de “dibujo”
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={points}
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 220,
          strokeDashoffset: 220,
          animation: 'sparkDraw 900ms ease-out forwards'
        }}
      />
    </svg>
  )
}

function TrendBadge({ delta }: { delta: number }) {
  if (!delta) {
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-600 tabular-nums">0</span>
    )
  }

  const up = delta > 0
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded tabular-nums transition-colors
        ${up ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}
      title="Cambio vs última actualización"
    >
      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {up ? `+${delta}` : `${delta}`}
    </span>
  )
}

type PieSegment = {
  key: string
  label: string
  value: number
  color: string
}

function DonutChart({ segments, total }: { segments: PieSegment[]; total: number }) {
  const [hovered, setHovered] = useState<string | null>(null)
  const size = 140
  const cx = size / 2
  const cy = size / 2
  const rOuter = 56
  const rInner = 34

  const polar = (angleRad: number, radius: number) => ({
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad)
  })

  const arcPath = (start: number, end: number) => {
    const largeArc = end - start > Math.PI ? 1 : 0
    const p1 = polar(start, rOuter)
    const p2 = polar(end, rOuter)
    const p3 = polar(end, rInner)
    const p4 = polar(start, rInner)

    return [
      `M ${p1.x} ${p1.y}`,
      `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${p2.x} ${p2.y}`,
      `L ${p3.x} ${p3.y}`,
      `A ${rInner} ${rInner} 0 ${largeArc} 0 ${p4.x} ${p4.y}`,
      'Z'
    ].join(' ')
  }

  const visible = segments.filter(s => s.value > 0)
  let cursor = -Math.PI / 2

  const hoveredSeg = hovered ? segments.find(s => s.key === hovered) : null
  const centerLabel = hoveredSeg
    ? { top: hoveredSeg.label, bottom: `${Math.round((hoveredSeg.value / (total || 1)) * 100)}%` }
    : { top: 'Total', bottom: `${total}` }

  return (
    <div className="relative">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-sm">
        <circle cx={cx} cy={cy} r={rOuter} fill="#f3f4f6" />
        {visible.map(seg => {
          const angle = (seg.value / (total || 1)) * Math.PI * 2
          const start = cursor
          const end = cursor + angle
          cursor = end

          const mid = (start + end) / 2
          const isHover = hovered === seg.key
          const pop = isHover ? 5 : 0
          const tx = pop * Math.cos(mid)
          const ty = pop * Math.sin(mid)

          return (
            <path
              key={seg.key}
              d={arcPath(start, end)}
              fill={seg.color}
              onMouseEnter={() => setHovered(seg.key)}
              onMouseLeave={() => setHovered(null)}
              style={{
                transform: `translate(${tx}px, ${ty}px)`,
                transformOrigin: 'center',
                transition: 'transform 200ms ease, opacity 200ms ease',
                opacity: hovered && !isHover ? 0.55 : 1
              }}
            />
          )
        })}
        <circle cx={cx} cy={cy} r={rInner} fill="white" />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">{centerLabel.top}</div>
        <div className="text-xl font-bold text-gray-900 tabular-nums">{centerLabel.bottom}</div>
      </div>
    </div>
  )
}

// Componente de KPI compacto
function KPICard({ 
  title, 
  value, 
  trend, 
  icon,
  color = 'blue',
  data = []
}: { 
  title: string
  value: string | number
  trend?: { value: number; direction: 'up' | 'down' }
  icon?: React.ReactNode
  color?: 'blue' | 'green' | 'amber' | 'purple' | 'red'
  data?: number[]
}) {
  const colorMap = {
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', accent: '#3b82f6', iconBg: 'bg-blue-500' },
    green: { bg: 'bg-emerald-50', border: 'border-emerald-200', accent: '#10b981', iconBg: 'bg-emerald-500' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', accent: '#f59e0b', iconBg: 'bg-amber-500' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', accent: '#8b5cf6', iconBg: 'bg-purple-500' },
    red: { bg: 'bg-red-50', border: 'border-red-200', accent: '#ef4444', iconBg: 'bg-red-500' },
  }
  const c = colorMap[color]

  return (
    <div className={`bg-white rounded-lg px-3 py-2.5 relative overflow-hidden group cursor-default transition-all duration-200 hover:shadow-md border border-gray-200`}>
      <div className="flex items-center gap-2.5">
        {icon && (
          <div className={`flex-shrink-0 p-1.5 ${c.iconBg} rounded text-white`}>
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider leading-none">{title}</div>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-xl font-bold text-gray-900 tabular-nums leading-tight">{value}</span>
            {trend && (
              <span className={`inline-flex items-center text-[9px] font-bold tabular-nums
                ${trend.direction === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
                {trend.direction === 'up' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                {trend.value}%
              </span>
            )}
          </div>
        </div>
        {data.length > 0 && (
          <div className="w-14 h-8 opacity-30 flex-shrink-0">
            <MiniSparkline data={data} color={c.accent} />
          </div>
        )}
      </div>
    </div>
  )
}

// Componente de Score Circle
function ScoreCircle({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
  const getColor = (s: number) => {
    if (s >= 90) return { bg: 'bg-emerald-100', text: 'text-emerald-700', stroke: '#10b981' }
    if (s >= 70) return { bg: 'bg-amber-100', text: 'text-amber-700', stroke: '#f59e0b' }
    return { bg: 'bg-red-100', text: 'text-red-700', stroke: '#ef4444' }
  }

  const colors = getColor(score)
  const sizeClasses = {
    sm: { container: 'w-10 h-10', text: 'text-xs' },
    md: { container: 'w-16 h-16', text: 'text-lg' },
    lg: { container: 'w-24 h-24', text: 'text-2xl' }
  }

  const radius = size === 'sm' ? 16 : size === 'md' ? 28 : 44
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference

  return (
    <div className={`relative ${sizeClasses[size].container}`}>
      <svg className="w-full h-full -rotate-90" viewBox={size === 'sm' ? '0 0 40 40' : size === 'md' ? '0 0 64 64' : '0 0 96 96'}>
        <circle
          cx={size === 'sm' ? 20 : size === 'md' ? 32 : 48}
          cy={size === 'sm' ? 20 : size === 'md' ? 32 : 48}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={size === 'sm' ? 3 : 4}
        />
        <circle
          cx={size === 'sm' ? 20 : size === 'md' ? 32 : 48}
          cy={size === 'sm' ? 20 : size === 'md' ? 32 : 48}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={size === 'sm' ? 3 : 4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-700"
        />
      </svg>
      <div className={`absolute inset-0 flex items-center justify-center font-bold ${sizeClasses[size].text} ${colors.text}`}>
        {score}%
      </div>
    </div>
  )
}

export default function CorporateDashboardClient({ hubModules, isAdmin }: CorporateDashboardClientProps) {
  const [stats, setStats] = useState<CorporateStats | null>(null)
  const [pendingReviews, setPendingReviews] = useState<any[]>([])
  const [itStats, setItStats] = useState<any>(null)
  const [maintenanceStats, setMaintenanceStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [expandedAreaIndex, setExpandedAreaIndex] = useState<number | null>(null)

  const [inspectionTrends, setInspectionTrends] = useState<Record<string, number>>({})
  const [inspectionHistory, setInspectionHistory] = useState<Record<string, number[]>>({})
  const prevInspectionsRef = useRef<Record<string, number> | null>(null)

  // Helper para verificar si un módulo está visible
  // Si hubModules es null (admin), todos los módulos están visibles
  // Si hubModules existe pero el módulo no está definido o es true, está visible 
  // Solo se oculta si está explícitamente en false
  const isModuleVisible = (moduleKey: string): boolean => {
    if (isAdmin || hubModules === null) return true
    if (!hubModules) return true
    // Si el módulo está explícitamente en false, no está visible
    // Si no está definido o es true, está visible
    return hubModules[moduleKey] !== false
  }

  // Verificar permisos de cada sección
  const showIT = isModuleVisible('it-helpdesk')
  const showMaintenance = isModuleVisible('mantenimiento')
  const showInspections = isModuleVisible('inspecciones-rrhh')
  const showAcademia = isModuleVisible('academia')

  // Calcular cuántas columnas mostrar en el grid principal
  const visibleModulesCount = [showIT, showMaintenance, showInspections].filter(Boolean).length

  const normalizeStatus = (status: unknown) => {
    if (typeof status !== 'string') return ''
    return status.trim().toLowerCase().replace(/\s+/g, '_')
  }

  const isClosedStatus = (normalizedStatus: string) => {
    if (!normalizedStatus) return false
    return (
      normalizedStatus === 'closed' ||
      normalizedStatus === 'done' ||
      normalizedStatus === 'resolved' ||
      normalizedStatus === 'completed' ||
      normalizedStatus === 'finalizado' ||
      normalizedStatus === 'finalizada' ||
      normalizedStatus === 'completado' ||
      normalizedStatus === 'completada' ||
      normalizedStatus === 'cerrado' ||
      normalizedStatus === 'cerrada' ||
      normalizedStatus.includes('close') ||
      normalizedStatus.includes('cerrad') ||
      normalizedStatus.includes('resuelt') ||
      normalizedStatus.includes('finaliz') ||
      normalizedStatus.includes('complet') ||
      normalizedStatus.includes('cancel') ||
      normalizedStatus.includes('anulad')
    )
  }

  const isEscalatedStatus = (normalizedStatus: string) => {
    if (!normalizedStatus) return false
    return (
      normalizedStatus.includes('escal') ||
      normalizedStatus.includes('deriv') ||
      normalizedStatus.includes('l2') ||
      normalizedStatus.includes('nivel2') ||
      normalizedStatus.includes('nivel_2')
    )
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (!stats) return

    setLoaded(true)

    const currentRaw = stats.inspectionsByStatus || {}
    const current: Record<string, number> = {}
    Object.entries(currentRaw).forEach(([k, v]) => {
      const nk = normalizeStatus(k)
      const nv = typeof v === 'number' ? v : Number(v) || 0
      current[nk] = (current[nk] || 0) + nv
    })

    const prev = prevInspectionsRef.current || {}
    const deltas: Record<string, number> = {}
    Object.entries(current).forEach(([k, v]) => {
      deltas[k] = v - (prev[k] || 0)
    })
    setInspectionTrends(deltas)

    setInspectionHistory(prevHistory => {
      const next: Record<string, number[]> = { ...prevHistory }
      Object.entries(current).forEach(([k, v]) => {
        const arr = (next[k] ? [...next[k]] : [])
        arr.push(v)
        next[k] = arr.slice(-12)
      })
      return next
    })

    prevInspectionsRef.current = current
  }, [stats])

  const loadData = async () => {
    try {
      // Solo cargar estadísticas de inspecciones si el módulo está visible
      if (showInspections) {
        const { data, error } = await CorporateStatsService.getFullStats()
        if (error) throw error
        setStats(data)

        const { data: pending } = await CorporateStatsService.getPendingReviews()
        setPendingReviews(pending || [])
      }

      // Solo cargar IT si está visible
      if (showIT) {
        await loadITStats()
      }
      
      // Solo cargar mantenimiento si está visible
      if (showMaintenance) {
        await loadMaintenanceStats()
      }
    } catch (error) {
      console.error('Error al cargar datos:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadITStats = async () => {
    try {
      const supabase = createSupabaseBrowserClient()

      const { data: allTickets } = await supabase
        .from('tickets')
        .select('id, status, service_area')
        .or('service_area.eq.it,service_area.is.null')

      const total = allTickets?.length || 0

      let closed = 0
      let escalated = 0
      allTickets?.forEach(t => {
        const s = normalizeStatus(t?.status)
        if (isClosedStatus(s)) closed += 1
        if (isEscalatedStatus(s)) escalated += 1
      })

      // Abiertos = activos (todo lo que no está cerrado/resuelto/cancelado)
      const open = Math.max(total - closed, 0)

      setItStats({ open, closed, escalated, total })
    } catch (error) {
      console.error('Error loading IT stats:', error)
    }
  }

  const loadMaintenanceStats = async () => {
    try {
      const supabase = createSupabaseBrowserClient()

      const { data: allTickets } = await supabase
        .from('tickets_maintenance')
        .select('id, status')

      const total = allTickets?.length || 0

      let closed = 0
      let escalated = 0
      allTickets?.forEach(t => {
        const s = normalizeStatus(t?.status)
        if (isClosedStatus(s)) closed += 1
        if (isEscalatedStatus(s)) escalated += 1
      })

      const open = Math.max(total - closed, 0)

      setMaintenanceStats({ open, closed, escalated, total })
    } catch (error) {
      console.error('Error loading maintenance stats:', error)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      await CorporateStatsService.approveInspection(id)
      loadData()
    } catch (error) {
      console.error('Error al aprobar:', error)
    }
  }

  const handleReject = async (id: string) => {
    try {
      await CorporateStatsService.rejectInspection(id)
      loadData()
    } catch (error) {
      console.error('Error al rechazar:', error)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await loadData()
    } finally {
      setTimeout(() => {
        setRefreshing(false)
      }, 500)
    }
  }

  // Generar datos para sparklines
  const generateSparklineData = (value: number) => {
    return Array.from({ length: 7 }, (_, i) => Math.floor(value * (0.7 + (i * 0.3 / 6))))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Cargando dashboard corporativo...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 bg-gray-50">
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes sparkDraw {
          from { stroke-dashoffset: 220; }
          to { stroke-dashoffset: 0; }
        }
        .animate-enter {
          animation: slideIn 0.3s ease-out forwards;
        }
      `}</style>

      {/* Header compacto */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Panel de Control Corporativo</h2>
          <p className="text-xs text-gray-500">
            {isAdmin 
              ? 'Visión ejecutiva del cumplimiento organizacional' 
              : `Vista departamental: ${[
                  showIT && 'IT',
                  showMaintenance && 'Mantenimiento', 
                  showInspections && 'Inspecciones'
                ].filter(Boolean).join(', ') || 'Sin módulos asignados'}`
            }
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 text-xs"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          <span className="font-medium text-gray-700">Actualizar</span>
        </button>
      </div>

      {/* KPIs - Strip compacto - mostrar según módulos visibles */}
      {(stats || itStats || maintenanceStats) && (
        <div className={`grid grid-cols-2 ${
          visibleModulesCount <= 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-4'
        } gap-2 animate-enter`}>
          {/* Sedes - solo si hay datos de inspecciones */}
          {showInspections && stats && (
            <KPICard
              title="SEDES"
              value={stats.totalLocations}
              trend={{ value: 8, direction: 'up' }}
              color="blue"
              icon={<Icons.Building />}
              data={generateSparklineData(stats.totalLocations)}
            />
          )}
          
          {/* Cumplimiento - solo si inspecciones visible */}
          {showInspections && stats && (
            <KPICard
              title="CUMPLIMIENTO"
              value={`${stats.avgComplianceScore}%`}
              trend={{ value: 4, direction: 'up' }}
              color="green"
              icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              data={stats.complianceTrend.slice(-7).map(t => t.score)}
            />
          )}
          
          {/* Tickets IT - solo si IT visible */}
          {showIT && itStats && (
            <KPICard
              title="TICKETS IT"
              value={itStats.total}
              trend={{ value: itStats.total > 0 ? Math.round((itStats.open / itStats.total) * 100) : 0, direction: itStats.open > itStats.closed ? 'up' : 'down' }}
              color="blue"
              icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
              data={generateSparklineData(itStats.total)}
            />
          )}
          
          {/* Tickets Mantenimiento - solo si visible */}
          {showMaintenance && maintenanceStats && (
            <KPICard
              title="TICKETS MANT."
              value={maintenanceStats.total}
              trend={{ value: maintenanceStats.total > 0 ? Math.round((maintenanceStats.open / maintenanceStats.total) * 100) : 0, direction: maintenanceStats.open > maintenanceStats.closed ? 'up' : 'down' }}
              color="amber"
              icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
              data={generateSparklineData(maintenanceStats.total)}
            />
          )}
          
          {/* Inspecciones - solo si visible */}
          {showInspections && stats && (
            <KPICard
              title="INSPECCIONES"
              value={stats.totalInspections}
              trend={{ value: 15, direction: 'up' }}
              color="purple"
              icon={<Icons.ClipboardCheck />}
              data={generateSparklineData(stats.totalInspections)}
            />
          )}
          
          {/* Usuarios - solo para admin */}
          {isAdmin && stats && (
            <KPICard
              title="USUARIOS"
              value={stats.totalUsers}
              trend={{ value: 12, direction: 'up' }}
              color="purple"
              icon={<Icons.Users />}
              data={generateSparklineData(stats.totalUsers)}
            />
          )}
        </div>
      )}

      {/* Grid columnas: IT | Mantenimiento | Inspecciones - solo secciones visibles */}
      {visibleModulesCount > 0 && (
        <div className={`grid grid-cols-1 ${
          visibleModulesCount === 1 ? 'lg:grid-cols-1' :
          visibleModulesCount === 2 ? 'lg:grid-cols-2' :
          'lg:grid-cols-3'
        } gap-2 animate-enter`} style={{ animationDelay: '0.1s' }}>
        
        {/* IT Helpdesk - Solo si visible */}
        {showIT && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100 flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <div className="p-1 bg-blue-500 rounded">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">IT Helpdesk</span>
            </div>
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 text-[9px] font-semibold">VER →</Link>
          </div>
          {itStats ? (
            <div className="p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-500 font-medium">Abiertos</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-blue-600 tabular-nums">{itStats.open}</span>
                  <span className="text-[9px] text-gray-400">({itStats.total > 0 ? Math.round((itStats.open / itStats.total) * 100) : 0}%)</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-500 font-medium">Cerrados</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-emerald-600 tabular-nums">{itStats.closed}</span>
                  <span className="text-[9px] text-gray-400">({itStats.total > 0 ? Math.round((itStats.closed / itStats.total) * 100) : 0}%)</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-500 font-medium">Escalados</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-red-600 tabular-nums">{itStats.escalated}</span>
                  <span className="text-[9px] text-gray-400">({itStats.total > 0 ? Math.round((itStats.escalated / itStats.total) * 100) : 0}%)</span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-gray-100">
                <span className="text-[10px] text-gray-700 font-bold">Total</span>
                <span className="text-sm font-bold text-gray-900 tabular-nums">{itStats.total}</span>
              </div>
              {/* Barra de proporción */}
              <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-100 mt-1">
                {itStats.total > 0 && (
                  <>
                    <div className="bg-blue-500 transition-all" style={{ width: `${(itStats.open / itStats.total) * 100}%` }} />
                    <div className="bg-emerald-500 transition-all" style={{ width: `${(itStats.closed / itStats.total) * 100}%` }} />
                    <div className="bg-red-500 transition-all" style={{ width: `${(itStats.escalated / itStats.total) * 100}%` }} />
                  </>
                )}
              </div>
              <div className="flex gap-2 text-[8px] text-gray-400 mt-0.5">
                <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />Abiertos</span>
                <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Cerrados</span>
                <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />Escalados</span>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center text-gray-400 text-xs">Cargando...</div>
          )}
        </div>
        )}

        {/* Mantenimiento - Solo si visible */}
        {showMaintenance && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100 flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <div className="p-1 bg-amber-500 rounded">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Mantenimiento</span>
            </div>
            <Link href="/mantenimiento/dashboard" className="text-amber-600 hover:text-amber-700 text-[9px] font-semibold">VER →</Link>
          </div>
          {maintenanceStats ? (
            <div className="p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-500 font-medium">Abiertos</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-amber-600 tabular-nums">{maintenanceStats.open}</span>
                  <span className="text-[9px] text-gray-400">({maintenanceStats.total > 0 ? Math.round((maintenanceStats.open / maintenanceStats.total) * 100) : 0}%)</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-500 font-medium">Cerrados</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-emerald-600 tabular-nums">{maintenanceStats.closed}</span>
                  <span className="text-[9px] text-gray-400">({maintenanceStats.total > 0 ? Math.round((maintenanceStats.closed / maintenanceStats.total) * 100) : 0}%)</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-500 font-medium">Escalados</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-red-600 tabular-nums">{maintenanceStats.escalated}</span>
                  <span className="text-[9px] text-gray-400">({maintenanceStats.total > 0 ? Math.round((maintenanceStats.escalated / maintenanceStats.total) * 100) : 0}%)</span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-gray-100">
                <span className="text-[10px] text-gray-700 font-bold">Total</span>
                <span className="text-sm font-bold text-gray-900 tabular-nums">{maintenanceStats.total}</span>
              </div>
              <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-100 mt-1">
                {maintenanceStats.total > 0 && (
                  <>
                    <div className="bg-amber-500 transition-all" style={{ width: `${(maintenanceStats.open / maintenanceStats.total) * 100}%` }} />
                    <div className="bg-emerald-500 transition-all" style={{ width: `${(maintenanceStats.closed / maintenanceStats.total) * 100}%` }} />
                    <div className="bg-red-500 transition-all" style={{ width: `${(maintenanceStats.escalated / maintenanceStats.total) * 100}%` }} />
                  </>
                )}
              </div>
              <div className="flex gap-2 text-[8px] text-gray-400 mt-0.5">
                <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />Abiertos</span>
                <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Cerrados</span>
                <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />Escalados</span>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center text-gray-400 text-xs">Cargando...</div>
          )}
        </div>
        )}

        {/* Inspecciones - Solo si visible */}
        {showInspections && stats && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-100 flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <div className="p-1 bg-indigo-500 rounded">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Inspecciones</span>
              </div>
              <Link href="/corporativo/inspecciones" className="text-indigo-600 hover:text-indigo-700 text-[9px] font-semibold">VER →</Link>
            </div>

            {(() => {
              const raw = stats.inspectionsByStatus || {}
              const aggregated: Record<string, number> = {}
              Object.entries(raw).forEach(([k, v]) => {
                const nk = normalizeStatus(k)
                const nv = typeof v === 'number' ? v : Number(v) || 0
                aggregated[nk] = (aggregated[nk] || 0) + nv
              })
              const total = Object.values(aggregated).reduce((a, b) => a + b, 0)

              const statusMeta: Record<string, { label: string; color: string }> = {
                completed: { label: 'Completadas', color: '#f59e0b' },
                approved: { label: 'Aprobadas', color: '#10b981' },
                rejected: { label: 'Rechazadas', color: '#ef4444' },
                pending: { label: 'Pendientes', color: '#3b82f6' },
                in_review: { label: 'En Revisión', color: '#6366f1' },
                draft: { label: 'Borrador', color: '#94a3b8' }
              }
              const keys = Object.keys(aggregated).sort((a, b) => (aggregated[b] || 0) - (aggregated[a] || 0))

              return (
                <div className="p-3 space-y-1.5">
                  {keys.length > 0 ? (
                    <>
                      {keys.map(k => {
                        const count = aggregated[k] || 0
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0
                        const meta = statusMeta[k] || { label: k, color: '#64748b' }
                        const delta = inspectionTrends[k] || 0
                        return (
                          <div key={k} className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: meta.color }} />
                              <span className="text-[10px] text-gray-600 font-medium">{meta.label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: meta.color }} />
                              </div>
                              <span className="text-sm font-bold tabular-nums w-6 text-right" style={{ color: meta.color }}>{count}</span>
                              {delta !== 0 && (
                                <span className={`text-[8px] font-bold ${delta > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {delta > 0 ? '+' : ''}{delta}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                      <div className="flex items-center justify-between pt-1.5 border-t border-gray-100">
                        <span className="text-[10px] text-gray-700 font-bold">Total</span>
                        <span className="text-sm font-bold text-gray-900 tabular-nums">{total}</span>
                      </div>
                    </>
                  ) : (
                    <div className="py-4 text-center text-gray-400 text-xs">Sin datos</div>
                  )}
                </div>
              )
            })()}
          </div>
        )}
      </div>
      )}

      {/* Grid inferior: Ranking | Áreas Críticas | Pendientes - Solo si inspecciones visible */}
      {showInspections && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 animate-enter" style={{ animationDelay: '0.15s' }}>
          {/* Ranking de Sedes - Compacto */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-100 flex justify-between items-center">
              <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <div className="w-1 h-3 bg-amber-500 rounded-full"></div>
                Ranking Sedes
              </span>
              <span className="text-[9px] text-gray-400">Top 5</span>
            </div>
            <div className="p-2 space-y-0.5">
              {stats.locationRanking.slice(0, 5).map((location, index) => (
                <div key={location.location_id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 transition-colors">
                  <span className={`flex-shrink-0 w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center ${
                    index === 0 ? 'bg-amber-100 text-amber-700' :
                    index === 1 ? 'bg-gray-100 text-gray-600' :
                    index === 2 ? 'bg-orange-100 text-orange-600' :
                    'bg-gray-50 text-gray-400'
                  }`}>
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-gray-900 truncate">{location.property_name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <div className="flex-1 bg-gray-100 rounded-full h-1 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            location.avgScore >= 90 ? 'bg-emerald-500' :
                            location.avgScore >= 75 ? 'bg-amber-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${location.avgScore}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <span className={`text-[11px] font-bold tabular-nums ${
                    location.avgScore >= 90 ? 'text-emerald-600' :
                    location.avgScore >= 75 ? 'text-amber-600' :
                    'text-red-600'
                  }`}>{location.avgScore}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Áreas de Atención - Con detalle expandible */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-1.5">
              <AlertTriangle size={12} className="text-red-500" />
              <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Áreas de Atención</span>
              <span className="text-[8px] text-gray-400 ml-auto">Clic para ver detalle</span>
            </div>
            <div className="p-2">
              {stats.criticalAreas.length > 0 ? (
                <div className="space-y-1">
                  {stats.criticalAreas.map((area, index) => {
                    const isExpanded = expandedAreaIndex === index
                    return (
                      <div key={`${area.area_name}-${index}`}>
                        {/* Fila principal - clickeable */}
                        <button
                          onClick={() => setExpandedAreaIndex(isExpanded ? null : index)}
                          className={`w-full flex items-center justify-between px-2 py-1.5 rounded transition-colors ${
                            isExpanded ? 'bg-red-50 ring-1 ring-red-200' : 'hover:bg-red-50/50'
                          }`}
                        >
                          <div className="flex-1 min-w-0 text-left">
                            <p className="text-[11px] font-semibold text-gray-900 truncate">{area.area_name}</p>
                            <p className="text-[9px] text-gray-400">{area.inspectionCount} insp.</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-bold text-red-600 tabular-nums">
                              {area.avgScore}<span className="text-[9px] text-gray-400">/10</span>
                            </span>
                            {isExpanded ? (
                              <ChevronUp size={12} className="text-gray-400" />
                            ) : (
                              <ChevronDown size={12} className="text-gray-400" />
                            )}
                          </div>
                        </button>

                        {/* Panel expandido con detalles */}
                        {isExpanded && area.recentInspections && area.recentInspections.length > 0 && (
                          <div className="mt-1 ml-2 mr-1 p-2 bg-gray-50 border border-gray-200 rounded-md space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                            <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                              Inspecciones recientes con bajo puntaje
                            </p>
                            {area.recentInspections.map((insp, i) => (
                              <div
                                key={`${insp.inspection_id}-${i}`}
                                className="p-2 bg-white border border-gray-100 rounded-md hover:border-red-200 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold text-gray-900 truncate">
                                      {insp.property_code} - {insp.property_name}
                                    </p>
                                  </div>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                    insp.score >= 7 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                  }`}>
                                    {insp.score}<span className="text-[8px] font-normal text-gray-400">/10</span>
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] text-gray-500">
                                  <span className="inline-flex items-center gap-0.5">
                                    <MapPin size={9} className="text-gray-400" />
                                    {insp.department || 'Sin depto.'}
                                  </span>
                                  <span className="inline-flex items-center gap-0.5">
                                    <User size={9} className="text-gray-400" />
                                    {insp.inspector_name || 'Sin inspector'}
                                  </span>
                                  <span className="inline-flex items-center gap-0.5">
                                    <Calendar size={9} className="text-gray-400" />
                                    {insp.inspection_date
                                      ? new Date(insp.inspection_date).toLocaleDateString('es-MX', {
                                          day: '2-digit',
                                          month: 'short',
                                          year: '2-digit'
                                        })
                                      : '-'}
                                  </span>
                                </div>
                                <Link
                                  href={`/inspections/rrhh/${insp.inspection_id}`}
                                  className="mt-1.5 inline-flex items-center gap-1 text-[9px] font-medium text-blue-600 hover:text-blue-700 hover:underline"
                                >
                                  Ver inspección completa
                                  <ArrowUpRight size={10} />
                                </Link>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-4 text-center text-emerald-500 text-xs">
                  <Check size={16} className="mx-auto mb-1" />
                  Sin áreas críticas
                </div>
              )}
            </div>
          </div>

          {/* Pendientes de Revisión - Compacto */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-100 flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
                <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Pendientes</span>
              </div>
              <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[9px] font-bold rounded">{pendingReviews.length}</span>
            </div>
            <div className="p-2 max-h-48 overflow-y-auto">
              {pendingReviews.length > 0 ? (
                <div className="space-y-1">
                  {pendingReviews.map((review) => (
                    <div key={review.id} className="px-2 py-1.5 border border-gray-100 rounded hover:border-gray-200 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[11px] font-semibold text-gray-900 truncate flex-1">{review.property_name}</p>
                        <span className="text-[9px] font-bold text-amber-600 ml-2">{Math.round((review.average_score || 0) * 10)}/10</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] text-gray-400">
                          {review.inspection_date
                            ? new Date(review.inspection_date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
                            : '-'}
                        </span>
                        <div className="flex-1" />
                        <button onClick={() => handleApprove(review.id)} className="px-1.5 py-0.5 bg-emerald-500 text-white text-[8px] font-bold rounded hover:bg-emerald-600">
                          <Check size={10} />
                        </button>
                        <button onClick={() => handleReject(review.id)} className="px-1.5 py-0.5 bg-red-500 text-white text-[8px] font-bold rounded hover:bg-red-600">
                          <X size={10} />
                        </button>
                        <Link href={`/inspections/rrhh/${review.id}`} className="px-1.5 py-0.5 bg-gray-200 text-gray-600 text-[8px] font-bold rounded hover:bg-gray-300">
                          Ver
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-emerald-500 text-xs">
                  <Check size={16} className="mx-auto mb-1" />
                  Sin pendientes
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Accesos rápidos - Inline compacto - Solo mostrar accesos visibles */}
      <div className="flex flex-wrap items-center gap-2 animate-enter" style={{ animationDelay: '0.2s' }}>
        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Accesos:</span>
        
        {/* IT Dashboard */}
        {showIT && (
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all text-xs font-medium text-gray-700 hover:text-blue-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            IT Helpdesk
          </Link>
        )}
        
        {/* Mantenimiento Dashboard */}
        {showMaintenance && (
          <Link
            href="/mantenimiento/dashboard"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:border-amber-300 hover:bg-amber-50 transition-all text-xs font-medium text-gray-700 hover:text-amber-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Mantenimiento
          </Link>
        )}
        
        {/* Inspecciones */}
        {showInspections && (
          <Link
            href="/corporativo/inspecciones"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all text-xs font-medium text-gray-700 hover:text-indigo-700"
          >
            <Icons.ClipboardCheck />
            Inspecciones
          </Link>
        )}
        
        {/* Academia */}
        {showAcademia && (
          <Link
            href="/academia"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all text-xs font-medium text-gray-700 hover:text-purple-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
            Academia
          </Link>
        )}
        
        {/* Si no hay ningún módulo visible, mostrar mensaje */}
        {!showIT && !showMaintenance && !showInspections && !showAcademia && (
          <span className="text-xs text-gray-400 italic">No hay módulos asignados</span>
        )}
      </div>

      {/* Footer mínimo */}
      <div className="text-center text-[9px] text-gray-400 py-2">
        ZIII Dashboard Corporativo • {isAdmin ? 'Vista completa' : 'Vista departamental'}
      </div>
    </div>
  )
}
