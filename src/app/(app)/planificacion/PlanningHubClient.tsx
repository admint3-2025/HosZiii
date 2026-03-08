'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { OpsCalendarItem, OpsComplianceItem } from '@/lib/ops/service'
import type { UserPlanningProfile } from './page'

type Tab = 'overview' | 'calendar' | 'alerts'

type Props = {
  calendarMonth: OpsCalendarItem[]
  compliance: OpsComplianceItem[]
  upcoming: OpsCalendarItem[]
  today: string
  currentYear: number
  currentMonth: number
  userProfile: UserPlanningProfile
  stats: {
    totalThisMonth: number
    completedThisMonth: number
    overdueCount: number
    criticalCount: number
  }
}

type NewActivityForm = {
  tipo: string
  titulo: string
  descripcion: string
  departamento: string
  area: string
  fecha: string
  frecuencia: string
  repite: boolean
}

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

const WEEK_DAYS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']

const OPS_DEPARTMENTS = [
  'MANTENIMIENTO',
  'RECURSOS HUMANOS',
  'GSH',
  'DIV. CUARTOS',
  'SISTEMAS',
  'ALIMENTOS Y BEBIDAS',
  'AMA DE LLAVES',
  'CONTABILIDAD',
  'MARKETING',
]

const STATUS_BADGE: Record<string, string> = {
  pendiente: 'bg-amber-100 text-amber-800 border-amber-200',
  en_proceso: 'bg-sky-100 text-sky-800 border-sky-200',
  completado: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelado: 'bg-slate-100 text-slate-600 border-slate-200',
}

const PRIORITY_BADGE: Record<string, string> = {
  baja: 'bg-slate-100 text-slate-700 border-slate-200',
  media: 'bg-amber-100 text-amber-800 border-amber-200',
  alta: 'bg-orange-100 text-orange-800 border-orange-200',
  critica: 'bg-rose-100 text-rose-800 border-rose-200',
}

function formatShortDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}

function toLateLabel(days: number) {
  if (days <= 0) return `en ${Math.abs(days)}d`
  if (days < 7) return `${days}d tarde`
  if (days < 30) return `${Math.floor(days / 7)}sem tarde`
  return `${Math.floor(days / 30)}mes tarde`
}

function buildCalendarWeeks(year: number, month: number) {
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7
  const totalDays = new Date(year, month + 1, 0).getDate()
  const weeks: (number | null)[][] = []
  let week: (number | null)[] = Array(firstDay).fill(null)

  for (let day = 1; day <= totalDays; day++) {
    week.push(day)
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }

  if (week.length > 0) {
    while (week.length < 7) week.push(null)
    weeks.push(week)
  }

  return weeks
}

function KpiCard({
  title,
  value,
  sub,
  valueClass,
}: {
  title: string
  value: string | number
  sub?: string
  valueClass?: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500 font-semibold">{title}</p>
      <p className={`mt-2 text-4xl font-black leading-none ${valueClass ?? 'text-slate-900'}`}>{value}</p>
      {sub ? <p className="mt-2 text-xs text-slate-500">{sub}</p> : null}
    </div>
  )
}

function QuickAction({
  title,
  sub,
  href,
}: {
  title: string
  sub: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-sky-300 hover:shadow transition-all"
    >
      <p className="text-sm font-bold text-slate-900">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{sub}</p>
    </Link>
  )
}

