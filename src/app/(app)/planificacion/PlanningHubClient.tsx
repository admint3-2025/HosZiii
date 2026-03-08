'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import type { OpsCalendarItem, OpsComplianceItem } from '@/lib/ops/service'

// ─── Constantes de UI ─────────────────────────────────────────────────────────

const DEPT_COLOR: Record<string, { dot: string; bg: string; text: string; border: string }> = {
  MANTENIMIENTO:        { dot: 'bg-orange-500',   bg: 'bg-orange-50',   text: 'text-orange-700',  border: 'border-orange-200' },
  RRHH:                 { dot: 'bg-purple-500',   bg: 'bg-purple-50',   text: 'text-purple-700',  border: 'border-purple-200' },
  'RECURSOS HUMANOS':   { dot: 'bg-purple-500',   bg: 'bg-purple-50',   text: 'text-purple-700',  border: 'border-purple-200' },
  SISTEMAS:             { dot: 'bg-blue-500',     bg: 'bg-blue-50',     text: 'text-blue-700',    border: 'border-blue-200' },
  'ALIMENTOS Y BEBIDAS':{ dot: 'bg-emerald-500',  bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-200' },
  ALIMENTOS:            { dot: 'bg-emerald-500',  bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-200' },
  'DIV. CUARTOS':       { dot: 'bg-cyan-500',     bg: 'bg-cyan-50',     text: 'text-cyan-700',    border: 'border-cyan-200' },
  'AMA DE LLAVES':      { dot: 'bg-pink-500',     bg: 'bg-pink-50',     text: 'text-pink-700',    border: 'border-pink-200' },
  GSH:                  { dot: 'bg-indigo-500',   bg: 'bg-indigo-50',   text: 'text-indigo-700',  border: 'border-indigo-200' },
  CONTABILIDAD:         { dot: 'bg-teal-500',     bg: 'bg-teal-50',     text: 'text-teal-700',    border: 'border-teal-200' },
  MARKETING:            { dot: 'bg-rose-500',     bg: 'bg-rose-50',     text: 'text-rose-700',    border: 'border-rose-200' },
}

const FALLBACK_COLOR = { dot: 'bg-slate-400', bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' }

function deptColor(dept: string) {
  return DEPT_COLOR[dept?.toUpperCase()] ?? FALLBACK_COLOR
}

const SEMAFORO: Record<string, string> = {
  GREEN:  'bg-emerald-500',
  YELLOW: 'bg-amber-400',
  RED:    'bg-rose-500',
}

const PRIORIDAD_COLORS: Record<string, string> = {
  baja:    'bg-slate-100 text-slate-600',
  media:   'bg-amber-100 text-amber-700',
  alta:    'bg-orange-100 text-orange-700',
  critica: 'bg-rose-100 text-rose-700',
}

const ESTADO_COLORS: Record<string, string> = {
  pendiente:  'bg-slate-100 text-slate-600',
  en_proceso: 'bg-blue-100 text-blue-700',
  completado: 'bg-emerald-100 text-emerald-700',
  cancelado:  'bg-gray-100 text-gray-500',
}

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const FREQ_LABELS: Record<string, string> = {
  daily: 'Diario', weekly: 'Semanal', monthly: 'Mensual',
  quincenal: 'Quincenal', quarterly: 'Trimestral',
  yearly: 'Anual', custom_days: 'Personalizado',
}

const OPS_DEPARTMENTS = [
  'MANTENIMIENTO', 'RECURSOS HUMANOS', 'GSH', 'DIV. CUARTOS',
  'SISTEMAS', 'ALIMENTOS Y BEBIDAS', 'AMA DE LLAVES', 'CONTABILIDAD', 'MARKETING',
]

type Tab = 'resumen' | 'calendario' | 'mantenimiento' | 'inspecciones' | 'inventario' | 'capacitacion' | 'alertas'

interface Props {
  calendarMonth: OpsCalendarItem[]
  compliance: OpsComplianceItem[]
  upcoming: OpsCalendarItem[]
  today: string
  currentYear: number
  currentMonth: number
  stats: { totalThisMonth: number; completedThisMonth: number; overdueCount: number; criticalCount: number }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

function agingLabel(days: number): string {
  if (days <= 0) return `en ${Math.abs(days)} día${Math.abs(days) !== 1 ? 's' : ''}`
  if (days === 1) return 'ayer'
  if (days < 7) return `hace ${days} días`
  if (days < 30) return `hace ${Math.floor(days / 7)} sem.`
  return `hace ${Math.floor(days / 30)} mes${Math.floor(days / 30) !== 1 ? 'es' : ''}`
}

function buildCalendarWeeks(year: number, month: number): (number | null)[][] {
  const firstDay = new Date(year, month, 1).getDay() // 0=Dom
  const firstDayMon = (firstDay + 6) % 7 // 0=Lun
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const weeks: (number | null)[][] = []
  let week: (number | null)[] = Array(firstDayMon).fill(null)
  for (let day = 1; day <= daysInMonth; day++) {
    week.push(day)
    if (week.length === 7) { weeks.push(week); week = [] }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null)
    weeks.push(week)
  }
  return weeks
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-5 flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</span>
      <span className={`text-3xl font-bold ${color}`}>{value}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  )
}

function ActivityRow({ item, today }: { item: OpsCalendarItem; today: string }) {
  const c = deptColor(item.departamento_dueno)
  const isOverdue = item.due_date < today && item.estado === 'pendiente'
  return (
    <div className={`flex items-center gap-3 py-3 px-4 rounded-lg border ${isOverdue ? 'bg-rose-50 border-rose-200' : 'bg-white border-gray-100'} hover:border-gray-300 transition-colors`}>
      <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${c.dot}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{item.plan_nombre}</p>
        <p className="text-xs text-gray-400 truncate">{item.entidad_objetivo} · {item.departamento_dueno}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORIDAD_COLORS[item.prioridad] ?? 'bg-gray-100 text-gray-600'}`}>
          {item.prioridad}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_COLORS[item.estado] ?? 'bg-gray-100 text-gray-600'}`}>
          {item.estado.replace('_', ' ')}
        </span>
        <span className={`text-xs font-mono ${isOverdue ? 'text-rose-600 font-semibold' : 'text-gray-400'}`}>
          {isOverdue ? `Vencido ${agingLabel(item.aging_days)}` : formatDate(item.due_date)}
        </span>
      </div>
    </div>
  )
}

