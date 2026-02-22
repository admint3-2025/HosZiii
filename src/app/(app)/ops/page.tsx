import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getOperationalCalendar, getComplianceAging, getFinancialControl } from '@/lib/ops/service'

export const dynamic = 'force-dynamic'

type OpsSearchParams = {
  view?: string
  departamento?: string
  centro_costo?: string
  estado?: string
  from?: string
  to?: string
  as_of_date?: string
}

const VIEW_TABS = [
  { key: 'operativa', label: 'Vista Operativa', icon: '📊' },
  { key: 'riesgo', label: 'Riesgo y Cumplimiento', icon: '⚠️' },
  { key: 'financiera', label: 'Control Financiero', icon: '💰' },
] as const

const STATUS_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  completado: 'Completado',
  cancelado: 'Cancelado',
}

const STATUS_DOT: Record<string, string> = {
  pendiente: 'bg-slate-400',
  en_proceso: 'bg-blue-400',
  completado: 'bg-emerald-400',
  cancelado: 'bg-rose-400',
}

function buildHref(view: string, params: OpsSearchParams) {
  const query = new URLSearchParams()
  query.set('view', view)
  if (params.departamento) query.set('departamento', params.departamento)
  if (params.centro_costo) query.set('centro_costo', params.centro_costo)
  if (params.estado) query.set('estado', params.estado)
  if (params.from) query.set('from', params.from)
  if (params.to) query.set('to', params.to)
  if (params.as_of_date) query.set('as_of_date', params.as_of_date)
  return `/ops?${query.toString()}`
}

function SemaphoreDot({ flag }: { flag: 'GREEN' | 'YELLOW' | 'RED' }) {
  const cls =
    flag === 'RED'    ? 'bg-rose-500 shadow-rose-500/50' :
    flag === 'YELLOW' ? 'bg-amber-400 shadow-amber-400/50' :
                        'bg-emerald-500 shadow-emerald-500/50'
  return <span className={`inline-block h-3 w-3 rounded-full shadow-sm ${cls}`} aria-label={flag} />
}

function StatusPill({ value }: { value: string }) {
  const dot = STATUS_DOT[value] || 'bg-slate-500'
  const label = STATUS_LABELS[value] || value
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      <span className="text-[13px] text-slate-300">{label}</span>
    </span>
  )
}

