'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

// Tipos
type InspectionItem = {
  id: number
  db_id?: string
  descripcion: string
  tipo_dato: string
  cumplimiento_valor: '' | 'Cumple' | 'No Cumple' | 'N/A'
  cumplimiento_editable: boolean
  calif_valor: number
  calif_editable: boolean
  comentarios_valor: string
  comentarios_libre: boolean
  evidences?: InspectionItemEvidence[]
}

type EvidenceSlot = 1 | 2

type InspectionItemEvidence = {
  id: string
  inspection_id: string
  item_id: string
  slot: EvidenceSlot
  storage_path: string
  file_name: string | null
  file_size: number | null
  mime_type: string | null
  uploaded_by: string | null
  created_at: string
  signed_url?: string | null
}

type InspectionArea = {
  area: string
  items: InspectionItem[]
  calificacion_area_fija: number
}

// Datos iniciales de inspección RRHH
const INITIAL_INSPECTION_DATA: InspectionArea[] = [
  {
    area: "Planificación y control de plantilla",
    items: [
      { id: 1, descripcion: "Seguimiento vacantes actuales", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { id: 2, descripcion: "Uso de plataformas para posteo de vacantes", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { id: 3, descripcion: "% Rotación actual de plantilla aceptable", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true }
    ],
    calificacion_area_fija: 0
  },
  {
    area: "Plan de inducción a colaboradores",
    items: [
      { id: 1, descripcion: "Inducción de personal de nuevo ingreso", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { id: 2, descripcion: "Inducción al puesto (Formato espejo y líder)", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { id: 3, descripcion: "Salarios emocionales", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { id: 4, descripcion: "Conocimiento de Reglamento Interno", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { id: 5, descripcion: "Entrega de PIN Nuevo Ingreso", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true }
    ],
    calificacion_area_fija: 0
  },
  {
    area: "Evaluación y gestión de desempeño",
    items: [
      { id: 1, descripcion: "Aplicación de evaluación de desempeño", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { id: 2, descripcion: "Seguimiento puntual de renovaciones", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true }
    ],
    calificacion_area_fija: 0
  },
  {
    area: "Reconocimiento y recompensas",
    items: [
      { id: 1, descripcion: "Festejo Cumpleaños", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { id: 2, descripcion: "Celebración Colaborador del Mes", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { id: 3, descripcion: "Celebración aniversarios", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true }
    ],
    calificacion_area_fija: 0
  },
  {
    area: "Prevención Social y laboral",
    items: [
      { id: 1, descripcion: "Integración de comisiones mixtas", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { id: 2, descripcion: "Tarjetas checadoras completas", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { id: 3, descripcion: "Recibos de nómina completos", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { id: 4, descripcion: "Papeletas de vacaciones", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { id: 5, descripcion: "Tiempo adicional autorizado", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true }
    ],
    calificacion_area_fija: 0
  },
  {
    area: "Áreas comunes colaboradores",
    items: [
      { id: 1, descripcion: "Comedor de colaboradores", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { id: 2, descripcion: "Vestidores/Lockers", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { id: 3, descripcion: "Baños colaboradores", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { id: 4, descripcion: "Oficinas", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true }
    ],
    calificacion_area_fija: 0
  },
  {
    area: "Calendario Actividades",
    items: [
      { id: 1, descripcion: "Actividad de mes", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { id: 2, descripcion: "Capacitaciones del mes", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true }
    ],
    calificacion_area_fija: 0
  },
  {
    area: "Expedientes",
    items: [
      { id: 1, descripcion: "Documentación completa colaborador", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { id: 2, descripcion: "Retención Infonavit", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { id: 3, descripcion: "Retención Foncacot", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { id: 4, descripcion: "Aceptación Fondo de ahorro", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { id: 5, descripcion: "Anexo sindicato", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { id: 6, descripcion: "Política salarios emocionales", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { id: 7, descripcion: "Formato inducción", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { id: 8, descripcion: "Perfil de puesto", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { id: 9, descripcion: "Contratos determinado/indeterminado", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true }
    ],
    calificacion_area_fija: 0
  },
  {
    area: "Imagen",
    items: [
      { id: 1, descripcion: "Higiene personal", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { id: 2, descripcion: "Uniforme completo (Conforme a la política)", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { id: 3, descripcion: "Uso de gafete/PIN nuevo ingreso", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { id: 4, descripcion: "Uso de Cubrebocas", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true }
    ],
    calificacion_area_fija: 0
  },
  {
    area: "Vinculaciones y oferta académica",
    items: [
      { id: 1, descripcion: "Vinculaciones con dependencias gubernamentales", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { id: 2, descripcion: "Vinculaciones con Universidades Locales", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { id: 3, descripcion: "Vinculaciones con dependencias no lucrativas", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true }
    ],
    calificacion_area_fija: 0
  }
]

// ============== COMPONENTES DE GRÁFICOS ==============

// Gráfico de Dona/Gauge
function DonutChart({ percentage, size = 120, strokeWidth = 12, color = '#3b82f6' }: { percentage: number; size?: number; strokeWidth?: number; color?: string }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-slate-800">{percentage}%</span>
      </div>
    </div>
  )
}

// Gráfico de Barras Horizontales
function HorizontalBarChart({ data, maxValue = 100 }: { data: { label: string; value: number; color: string }[]; maxValue?: number }) {
  return (
    <div className="space-y-3">
      {data.map((item, idx) => (
        <div key={idx} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-600 truncate max-w-[60%]">{item.label}</span>
            <span className="font-semibold text-slate-800">{item.value.toFixed(1)}</span>
          </div>
          <div className="h-6 bg-slate-100 rounded-sm overflow-hidden">
            <div
              className="h-full rounded-sm transition-all duration-700 ease-out"
              style={{ 
                width: `${(item.value / maxValue) * 100}%`,
                backgroundColor: item.color
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// Gráfico de Barras Verticales (estilo Power BI)
function VerticalBarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const maxValue = Math.max(...data.map(d => d.value))
  
  return (
    <div className="flex items-end justify-between gap-2 h-40">
      {data.map((item, idx) => (
        <div key={idx} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[10px] font-semibold text-slate-700">{item.value.toFixed(0)}</span>
          <div className="w-full bg-slate-100 rounded-t flex-1 relative" style={{ maxHeight: '120px' }}>
            <div
              className="absolute bottom-0 w-full rounded-t transition-all duration-700 ease-out"
              style={{ 
                height: `${(item.value / maxValue) * 100}%`,
                backgroundColor: item.color
              }}
            />
          </div>
          <span className="text-[9px] text-slate-500 text-center leading-tight h-8 overflow-hidden">{item.label.split(' ').slice(0, 2).join(' ')}</span>
        </div>
      ))}
    </div>
  )
}

// Gráfico de Dona Multi-segmento (Pie Chart)
function PieChart({ data, size = 140 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  const strokeWidth = 30
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  
  let currentOffset = 0

  return (
    <div className="flex items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {data.map((item, idx) => {
            const percentage = (item.value / total) * 100
            const strokeDasharray = (percentage / 100) * circumference
            const offset = currentOffset
            currentOffset += strokeDasharray
            
            return (
              <circle
                key={idx}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${strokeDasharray} ${circumference}`}
                strokeDashoffset={-offset}
                className="transition-all duration-700"
              />
            )
          })}
        </svg>
      </div>
      <div className="flex flex-col gap-1">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
            <span className="text-[10px] text-slate-600">{item.label}</span>
            <span className="text-[10px] font-semibold text-slate-800">{((item.value / total) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Gráfico de Línea Interactivo
function LineChart({
  data,
  labels,
  color = '#3b82f6',
  height = 220
}: {
  data: number[]
  labels: string[]
  color?: string
  height?: number
}) {
  const id = useId()
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null)

  const W = 640
  const H = 220
  const padX = 56
  const padTop = 20
  const padBottom = 48
  const chartW = W - padX * 2
  const chartH = H - padTop - padBottom

  const safe = (n: number) => (Number.isFinite(n) ? n : 0)
  const cleaned = data.map((v) => {
    const vv = safe(v)
    return Math.max(0, Math.min(100, vv))
  })

  const points = useMemo(() => {
    if (cleaned.length === 0) return [] as { x: number; y: number; v: number }[]
    if (cleaned.length === 1) {
      const x = padX + chartW / 2
      const y = padTop + chartH - (cleaned[0] / 100) * chartH
      return [{ x, y, v: cleaned[0] }]
    }
    return cleaned.map((v, i) => {
      const x = padX + (i / (cleaned.length - 1)) * chartW
      const y = padTop + chartH - (v / 100) * chartH
      return { x, y, v }
    })
  }, [cleaned, chartH, chartW])

  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ')
  const area =
    points.length > 0
      ? `${padX},${padTop + chartH} ${polyline} ${padX + chartW},${padTop + chartH}`
      : ''

  const setHoverFromEvent = (evt: React.MouseEvent) => {
    if (!wrapRef.current || points.length === 0) return
    const rect = wrapRef.current.getBoundingClientRect()
    const mx = evt.clientX - rect.left
    const my = evt.clientY - rect.top

    const scaleX = rect.width / W
    const scaleY = rect.height / H
    const vx = mx / (scaleX || 1)

    let best = 0
    let bestDist = Infinity
    for (let i = 0; i < points.length; i++) {
      const d = Math.abs(points[i].x - vx)
      if (d < bestDist) {
        bestDist = d
        best = i
      }
    }

    setHoverIdx(best)
    setTooltip({ x: mx, y: my })
  }

  const hovered = hoverIdx != null ? points[hoverIdx] : null
  const hoveredLabel = hoverIdx != null ? labels[hoverIdx] : ''
  const hoveredValue = hoverIdx != null ? cleaned[hoverIdx] : 0
  const prevValue = hoverIdx != null && hoverIdx > 0 ? cleaned[hoverIdx - 1] : null
  const delta = prevValue == null ? null : hoveredValue - prevValue

  return (
    <div ref={wrapRef} className="relative w-full" style={{ height }}>
      {hovered && tooltip && (
        <div
          className="absolute z-10 pointer-events-none"
          style={{
            left: Math.min(Math.max(tooltip.x + 12, 8), (wrapRef.current?.clientWidth ?? 0) - 180),
            top: Math.max(tooltip.y - 44, 8)
          }}
        >
          <div className="rounded-lg bg-slate-900 text-white shadow-lg border border-white/10 px-3 py-2">
            <div className="text-[11px] font-semibold text-white/90">{hoveredLabel}</div>
            <div className="flex items-baseline gap-2">
              <div className="text-lg font-bold leading-none">{Math.round(hovered.v)}%</div>
              {delta != null && (
                <div className={`text-[11px] font-semibold ${delta >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {delta >= 0 ? '▲' : '▼'} {Math.abs(Math.round(delta))} pts
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <svg
        className="w-full h-full"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        onMouseMove={setHoverFromEvent}
        onMouseEnter={setHoverFromEvent}
        onMouseLeave={() => {
          setHoverIdx(null)
          setTooltip(null)
        }}
      >
        <defs>
          <linearGradient id={`trend-line-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <linearGradient id={`trend-area-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid (0..100) */}
        {[0, 25, 50, 75, 100].map((t) => {
          const y = padTop + chartH - (t / 100) * chartH
          return (
            <g key={t}>
              <line x1={padX} y1={y} x2={padX + chartW} y2={y} stroke="#e2e8f0" strokeWidth="1" />
              <text x={padX - 10} y={y + 4} textAnchor="end" className="text-[10px] fill-slate-500">
                {t}
              </text>
            </g>
          )
        })}

        {/* Area + Line */}
        {area && (
          <polygon points={area} fill={`url(#trend-area-${id})`} stroke="none" />
        )}
        {polyline && (
          <polyline
            points={polyline}
            fill="none"
            stroke={`url(#trend-line-${id})`}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Hover guideline */}
        {hovered && (
          <line
            x1={hovered.x}
            y1={padTop}
            x2={hovered.x}
            y2={padTop + chartH}
            stroke="#94a3b8"
            strokeDasharray="4 4"
            strokeWidth="1"
            opacity="0.9"
          />
        )}

        {/* Points + labels */}
        {points.map((p, i) => {
          const isHot = i === hoverIdx
          return (
            <g key={i}>
              <text
                x={p.x}
                y={padTop + chartH + 26}
                textAnchor="middle"
                className="text-[11px] fill-slate-600 font-medium"
              >
                {labels[i]}
              </text>

              {/* Bigger hit target */}
              <circle
                cx={p.x}
                cy={p.y}
                r="14"
                fill="transparent"
                onMouseEnter={() => setHoverIdx(i)}
              />

              <circle
                cx={p.x}
                cy={p.y}
                r={isHot ? 7 : 5}
                fill={isHot ? color : 'white'}
                stroke={color}
                strokeWidth={isHot ? 3 : 2}
              />
              <circle
                cx={p.x}
                cy={p.y}
                r={isHot ? 14 : 0}
                fill={color}
                opacity={isHot ? 0.12 : 0}
              />

              {/* Show value only on hover (or last point) */}
              {(isHot || i === points.length - 1) && (
                <text
                  x={p.x}
                  y={p.y - 12}
                  textAnchor="middle"
                  className="text-[12px] font-bold fill-slate-800"
                >
                  {Math.round(p.v)}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// Mini Sparkline para KPI
function Sparkline({ data, color = '#3b82f6', height = 30 }: { data: number[]; color?: string; height?: number }) {
  const width = 80
  const padding = 2
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2)
    const y = height - padding - ((val - min) / range) * (height - padding * 2)
    return `${x},${y}`
  }).join(' ')

  // Area fill
  const areaPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`

  return (
    <svg width={width} height={height}>
      <polygon
        fill={color}
        fillOpacity="0.1"
        points={areaPoints}
      />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  )
}

type OverallSegmentKey = 'Cumple' | 'No Cumple' | 'N/A' | 'Sin evaluar'

function OverallPerformanceDonut({
  totalItems,
  cumple,
  noCumple,
  na,
  pending,
  size = 240
}: {
  totalItems: number
  cumple: number
  noCumple: number
  na: number
  pending: number
  size?: number
}) {
  const id = useId()
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [hoverKey, setHoverKey] = useState<OverallSegmentKey | null>(null)
  const [pinnedKey, setPinnedKey] = useState<OverallSegmentKey | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null)

  const total = Math.max(0, totalItems)
  const evaluated = Math.max(0, cumple + noCumple + na)
  const applicableEvaluated = Math.max(0, cumple + noCumple)
  const coveragePct = total > 0 ? Math.round((evaluated / total) * 100) : 0
  const compliancePct = applicableEvaluated > 0 ? Math.round((cumple / applicableEvaluated) * 100) : 0

  const segments = useMemo(
    () =>
      ([
        {
          key: 'Cumple' as const,
          label: 'Cumple',
          value: Math.max(0, cumple),
          color: '#10b981',
          hint: 'Ítems que cumplen'
        },
        {
          key: 'No Cumple' as const,
          label: 'No Cumple',
          value: Math.max(0, noCumple),
          color: '#ef4444',
          hint: 'Ítems con incumplimiento'
        },
        {
          key: 'Sin evaluar' as const,
          label: 'Sin evaluar',
          value: Math.max(0, pending),
          color: '#cbd5e1',
          hint: 'Ítems sin selección'
        },
        {
          key: 'N/A' as const,
          label: 'N/A',
          value: Math.max(0, na),
          color: '#f59e0b',
          hint: 'No aplica'
        }
      ] as const).filter((s) => s.value > 0),
    [cumple, noCumple, pending, na]
  )

  const activeKey = pinnedKey ?? hoverKey
  const active = activeKey ? segments.find((s) => s.key === activeKey) : null

  const strokeWidth = 26
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  let currentOffset = 0

  const handleMove = (evt: React.MouseEvent) => {
    if (!wrapRef.current) return
    const rect = wrapRef.current.getBoundingClientRect()
    setTooltip({ x: evt.clientX - rect.left, y: evt.clientY - rect.top })
  }

  const togglePin = (key: OverallSegmentKey) => {
    setPinnedKey((prev) => (prev === key ? null : key))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-5 items-center">
        <div
          ref={wrapRef}
          className="relative"
          style={{ width: size, height: size }}
          onMouseMove={handleMove}
          onMouseLeave={() => {
            setHoverKey(null)
            setTooltip(null)
          }}
        >
          {active && tooltip && (
            <div
              className="absolute z-10 pointer-events-none"
              style={{
                left: Math.min(Math.max(tooltip.x + 12, 8), (wrapRef.current?.clientWidth ?? 0) - 200),
                top: Math.max(tooltip.y - 56, 8)
              }}
            >
              <div className="rounded-lg bg-slate-900 text-white shadow-lg border border-white/10 px-3 py-2">
                <div className="text-[11px] font-semibold text-white/90">{active.label}</div>
                <div className="flex items-baseline gap-2">
                  <div className="text-lg font-bold leading-none">
                    {total > 0 ? Math.round((active.value / total) * 100) : 0}%
                  </div>
                  <div className="text-[11px] font-semibold text-white/70">{active.value} ítems</div>
                </div>
                <div className="text-[11px] text-white/70 mt-0.5">{active.hint}</div>
                {pinnedKey && <div className="text-[10px] text-white/50 mt-1">Fijado • clic para soltar</div>}
              </div>
            </div>
          )}

          <svg width={size} height={size} className="transform -rotate-90">
            <defs>
              <linearGradient id={`overall-bg-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e2e8f0" />
                <stop offset="100%" stopColor="#f1f5f9" />
              </linearGradient>
            </defs>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={`url(#overall-bg-${id})`}
              strokeWidth={strokeWidth}
            />

            {segments.map((seg) => {
              const pct = total > 0 ? seg.value / total : 0
              const dash = pct * circumference
              const visible = Math.max(dash - 2.5, 0)
              const offset = currentOffset
              currentOffset += dash

              const isActive = seg.key === activeKey

              return (
                <circle
                  key={seg.key}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={strokeWidth}
                  strokeLinecap="butt"
                  strokeDasharray={`${visible} ${circumference}`}
                  strokeDashoffset={-offset}
                  className="transition-[opacity,filter] duration-200"
                  style={{
                    cursor: 'pointer',
                    opacity: activeKey ? (isActive ? 1 : 0.25) : 0.95,
                    filter: isActive ? 'drop-shadow(0px 6px 10px rgba(15, 23, 42, 0.15))' : 'none'
                  }}
                  onMouseEnter={() => setHoverKey(seg.key)}
                  onMouseLeave={() => setHoverKey(null)}
                  onClick={() => togglePin(seg.key)}
                />
              )
            })}
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {active ? (
              <>
                <div className="text-sm font-semibold text-slate-700">{active.label}</div>
                <div className="text-4xl font-extrabold" style={{ color: active.color }}>
                  {total > 0 ? Math.round((active.value / total) * 100) : 0}%
                </div>
                <div className="text-[11px] text-slate-500">{active.value}/{total}</div>
              </>
            ) : (
              <>
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Aplicable</div>
                <div className="text-5xl font-extrabold text-slate-800 leading-none">{applicableEvaluated > 0 ? `${compliancePct}%` : '—'}</div>
                <div className="text-[11px] text-slate-500 mt-1">Cob. {coveragePct}% ({evaluated}/{total})</div>
              </>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <span title="Cumple" className="text-[11px] font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
              ✓ {cumple}
            </span>
            <span title="No cumple" className="text-[11px] font-semibold px-2 py-1 rounded-full bg-red-50 text-red-700 border border-red-100">
              ✗ {noCumple}
            </span>
            <span title="Sin evaluar" className="text-[11px] font-semibold px-2 py-1 rounded-full bg-slate-50 text-slate-700 border border-slate-200">
              … {pending}
            </span>
            <span title="N/A" className="text-[11px] font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
              N/A {na}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Cob.</div>
              <div className="text-2xl font-bold text-slate-800 mt-1">{coveragePct}%</div>
              <div className="text-[11px] text-slate-500">{evaluated}/{total}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Cumpl.</div>
              <div className="text-2xl font-bold text-slate-800 mt-1">{applicableEvaluated > 0 ? `${compliancePct}%` : '—'}</div>
              <div className="text-[11px] text-slate-500">Base: {applicableEvaluated}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Riesgo</div>
              <div className={`text-2xl font-bold mt-1 ${noCumple > 0 ? 'text-red-600' : 'text-slate-800'}`}>{noCumple}</div>
              <div className="text-[11px] text-slate-500">Incump.</div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 hidden sm:block">
            Hover para detalles • clic para fijar
          </div>
        </div>
      </div>
    </div>
  )
}


// Tarjeta KPI estilo Power BI
function KPICard({ title, value, subtitle, trend, sparklineData, color = '#3b82f6' }: {
  title: string
  value: string | number
  subtitle?: string
  trend?: number
  sparklineData?: number[]
  color?: string
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</span>
        {trend !== undefined && (
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-3xl font-bold" style={{ color }}>{value}</div>
          {subtitle && <div className="text-xs text-slate-400 mt-1">{subtitle}</div>}
        </div>
        {sparklineData && <Sparkline data={sparklineData} color={color} />}
      </div>
    </div>
  )
}

// Tarjeta de gráfico con título
function ChartCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden ${className}`}>
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  )
}

// ============== COMPONENTES DE EDICIÓN ==============

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg className={`w-5 h-5 text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  )
}

// Componente de área expandible
function AreaCard({
  area,
  onUpdateItem,
  isReadOnly = false,
  isMarketing = false,
  inspectionId,
  inspectionType,
  onEvidenceUpsert,
  onEvidenceRemove,
}: {
  area: InspectionArea
  onUpdateItem: (areaName: string, itemId: number, field: string, value: any) => void
  isReadOnly?: boolean
  isMarketing?: boolean
  inspectionId?: string
  inspectionType?: 'rrhh' | 'gsh'
  onEvidenceUpsert?: (itemDbId: string, evidence: InspectionItemEvidence) => void
  onEvidenceRemove?: (itemDbId: string, slot: EvidenceSlot) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [evidenceUrls, setEvidenceUrls] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState<Record<string, boolean>>({})

  const mapStatusLabel = (value: '' | 'Cumple' | 'No Cumple' | 'N/A') => {
    if (!isMarketing) return value
    if (value === 'Cumple') return 'Existe'
    if (value === 'No Cumple') return 'No existe'
    return value
  }
  
  const calculatedScore = useMemo(() => {
    const cumpleItems = area.items.filter(item => item.cumplimiento_valor === 'Cumple')
    if (cumpleItems.length === 0) return 0
    const sum = cumpleItems.reduce((acc, item) => acc + item.calif_valor, 0)
    return (sum / cumpleItems.length).toFixed(2)
  }, [area.items])

  const cumpleCount = area.items.filter(i => i.cumplimiento_valor === 'Cumple').length
  const pendingCount = area.items.filter(i => !i.cumplimiento_valor).length
  const applicableItems = area.items.filter(i => i.cumplimiento_valor !== 'N/A').length
  const totalItems = area.items.length
  
  const scoreNum = typeof calculatedScore === 'string' ? parseFloat(calculatedScore) : calculatedScore
  const scoreColor = scoreNum >= 9 ? 'text-emerald-600 bg-emerald-50' : 
                     scoreNum >= 8 ? 'text-blue-600 bg-blue-50' : 
                     scoreNum >= 7 ? 'text-orange-600 bg-orange-50' : 'text-red-600 bg-red-50'

  return (
    <div className={`bg-white rounded-lg shadow-sm border overflow-hidden ${pendingCount > 0 ? 'border-amber-200' : 'border-slate-200'}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 rounded-lg font-bold text-lg ${scoreColor}`}>
            {calculatedScore}
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-slate-800">{area.area}</h3>
            <p className="text-xs text-slate-500">
              {cumpleCount}/{totalItems - pendingCount} items cumplen
              {pendingCount > 0 && (
                <span className="ml-2 text-amber-600 font-medium">• {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
              {pendingCount}
            </span>
          )}
          <ChevronIcon expanded={expanded} />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100">
          <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-100">
            <div className="col-span-4">Descripción</div>
            <div className="col-span-2 text-center">{isMarketing ? 'Existencia' : 'Cumplimiento'}</div>
            <div className="col-span-2 text-center">Calificación</div>
            <div className="col-span-4">Comentarios</div>
          </div>
          
          {area.items.map((item) => {
            const isPending = !item.cumplimiento_valor
            const itemDbId = item.db_id
            const itemEvidences = (item.evidences || []).slice().sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))

            const getEvidenceForSlot = (slot: EvidenceSlot) => itemEvidences.find((e) => e.slot === slot) || null

            const ensureSignedUrl = async (ev: InspectionItemEvidence | null) => {
              if (!ev) return null
              const key = ev.id
              if (evidenceUrls[key]) return evidenceUrls[key]
              try {
                const supabase = createSupabaseBrowserClient()
                const { data, error } = await supabase.storage
                  .from('inspection-evidences')
                  .createSignedUrl(ev.storage_path, 3600)
                if (error || !data?.signedUrl) return null
                setEvidenceUrls((prev) => ({ ...prev, [key]: data.signedUrl }))
                return data.signedUrl
              } catch {
                return null
              }
            }

            const compressImageForUpload = async (file: File): Promise<File> => {
              const maxDim = 1280
              const quality = 0.75

              const bitmap = await new Promise<HTMLImageElement>((resolve, reject) => {
                const img = new Image()
                img.onload = () => resolve(img)
                img.onerror = () => reject(new Error('No se pudo leer la imagen'))
                img.src = URL.createObjectURL(file)
              })

              const w = bitmap.naturalWidth || (bitmap as any).width
              const h = bitmap.naturalHeight || (bitmap as any).height
              const scale = Math.min(1, maxDim / Math.max(w, h))
              const outW = Math.max(1, Math.round(w * scale))
              const outH = Math.max(1, Math.round(h * scale))

              const canvas = document.createElement('canvas')
              canvas.width = outW
              canvas.height = outH
              const ctx = canvas.getContext('2d')
              if (!ctx) throw new Error('No se pudo procesar la imagen')
              ctx.drawImage(bitmap, 0, 0, outW, outH)

              const blob: Blob = await new Promise((resolve, reject) => {
                canvas.toBlob(
                  (b) => (b ? resolve(b) : reject(new Error('No se pudo comprimir la imagen'))),
                  'image/jpeg',
                  quality
                )
              })

              const safeName = file.name.replace(/\.[^.]+$/, '')
              return new File([blob], `${safeName || 'evidencia'}.jpg`, { type: 'image/jpeg' })
            }

            const handlePick = async (slot: EvidenceSlot, file: File) => {
              if (!inspectionId || !inspectionType || !itemDbId) {
                alert('No se pudo asociar evidencia (falta inspección o ítem).')
                return
              }

              const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
              if (!validTypes.includes(file.type)) {
                alert('Tipo de archivo no válido. Use JPG, PNG, WebP o GIF.')
                return
              }

              if (file.size > 10 * 1024 * 1024) {
                alert('La imagen es demasiado grande. Máximo 10MB.')
                return
              }

              const uploadKey = `${itemDbId}:${slot}`
              setUploading((prev) => ({ ...prev, [uploadKey]: true }))

              try {
                const supabase = createSupabaseBrowserClient()
                const { data: userData } = await supabase.auth.getUser()
                const userId = userData?.user?.id ?? null

                const processed = await compressImageForUpload(file)

                const storagePath = `inspections/${inspectionType}/${inspectionId}/${itemDbId}/slot-${slot}.jpg`
                const { error: upErr } = await supabase.storage
                  .from('inspection-evidences')
                  .upload(storagePath, processed, { cacheControl: '3600', upsert: true })
                if (upErr) throw upErr

                const table = inspectionType === 'rrhh'
                  ? 'inspections_rrhh_item_evidences'
                  : 'inspections_gsh_item_evidences'

                const { data: evRow, error: evErr } = await supabase
                  .from(table)
                  .upsert({
                    inspection_id: inspectionId,
                    item_id: itemDbId,
                    slot,
                    storage_path: storagePath,
                    file_name: processed.name,
                    file_size: processed.size,
                    mime_type: processed.type,
                    uploaded_by: userId
                  }, { onConflict: 'item_id,slot' })
                  .select('*')
                  .single()

                if (evErr || !evRow) throw evErr

                const { data: signed, error: sErr } = await supabase.storage
                  .from('inspection-evidences')
                  .createSignedUrl(storagePath, 3600)

                const evidence: InspectionItemEvidence = {
                  id: String((evRow as any).id),
                  inspection_id: String((evRow as any).inspection_id),
                  item_id: String((evRow as any).item_id),
                  slot: Number((evRow as any).slot) as EvidenceSlot,
                  storage_path: String((evRow as any).storage_path),
                  file_name: (evRow as any).file_name ?? null,
                  file_size: typeof (evRow as any).file_size === 'number' ? (evRow as any).file_size : ((evRow as any).file_size ? Number((evRow as any).file_size) : null),
                  mime_type: (evRow as any).mime_type ?? null,
                  uploaded_by: (evRow as any).uploaded_by ?? null,
                  created_at: String((evRow as any).created_at),
                  signed_url: sErr ? null : (signed?.signedUrl ?? null)
                }

                if (evidence.signed_url) {
                  setEvidenceUrls((prev) => ({ ...prev, [evidence.id]: evidence.signed_url as string }))
                }

                onEvidenceUpsert?.(itemDbId, evidence)
              } catch (e: any) {
                console.error('Error subiendo evidencia:', e)
                alert(e?.message || 'No se pudo subir la evidencia')
              } finally {
                setUploading((prev) => ({ ...prev, [uploadKey]: false }))
              }
            }

            const handleRemove = async (slot: EvidenceSlot) => {
              if (!inspectionId || !inspectionType || !itemDbId) return
              const existing = getEvidenceForSlot(slot)
              if (!existing) return

              const ok = window.confirm('¿Eliminar esta evidencia?')
              if (!ok) return

              const uploadKey = `${itemDbId}:${slot}`
              setUploading((prev) => ({ ...prev, [uploadKey]: true }))
              try {
                const supabase = createSupabaseBrowserClient()
                await supabase.storage.from('inspection-evidences').remove([existing.storage_path])

                const table = inspectionType === 'rrhh'
                  ? 'inspections_rrhh_item_evidences'
                  : 'inspections_gsh_item_evidences'
                await supabase.from(table).delete().eq('id', existing.id)

                onEvidenceRemove?.(itemDbId, slot)
              } catch (e: any) {
                console.error('Error eliminando evidencia:', e)
                alert(e?.message || 'No se pudo eliminar la evidencia')
              } finally {
                setUploading((prev) => ({ ...prev, [uploadKey]: false }))
              }
            }

            return (
            <div 
              key={item.id} 
              className={`grid grid-cols-12 gap-2 px-4 py-3 border-b items-start ${
                isPending 
                  ? 'bg-amber-50/50 border-amber-100 hover:bg-amber-50' 
                  : 'border-slate-50 hover:bg-slate-50'
              }`}
            >
              <div className="col-span-4 flex items-center gap-2">
                {isPending && (
                  <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400" title="Pendiente de evaluar" />
                )}
                <span className={`text-xs ${isPending ? 'text-amber-700' : 'text-slate-700'}`}>{item.descripcion}</span>
              </div>
              
              <div className="col-span-2 text-center">
                {item.cumplimiento_editable && !isReadOnly ? (
                  isMarketing ? (
                    <div className="inline-flex rounded-md border border-slate-200 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateItem(area.area, item.id, 'cumplimiento_valor', 'Cumple')
                        }}
                        className={`px-2 py-1 text-xs font-semibold transition-colors ${
                          item.cumplimiento_valor === 'Cumple'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                        title="Existe"
                      >
                        Existe
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateItem(area.area, item.id, 'cumplimiento_valor', 'No Cumple')
                          onUpdateItem(area.area, item.id, 'calif_valor', 0)
                        }}
                        className={`px-2 py-1 text-xs font-semibold transition-colors border-l border-slate-200 ${
                          item.cumplimiento_valor === 'No Cumple'
                            ? 'bg-red-600 text-white'
                            : 'bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                        title="No existe"
                      >
                        No existe
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateItem(area.area, item.id, 'cumplimiento_valor', 'N/A')
                          onUpdateItem(area.area, item.id, 'calif_valor', 0)
                        }}
                        className={`px-2 py-1 text-xs font-semibold transition-colors border-l border-slate-200 ${
                          item.cumplimiento_valor === 'N/A'
                            ? 'bg-amber-500 text-white'
                            : 'bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                        title="No aplica"
                      >
                        N/A
                      </button>
                    </div>
                  ) : (
                    <select
                      value={item.cumplimiento_valor}
                      onChange={(e) => {
                        const value = e.target.value as '' | 'Cumple' | 'No Cumple' | 'N/A'
                        onUpdateItem(area.area, item.id, 'cumplimiento_valor', value)
                        if (value !== 'Cumple') {
                          onUpdateItem(area.area, item.id, 'calif_valor', 0)
                        } else if (!item.calif_valor) {
                          onUpdateItem(area.area, item.id, 'calif_valor', 10)
                        }
                      }}
                      className={`text-xs font-medium px-2 py-1 rounded border cursor-pointer ${
                        item.cumplimiento_valor === 'Cumple' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : item.cumplimiento_valor === 'No Cumple'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : item.cumplimiento_valor === 'N/A'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-white text-slate-500 border-amber-300 ring-1 ring-amber-200'
                      }`}
                    >
                      <option value="">Seleccionar...</option>
                      <option value="Cumple">Cumple</option>
                      <option value="No Cumple">No Cumple</option>
                      <option value="N/A">N/A</option>
                    </select>
                  )
                ) : (
                  <span className={`text-xs font-medium px-2 py-1 rounded ${
                    item.cumplimiento_valor === 'Cumple' ? 'bg-emerald-50 text-emerald-700' : item.cumplimiento_valor === 'No Cumple' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {mapStatusLabel(item.cumplimiento_valor)}
                  </span>
                )}
              </div>
              
              <div className="col-span-2 text-center">
                {item.calif_editable && item.cumplimiento_valor === 'Cumple' && !isReadOnly ? (
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={item.calif_valor}
                    onChange={(e) => onUpdateItem(area.area, item.id, 'calif_valor', parseInt(e.target.value) || 0)}
                    className="w-14 text-center text-xs font-bold px-2 py-1 rounded border border-slate-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                  />
                ) : (
                  <span className={`text-xs font-bold ${item.cumplimiento_valor !== 'Cumple' ? 'text-slate-400' : 'text-slate-700'}`}>
                    {item.cumplimiento_valor === 'Cumple' ? item.calif_valor : item.cumplimiento_valor === 'N/A' ? 'N/A' : '-'}
                  </span>
                )}
              </div>
              
              <div className="col-span-4">
                {item.comentarios_libre && !isReadOnly ? (
                  <input
                    type="text"
                    value={item.comentarios_valor}
                    onChange={(e) => onUpdateItem(area.area, item.id, 'comentarios_valor', e.target.value)}
                    placeholder="Agregar comentario..."
                    className="w-full text-xs px-2 py-1 rounded border border-slate-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 text-slate-600"
                  />
                ) : (
                  <span className="text-xs text-slate-500">{item.comentarios_valor || '-'}</span>
                )}
              </div>

              {/* Evidencias fotográficas (2 slots) */}
              <div className="col-span-12 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-600">Evidencias fotográficas</span>
                  {!itemDbId && (
                    <span className="text-[11px] text-slate-400">(no disponible)</span>
                  )}
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 max-w-[260px]">
                  {([1, 2] as EvidenceSlot[]).map((slot) => {
                    const ev = getEvidenceForSlot(slot)
                    const uploadKey = `${itemDbId || 'noid'}:${slot}`
                    const isUp = !!uploading[uploadKey]

                    const url = ev ? (evidenceUrls[ev.id] || ev.signed_url || '') : ''
                    if (ev && !url) {
                      // Lazy resolve on render (best-effort)
                      void ensureSignedUrl(ev)
                    }

                    return (
                      <div key={slot} className="relative">
                        {ev && url ? (
                          <div className="relative h-20 rounded-md border border-slate-200 bg-slate-50 overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt={`Evidencia ${slot}`}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-1 right-1 flex gap-1">
                              <label
                                className="px-2 py-1 text-[10px] bg-white/90 border border-slate-200 rounded hover:bg-white cursor-pointer"
                                title="Reemplazar"
                              >
                                {isUp ? '...' : 'Cambiar'}
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp,image/gif"
                                  className="hidden"
                                  disabled={isReadOnly || isUp}
                                  onChange={(e) => {
                                    const f = e.target.files?.[0]
                                    if (f) void handlePick(slot, f)
                                    e.currentTarget.value = ''
                                  }}
                                />
                              </label>
                              <button
                                type="button"
                                disabled={isReadOnly || isUp}
                                onClick={() => void handleRemove(slot)}
                                className="px-2 py-1 text-[10px] bg-white/90 border border-slate-200 rounded hover:bg-white disabled:opacity-50"
                                title="Eliminar"
                              >
                                Eliminar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label
                            className={`h-20 rounded-md border border-dashed flex items-center justify-center text-[11px] cursor-pointer transition-colors ${
                              isReadOnly || !itemDbId
                                ? 'border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed'
                                : 'border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-white'
                            }`}
                          >
                            {isUp ? 'Subiendo...' : `Agregar foto ${slot}`}
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/gif"
                              className="hidden"
                              disabled={isReadOnly || !itemDbId || isUp}
                              onChange={(e) => {
                                const f = e.target.files?.[0]
                                if (f) void handlePick(slot, f)
                                e.currentTarget.value = ''
                              }}
                            />
                          </label>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )})}
          
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50">
            <span className="text-xs text-slate-500">Promedio calculado del área</span>
            <span className={`text-sm font-bold ${scoreColor.split(' ')[0]}`}>{calculatedScore}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ============== COMPONENTE PRINCIPAL ==============

interface InspectionDashboardProps {
  departmentName: string
  propertyCode: string
  propertyName: string
  inspectionId?: string
  inspectionType?: 'rrhh' | 'gsh'
  inspectionData?: InspectionArea[]
  onUpdateItem?: (areaName: string, itemId: number, field: string, value: any) => void
  generalComments?: string
  onUpdateGeneralComments?: (value: string) => void
  trendData?: number[]
  onSave?: (complete?: boolean) => void
  onGeneratePDF?: () => void
  saving?: boolean
  inspectionStatus?: string
  onUnsavedChanges?: (hasChanges: boolean) => void
  onBack?: () => void
  onEvidenceUpsert?: (itemDbId: string, evidence: InspectionItemEvidence) => void
  onEvidenceRemove?: (itemDbId: string, slot: EvidenceSlot) => void
}

export default function InspectionDashboard({
  departmentName,
  propertyCode,
  propertyName,
  inspectionId,
  inspectionType,
  inspectionData: propInspectionData,
  onUpdateItem: propOnUpdateItem,
  generalComments: propGeneralComments = '',
  onUpdateGeneralComments,
  trendData: propTrendData,
  onSave,
  onGeneratePDF,
  saving = false,
  inspectionStatus = 'draft',
  onUnsavedChanges,
  onBack,
  onEvidenceUpsert,
  onEvidenceRemove
}: InspectionDashboardProps) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const isReadOnly = inspectionStatus === 'completed' || inspectionStatus === 'approved'

  useEffect(() => {
    if (isReadOnly) setHasUnsavedChanges(false)
  }, [isReadOnly])

  // Detectar cambios sin guardar al cerrar ventana/pestaña
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
        return ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  // Notificar al padre cuando hay cambios sin guardar
  useEffect(() => {
    onUnsavedChanges?.(hasUnsavedChanges)
  }, [hasUnsavedChanges, onUnsavedChanges])

  const [internalInspectionData, setInternalInspectionData] = useState<InspectionArea[]>(INITIAL_INSPECTION_DATA)
  const [internalGeneralComments, setInternalGeneralComments] = useState('')
  const [hoveredBar, setHoveredBar] = useState<number | null>(null)

  // Usar props si se proporcionan, caso contrario usar estado interno
  const inspectionData = propInspectionData || internalInspectionData
  const generalComments = propGeneralComments || internalGeneralComments

  const handleUpdateItem = (areaName: string, itemId: number, field: string, value: any) => {
    if (isReadOnly) return
    console.log('=== InspectionDashboard.handleUpdateItem ===', { areaName, itemId, field, value, hasPropOnUpdateItem: !!propOnUpdateItem })
    setHasUnsavedChanges(true)
    if (propOnUpdateItem) {
      console.log('Llamando propOnUpdateItem...')
      propOnUpdateItem(areaName, itemId, field, value)
    } else {
      console.log('Usando estado interno (NO debería pasar)')
      setInternalInspectionData(prev => prev.map(area => {
        if (area.area !== areaName) return area
        return {
          ...area,
          items: area.items.map(item => {
            if (item.id !== itemId) return item
            return { ...item, [field]: value }
          })
        }
      }))
    }
  }

  const handleUpdateGeneralComments = (value: string) => {
    if (isReadOnly) return
    if (onUpdateGeneralComments) {
      onUpdateGeneralComments(value)
    } else {
      setInternalGeneralComments(value)
    }
  }

  // Estadísticas calculadas
  const stats = useMemo(() => {
    const areaScores = inspectionData.map(area => {
      const cumpleItems = area.items.filter(item => item.cumplimiento_valor === 'Cumple')
      if (cumpleItems.length === 0) return 0
      return cumpleItems.reduce((acc, item) => acc + item.calif_valor, 0) / cumpleItems.length
    })
    
    const totalAreas = inspectionData.length
    const totalItems = inspectionData.reduce((acc, area) => acc + area.items.length, 0)
    const totalCumple = inspectionData.reduce((acc, area) => acc + area.items.filter(i => i.cumplimiento_valor === 'Cumple').length, 0)
    const totalNoCumple = inspectionData.reduce((acc, area) => acc + area.items.filter(i => i.cumplimiento_valor === 'No Cumple').length, 0)
    const totalNA = inspectionData.reduce((acc, area) => acc + area.items.filter(i => i.cumplimiento_valor === 'N/A').length, 0)
    const totalPending = inspectionData.reduce((acc, area) => acc + area.items.filter(i => !i.cumplimiento_valor).length, 0)

    const evaluatedItems = totalCumple + totalNoCumple + totalNA
    const applicableEvaluated = totalCumple + totalNoCumple
    const coveragePercentage = totalItems > 0 ? Math.round((evaluatedItems / totalItems) * 100) : 0
    const compliancePercentage = applicableEvaluated > 0 ? Math.round((totalCumple / applicableEvaluated) * 100) : 0

    const averageScore = areaScores.reduce((a, b) => a + b, 0) / totalAreas
    const averagePercentage = Math.round(averageScore * 10)
    const perfectAreas = areaScores.filter(s => s >= 10).length
    const goodAreas = areaScores.filter(s => s >= 9 && s < 10).length
    const alertAreas = areaScores.filter(s => s >= 8 && s < 9).length
    const criticalAreas = areaScores.filter(s => s < 8).length

    // Data para gráficos
    const barChartData = inspectionData.map((area, idx) => ({
      label: area.area,
      value: areaScores[idx] * 10,
      color: areaScores[idx] >= 9 ? '#10b981' : areaScores[idx] >= 8 ? '#3b82f6' : areaScores[idx] >= 7 ? '#f97316' : '#ef4444'
    })).sort((a, b) => b.value - a.value)

    const pieData = [
      { label: 'Óptimas', value: perfectAreas, color: '#10b981' },
      { label: 'Buenas', value: goodAreas, color: '#3b82f6' },
      { label: 'Alerta', value: alertAreas, color: '#f97316' },
      { label: 'Críticas', value: criticalAreas, color: '#ef4444' }
    ].filter(d => d.value > 0)

    const cumplimientoPie = [
      { label: 'Cumple', value: totalCumple, color: '#10b981' },
      { label: 'No Cumple', value: totalNoCumple, color: '#ef4444' }
    ]

    // Usar trendData de props o simulado
    const trendData = propTrendData && propTrendData.length > 0 
      ? [...propTrendData, averagePercentage] 
      : [85, 88, 87, 90, 89, averagePercentage]

    return { 
      totalAreas,
      totalItems,
      totalCumple,
      totalNoCumple,
      totalNA,
      totalPending,
      evaluatedItems,
      coveragePercentage,
      compliancePercentage,
      averagePercentage, perfectAreas, goodAreas, alertAreas, criticalAreas, 
      areaScores, barChartData, pieData, cumplimientoPie, trendData 
    }
  }, [inspectionData, propTrendData])

  return (
    <div className="bg-slate-50">
      {/* Header compacto integrado */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 border-b border-slate-600 px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">{departmentName}</span>
                <span className="text-slate-500">•</span>
                <span className="text-sm font-medium text-emerald-400">{propertyCode}</span>
              </div>
              <p className="text-xs text-slate-400">{propertyName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onBack ? onBack : () => window.location.href = '/inspections'}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-slate-300 text-xs hover:text-white hover:bg-white/10 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Volver
            </button>
            {inspectionStatus !== 'completed' && (
              <button
                onClick={() => onSave && onSave(false)}
                disabled={saving}
                className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPIs Row */}
      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-4">
        <KPICard 
          title="Promedio Global" 
          value={`${stats.averagePercentage}%`}
          subtitle="Última inspección"
          trend={2}
          sparklineData={stats.trendData}
          color="#3b82f6"
        />
        <KPICard 
          title="Áreas Evaluadas" 
          value={stats.totalAreas}
          subtitle="Total de áreas"
          color="#64748b"
        />
        <KPICard 
          title="Items Evaluados" 
          value={stats.evaluatedItems}
          subtitle={`${stats.totalCumple} cumplen • ${stats.totalPending} sin evaluar`}
          color="#10b981"
        />
        <KPICard 
          title="Cumplimiento" 
          value={`${stats.compliancePercentage}%`}
          subtitle={`${stats.totalNoCumple} no cumplen • ${stats.totalNA} N/A`}
          color={stats.compliancePercentage >= 80 ? '#10b981' : stats.compliancePercentage >= 70 ? '#f97316' : '#ef4444'}
        />
        <KPICard 
          title="Áreas Críticas" 
          value={stats.criticalAreas}
          subtitle="Requieren atención"
          trend={stats.criticalAreas > 0 ? -5 : 0}
          color="#ef4444"
        />
        </div>

      {/* Gráficos: Torta + Evaluaciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Torta Interactiva - Promedio Global */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <h3 className="text-sm font-semibold text-slate-700">Desempeño General</h3>
          </div>
          <div className="p-6">
            <OverallPerformanceDonut
              totalItems={stats.totalItems}
              cumple={stats.totalCumple}
              noCumple={stats.totalNoCumple}
              na={stats.totalNA}
              pending={stats.totalPending}
            />
          </div>
        </div>

        {/* Gráfico de Línea - Últimas 4 Evaluaciones */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <h3 className="text-sm font-semibold text-slate-700">Últimas 4 Evaluaciones</h3>
          </div>
          <div className="p-4">
            <LineChart 
              data={[stats.trendData[2], stats.trendData[3], stats.trendData[4], stats.averagePercentage]} 
              labels={['Hace 3 sem', 'Hace 2 sem', 'Hace 1 sem', 'Hoy']}
            />
          </div>
        </div>
      </div>

      {/* Calificación por Área - Barras Verticales Compactas */}
      <div className="mb-4 bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-700">Calificación por Área</h3>
        </div>
        <div className="p-4">
          <div className="flex items-end justify-between gap-1 h-24 relative">
            {stats.barChartData.map((item, idx) => {
              const percentage = item.value
              const isZero = percentage === 0
              const isBelowThreshold = percentage > 0 && percentage < 80
              return (
                <div 
                  key={idx} 
                  className="flex-1 flex flex-col items-center gap-1 group cursor-pointer relative"
                  onMouseEnter={() => setHoveredBar(idx)}
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  <span className="text-xs font-semibold text-slate-700 h-4">{percentage.toFixed(0)}</span>
                  <div className="w-full bg-slate-100 rounded-t flex-1 relative min-h-fit hover:shadow-lg transition-shadow" style={{ maxHeight: '80px' }}>
                    <div
                      className="absolute bottom-0 w-full rounded-t transition-all duration-500 ease-out group-hover:opacity-90"
                      style={{ 
                        height: `${Math.max(percentage * 0.8, 5)}px`,
                        backgroundColor: isZero ? '#e2e8f0' : item.color
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-600 text-center leading-tight h-8 overflow-hidden line-clamp-2">{item.label.split(' ').slice(0, 2).join(' ')}</span>
                  
                  {/* Tooltip */}
                  {hoveredBar === idx && (
                    <div className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 z-10 bg-slate-900 text-white px-2 py-1.5 rounded text-xs font-medium shadow-lg pointer-events-none max-w-[120px]">
                      <div className="flex flex-col gap-0.5 text-center">
                        <p className="font-semibold leading-tight">{item.label}</p>
                        <p className="text-[10px] opacity-90 leading-tight">
                          {isZero ? '⚪ Sin evaluar' : isBelowThreshold ? '⚠️ Debajo del umbral' : '✓ Aceptable'}
                        </p>
                      </div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Áreas de inspección */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
          <EditIcon />
          {isReadOnly ? 'Detalle de Áreas (solo lectura)' : 'Detalle de Áreas (click para expandir)'}
        </h2>
        {inspectionData.map((area) => (
          <AreaCard
            key={area.area}
            area={area}
            onUpdateItem={handleUpdateItem}
            isReadOnly={isReadOnly}
            isMarketing={departmentName?.toUpperCase().includes('MARKETING')}
            inspectionId={inspectionId}
            inspectionType={inspectionType}
            onEvidenceUpsert={onEvidenceUpsert}
            onEvidenceRemove={onEvidenceRemove}
          />
        ))}
      </div>

      {/* Comentarios Generales */}
      <div className="mt-4 bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          <h3 className="text-sm font-semibold text-slate-700">Comentarios Generales</h3>
        </div>
        <div className="p-4">
          <textarea
            value={generalComments}
            onChange={(e) => handleUpdateGeneralComments(e.target.value)}
            maxLength={1000}
            placeholder="Escriba aquí observaciones generales, hallazgos importantes, recomendaciones o cualquier anotación relevante sobre esta inspección..."
            className="w-full h-32 text-sm px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 text-slate-700 placeholder:text-slate-400 resize-none"
            disabled={isReadOnly}
            readOnly={isReadOnly}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-slate-400">Las anotaciones se guardarán con la inspección</span>
            <span className="text-xs text-slate-400">{generalComments.length}/1000 caracteres</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 flex items-center justify-between">
        <div className="text-xs text-slate-400">
          <span>Última actualización: {new Date().toLocaleString('es-MX')}</span>
          {inspectionStatus && (
            <span className="ml-3">
              Estado: <span className="font-semibold">{inspectionStatus === 'draft' ? 'Borrador' : inspectionStatus === 'completed' ? 'Completada' : inspectionStatus}</span>
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {onGeneratePDF && inspectionStatus === 'completed' && (
            <button
              onClick={onGeneratePDF}
              disabled={saving}
              className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Generar PDF
            </button>
          )}
          {onGeneratePDF && inspectionStatus !== 'completed' && (
            <button
              disabled
              className="px-4 py-2 bg-slate-400 text-white rounded-lg cursor-not-allowed opacity-50 flex items-center gap-2 font-medium"
              title="Completa la inspección primero"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Generar PDF
            </button>
          )}
          {onSave && inspectionStatus !== 'completed' && (
            <>
              <button
                onClick={() => {
                  setHasUnsavedChanges(false)
                  onSave(false)
                }}
                disabled={saving}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Guardando...' : 'Guardar Borrador'}
              </button>
              <button
                onClick={() => {
                  setHasUnsavedChanges(false)
                  onSave(true)
                }}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Guardando...' : 'Guardar y Completar'}
              </button>
            </>
          )}
          {inspectionStatus === 'completed' && (
            <span className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg font-medium border border-emerald-200">
              ✓ Inspección Completada
            </span>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}
