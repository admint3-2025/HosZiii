'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { OpsCalendarItem, OpsComplianceItem } from '@/lib/ops/service'
import type { UserPlanningProfile } from './page'

// â”€â”€â”€ Paleta por departamento â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const DEPT_COLOR: Record<string, { dot: string; bg: string; text: string; ring: string }> = {
  MANTENIMIENTO:         { dot: 'bg-orange-500',  bg: 'bg-orange-500/10',  text: 'text-orange-300',  ring: 'ring-orange-500/30' },
  RRHH:                  { dot: 'bg-purple-500',  bg: 'bg-purple-500/10',  text: 'text-purple-300',  ring: 'ring-purple-500/30' },
  'RECURSOS HUMANOS':    { dot: 'bg-purple-500',  bg: 'bg-purple-500/10',  text: 'text-purple-300',  ring: 'ring-purple-500/30' },
  SISTEMAS:              { dot: 'bg-blue-500',    bg: 'bg-blue-500/10',    text: 'text-blue-300',    ring: 'ring-blue-500/30' },
  'ALIMENTOS Y BEBIDAS': { dot: 'bg-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-300', ring: 'ring-emerald-500/30' },
  ALIMENTOS:             { dot: 'bg-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-300', ring: 'ring-emerald-500/30' },
  'DIV. CUARTOS':        { dot: 'bg-cyan-500',    bg: 'bg-cyan-500/10',    text: 'text-cyan-300',    ring: 'ring-cyan-500/30' },
  'AMA DE LLAVES':       { dot: 'bg-pink-500',    bg: 'bg-pink-500/10',    text: 'text-pink-300',    ring: 'ring-pink-500/30' },
  GSH:                   { dot: 'bg-indigo-400',  bg: 'bg-indigo-500/10',  text: 'text-indigo-300',  ring: 'ring-indigo-500/30' },
  CONTABILIDAD:          { dot: 'bg-teal-500',    bg: 'bg-teal-500/10',    text: 'text-teal-300',    ring: 'ring-teal-500/30' },
  MARKETING:             { dot: 'bg-rose-500',    bg: 'bg-rose-500/10',    text: 'text-rose-300',    ring: 'ring-rose-500/30' },
}
const FB = { dot: 'bg-slate-400', bg: 'bg-slate-500/10', text: 'text-slate-300', ring: 'ring-slate-500/20' }
const dc = (d: string) => DEPT_COLOR[d?.toUpperCase()] ?? FB

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DIAS_SEMANA = ['Lun','Mar','MiÃ©','Jue','Vie','SÃ¡b','Dom']
const OPS_DEPARTMENTS = ['MANTENIMIENTO','RECURSOS HUMANOS','GSH','DIV. CUARTOS','SISTEMAS','ALIMENTOS Y BEBIDAS','AMA DE LLAVES','CONTABILIDAD','MARKETING']

const ESTADO_DOT: Record<string, string> = {
  pendiente: 'bg-slate-400', en_proceso: 'bg-blue-400',
  completado: 'bg-emerald-400', cancelado: 'bg-gray-600',
}
const PRIORIDAD_RING: Record<string, string> = {
  baja: 'ring-slate-600', media: 'ring-amber-500',
  alta: 'ring-orange-500', critica: 'ring-rose-500',
}

function fmt(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}
function ageLbl(days: number) {
  if (days <= 0) return `en ${Math.abs(days)}d`
  if (days < 7) return `${days}d atrÃ¡s`
  if (days < 30) return `${Math.floor(days / 7)}sem atrÃ¡s`
  return `${Math.floor(days / 30)}mes atrÃ¡s`
}
function buildWeeks(year: number, month: number) {
  const fd = (new Date(year, month, 1).getDay() + 6) % 7
  const dim = new Date(year, month + 1, 0).getDate()
  const weeks: (number | null)[][] = []
  let w: (number | null)[] = Array(fd).fill(null)
  for (let d = 1; d <= dim; d++) {
    w.push(d)
    if (w.length === 7) { weeks.push(w); w = [] }
  }
  if (w.length) { while (w.length < 7) w.push(null); weeks.push(w) }
  return weeks
}