function ModulePortalCard({
  icon, title, description, href, color, count, countLabel,
}: {
  icon: string; title: string; description: string; href: string; color: string; count?: number; countLabel?: string
}) {
  return (
    <Link href={href} className={`block rounded-xl border-2 ${color} p-5 hover:shadow-md transition-all group`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-3xl">{icon}</span>
        {count !== undefined && (
          <span className="text-sm font-bold text-gray-700 bg-white rounded-full px-3 py-0.5 shadow-sm">
            {count} {countLabel}
          </span>
        )}
      </div>
      <h3 className="font-semibold text-gray-800 group-hover:text-gray-900">{title}</h3>
      <p className="text-xs text-gray-500 mt-1">{description}</p>
      <div className="mt-3 text-xs font-medium text-gray-400 group-hover:text-gray-600 transition-colors flex items-center gap-1">
        Ver módulo <span>→</span>
      </div>
    </Link>
  )
}

// ─── Modal Nueva Actividad ────────────────────────────────────────────────────

interface NewActivityForm {
  tipo: string
  titulo: string
  descripcion: string
  departamento: string
  area: string
  fecha: string
  frecuencia: string
  repite: boolean
}

function NewActivityModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<NewActivityForm>({
    tipo: 'mantenimiento_preventivo',
    titulo: '',
    descripcion: '',
    departamento: 'MANTENIMIENTO',
    area: '',
    fecha: new Date().toISOString().split('T')[0],
    frecuencia: 'monthly',
    repite: false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.titulo || !form.fecha || !form.departamento) {
      setError('Completa los campos obligatorios')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/ops/actividades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error ?? 'Error al crear la actividad')
      onCreated()
    } catch (err: any) {
      setError(err?.message ?? 'Error desconocido')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all'
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">Nueva Actividad Programada</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Tipo */}
          <div>
            <label className={labelCls}>Tipo de actividad *</label>
            <select
              className={inputCls}
              value={form.tipo}
              onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
            >
              <option value="mantenimiento_preventivo">🔧 Mantenimiento Preventivo</option>
              <option value="inspeccion">🔍 Inspección</option>
              <option value="inventario">📦 Inventario</option>
              <option value="capacitacion">🎓 Capacitación</option>
              <option value="otro">📋 Otro</option>
            </select>
          </div>

          {/* Título */}
          <div>
            <label className={labelCls}>Título *</label>
            <input
              type="text"
              className={inputCls}
              placeholder="Ej: Revisión mensual de bomba hidroneumática"
              value={form.titulo}
              onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
              required
            />
          </div>

          {/* Departamento + Área en fila */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Departamento *</label>
              <select
                className={inputCls}
                value={form.departamento}
                onChange={(e) => setForm((f) => ({ ...f, departamento: e.target.value }))}
              >
                {OPS_DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Área / Equipo</label>
              <input
                type="text"
                className={inputCls}
                placeholder="Ej: Cuarto de máquinas"
                value={form.area}
                onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
              />
            </div>
          </div>

          {/* Fecha */}
          <div>
            <label className={labelCls}>Fecha programada *</label>
            <input
              type="date"
              className={inputCls}
              value={form.fecha}
              onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
              required
            />
          </div>

          {/* Descripción */}
          <div>
            <label className={labelCls}>Descripción</label>
            <textarea
              className={`${inputCls} resize-none`}
              rows={2}
              placeholder="Detalle de la actividad..."
              value={form.descripcion}
              onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
            />
          </div>

          {/* ¿Se repite? */}
          <div className="flex items-center gap-3 py-2">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, repite: !f.repite }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.repite ? 'bg-blue-600' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.repite ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className="text-sm text-gray-700 font-medium">Actividad recurrente</span>
          </div>

          {form.repite && (
            <div>
              <label className={labelCls}>Frecuencia de repetición</label>
              <select
                className={inputCls}
                value={form.frecuencia}
                onChange={(e) => setForm((f) => ({ ...f, frecuencia: e.target.value }))}
              >
                <option value="daily">Diario</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensual</option>
                <option value="quarterly">Trimestral</option>
                <option value="yearly">Anual</option>
              </select>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {saving ? 'Guardando...' : 'Programar actividad'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PlanningHubClient({
  calendarMonth,
  compliance,
  upcoming,
  today,
  currentYear,
  currentMonth,
  stats,
}: Props) {
  const [tab, setTab] = useState<Tab>('resumen')
  const [calYear, setCalYear] = useState(currentYear)
  const [calMonth, setCalMonth] = useState(currentMonth)
  const [showNew, setShowNew] = useState(false)

  const alertCount = stats.overdueCount + stats.criticalCount

  // Agrupar actividades del mes del calendario por día
  const activitiesByDay = useMemo(() => {
    const map: Record<number, OpsCalendarItem[]> = {}
    for (const item of calendarMonth) {
      const d = new Date(item.due_date + 'T00:00:00')
      if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
        const day = d.getDate()
        if (!map[day]) map[day] = []
        map[day].push(item)
      }
    }
    return map
  }, [calendarMonth, calYear, calMonth])

  const weeks = useMemo(() => buildCalendarWeeks(calYear, calMonth), [calYear, calMonth])

  const todayDate = useMemo(() => {
    const [y, m, d] = today.split('-').map(Number)
    return { year: y, month: m - 1, day: d }
  }, [today])

  // Navegar calendario
  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) }
    else setCalMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) }
    else setCalMonth(m => m + 1)
  }

  // Filtros por tipo
  const mntItems = useMemo(() =>
    upcoming.filter(x => x.departamento_dueno?.toUpperCase().includes('MANTENIMIENTO')),
  [upcoming])

  const alertItems = useMemo(() =>
    compliance
      .filter(x => x.aging_days > 0 && x.estado !== 'completado' && x.estado !== 'cancelado')
      .sort((a, b) => b.aging_days - a.aging_days),
  [compliance])

  const compliancePct = stats.totalThisMonth > 0
    ? Math.round((stats.completedThisMonth / stats.totalThisMonth) * 100)
    : 0

  const tabs: { key: Tab; label: string; icon: string; badge?: number }[] = [
    { key: 'resumen',       label: 'Resumen',          icon: '📊' },
    { key: 'calendario',    label: 'Calendario',       icon: '📅' },
    { key: 'mantenimiento', label: 'Mantenimiento',    icon: '🔧', badge: mntItems.filter(x => x.due_date < today).length || undefined },
    { key: 'inspecciones',  label: 'Inspecciones',     icon: '🔍' },
    { key: 'inventario',    label: 'Inventario',       icon: '📦' },
    { key: 'capacitacion',  label: 'Capacitación',     icon: '🎓' },
    { key: 'alertas',       label: 'Alertas',          icon: '⚠️',  badge: alertCount || undefined },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header ───────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Centro de Planificación</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {MESES[currentMonth]} {currentYear} · Seguimiento automático de todas las actividades programadas
              </p>
            </div>
            <button
              onClick={() => setShowNew(true)}
              className="flex-shrink-0 flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm shadow-blue-600/20 transition-colors"
            >
              <span className="text-base leading-none">+</span>
              Nueva Actividad
            </button>
          </div>

          {/* Stats ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-6">
            <StatCard
              label="Actividades este mes"
              value={stats.totalThisMonth}
              sub={`${stats.completedThisMonth} completadas`}
              color="text-gray-800"
            />
            <StatCard
              label="Cumplimiento"
              value={`${compliancePct}%`}
              sub="del mes actual"
              color={compliancePct >= 80 ? 'text-emerald-600' : compliancePct >= 50 ? 'text-amber-500' : 'text-rose-600'}
            />
            <StatCard
              label="Vencidas"
              value={stats.overdueCount}
              sub="requieren atención"
              color={stats.overdueCount > 0 ? 'text-rose-600' : 'text-emerald-600'}
            />
            <StatCard
              label="Críticas"
              value={stats.criticalCount}
              sub="semáforo rojo"
              color={stats.criticalCount > 0 ? 'text-rose-700' : 'text-emerald-600'}
            />
          </div>

          {/* Tabs ───────────────────────────────────────────────── */}
          <div className="flex gap-1 overflow-x-auto pb-0 -mb-px">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap relative flex-shrink-0
                  ${tab === t.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
                {t.badge ? (
                  <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                    {t.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content ──────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* ── RESUMEN ── */}
        {tab === 'resumen' && (
          <div className="space-y-6">
            {/* Módulos del sistema */}
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Módulos del Sistema</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                <ModulePortalCard
                  icon="🔧" title="Mantenimiento Preventivo"
                  description="Revisiones y servicios programados de equipos e instalaciones"
                  href="/mantenimiento" color="border-orange-200 bg-orange-50"
                  count={mntItems.length} countLabel="próximas"
                />
                <ModulePortalCard
                  icon="🔍" title="Inspecciones"
                  description="Checklists digitales de seguridad, limpieza y operación"
                  href="/inspections" color="border-blue-200 bg-blue-50"
                />
                <ModulePortalCard
                  icon="📦" title="Inventario"
                  description="Control y auditoría de activos, equipos y suministros"
                  href="/mantenimiento/assets" color="border-emerald-200 bg-emerald-50"
                />
                <ModulePortalCard
                  icon="🎓" title="Capacitación"
                  description="Cursos, certificaciones y planes de desarrollo del personal"
                  href="/academia" color="border-purple-200 bg-purple-50"
                />
                <ModulePortalCard
                  icon="⚠️" title="Alertas de Cumplimiento"
                  description="Actividades vencidas, críticas o en riesgo de incumplimiento"
                  href="/planificacion"
                  color={alertCount > 0 ? 'border-rose-300 bg-rose-50' : 'border-gray-200 bg-gray-50'}
                  count={alertCount || undefined} countLabel="alertas"
                />
              </div>
            </div>

            {/* Próximas actividades */}
            {upcoming.length > 0 ? (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Próximas 60 días ({upcoming.length})
                </h2>
                <div className="space-y-2">
                  {upcoming.slice(0, 15).map(item => (
                    <ActivityRow key={item.agenda_id} item={item} today={today} />
                  ))}
                  {upcoming.length > 15 && (
                    <p className="text-xs text-center text-gray-400 py-2">
                      +{upcoming.length - 15} actividades más · Usa el &quot;Calendario&quot; para ver todas
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-white border border-dashed border-gray-300 py-16 text-center">
                <p className="text-4xl mb-3">📋</p>
                <p className="font-medium text-gray-600">No hay actividades programadas</p>
                <p className="text-sm text-gray-400 mt-1">Usa &quot;Nueva Actividad&quot; para comenzar a planificar</p>
              </div>
            )}

            {/* Distribución por departamento */}
            {calendarMonth.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Distribución este mes por departamento
                </h2>
                <DeptDistribution items={calendarMonth} />
              </div>
            )}
          </div>
        )}

        {/* ── CALENDARIO ── */}
        {tab === 'calendario' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Nav mes */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
                ←
              </button>
              <h2 className="text-lg font-bold text-gray-800">
                {MESES[calMonth]} {calYear}
              </h2>
              <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
                →
              </button>
            </div>

            {/* Leyenda */}
            <div className="px-6 py-3 border-b border-gray-100 flex flex-wrap gap-3">
              {Object.entries(DEPT_COLOR).slice(0, 6).map(([dept, c]) => (
                <span key={dept} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className={`h-2 w-2 rounded-full ${c.dot}`} /> {dept}
                </span>
              ))}
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="h-2 w-2 rounded-full bg-rose-500" /> Vencida
              </span>
            </div>

            {/* Grid días semana */}
            <div className="grid grid-cols-7 border-b border-gray-100">
              {DIAS_SEMANA.map(d => (
                <div key={d} className="py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  {d}
                </div>
              ))}
            </div>

            {/* Semanas */}
            <div>
              {weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 border-b border-gray-100 last:border-0">
                  {week.map((day, di) => {
                    const isToday = day !== null && calYear === todayDate.year && calMonth === todayDate.month && day === todayDate.day
                    const items = day !== null ? (activitiesByDay[day] ?? []) : []
                    const hasOverdue = items.some(i => i.due_date < today && i.estado === 'pendiente')

                    return (
                      <div
                        key={di}
                        className={`min-h-[90px] p-2 border-r border-gray-100 last:border-0
                          ${day === null ? 'bg-gray-50/50' : 'bg-white hover:bg-gray-50/50'}
                          ${isToday ? 'bg-blue-50/60' : ''}
                        `}
                      >
                        {day !== null && (
                          <>
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-xs font-semibold leading-none inline-flex items-center justify-center ${
                                isToday
                                  ? 'h-6 w-6 rounded-full bg-blue-600 text-white'
                                  : hasOverdue
                                  ? 'text-rose-600'
                                  : 'text-gray-500'
                              }`}>
                                {day}
                              </span>
                              {items.length > 0 && (
                                <span className="text-[10px] text-gray-400">{items.length}</span>
                              )}
                            </div>
                            <div className="space-y-0.5">
                              {items.slice(0, 3).map(item => {
                                const c = deptColor(item.departamento_dueno)
                                const isVencida = item.due_date < today && item.estado === 'pendiente'
                                return (
                                  <div
                                    key={item.agenda_id}
                                    title={`${item.plan_nombre} · ${item.departamento_dueno} · ${item.estado}`}
                                    className={`rounded px-1 py-0.5 text-[10px] font-medium truncate cursor-default
                                      ${isVencida ? 'bg-rose-100 text-rose-700' : `${c.bg} ${c.text}`}`}
                                  >
                                    {item.plan_nombre.length > 20 ? item.plan_nombre.substring(0, 20) + '…' : item.plan_nombre}
                                  </div>
                                )
                              })}
                              {items.length > 3 && (
                                <div className="text-[10px] text-gray-400 pl-1">+{items.length - 3} más</div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── MANTENIMIENTO PREVENTIVO ── */}
        {tab === 'mantenimiento' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Mantenimiento Preventivo</h2>
                <p className="text-sm text-gray-400">Actividades programadas para los próximos 60 días</p>
              </div>
              <div className="flex gap-3">
                <Link
                  href="/mantenimiento/tickets/new"
                  className="rounded-xl border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-100 transition-colors"
                >
                  + Ticket correctivo
                </Link>
                <Link
                  href="/mantenimiento"
                  className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition-colors"
                >
                  Módulo completo →
                </Link>
              </div>
            </div>

            {mntItems.length > 0 ? (
              <div className="space-y-2">
                {mntItems.map(item => (
                  <ActivityRow key={item.agenda_id} item={item} today={today} />
                ))}
              </div>
            ) : upcoming.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-400 mb-2">Mostrando todas las actividades programadas</p>
                {upcoming.map(item => (
                  <ActivityRow key={item.agenda_id} item={item} today={today} />
                ))}
              </div>
            ) : (
              <EmptyState icon="🔧" title="Sin mantenimientos programados" sub="Programa actividades usando el botón + Nueva Actividad" />
            )}
          </div>
        )}

        {/* ── INSPECCIONES ── */}
        {tab === 'inspecciones' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Inspecciones con Checklists</h2>
                <p className="text-sm text-gray-400">Auditorías y verificaciones programadas por departamento</p>
              </div>
              <Link href="/inspections" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
                Ir a Inspecciones →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InspectionPortalBlock
                title="Inspecciones RRHH"
                description="Supervisión de bienestar laboral, presentación e imagen del personal"
                href="/inspections"
                icon="👔"
                color="bg-purple-50 border-purple-200"
              />
              <InspectionPortalBlock
                title="Inspecciones Operativas"
                description="Revisión de áreas, equipos, seguridad e higiene de instalaciones"
                href="/corporativo/inspecciones"
                icon="🏨"
                color="bg-blue-50 border-blue-200"
              />
              <InspectionPortalBlock
                title="Bandeja de Inspecciones"
                description="Centro unificado de seguimiento de todas las inspecciones activas"
                href="/inspections/inbox"
                icon="📥"
                color="bg-slate-50 border-slate-200"
              />
              <InspectionPortalBlock
                title="Nueva Inspección"
                description="Iniciar un flujo de inspección con checklist digital inmediato"
                href="/inspections"
                icon="✅"
                color="bg-emerald-50 border-emerald-200"
              />
            </div>
          </div>
        )}

        {/* ── INVENTARIO ── */}
        {tab === 'inventario' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Inventarios Automatizados</h2>
                <p className="text-sm text-gray-400">Control y auditoría de activos, equipos y suministros</p>
              </div>
              <Link href="/mantenimiento/assets" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors">
                Ver Activos →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InspectionPortalBlock
                title="Activos de Mantenimiento"
                description="Inventario completo de equipos, maquinaria e instalaciones del hotel"
                href="/mantenimiento/assets"
                icon="🏗️"
                color="bg-emerald-50 border-emerald-200"
              />
              <InspectionPortalBlock
                title="Activos de IT"
                description="Computadoras, servidores, red y dispositivos tecnológicos"
                href="/assets"
                icon="💻"
                color="bg-blue-50 border-blue-200"
              />
              <InspectionPortalBlock
                title="Programar Inventario"
                description="Crear actividad de conteo y verificación de activos en el calendario"
                href="#"
                icon="📋"
                color="bg-amber-50 border-amber-200"
                onClick={() => setShowNew(true)}
              />
              <InspectionPortalBlock
                title="Activos próximos a vencer"
                description="Equipos con garantía, contratos o certificaciones por expirar"
                href="/mantenimiento/assets"
                icon="⏰"
                color="bg-rose-50 border-rose-200"
              />
            </div>
          </div>
        )}

        {/* ── CAPACITACIÓN ── */}
        {tab === 'capacitacion' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Capacitación y Certificaciones</h2>
                <p className="text-sm text-gray-400">Planes de formación, cursos obligatorios y certificaciones del personal</p>
              </div>
              <Link href="/academia" className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 transition-colors">
                Ir a Academia →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InspectionPortalBlock
                title="Catálogo de Cursos"
                description="Todos los cursos disponibles: operativos, seguridad, servicio al cliente"
                href="/academia"
                icon="📚"
                color="bg-purple-50 border-purple-200"
              />
              <InspectionPortalBlock
                title="Mi Progreso"
                description="Avance personal en cursos, evaluaciones y certificaciones obtenidas"
                href="/academia/mi-progreso"
                icon="🏆"
                color="bg-amber-50 border-amber-200"
              />
              <InspectionPortalBlock
                title="Administración Academia"
                description="Gestión de cursos, inscripciones y reportes de cumplimiento formativo"
                href="/corporativo/academia/admin"
                icon="🎓"
                color="bg-indigo-50 border-indigo-200"
              />
              <InspectionPortalBlock
                title="Programar Capacitación"
                description="Añadir sesión de capacitación al calendario de planificación"
                href="#"
                icon="📅"
                color="bg-emerald-50 border-emerald-200"
                onClick={() => setShowNew(true)}
              />
            </div>
          </div>
        )}

        {/* ── ALERTAS ── */}
        {tab === 'alertas' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Alertas de Cumplimiento</h2>
                <p className="text-sm text-gray-400">{alertItems.length} actividades vencidas o en riesgo</p>
              </div>
            </div>

            {alertItems.length > 0 ? (
              <div className="space-y-2">
                {alertItems.map(item => (
                  <AlertRow key={item.agenda_id} item={item} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 py-16 text-center">
                <p className="text-4xl mb-3">✅</p>
                <p className="font-semibold text-emerald-700">Sin alertas activas</p>
                <p className="text-sm text-emerald-600/70 mt-1">Todas las actividades están al día</p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Modal nueva actividad */}
      {showNew && (
        <NewActivityModal
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false)
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}

// ─── Componentes auxiliares ───────────────────────────────────────────────────

function InspectionPortalBlock({
  title, description, href, icon, color, onClick,
}: {
  title: string; description: string; href: string; icon: string; color: string; onClick?: () => void
}) {
  const content = (
    <>
      <span className="text-3xl">{icon}</span>
      <div className="flex-1">
        <h3 className="font-semibold text-gray-800">{title}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <span className="text-gray-400 text-sm">→</span>
    </>
  )
  const cls = `flex items-center gap-4 rounded-xl border-2 ${color} p-4 hover:shadow-md transition-all cursor-pointer`
  if (onClick) {
    return <button type="button" onClick={onClick} className={cls}>{content}</button>
  }
  return <Link href={href} className={cls}>{content}</Link>
}

function AlertRow({ item }: { item: OpsComplianceItem }) {
  const flagColor = item.alert_flag === 'RED' ? 'bg-rose-500' : item.alert_flag === 'YELLOW' ? 'bg-amber-400' : 'bg-emerald-400'
  const rowBg = item.alert_flag === 'RED' ? 'bg-rose-50 border-rose-200' : item.alert_flag === 'YELLOW' ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100'
  const c = deptColor(item.departamento ?? '')
  return (
    <div className={`flex items-center gap-3 py-3 px-4 rounded-lg border ${rowBg}`}>
      <span className={`h-3 w-3 rounded-full flex-shrink-0 ${flagColor}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{item.plan_nombre}</p>
        <p className="text-xs text-gray-400 truncate">{item.entidad_objetivo} · {item.departamento}</p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
          {item.departamento}
        </span>
        <span className="text-xs font-mono text-gray-500">
          {item.alert_flag === 'RED' ? '🔴' : item.alert_flag === 'YELLOW' ? '🟡' : '🟢'}
          {' '}{agingLabel(item.aging_days)}
        </span>
        <span className="text-xs text-gray-400 font-mono">
          {formatDate(item.due_date)}
        </span>
      </div>
    </div>
  )
}

function DeptDistribution({ items }: { items: OpsCalendarItem[] }) {
  const counts: Record<string, { total: number; done: number }> = {}
  for (const item of items) {
    const d = item.departamento_dueno || 'Sin depto.'
    if (!counts[d]) counts[d] = { total: 0, done: 0 }
    counts[d].total++
    if (item.estado === 'completado') counts[d].done++
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1].total - a[1].total)
  const max = sorted[0]?.[1].total || 1
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
      {sorted.map(([dept, { total, done }]) => {
        const c = deptColor(dept)
        const pct = Math.round((done / total) * 100)
        return (
          <div key={dept} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-gray-700">
                <span className={`h-2 w-2 rounded-full ${c.dot}`} /> {dept}
              </span>
              <span className="text-gray-400">{done}/{total} · {pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${c.dot} opacity-60`}
                style={{ width: `${(total / max) * 100}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function EmptyState({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-white border border-dashed border-gray-300 py-16 text-center">
      <p className="text-4xl mb-3">{icon}</p>
      <p className="font-medium text-gray-600">{title}</p>
      {sub && <p className="text-sm text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}