function formatMoney(value: number, currency = 'USD') {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

function formatShortDate(value: string) {
  const date = new Date(value + 'T00:00:00')
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Reusable card wrapper
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-white/[0.06] bg-gradient-to-b from-slate-900/80 to-slate-950/90 shadow-xl shadow-black/20 ${className}`}>{children}</div>
}

const inputCls = 'h-10 w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-slate-200 placeholder:text-slate-600 focus:border-indigo-500/50 focus:bg-white/[0.06] focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all'

export default async function OpsPage({
  searchParams,
}: {
  searchParams: Promise<OpsSearchParams>
}) {
  const supabase = await createSupabaseServerClient()
  const params = (await searchParams) ?? {}

  const view = ['operativa', 'riesgo', 'financiera'].includes(params.view || '')
    ? (params.view as 'operativa' | 'riesgo' | 'financiera')
    : 'operativa'

  let calendarData: Awaited<ReturnType<typeof getOperationalCalendar>> = []
  let complianceData: Awaited<ReturnType<typeof getComplianceAging>> = []
  let financialData: Awaited<ReturnType<typeof getFinancialControl>> = []
  let loadError: string | null = null

  try {
    ;[calendarData, complianceData, financialData] = await Promise.all([
      getOperationalCalendar(supabase, {
        from: params.from ?? null,
        to: params.to ?? null,
        departamento: params.departamento ?? null,
        centroCosto: params.centro_costo ?? null,
        estado: params.estado ?? null,
        limit: 500,
      }),
      getComplianceAging(supabase, {
        asOfDate: params.as_of_date ?? null,
        departamento: params.departamento ?? null,
        centroCosto: params.centro_costo ?? null,
      }),
      getFinancialControl(supabase, {
        departamento: params.departamento ?? null,
        centroCosto: params.centro_costo ?? null,
      }),
    ])
  } catch (error: any) {
    loadError = String(error?.message ?? error)
  }

  const departamentos = Array.from(
    new Set([
      ...calendarData.map((x) => x.departamento_dueno),
      ...complianceData.map((x) => x.departamento),
      ...financialData.map((x) => x.departamento_dueno),
    ].filter(Boolean)),
  ).sort()

  const centrosCosto = Array.from(
    new Set([
      ...calendarData.map((x) => x.centro_costo),
      ...complianceData.map((x) => x.centro_costo),
      ...financialData.map((x) => x.centro_costo),
    ].filter((x): x is string => Boolean(x))),
  ).sort()

  const totals = {
    overdue: complianceData.filter((x) => x.aging_days > 0).length,
    red: complianceData.filter((x) => x.alert_flag === 'RED').length,
    yellow: complianceData.filter((x) => x.alert_flag === 'YELLOW').length,
    green: complianceData.filter((x) => x.alert_flag === 'GREEN').length,
    impact: complianceData.reduce((sum, x) => sum + Number(x.impacto_financiero || 0), 0),
    totalPlans: financialData.length,
  }

  return (
    <main className="space-y-5 max-w-[1400px] mx-auto">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Dashboard Operacional</h1>
          <p className="text-sm text-slate-500 mt-0.5">Presupuestos · Agenda · Cumplimiento</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/ops/gestion"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-500/15 border border-indigo-500/25 px-4 py-2.5 text-sm font-medium text-indigo-300 hover:bg-indigo-500/25 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Gestión
          </Link>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Vencidos', value: totals.overdue, color: 'text-slate-100', dot: 'bg-slate-400', sub: 'overdue items' },
          { label: 'Advertencia', value: totals.yellow, color: 'text-amber-300', dot: 'bg-amber-400 shadow-amber-400/50', sub: 'alerta amarilla' },
          { label: 'Críticos', value: totals.red, color: 'text-rose-300', dot: 'bg-rose-400 shadow-rose-400/50', sub: 'alerta roja' },
          { label: 'Impacto Total', value: formatMoney(totals.impact), color: 'text-white', dot: 'bg-indigo-400 shadow-indigo-400/50', sub: 'financiero' },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <div className="px-4 py-3.5">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`h-2.5 w-2.5 rounded-full shadow-sm ${kpi.dot}`} />
                <span className="text-sm text-slate-400">{kpi.label}</span>
              </div>
              <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
              <p className="text-xs text-slate-600 mt-0.5">{kpi.sub}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* ── Error ──────────────────────────────────────────────────── */}
      {loadError && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-5 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400 shadow-sm shadow-rose-400/50" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-rose-300">No se pudo cargar Operaciones</p>
            <p className="text-sm text-rose-200/80 mt-0.5">Verifica la migración del esquema ops en Supabase.</p>
            <p className="break-all text-xs text-rose-200/60 mt-1">{loadError}</p>
          </div>
        </div>
      )}

      {/* ── Filtros ────────────────────────────────────────────────── */}
      <Card>
        <div className="px-5 py-4">
          <form className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
            <input type="hidden" name="view" value={view} />

            <select name="departamento" defaultValue={params.departamento || ''} className={inputCls}>
              <option value="">Todos los departamentos</option>
              {departamentos.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>

            <select name="centro_costo" defaultValue={params.centro_costo || ''} className={inputCls}>
              <option value="">Todos los centros de costo</option>
              {centrosCosto.map((cc) => (
                <option key={cc} value={cc}>{cc}</option>
              ))}
            </select>

            <select name="estado" defaultValue={params.estado || ''} className={inputCls}>
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="en_proceso">En proceso</option>
              <option value="completado">Completado</option>
              <option value="cancelado">Cancelado</option>
            </select>

            <input name="from" type="date" defaultValue={params.from || ''} className={inputCls} title="Desde" />
            <input name="to" type="date" defaultValue={params.to || ''} className={inputCls} title="Hasta" />
            <input name="as_of_date" type="date" defaultValue={params.as_of_date || ''} className={inputCls} title="Fecha de corte" />

            <button type="submit" className="h-10 rounded-lg bg-indigo-500 px-4 text-sm font-semibold text-white hover:bg-indigo-400 shadow-lg shadow-indigo-500/20 transition-all">
              Aplicar filtros
            </button>
          </form>
        </div>
      </Card>

      {/* ── Tabs ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1">
        {VIEW_TABS.map((t) => {
          const active = t.key === view
          return (
            <Link
              key={t.key}
              href={buildHref(t.key, params)}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all ${
                active
                  ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 shadow-sm shadow-indigo-500/10'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
            </Link>
          )
        })}
      </div>

      {/* ═══════════════ VISTA OPERATIVA ═══════════════ */}
      {view === 'operativa' && (
        <Card>
          <div className="border-b border-white/[0.06] px-5 py-3.5">
            <h2 className="text-base font-semibold text-white">Calendario Operativo</h2>
            <p className="text-sm text-slate-500 mt-0.5">{calendarData.length} registros · Semáforo por aging</p>
          </div>
          <div className="overflow-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Semáforo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Aging</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Vence</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Entidad</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Plan</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Departamento</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Estimado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {calendarData.map((row) => (
                  <tr key={row.agenda_id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-2.5"><SemaphoreDot flag={row.semaforo} /></td>
                    <td className="px-4 py-2.5 text-sm font-mono text-slate-300">{row.aging_days}d</td>
                    <td className="px-4 py-2.5 text-sm text-slate-300">{formatShortDate(row.due_date)}</td>
                    <td className="px-4 py-2.5 text-sm text-slate-200 font-medium">{row.entidad_objetivo}</td>
                    <td className="px-4 py-2.5 text-sm text-slate-300 max-w-[280px] truncate">{row.plan_nombre}</td>
                    <td className="px-4 py-2.5 text-sm text-slate-400">{row.departamento_dueno}</td>
                    <td className="px-4 py-2.5"><StatusPill value={row.estado} /></td>
                    <td className="px-4 py-2.5 text-sm text-right font-medium text-slate-200">{formatMoney(row.monto_estimado)}</td>
                  </tr>
                ))}
                {calendarData.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-600">Sin registros operativos para los filtros seleccionados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ═══════════════ RIESGO Y CUMPLIMIENTO ═══════════════ */}
      {view === 'riesgo' && (
        <Card>
          <div className="border-b border-white/[0.06] px-5 py-3.5">
            <h2 className="text-base font-semibold text-white">Matriz de Riesgo y Cumplimiento</h2>
            <p className="text-sm text-slate-500 mt-0.5">{complianceData.filter((x) => x.aging_days > 0).length} ítems vencidos</p>
          </div>
          <div className="overflow-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Alerta</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Aging</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Vence</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Departamento</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Entidad</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Plan</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Impacto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {complianceData
                  .filter((x) => x.aging_days > 0)
                  .map((row) => (
                    <tr key={row.agenda_id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-2.5"><SemaphoreDot flag={row.alert_flag} /></td>
                      <td className="px-4 py-2.5 text-sm font-mono text-slate-300">{row.aging_days}d</td>
                      <td className="px-4 py-2.5 text-sm text-slate-300">{formatShortDate(row.due_date)}</td>
                      <td className="px-4 py-2.5 text-sm text-slate-200 font-medium">{row.departamento}</td>
                      <td className="px-4 py-2.5 text-sm text-slate-300">{row.entidad_objetivo}</td>
                      <td className="px-4 py-2.5 text-sm text-slate-300 max-w-[280px] truncate">{row.plan_nombre}</td>
                      <td className="px-4 py-2.5 text-sm text-right font-medium text-rose-300">{formatMoney(row.impacto_financiero)}</td>
                    </tr>
                  ))}
                {complianceData.filter((x) => x.aging_days > 0).length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-600">Sin ítems vencidos (Aging &gt; 0) en este momento.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ═══════════════ CONTROL FINANCIERO ═══════════════ */}
      {view === 'financiera' && (
        <Card>
          <div className="border-b border-white/[0.06] px-5 py-3.5">
            <h2 className="text-base font-semibold text-white">Control Financiero</h2>
            <p className="text-sm text-slate-500 mt-0.5">{financialData.length} planes · Planeado vs Real</p>
          </div>
          <div className="overflow-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Plan</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Departamento</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Centro Costo</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Planeado</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Real</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Variación</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Var %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {financialData.map((row) => {
                  const varianceClass = Number(row.variacion_abs) > 0 ? 'text-rose-300' : 'text-emerald-300'
                  return (
                    <tr key={row.plan_id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-2.5 text-sm text-slate-200 font-medium max-w-[300px] truncate">{row.plan_nombre}</td>
                      <td className="px-4 py-2.5 text-sm text-slate-300">{row.departamento_dueno}</td>
                      <td className="px-4 py-2.5 text-sm text-slate-400">{row.centro_costo || '-'}</td>
                      <td className="px-4 py-2.5 text-sm text-right text-slate-200">{formatMoney(row.monto_total_planeado, row.moneda)}</td>
                      <td className="px-4 py-2.5 text-sm text-right text-slate-200">{formatMoney(row.monto_real_total, row.moneda)}</td>
                      <td className={`px-4 py-2.5 text-sm text-right font-semibold ${varianceClass}`}>{formatMoney(row.variacion_abs, row.moneda)}</td>
                      <td className={`px-4 py-2.5 text-sm text-right font-semibold ${varianceClass}`}>{Number(row.variacion_pct || 0).toFixed(1)}%</td>
                    </tr>
                  )
                })}
                {financialData.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-600">Sin datos financieros para los filtros seleccionados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </main>
  )
}
