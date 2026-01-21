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
  RefreshCw
} from 'lucide-react'

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

// Componente de KPI Card - Rediseñado con Sparkline
function KPICard({ 
  title, 
  value, 
  subtitle, 
  trend, 
  color = 'blue',
  data = []
}: { 
  title: string
  value: string | number
  subtitle?: string
  trend?: { value: number; direction: 'up' | 'down' }
  color?: 'blue' | 'green' | 'amber' | 'purple' | 'red'
  data?: number[]
}) {
  // Sparkline mini
  const Sparkline = ({ data, positive }: { data: number[], positive: boolean }) => {
    if (!data || data.length === 0) return null
    const max = Math.max(...data)
    const min = Math.min(...data)
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * 100
      const y = 100 - ((d - min) / (max - min || 1)) * 100
      return `${x},${y}`
    }).join(' ')

    return (
      <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id={`grad-kpi-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={positive ? '#10b981' : '#ef4444'} stopOpacity="0.15" />
            <stop offset="100%" stopColor={positive ? '#10b981' : '#ef4444'} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`M0,100 L0,${100 - ((data[0] - min) / (max - min || 1)) * 100} ${points.split(' ').map((p) => `L${p}`).join(' ')} L100,100 Z`}
          fill={`url(#grad-kpi-${color})`}
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        />
        <polyline
          fill="none"
          stroke={positive ? '#10b981' : '#ef4444'}
          strokeWidth="2"
          points={points}
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  return (
    <div className="bg-white rounded-xl p-5 relative overflow-hidden group cursor-default transition-all duration-300 hover:border-blue-300 hover:shadow-lg border border-gray-200">
      {/* Hover Glow Effect */}
      <div className={`absolute top-0 left-0 w-full h-[2px] transition-all duration-500 transform scale-x-0 group-hover:scale-x-100 ${trend?.direction === 'up' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>

      <div className="relative z-10 flex flex-col h-24 justify-between">
        {/* Header */}
        <div className="flex justify-between items-start">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-gray-700 transition-colors">{title}</span>
          
          {/* Trend Badge */}
          {trend && (
            <div className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded transition-all duration-300 
              ${trend.direction === 'up' ? 'text-emerald-600 bg-emerald-50 group-hover:bg-emerald-100' : 'text-red-600 bg-red-50 group-hover:bg-red-100'}`}>
              {trend.direction === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {trend.value}%
            </div>
          )}
        </div>

        {/* Value */}
        <div className="flex items-end justify-between mt-2">
          <span className="text-3xl font-bold text-gray-900 tracking-tighter group-hover:translate-x-1 transition-transform duration-300">
            {value}
          </span>
        </div>
        
        {/* Hidden Context - Revealed on Hover */}
        {subtitle && (
          <div className="h-0 group-hover:h-auto overflow-hidden opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out flex items-center justify-between mt-2 pt-2 border-t border-dashed border-gray-200/0 group-hover:border-gray-300">
            <span className="text-[10px] text-gray-500 font-medium">{subtitle}</span>
          </div>
        )}
      </div>

      {/* Sparkline Background */}
      {data.length > 0 && (
        <div className="absolute bottom-0 right-0 w-1/2 h-16 opacity-20 group-hover:opacity-40 transition-opacity duration-500 pointer-events-none">
          <Sparkline data={data} positive={trend?.direction === 'up' || false} />
        </div>
      )}
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

export default function CorporateDashboardClient() {
  const [stats, setStats] = useState<CorporateStats | null>(null)
  const [pendingReviews, setPendingReviews] = useState<any[]>([])
  const [itStats, setItStats] = useState<any>(null)
  const [maintenanceStats, setMaintenanceStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const [inspectionTrends, setInspectionTrends] = useState<Record<string, number>>({})
  const [inspectionHistory, setInspectionHistory] = useState<Record<string, number[]>>({})
  const prevInspectionsRef = useRef<Record<string, number> | null>(null)

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
      const { data, error } = await CorporateStatsService.getFullStats()
      if (error) throw error
      setStats(data)

      const { data: pending } = await CorporateStatsService.getPendingReviews()
      setPendingReviews(pending || [])

      await loadITStats()
      await loadMaintenanceStats()
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
    <div className="space-y-6 bg-gray-50">
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes sparkDraw {
          from { stroke-dashoffset: 220; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-enter {
          animation: slideIn 0.4s ease-out forwards;
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.5s ease-out;
          opacity: 0;
        }
      `}</style>

      {/* Header con última actualización */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Panel de Control Corporativo</h2>
          <p className="text-sm text-gray-600 mt-1">
            Visión ejecutiva del cumplimiento organizacional
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          <span className="text-sm font-medium text-gray-700">Actualizar</span>
        </button>
      </div>

      {/* KPIs Principales con animación de entrada */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-enter">
          <KPICard
            title="SEDES ACTIVAS"
            value={stats.totalLocations}
            subtitle="Ubicaciones monitoreadas"
            trend={{ value: 8, direction: 'up' }}
            color="blue"
            data={generateSparklineData(stats.totalLocations)}
          />
          <KPICard
            title="CUMPLIMIENTO GLOBAL"
            value={`${stats.avgComplianceScore}%`}
            subtitle="Promedio de todas las sedes"
            trend={{ value: 4, direction: 'up' }}
            color="green"
            data={stats.complianceTrend.slice(-7).map(t => t.score)}
          />
          <KPICard
            title="INSPECCIONES"
            value={stats.totalInspections}
            subtitle="Total de inspecciones realizadas"
            trend={{ value: 15, direction: 'up' }}
            color="amber"
            data={generateSparklineData(stats.totalInspections)}
          />
          <KPICard
            title="USUARIOS ACTIVOS"
            value={stats.totalUsers}
            subtitle="Personal registrado en el sistema"
            trend={{ value: 12, direction: 'up' }}
            color="purple"
            data={generateSparklineData(stats.totalUsers)}
          />
        </div>
      )}

      {/* Grid para Panel IT/Mantenimiento y Estado de Inspecciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-enter" style={{ animationDelay: '0.1s' }}>
        {/* Panel Integrado: IT Helpdesk & Mantenimiento - Tabla tipo inspecciones */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
            <h3 className="text-[11px] font-bold text-gray-700 flex items-center gap-2 uppercase tracking-wider">
              <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="3" strokeWidth={2} />
              </svg>
              OPERACIONES EN TIEMPO REAL
            </h3>
            <div className="flex items-center gap-2">
              <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 text-[10px] font-semibold transition-colors">VER IT →</Link>
              <span className="text-gray-300">|</span>
              <Link href="/mantenimiento/dashboard" className="text-amber-600 hover:text-amber-700 text-[10px] font-semibold transition-colors">VER MTTO →</Link>
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-mono uppercase border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3 font-semibold text-[10px]">Módulo</th>
                  <th className="px-5 py-3 font-semibold text-[10px] text-center">Métrica</th>
                  <th className="px-5 py-3 font-semibold text-[10px] text-center">Valor</th>
                  <th className="px-5 py-3 font-semibold text-[10px] text-right">Tendencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {/* IT Helpdesk */}
                {itStats ? (
                  <>
                    <tr className="hover:bg-blue-50/30 transition-colors group cursor-pointer">
                      <td className="px-5 py-3" rowSpan={4}>
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-blue-500 rounded">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 text-xs group-hover:text-blue-700 transition-colors">IT Helpdesk</div>
                            <div className="text-[10px] text-gray-500 font-mono">TICKETS</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="text-gray-700 font-medium">Abiertos</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="text-lg font-bold text-blue-600 tabular-nums">{itStats.open}</span>
                        <span className="text-[10px] text-gray-500 ml-1">({itStats.total > 0 ? Math.round((itStats.open / itStats.total) * 100) : 0}%)</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-6">
                            <MiniSparkline data={generateSparklineData(itStats.open)} color="#3b82f6" />
                          </div>
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold uppercase">
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                            </svg>
                            8%
                          </span>
                        </div>
                      </td>
                    </tr>
                    <tr className="hover:bg-green-50/30 transition-colors group cursor-pointer">
                      <td className="px-5 py-3 text-center">
                        <span className="text-gray-700 font-medium">Cerrados</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="text-lg font-bold text-emerald-600 tabular-nums">{itStats.closed}</span>
                        <span className="text-[10px] text-gray-500 ml-1">({itStats.total > 0 ? Math.round((itStats.closed / itStats.total) * 100) : 0}%)</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-6">
                            <MiniSparkline data={generateSparklineData(itStats.closed)} color="#10b981" />
                          </div>
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold uppercase">
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                            </svg>
                            5%
                          </span>
                        </div>
                      </td>
                    </tr>
                    <tr className="hover:bg-red-50/30 transition-colors group cursor-pointer">
                      <td className="px-5 py-3 text-center">
                        <span className="text-gray-700 font-medium">Escalados</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="text-lg font-bold text-red-600 tabular-nums">{itStats.escalated}</span>
                        <span className="text-[10px] text-gray-500 ml-1">({itStats.total > 0 ? Math.round((itStats.escalated / itStats.total) * 100) : 0}%)</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-6">
                            <MiniSparkline data={generateSparklineData(itStats.escalated || 1)} color="#ef4444" />
                          </div>
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-red-100 text-red-700 border border-red-200 rounded text-[10px] font-bold uppercase">
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                            0%
                          </span>
                        </div>
                      </td>
                    </tr>
                    <tr className="hover:bg-purple-50/30 transition-colors group cursor-pointer border-b-2 border-gray-300">
                      <td className="px-5 py-3 text-center">
                        <span className="text-gray-700 font-medium">Total</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="text-lg font-bold text-purple-600 tabular-nums">{itStats.total}</span>
                        <span className="text-[10px] text-gray-500 ml-1">(100%)</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-6">
                            <MiniSparkline data={generateSparklineData(itStats.total)} color="#8b5cf6" />
                          </div>
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold uppercase">
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                            </svg>
                            2%
                          </span>
                        </div>
                      </td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-gray-400 text-xs">Cargando IT...</td>
                  </tr>
                )}
                
                {/* Mantenimiento */}
                {maintenanceStats ? (
                  <>
                    <tr className="hover:bg-amber-50/30 transition-colors group cursor-pointer">
                      <td className="px-5 py-3" rowSpan={4}>
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-amber-500 rounded">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 text-xs group-hover:text-amber-700 transition-colors">Mantenimiento</div>
                            <div className="text-[10px] text-gray-500 font-mono">TICKETS</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="text-gray-700 font-medium">Abiertos</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="text-lg font-bold text-amber-600 tabular-nums">{maintenanceStats.open}</span>
                        <span className="text-[10px] text-gray-500 ml-1">({maintenanceStats.total > 0 ? Math.round((maintenanceStats.open / maintenanceStats.total) * 100) : 0}%)</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-6">
                            <MiniSparkline data={generateSparklineData(maintenanceStats.open)} color="#f59e0b" />
                          </div>
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold uppercase">
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                            </svg>
                            8%
                          </span>
                        </div>
                      </td>
                    </tr>
                    <tr className="hover:bg-green-50/30 transition-colors group cursor-pointer">
                      <td className="px-5 py-3 text-center">
                        <span className="text-gray-700 font-medium">Cerrados</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="text-lg font-bold text-emerald-600 tabular-nums">{maintenanceStats.closed}</span>
                        <span className="text-[10px] text-gray-500 ml-1">({maintenanceStats.total > 0 ? Math.round((maintenanceStats.closed / maintenanceStats.total) * 100) : 0}%)</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-6">
                            <MiniSparkline data={generateSparklineData(maintenanceStats.closed)} color="#10b981" />
                          </div>
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold uppercase">
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                            </svg>
                            5%
                          </span>
                        </div>
                      </td>
                    </tr>
                    <tr className="hover:bg-red-50/30 transition-colors group cursor-pointer">
                      <td className="px-5 py-3 text-center">
                        <span className="text-gray-700 font-medium">Escalados</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="text-lg font-bold text-red-600 tabular-nums">{maintenanceStats.escalated}</span>
                        <span className="text-[10px] text-gray-500 ml-1">({maintenanceStats.total > 0 ? Math.round((maintenanceStats.escalated / maintenanceStats.total) * 100) : 0}%)</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-6">
                            <MiniSparkline data={generateSparklineData(maintenanceStats.escalated || 1)} color="#ef4444" />
                          </div>
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-red-100 text-red-700 border border-red-200 rounded text-[10px] font-bold uppercase">
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                            0%
                          </span>
                        </div>
                      </td>
                    </tr>
                    <tr className="hover:bg-purple-50/30 transition-colors group cursor-pointer">
                      <td className="px-5 py-3 text-center">
                        <span className="text-gray-700 font-medium">Total</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="text-lg font-bold text-purple-600 tabular-nums">{maintenanceStats.total}</span>
                        <span className="text-[10px] text-gray-500 ml-1">(100%)</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-6">
                            <MiniSparkline data={generateSparklineData(maintenanceStats.total)} color="#8b5cf6" />
                          </div>
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold uppercase">
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                            </svg>
                            2%
                          </span>
                        </div>
                      </td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-gray-400 text-xs">Cargando Mantenimiento...</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Estado de Inspecciones - Tabla */}
        {stats && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
              <h3 className="text-[11px] font-bold text-gray-700 flex items-center gap-2 uppercase tracking-wider">
                <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                ESTADO DE INSPECCIONES
              </h3>
              <span className="text-[10px] text-gray-500 font-medium">Tendencia vs última actualización</span>
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

              const statusMeta: Record<string, { label: string; color: string; bgHover: string }> = {
                completed: { label: 'Completadas', color: '#f59e0b', bgHover: 'hover:bg-amber-50/30' },
                approved: { label: 'Aprobadas', color: '#10b981', bgHover: 'hover:bg-emerald-50/30' },
                rejected: { label: 'Rechazadas', color: '#ef4444', bgHover: 'hover:bg-red-50/30' },
                pending: { label: 'Pendientes', color: '#3b82f6', bgHover: 'hover:bg-blue-50/30' },
                in_review: { label: 'En Revisión', color: '#6366f1', bgHover: 'hover:bg-indigo-50/30' },
                draft: { label: 'Borrador', color: '#94a3b8', bgHover: 'hover:bg-gray-50' }
              }

              const keys = Object.keys(aggregated).sort((a, b) => (aggregated[b] || 0) - (aggregated[a] || 0))

              return (
                <div className="flex-1 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-600 font-mono uppercase border-b border-gray-200">
                      <tr>
                        <th className="px-5 py-3 font-semibold text-[10px]">Estado</th>
                        <th className="px-5 py-3 font-semibold text-[10px] text-center">Porcentaje</th>
                        <th className="px-5 py-3 font-semibold text-[10px] text-center">Cantidad</th>
                        <th className="px-5 py-3 font-semibold text-[10px] text-right">Tendencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {keys.length > 0 ? (
                        <>
                          {keys.map((k, index) => {
                            const count = aggregated[k] || 0
                            const percentage = total > 0 ? (count / total) * 100 : 0
                            const meta = statusMeta[k] || { label: k, color: '#64748b', bgHover: 'hover:bg-gray-50' }
                            const label = meta.label
                            const color = meta.color
                            const delta = inspectionTrends[k] || 0
                            const history = inspectionHistory[k] || [count, count, count, count]
                            const isLast = index === keys.length - 1

                            return (
                              <tr key={k} className={`${meta.bgHover} transition-colors group cursor-pointer ${isLast ? 'border-b-2 border-gray-300' : ''}`}>
                                <td className="px-5 py-3">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                                    <span className="text-gray-900 font-semibold">{label}</span>
                                  </div>
                                </td>
                                <td className="px-5 py-3 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <div className="flex-1 max-w-[80px] h-2 bg-gray-100 rounded-full overflow-hidden">
                                      <div
                                        className="h-full rounded-full transition-all duration-700"
                                        style={{ width: `${percentage}%`, backgroundColor: color }}
                                      />
                                    </div>
                                    <span className="text-gray-700 font-medium tabular-nums">{Math.round(percentage)}%</span>
                                  </div>
                                </td>
                                <td className="px-5 py-3 text-center">
                                  <span className="text-lg font-bold tabular-nums" style={{ color }}>{count}</span>
                                </td>
                                <td className="px-5 py-3 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <div className="w-16 h-6">
                                      <MiniSparkline data={history} color={color} />
                                    </div>
                                    <TrendBadge delta={delta} />
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                          {/* Total Row */}
                          <tr className="bg-gray-50 font-bold">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-gray-500" />
                                <span className="text-gray-900 font-bold uppercase text-xs">Total</span>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-center">
                              <span className="text-gray-700 font-bold">100%</span>
                            </td>
                            <td className="px-5 py-3 text-center">
                              <span className="text-lg font-bold text-gray-900 tabular-nums">{total}</span>
                            </td>
                            <td className="px-5 py-3 text-right">
                              <span className="text-[10px] text-gray-500 font-mono uppercase">Inspecciones</span>
                            </td>
                          </tr>
                        </>
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-5 py-8 text-center text-gray-400 text-xs">No hay datos de inspecciones</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )
            })()}
          </div>
        )}
      </div>

      {/* Ranking de Sedes */}
      {stats && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 animate-enter" style={{ animationDelay: '0.15s' }}>
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-1 h-4 bg-amber-500 rounded-full"></div>
              RANKING DE SEDES
              <span className="ml-auto text-xs text-gray-500 font-normal">Top 5</span>
            </h3>
            <div className="space-y-2">
              {stats.locationRanking.slice(0, 5).map((location, index) => (
                <div key={location.location_id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                    index === 0 ? 'bg-amber-100 text-amber-700' :
                    index === 1 ? 'bg-gray-100 text-gray-600' :
                    index === 2 ? 'bg-orange-100 text-orange-600' :
                    'bg-gray-50 text-gray-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">{location.property_name}</p>
                      <span className="text-xs text-gray-500 font-mono">{location.property_code}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
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
                  <ScoreCircle score={location.avgScore} size="sm" />
                </div>
              ))}
            </div>
          </div>
        )}

      {/* Áreas de Atención y Pendientes */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-enter" style={{ animationDelay: '0.2s' }}>
          {/* Áreas Críticas */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-500" />
              ÁREAS DE ATENCIÓN
            </h3>
            <div className="space-y-2">
              {stats.criticalAreas.map((area, index) => (
                <div key={`${area.area_name}-${index}`} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{area.area_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{area.inspectionCount} inspecciones</p>
                  </div>
                  <span className="text-lg font-bold text-red-600">{area.avgScore}<span className="text-xs text-gray-400">/10</span></span>
                </div>
              ))}
            </div>
          </div>

          {/* Pendientes de Revisión */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                PENDIENTES DE REVISIÓN
              </div>
              <span className="px-2 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded">{pendingReviews.length}</span>
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {pendingReviews.map((review) => (
                <div key={review.id} className="p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{review.property_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(review.created_at).toLocaleDateString('es-ES', { 
                          day: '2-digit', 
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <span className="px-2 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded">
                      {review.score}%
                    </span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleApprove(review.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-emerald-500 text-white text-xs font-medium rounded-lg hover:bg-emerald-600 transition-colors"
                    >
                      <Check size={14} /> Aprobar
                    </button>
                    <button
                      onClick={() => handleReject(review.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded-lg hover:bg-red-600 transition-colors"
                    >
                      <X size={14} /> Rechazar
                    </button>
                    <Link
                      href={`/inspections/${review.id}`}
                      className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Ver
                    </Link>
                  </div>
                </div>
              ))}
              {pendingReviews.length === 0 && (
                <div className="py-8 text-center text-emerald-600">
                  <Check size={32} className="mx-auto mb-2" />
                  <p className="text-sm font-medium">No hay pendientes</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-lg transition-all">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">⚡ ACCESOS RÁPIDOS</h3>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/corporativo/inspecciones"
            className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-lg hover:shadow-md transition-all group"
          >
            <div className="flex flex-col items-center text-center gap-2">
              <div className="p-2 bg-amber-500 rounded-lg text-white group-hover:scale-110 transition-transform">
                <Icons.ClipboardCheck />
              </div>
              <div>
                <div className="font-semibold text-gray-900 text-sm">Inspecciones</div>
                <div className="text-xs text-gray-600">Gestionar</div>
              </div>
            </div>
          </Link>

          <button className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg opacity-60 cursor-not-allowed">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="p-2 bg-gray-400 rounded-lg text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-gray-700 text-sm">Políticas</div>
                <div className="text-xs text-gray-500">Próximamente</div>
              </div>
            </div>
          </button>

          <button className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg opacity-60 cursor-not-allowed">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="p-2 bg-gray-400 rounded-lg text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-gray-700 text-sm">Procedimientos</div>
                <div className="text-xs text-gray-500">Próximamente</div>
              </div>
            </div>
          </button>

          <button className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg opacity-60 cursor-not-allowed">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="p-2 bg-gray-400 rounded-lg text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-gray-700 text-sm">Academia</div>
                <div className="text-xs text-gray-500">Próximamente</div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-500 py-4 border-t border-gray-200">
        Dashboard Corporativo ZIII • Datos actualizados en tiempo real
      </div>
    </div>
  )
}