function ActivityRow({ item, today }: { item: OpsCalendarItem; today: string }) {
  const overdue = item.due_date < today && item.estado !== 'completado' && item.estado !== 'cancelado'

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">{item.plan_nombre}</p>
          <p className="mt-1 text-xs text-slate-500 truncate">{item.entidad_objetivo}</p>
          <p className="mt-1 text-xs text-slate-500">{item.departamento_dueno}</p>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-xs font-semibold ${overdue ? 'text-rose-700' : 'text-slate-600'}`}>
            {overdue ? `Atraso ${toLateLabel(item.aging_days)}` : formatShortDate(item.due_date)}
          </p>
          <div className="mt-2 flex justify-end gap-1.5">
            <span
              className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold uppercase ${PRIORITY_BADGE[item.prioridad] ?? PRIORITY_BADGE.media}`}
            >
              {item.prioridad}
            </span>
            <span
              className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_BADGE[item.estado] ?? STATUS_BADGE.pendiente}`}
            >
              {item.estado}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function AlertRow({ item }: { item: OpsComplianceItem }) {
  const isRed = item.alert_flag === 'RED'
  const isYellow = item.alert_flag === 'YELLOW'
  const dotClass = isRed ? 'bg-rose-500' : isYellow ? 'bg-amber-500' : 'bg-emerald-500'

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className={`mt-1 h-2.5 w-2.5 rounded-full ${dotClass}`} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900 truncate">{item.plan_nombre}</p>
          <p className="mt-1 text-xs text-slate-500 truncate">{item.entidad_objetivo} | {item.departamento}</p>
          <p className="mt-2 text-xs text-slate-600">
            Fecha objetivo: {formatShortDate(item.due_date)} | {toLateLabel(item.aging_days)}
          </p>
        </div>
      </div>
    </div>
  )
}

function EmptyPanel({
  title,
  sub,
  action,
}: {
  title: string
  sub?: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
      <p className="text-base font-bold text-slate-700">{title}</p>
      {sub ? <p className="mt-1 text-sm text-slate-500">{sub}</p> : null}
      {action ? (
        <button
          onClick={action.onClick}
          className="mt-4 rounded-md border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-100"
        >
          {action.label}
        </button>
      ) : null}
    </div>
  )
}

function NewActivityModal({
  defaultDept,
  canChangeDept,
  onClose,
  onCreated,
}: {
  defaultDept: string
  canChangeDept: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [form, setForm] = useState<NewActivityForm>({
    tipo: 'mantenimiento_preventivo',
    titulo: '',
    descripcion: '',
    departamento: defaultDept,
    area: '',
    fecha: new Date().toISOString().split('T')[0],
    frecuencia: 'monthly',
    repite: false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inputClass =
    'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titulo || !form.departamento || !form.fecha) {
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
      if (!json.ok) throw new Error(json.error ?? 'Error al crear')
      onCreated()
    } catch (err: any) {
      setError(err?.message ?? 'Error inesperado')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Nueva actividad</h2>
            <p className="text-xs text-slate-500">Carga rapida para plan operativo</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">
            x
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 px-6 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Tipo</label>
              <select
                className={inputClass}
                value={form.tipo}
                onChange={(e) => setForm((prev) => ({ ...prev, tipo: e.target.value }))}
              >
                <option value="mantenimiento_preventivo">Mantenimiento preventivo</option>
                <option value="inspeccion">Inspeccion</option>
                <option value="inventario">Inventario</option>
                <option value="capacitacion">Capacitacion</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Fecha programada</label>
              <input
                type="date"
                className={inputClass}
                value={form.fecha}
                onChange={(e) => setForm((prev) => ({ ...prev, fecha: e.target.value }))}
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Titulo</label>
            <input
              type="text"
              className={inputClass}
              placeholder="Ej: Revision mensual de cuarto de maquinas"
              value={form.titulo}
              onChange={(e) => setForm((prev) => ({ ...prev, titulo: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Departamento</label>
              {canChangeDept ? (
                <select
                  className={inputClass}
                  value={form.departamento}
                  onChange={(e) => setForm((prev) => ({ ...prev, departamento: e.target.value }))}
                >
                  {OPS_DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              ) : (
                <input type="text" className={inputClass} value={form.departamento} readOnly />
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Area o equipo</label>
              <input
                type="text"
                className={inputClass}
                placeholder="Ej: Cuarto de maquinas"
                value={form.area}
                onChange={(e) => setForm((prev) => ({ ...prev, area: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Descripcion</label>
            <textarea
              className={inputClass}
              rows={3}
              value={form.descripcion}
              onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))}
              placeholder="Detalle de la actividad"
            />
          </div>

          {error ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Crear actividad'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function PlanningHubClient({
  calendarMonth,
  compliance,
  upcoming,
  today,
  currentYear,
  currentMonth,
  userProfile,
  stats,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [calYear, setCalYear] = useState(currentYear)
  const [calMonth, setCalMonth] = useState(currentMonth)
  const [showNewModal, setShowNewModal] = useState(false)

  const canSeeAll = userProfile.isAdmin || userProfile.isCorporate
  const defaultDept = (userProfile.departamento ?? userProfile.allowed_departments?.[0] ?? OPS_DEPARTMENTS[0]).toUpperCase()
  const deptLabel = canSeeAll ? 'Vista global' : defaultDept

  const compliancePct =
    stats.totalThisMonth > 0 ? Math.round((stats.completedThisMonth / stats.totalThisMonth) * 100) : null

  const alertItems = useMemo(
    () =>
      compliance
        .filter((x) => x.aging_days > 0 && x.estado !== 'completado' && x.estado !== 'cancelado')
        .sort((a, b) => b.aging_days - a.aging_days),
    [compliance],
  )

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
  }, [calendarMonth, calMonth, calYear])

  const weeks = useMemo(() => buildCalendarWeeks(calYear, calMonth), [calYear, calMonth])

  const todayParts = useMemo(() => {
    const [y, m, d] = today.split('-').map(Number)
    return { y, m: m - 1, d }
  }, [today])

  const tabs: Array<{ key: Tab; label: string; badge?: number }> = [
    { key: 'overview', label: 'Resumen' },
    { key: 'calendar', label: 'Calendario' },
    { key: 'alerts', label: 'Alertas', badge: alertItems.length || undefined },
  ]

  function prevMonth() {
    if (calMonth === 0) {
      setCalMonth(11)
      setCalYear((y) => y - 1)
      return
    }
    setCalMonth((m) => m - 1)
  }

  function nextMonth() {
    if (calMonth === 11) {
      setCalMonth(0)
      setCalYear((y) => y + 1)
      return
    }
    setCalMonth((m) => m + 1)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Planificacion operativa</p>
              <h1 className="mt-1 text-3xl font-black text-slate-900">Tablero de control</h1>
              <p className="mt-1 text-sm text-slate-600">
                {MONTHS[currentMonth]} {currentYear} | {deptLabel}
                {userProfile.full_name ? ` | ${userProfile.full_name}` : ''}
              </p>
            </div>

            <button
              onClick={() => setShowNewModal(true)}
              className="rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-500"
            >
              + Nueva actividad
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard title="Actividades del mes" value={stats.totalThisMonth} sub={`${stats.completedThisMonth} completadas`} />
            <KpiCard
              title="Cumplimiento"
              value={compliancePct !== null ? `${compliancePct}%` : '-'}
              sub={`Base: ${stats.totalThisMonth} actividades`}
              valueClass={
                compliancePct === null
                  ? 'text-slate-400'
                  : compliancePct >= 80
                    ? 'text-emerald-700'
                    : compliancePct >= 50
                      ? 'text-amber-700'
                      : 'text-rose-700'
              }
            />
            <KpiCard
              title="Vencidas"
              value={stats.overdueCount}
              sub="Requieren accion"
              valueClass={stats.overdueCount > 0 ? 'text-rose-700' : 'text-emerald-700'}
            />
            <KpiCard title="Criticas" value={stats.criticalCount} sub="Alerta roja" valueClass="text-rose-700" />
          </div>

          <div className="mt-6 border-b border-slate-200">
            <div className="flex gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-t-md px-4 py-2 text-sm font-semibold transition-colors ${
                    activeTab === tab.key
                      ? 'border-b-2 border-sky-600 text-sky-700'
                      : 'border-b-2 border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                  {tab.badge ? (
                    <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 text-[10px] text-white">
                      {tab.badge}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </div>

        {activeTab === 'overview' ? (
          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
            <section className="xl:col-span-2 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900">Proximas actividades (60 dias)</h2>
                  <button onClick={() => setActiveTab('calendar')} className="text-sm font-semibold text-sky-700 hover:text-sky-600">
                    Ver calendario
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {upcoming.length > 0 ? (
                    upcoming.slice(0, 12).map((item) => <ActivityRow key={item.agenda_id} item={item} today={today} />)
                  ) : (
                    <EmptyPanel
                      title="No hay actividades programadas"
                      sub="Empieza creando el primer plan del area"
                      action={{ label: 'Crear actividad', onClick: () => setShowNewModal(true) }}
                    />
                  )}
                </div>
              </div>
            </section>

            <aside className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900">Accesos operativos</h3>
                <div className="mt-3 grid grid-cols-1 gap-3">
                  <QuickAction title="Mantenimiento" sub="Tickets, activos y ordenes" href="/mantenimiento" />
                  <QuickAction title="Inspecciones" sub="Checklists y bandeja" href="/inspections" />
                  <QuickAction title="Inventario" sub="Activos y catalogos" href="/assets" />
                  <QuickAction title="Capacitacion" sub="Cursos y progreso" href="/academia" />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900">Estado de riesgo</h3>
                <div className="mt-3 space-y-2 text-sm">
                  <p className="flex items-center justify-between text-slate-700">
                    <span>Alertas activas</span>
                    <span className="font-bold text-rose-700">{alertItems.length}</span>
                  </p>
                  <p className="flex items-center justify-between text-slate-700">
                    <span>Vencidas</span>
                    <span className="font-bold text-rose-700">{stats.overdueCount}</span>
                  </p>
                  <p className="flex items-center justify-between text-slate-700">
                    <span>Cumplimiento</span>
                    <span className="font-bold text-slate-900">{compliancePct !== null ? `${compliancePct}%` : '-'}</span>
                  </p>
                </div>
              </div>
            </aside>
          </div>
        ) : null}

        {activeTab === 'calendar' ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <button onClick={prevMonth} className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                Anterior
              </button>
              <h2 className="text-base font-bold text-slate-900">
                {MONTHS[calMonth]} {calYear}
              </h2>
              <button onClick={nextMonth} className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                Siguiente
              </button>
            </div>

            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
              {WEEK_DAYS.map((day) => (
                <div key={day} className="px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-slate-600">
                  {day}
                </div>
              ))}
            </div>

            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 border-b border-slate-100 last:border-b-0">
                {week.map((day, di) => {
                  const isToday = day !== null && todayParts.y === calYear && todayParts.m === calMonth && todayParts.d === day
                  const items = day !== null ? activitiesByDay[day] ?? [] : []
                  return (
                    <div key={di} className="min-h-[98px] border-r border-slate-100 p-1.5 last:border-r-0">
                      {day === null ? null : (
                        <>
                          <div className="mb-1 flex items-center justify-between">
                            <span
                              className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                                isToday ? 'bg-sky-600 text-white' : 'text-slate-700'
                              }`}
                            >
                              {day}
                            </span>
                            {items.length > 0 ? <span className="text-[10px] text-slate-500">{items.length}</span> : null}
                          </div>

                          <div className="space-y-1">
                            {items.slice(0, 3).map((item) => (
                              <div
                                key={item.agenda_id}
                                className="truncate rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-700"
                                title={`${item.plan_nombre} | ${item.estado}`}
                              >
                                {item.plan_nombre}
                              </div>
                            ))}
                            {items.length > 3 ? <p className="text-[10px] text-slate-500">+{items.length - 3} mas</p> : null}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        ) : null}

        {activeTab === 'alerts' ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Alertas de cumplimiento</h2>
            <p className="mt-1 text-sm text-slate-500">{alertItems.length} actividades vencidas o en riesgo</p>

            <div className="mt-4 space-y-3">
              {alertItems.length > 0 ? (
                alertItems.map((item) => <AlertRow key={item.agenda_id} item={item} />)
              ) : (
                <EmptyPanel title="Sin alertas activas" sub="Todas las actividades estan al dia" />
              )}
            </div>
          </div>
        ) : null}

        {showNewModal ? (
          <NewActivityModal
            defaultDept={defaultDept}
            canChangeDept={canSeeAll}
            onClose={() => setShowNewModal(false)}
            onCreated={() => {
              setShowNewModal(false)
              window.location.reload()
            }}
          />
        ) : null}
      </div>
    </div>
  )
}