// â”€â”€â”€ Props â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type Tab = 'mis-actividades' | 'calendario' | 'alertas'

interface Props {
  calendarMonth: OpsCalendarItem[]
  compliance: OpsComplianceItem[]
  upcoming: OpsCalendarItem[]
  today: string
  currentYear: number
  currentMonth: number
  userProfile: UserPlanningProfile
  stats: { totalThisMonth: number; completedThisMonth: number; overdueCount: number; criticalCount: number }
}

// â”€â”€â”€ Modal Nueva Actividad â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface NewActivityForm {
  tipo: string; titulo: string; descripcion: string
  departamento: string; area: string; fecha: string
  frecuencia: string; repite: boolean
}

function NewActivityModal({
  defaultDept, canChangeDept, onClose, onCreated,
}: {
  defaultDept: string; canChangeDept: boolean; onClose: () => void; onCreated: () => void
}) {
  const [form, setForm] = useState<NewActivityForm>({
    tipo: 'mantenimiento_preventivo', titulo: '', descripcion: '',
    departamento: defaultDept, area: '',
    fecha: new Date().toISOString().split('T')[0],
    frecuencia: 'monthly', repite: false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.titulo || !form.fecha || !form.departamento) { setError('Completa los campos obligatorios'); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/ops/actividades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error ?? 'Error al crear')
      onCreated()
    } catch (err: any) {
      setError(err?.message ?? 'Error desconocido')
    } finally {
      setSaving(false)
    }
  }

  const inp = 'w-full rounded-lg border border-slate-600 bg-slate-700/60 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all'
  const lbl = 'block text-xs font-semibold text-slate-400 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div>
            <h2 className="text-base font-bold text-white">Nueva Actividad Programada</h2>
            <p className="text-xs text-slate-400 mt-0.5">Departamento: <span className="text-sky-400 font-medium">{form.departamento}</span></p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none transition-colors">Ã—</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={lbl}>Tipo de actividad *</label>
            <select className={inp} value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
              <option value="mantenimiento_preventivo">ðŸ”§ Mantenimiento Preventivo</option>
              <option value="inspeccion">ðŸ” InspecciÃ³n</option>
              <option value="inventario">ðŸ“¦ Inventario / Conteo</option>
              <option value="capacitacion">ðŸŽ“ CapacitaciÃ³n</option>
              <option value="otro">ðŸ“‹ Otro</option>
            </select>
          </div>
          <div>
            <label className={lbl}>TÃ­tulo *</label>
            <input type="text" className={inp} placeholder="Ej: RevisiÃ³n mensual de bomba hidroneumÃ¡tica"
              value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Departamento *</label>
              {canChangeDept ? (
                <select className={inp} value={form.departamento} onChange={e => setForm(f => ({ ...f, departamento: e.target.value }))}>
                  {OPS_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              ) : (
                <input type="text" className={`${inp} opacity-60 cursor-default`} value={form.departamento} readOnly />
              )}
            </div>
            <div>
              <label className={lbl}>Ãrea / Equipo</label>
              <input type="text" className={inp} placeholder="Ej: Cuarto de mÃ¡quinas"
                value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className={lbl}>Fecha programada *</label>
            <input type="date" className={inp} value={form.fecha}
              onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} required />
          </div>
          <div>
            <label className={lbl}>DescripciÃ³n</label>
            <textarea className={`${inp} resize-none`} rows={2} placeholder="Detalle de la actividadâ€¦"
              value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
          </div>
          <div className="flex items-center gap-3 py-1">
            <button type="button" onClick={() => setForm(f => ({ ...f, repite: !f.repite }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.repite ? 'bg-sky-600' : 'bg-slate-600'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.repite ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className="text-sm text-slate-300 font-medium">Actividad recurrente</span>
          </div>
          {form.repite && (
            <div>
              <label className={lbl}>Frecuencia</label>
              <select className={inp} value={form.frecuencia} onChange={e => setForm(f => ({ ...f, frecuencia: e.target.value }))}>
                <option value="daily">Diario</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensual</option>
                <option value="quarterly">Trimestral</option>
                <option value="yearly">Anual</option>
              </select>
            </div>
          )}
          {error && <div className="rounded-lg bg-rose-900/40 border border-rose-700 px-4 py-3 text-sm text-rose-300">{error}</div>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60 transition-colors">
              {saving ? 'Guardandoâ€¦' : 'Programar actividad'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// â”€â”€â”€ KPI Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function KpiCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent: string }) {
  return (
    <div className="bg-slate-800/60 rounded-xl ring-1 ring-slate-700/60 p-5 flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">{label}</span>
      <span className={`text-4xl font-black ${accent} leading-none`}>{value}</span>
      {sub && <span className="text-xs text-slate-500 mt-0.5">{sub}</span>}
    </div>
  )
}

// â”€â”€â”€ Activity Row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ActivityRow({ item, today }: { item: OpsCalendarItem; today: string }) {
  const c = dc(item.departamento_dueno)
  const isOverdue = item.due_date < today && item.estado !== 'completado' && item.estado !== 'cancelado'
  const dotColor = isOverdue ? 'bg-rose-500 animate-pulse' : (ESTADO_DOT[item.estado] ?? 'bg-slate-500')
  return (
    <div className={`group flex items-center gap-3 px-4 py-3 rounded-xl ring-1 transition-all
      ${isOverdue
        ? 'bg-rose-500/5 ring-rose-500/30 hover:ring-rose-500/50'
        : 'bg-slate-800/40 ring-slate-700/40 hover:ring-slate-600/60'
      }`}>
      <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${dotColor}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-100 truncate">{item.plan_nombre}</p>
        <p className="text-xs text-slate-500 truncate mt-0.5">{item.entidad_objetivo}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ring-1 ${PRIORIDAD_RING[item.prioridad] ?? 'ring-slate-600'} ${c.bg} ${c.text}`}>
          {item.prioridad}
        </span>
        <span className={`text-xs font-mono ${isOverdue ? 'text-rose-400 font-bold' : 'text-slate-500'}`}>
          {isOverdue ? `âš  ${ageLbl(item.aging_days)}` : fmt(item.due_date)}
        </span>
      </div>
    </div>
  )
}

// â”€â”€â”€ Alert Row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function AlertRow({ item }: { item: OpsComplianceItem }) {
  const isRed = item.alert_flag === 'RED'
  const isYellow = item.alert_flag === 'YELLOW'
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ring-1 transition-all
      ${isRed ? 'bg-rose-500/5 ring-rose-500/30' : isYellow ? 'bg-amber-500/5 ring-amber-500/30' : 'bg-slate-800/40 ring-slate-700/40'}`}>
      <span className={`h-3 w-3 rounded-full flex-shrink-0 ${isRed ? 'bg-rose-500' : isYellow ? 'bg-amber-400' : 'bg-emerald-500'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-100 truncate">{item.plan_nombre}</p>
        <p className="text-xs text-slate-500 truncate">{item.entidad_objetivo} Â· {item.departamento}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs font-mono text-slate-400">{fmt(item.due_date)}</span>
        <span className={`text-xs font-bold ${isRed ? 'text-rose-400' : isYellow ? 'text-amber-400' : 'text-emerald-400'}`}>
          {ageLbl(item.aging_days)}
        </span>
      </div>
    </div>
  )
}

// â”€â”€â”€ Componente principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function PlanningHubClient({
  calendarMonth, compliance, upcoming, today,
  currentYear, currentMonth, userProfile, stats,
}: Props) {
  const [tab, setTab] = useState<Tab>('mis-actividades')
  const [calYear, setCalYear] = useState(currentYear)
  const [calMonth, setCalMonth] = useState(currentMonth)
  const [showNew, setShowNew] = useState(false)

  const { isAdmin, isCorporate, departamento, full_name } = userProfile
  const canSeeAll = isAdmin || isCorporate
  const defaultDept = departamento?.toUpperCase() ?? OPS_DEPARTMENTS[0]
  const deptLabel = canSeeAll ? 'Todos los departamentos' : (departamento?.toUpperCase() ?? 'Mi Departamento')
  const c = dc(defaultDept)

  const alertItems = useMemo(() =>
    compliance.filter(x => x.aging_days > 0 && x.estado !== 'completado' && x.estado !== 'cancelado')
      .sort((a, b) => b.aging_days - a.aging_days),
  [compliance])

  const compliancePct = stats.totalThisMonth > 0
    ? Math.round((stats.completedThisMonth / stats.totalThisMonth) * 100)
    : null

  // Calendario
  const activitiesByDay = useMemo(() => {
    const map: Record<number, OpsCalendarItem[]> = {}
    for (const item of calendarMonth) {
      const d = new Date(item.due_date + 'T00:00:00')
      if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
        const dy = d.getDate()
        if (!map[dy]) map[dy] = []
        map[dy].push(item)
      }
    }
    return map
  }, [calendarMonth, calYear, calMonth])

  const weeks = useMemo(() => buildWeeks(calYear, calMonth), [calYear, calMonth])
  const todayParts = useMemo(() => {
    const [y, m, d] = today.split('-').map(Number)
    return { year: y, month: m - 1, day: d }
  }, [today])

  const prevMonth = () => { if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) } else setCalMonth(m => m - 1) }
  const nextMonth = () => { if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) } else setCalMonth(m => m + 1) }

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: 'mis-actividades', label: 'Mis Actividades' },
    { key: 'calendario', label: 'Calendario' },
    { key: 'alertas', label: 'Alertas', badge: alertItems.length || undefined },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">

      {/* â”€â”€ HEADER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="pt-8 pb-6">
            {/* Breadcrumb + Dept */}
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
              <span>PlanificaciÃ³n</span>
              <span>â€º</span>
              <span className={`font-semibold ${canSeeAll ? 'text-slate-300' : c.text}`}>{deptLabel}</span>
            </div>

            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">
                  {canSeeAll ? 'Centro de PlanificaciÃ³n' : `PlanificaciÃ³n Â· ${deptLabel}`}
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  {MESES[currentMonth]} {currentYear}
                  {full_name && <> Â· <span className="text-slate-400">{full_name}</span></>}
                </p>
              </div>
              <button
                onClick={() => setShowNew(true)}
                className="flex-shrink-0 flex items-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-sky-900/40 transition-colors"
              >
                <span className="text-lg leading-none">+</span> Nueva Actividad
              </button>
            </div>

            {/* KPIs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
              <KpiCard
                label="Actividades este mes"
                value={stats.totalThisMonth}
                sub={`${stats.completedThisMonth} completadas`}
                accent="text-white"
              />
              <KpiCard
                label="Cumplimiento"
                value={compliancePct !== null ? `${compliancePct}%` : 'â€”'}
                sub={`de ${stats.totalThisMonth} programadas`}
                accent={compliancePct === null ? 'text-slate-400'
                  : compliancePct >= 80 ? 'text-emerald-400'
                  : compliancePct >= 50 ? 'text-amber-400'
                  : 'text-rose-400'}
              />
              <KpiCard
                label="Vencidas"
                value={stats.overdueCount}
                sub="requieren acciÃ³n"
                accent={stats.overdueCount > 0 ? 'text-rose-400' : 'text-emerald-400'}
              />
              <KpiCard
                label="PrÃ³ximas 60 dÃ­as"
                value={upcoming.length}
                sub="actividades pendientes"
                accent="text-sky-400"
              />
            </div>

            {/* Tabs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="flex gap-1 mt-6 border-b border-slate-800 -mb-px">
              {tabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap
                    ${tab === t.key
                      ? 'border-sky-500 text-sky-400'
                      : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                >
                  {t.label}
                  {t.badge ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-black text-white">
                      {t.badge}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* â”€â”€ CONTENIDO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* â”€â”€ MIS ACTIVIDADES â”€â”€ */}
        {tab === 'mis-actividades' && (
          <div className="space-y-6">
            {/* Accesos rÃ¡pidos */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-600 mb-3">Accesos rÃ¡pidos</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <QuickLink icon="ðŸ”§" label="Mantenimiento" sub="Tickets y activos" href="/mantenimiento"
                  color="ring-orange-500/30 hover:ring-orange-500/60 bg-orange-500/5" />
                <QuickLink icon="ðŸ”" label="Inspecciones" sub="Checklists" href="/inspections"
                  color="ring-blue-500/30 hover:ring-blue-500/60 bg-blue-500/5" />
                <QuickLink icon="ðŸ“¦" label="Inventario" sub="Activos y equipos" href="/mantenimiento/assets"
                  color="ring-emerald-500/30 hover:ring-emerald-500/60 bg-emerald-500/5" />
                <QuickLink icon="ðŸŽ“" label="CapacitaciÃ³n" sub="Cursos y avance" href="/academia"
                  color="ring-purple-500/30 hover:ring-purple-500/60 bg-purple-500/5" />
              </div>
            </div>

            {/* Lista de prÃ³ximas actividades */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-600">
                  PrÃ³ximas actividades â€” 60 dÃ­as ({upcoming.length})
                </p>
                {upcoming.length > 0 && (
                  <button onClick={() => setTab('calendario')}
                    className="text-xs text-sky-500 hover:text-sky-400 transition-colors font-medium">
                    Ver en calendario â†’
                  </button>
                )}
              </div>

              {upcoming.length > 0 ? (
                <div className="space-y-1.5">
                  {upcoming.slice(0, 20).map(item => (
                    <ActivityRow key={item.agenda_id} item={item} today={today} />
                  ))}
                  {upcoming.length > 20 && (
                    <p className="text-xs text-center text-slate-600 py-2">
                      +{upcoming.length - 20} actividades mÃ¡s Â· Ver en calendario
                    </p>
                  )}
                </div>
              ) : (
                <EmptyState
                  title="Sin actividades programadas"
                  sub={canSeeAll ? 'AÃºn no hay planes registrados en el sistema' : 'Tu departamento no tiene actividades programadas aÃºn'}
                  action={{ label: '+ Programar primera actividad', onClick: () => setShowNew(true) }}
                />
              )}
            </div>

            {/* DistribuciÃ³n por departamento (solo admin/corporativo) */}
            {canSeeAll && calendarMonth.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-600 mb-3">DistribuciÃ³n este mes</p>
                <DeptDistribution items={calendarMonth} today={today} />
              </div>
            )}
          </div>
        )}

        {/* â”€â”€ CALENDARIO â”€â”€ */}
        {tab === 'calendario' && (
          <div className="bg-slate-800/40 rounded-2xl ring-1 ring-slate-700/50 overflow-hidden">
            {/* Nav mes */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/60">
              <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-slate-700 transition-colors text-slate-400 hover:text-white">â†</button>
              <h2 className="text-base font-bold text-white">{MESES[calMonth]} {calYear}</h2>
              <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-slate-700 transition-colors text-slate-400 hover:text-white">â†’</button>
            </div>
            {/* Cabecera dÃ­as */}
            <div className="grid grid-cols-7 border-b border-slate-700/40">
              {DIAS_SEMANA.map(d => (
                <div key={d} className="py-2.5 text-center text-[11px] font-bold text-slate-600 uppercase tracking-widest">{d}</div>
              ))}
            </div>
            {/* Semanas */}
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 border-b border-slate-800/60 last:border-0">
                {week.map((day, di) => {
                  const isToday = day !== null && calYear === todayParts.year && calMonth === todayParts.month && day === todayParts.day
                  const items = day !== null ? (activitiesByDay[day] ?? []) : []
                  const hasOverdue = items.some(i => i.due_date < today && i.estado === 'pendiente')
                  return (
                    <div key={di} className={`min-h-[80px] p-1.5 border-r border-slate-800/40 last:border-0
                      ${day === null ? '' : 'hover:bg-slate-700/20'} transition-colors`}>
                      {day !== null && (
                        <>
                          <div className="flex items-center justify-between mb-1 px-0.5">
                            <span className={`text-xs font-bold leading-none flex items-center justify-center
                              ${isToday ? 'h-6 w-6 rounded-full bg-sky-600 text-white' : hasOverdue ? 'text-rose-400' : 'text-slate-500'}`}>
                              {day}
                            </span>
                            {items.length > 0 && <span className="text-[9px] text-slate-600">{items.length}</span>}
                          </div>
                          <div className="space-y-0.5">
                            {items.slice(0, 3).map(item => {
                              const col = dc(item.departamento_dueno)
                              const vencida = item.due_date < today && item.estado === 'pendiente'
                              return (
                                <div key={item.agenda_id}
                                  title={`${item.plan_nombre} Â· ${item.estado}`}
                                  className={`rounded px-1 py-0.5 text-[9px] font-semibold truncate
                                    ${vencida ? 'bg-rose-500/20 text-rose-300' : `${col.bg} ${col.text}`}`}>
                                  {item.plan_nombre.length > 18 ? item.plan_nombre.slice(0, 18) + 'â€¦' : item.plan_nombre}
                                </div>
                              )
                            })}
                            {items.length > 3 && <div className="text-[9px] text-slate-600 px-1">+{items.length - 3}</div>}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}

        {/* â”€â”€ ALERTAS â”€â”€ */}
        {tab === 'alertas' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Alertas de Cumplimiento</h2>
                <p className="text-xs text-slate-500 mt-0.5">{alertItems.length} actividades vencidas o en riesgo</p>
              </div>
            </div>
            {alertItems.length > 0 ? (
              <div className="space-y-1.5">
                {alertItems.map(item => <AlertRow key={item.agenda_id} item={item} />)}
              </div>
            ) : (
              <div className="rounded-2xl bg-emerald-500/5 ring-1 ring-emerald-500/20 py-16 text-center">
                <p className="text-4xl mb-3">âœ…</p>
                <p className="font-bold text-emerald-400">Sin alertas activas</p>
                <p className="text-sm text-emerald-600/70 mt-1">Todas las actividades estÃ¡n al dÃ­a</p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Modal */}
      {showNew && (
        <NewActivityModal
          defaultDept={defaultDept}
          canChangeDept={canSeeAll}
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); window.location.reload() }}
        />
      )}
    </div>
  )
}

// â”€â”€â”€ Auxiliares â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function QuickLink({ icon, label, sub, href, color }: {
  icon: string; label: string; sub: string; href: string; color: string
}) {
  return (
    <Link href={href} className={`flex items-center gap-3 rounded-xl px-4 py-3 ring-1 transition-all ${color}`}>
      <span className="text-2xl">{icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-200 leading-tight">{label}</p>
        <p className="text-xs text-slate-500">{sub}</p>
      </div>
    </Link>
  )
}

function EmptyState({ title, sub, action }: {
  title: string; sub?: string; action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="rounded-2xl bg-slate-800/30 ring-1 ring-dashed ring-slate-700 py-16 text-center">
      <p className="text-4xl mb-3">ðŸ“‹</p>
      <p className="font-bold text-slate-400">{title}</p>
      {sub && <p className="text-sm text-slate-600 mt-1">{sub}</p>}
      {action && (
        <button onClick={action.onClick}
          className="mt-4 text-sm font-semibold text-sky-500 hover:text-sky-400 transition-colors">
          {action.label}
        </button>
      )}
    </div>
  )
}

function DeptDistribution({ items, today }: { items: OpsCalendarItem[]; today: string }) {
  const counts: Record<string, { total: number; done: number; overdue: number }> = {}
  for (const item of items) {
    const d = item.departamento_dueno || 'Sin depto.'
    if (!counts[d]) counts[d] = { total: 0, done: 0, overdue: 0 }
    counts[d].total++
    if (item.estado === 'completado') counts[d].done++
    if (item.due_date < today && item.estado === 'pendiente') counts[d].overdue++
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1].total - a[1].total)
  const max = sorted[0]?.[1].total || 1
  return (
    <div className="bg-slate-800/40 rounded-xl ring-1 ring-slate-700/40 p-5 space-y-4">
      {sorted.map(([dept, { total, done, overdue }]) => {
        const col = dc(dept)
        const pct = Math.round((done / total) * 100)
        return (
          <div key={dept} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 font-semibold text-slate-300">
                <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                {dept}
                {overdue > 0 && (
                  <span className="text-rose-400 font-bold">({overdue} vencida{overdue !== 1 ? 's' : ''})</span>
                )}
              </span>
              <span className="text-slate-500">{done}/{total} Â· {pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
              <div className={`h-full rounded-full ${col.dot} opacity-70 transition-all`}
                style={{ width: `${(total / max) * 100}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
