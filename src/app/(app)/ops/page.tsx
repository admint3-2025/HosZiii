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

const VIEW_LABELS: Record<string, string> = {
  operativa: 'Vista Operativa',
  riesgo: 'Dashboard de Riesgo',
  financiera: 'Vista Financiera',
}

const STATUS_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  completado: 'Completado',
  cancelado: 'Cancelado',
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

function semaphoreDot(flag: 'GREEN' | 'YELLOW' | 'RED') {
  const color =
    flag === 'RED' ? 'bg-rose-500' :
    flag === 'YELLOW' ? 'bg-amber-400' :
    'bg-emerald-500'

  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} aria-label={flag} />
}

function formatMoney(value: number, currency = 'USD') {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
}

function formatShortDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

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

  const [calendarData, complianceData, financialData] = await Promise.all([
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
    impact: complianceData.reduce((sum, x) => sum + Number(x.impacto_financiero || 0), 0),
  }

  return (
    <main className="p-4 md:p-6 space-y-4">
      <header className="rounded-lg border border-slate-800 bg-slate-950 p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-base md:text-lg font-semibold text-slate-100">Operaciones · Presupuestos, Agenda y Cumplimiento</h1>
            <p className="text-xs text-slate-400">Alta densidad operacional · Semáforo de aging (Verde / Amarillo / Rojo)</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-slate-300">Overdue: <span className="font-semibold text-slate-100">{totals.overdue}</span></div>
            <div className="rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-amber-300">Warning: <span className="font-semibold">{totals.yellow}</span></div>
            <div className="rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-rose-300">Critical: <span className="font-semibold">{totals.red}</span></div>
            <div className="rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-slate-300">Impacto: <span className="font-semibold text-slate-100">{formatMoney(totals.impact)}</span></div>
          </div>
        </div>
      </header>

      <section className="rounded-lg border border-slate-800 bg-slate-950 p-3">
        <form className="grid grid-cols-1 gap-2 md:grid-cols-7">
          <input type="hidden" name="view" value={view} />

          <select name="departamento" defaultValue={params.departamento || ''} className="h-9 rounded border border-slate-700 bg-slate-900 px-2 text-xs text-slate-200">
            <option value="">Todos los departamentos</option>
            {departamentos.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          <select name="centro_costo" defaultValue={params.centro_costo || ''} className="h-9 rounded border border-slate-700 bg-slate-900 px-2 text-xs text-slate-200">
            <option value="">Todos los centros de costo</option>
            {centrosCosto.map((cc) => (
              <option key={cc} value={cc}>{cc}</option>
            ))}
          </select>

          <select name="estado" defaultValue={params.estado || ''} className="h-9 rounded border border-slate-700 bg-slate-900 px-2 text-xs text-slate-200">
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_proceso">En proceso</option>
            <option value="completado">Completado</option>
            <option value="cancelado">Cancelado</option>
          </select>

          <input name="from" type="date" defaultValue={params.from || ''} className="h-9 rounded border border-slate-700 bg-slate-900 px-2 text-xs text-slate-200" />
          <input name="to" type="date" defaultValue={params.to || ''} className="h-9 rounded border border-slate-700 bg-slate-900 px-2 text-xs text-slate-200" />
          <input name="as_of_date" type="date" defaultValue={params.as_of_date || ''} className="h-9 rounded border border-slate-700 bg-slate-900 px-2 text-xs text-slate-200" />

          <button type="submit" className="h-9 rounded border border-slate-600 bg-slate-800 px-3 text-xs font-medium text-slate-100 hover:bg-slate-700">
            Aplicar filtros
          </button>
        </form>
      </section>

      <nav className="flex gap-2 text-xs">
        {(['operativa', 'riesgo', 'financiera'] as const).map((tab) => {
          const active = tab === view
          return (
            <Link
              key={tab}
              href={buildHref(tab, params)}
              className={`rounded border px-3 py-1.5 ${active ? 'border-slate-500 bg-slate-700 text-slate-100' : 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'}`}
            >
              {VIEW_LABELS[tab]}
            </Link>
          )
        })}
      </nav>

      {view === 'operativa' && (
        <section className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-900 text-slate-300">
                <tr className="text-left">
                  <th className="px-2 py-2 font-medium">Semáforo</th>
                  <th className="px-2 py-2 font-medium">Aging</th>
                  <th className="px-2 py-2 font-medium">Vence</th>
                  <th className="px-2 py-2 font-medium">Entidad</th>
                  <th className="px-2 py-2 font-medium">Plan</th>
                  <th className="px-2 py-2 font-medium">Departamento</th>
                  <th className="px-2 py-2 font-medium">Estado</th>
                  <th className="px-2 py-2 font-medium text-right">Estimado</th>
                </tr>
              </thead>
              <tbody>
                {calendarData.map((row) => (
                  <tr key={row.agenda_id} className="border-t border-slate-800 text-slate-200">
                    <td className="px-2 py-1.5">{semaphoreDot(row.semaforo)}</td>
                    <td className="px-2 py-1.5">{row.aging_days}d</td>
                    <td className="px-2 py-1.5">{formatShortDate(row.due_date)}</td>
                    <td className="px-2 py-1.5">{row.entidad_objetivo}</td>
                    <td className="px-2 py-1.5 max-w-[280px] truncate">{row.plan_nombre}</td>
                    <td className="px-2 py-1.5">{row.departamento_dueno}</td>
                    <td className="px-2 py-1.5">{STATUS_LABELS[row.estado] || row.estado}</td>
                    <td className="px-2 py-1.5 text-right">{formatMoney(row.monto_estimado)}</td>
                  </tr>
                ))}
                {calendarData.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-2 py-4 text-center text-slate-400">Sin registros operativos para los filtros seleccionados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {view === 'riesgo' && (
        <section className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-900 text-slate-300">
                <tr className="text-left">
                  <th className="px-2 py-2 font-medium">Semáforo</th>
                  <th className="px-2 py-2 font-medium">Aging</th>
                  <th className="px-2 py-2 font-medium">Vence</th>
                  <th className="px-2 py-2 font-medium">Departamento</th>
                  <th className="px-2 py-2 font-medium">Entidad</th>
                  <th className="px-2 py-2 font-medium">Plan</th>
                  <th className="px-2 py-2 font-medium text-right">Impacto</th>
                </tr>
              </thead>
              <tbody>
                {complianceData
                  .filter((x) => x.aging_days > 0)
                  .map((row) => (
                    <tr key={row.agenda_id} className="border-t border-slate-800 text-slate-200">
                      <td className="px-2 py-1.5">{semaphoreDot(row.alert_flag)}</td>
                      <td className="px-2 py-1.5">{row.aging_days}d</td>
                      <td className="px-2 py-1.5">{formatShortDate(row.due_date)}</td>
                      <td className="px-2 py-1.5">{row.departamento}</td>
                      <td className="px-2 py-1.5">{row.entidad_objetivo}</td>
                      <td className="px-2 py-1.5 max-w-[280px] truncate">{row.plan_nombre}</td>
                      <td className="px-2 py-1.5 text-right">{formatMoney(row.impacto_financiero)}</td>
                    </tr>
                  ))}
                {complianceData.filter((x) => x.aging_days > 0).length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-2 py-4 text-center text-slate-400">Sin ítems vencidos (Aging &gt; 0) en este momento.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {view === 'financiera' && (
        <section className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-900 text-slate-300">
                <tr className="text-left">
                  <th className="px-2 py-2 font-medium">Plan</th>
                  <th className="px-2 py-2 font-medium">Departamento</th>
                  <th className="px-2 py-2 font-medium">Centro costo</th>
                  <th className="px-2 py-2 font-medium text-right">Planeado</th>
                  <th className="px-2 py-2 font-medium text-right">Real</th>
                  <th className="px-2 py-2 font-medium text-right">Variación</th>
                  <th className="px-2 py-2 font-medium text-right">Variación %</th>
                </tr>
              </thead>
              <tbody>
                {financialData.map((row) => {
                  const varianceClass = Number(row.variacion_abs) > 0 ? 'text-rose-300' : 'text-emerald-300'
                  return (
                    <tr key={row.plan_id} className="border-t border-slate-800 text-slate-200">
                      <td className="px-2 py-1.5 max-w-[300px] truncate">{row.plan_nombre}</td>
                      <td className="px-2 py-1.5">{row.departamento_dueno}</td>
                      <td className="px-2 py-1.5">{row.centro_costo || '-'}</td>
                      <td className="px-2 py-1.5 text-right">{formatMoney(row.monto_total_planeado, row.moneda)}</td>
                      <td className="px-2 py-1.5 text-right">{formatMoney(row.monto_real_total, row.moneda)}</td>
                      <td className={`px-2 py-1.5 text-right font-medium ${varianceClass}`}>{formatMoney(row.variacion_abs, row.moneda)}</td>
                      <td className={`px-2 py-1.5 text-right font-medium ${varianceClass}`}>{Number(row.variacion_pct || 0).toFixed(2)}%</td>
                    </tr>
                  )
                })}
                {financialData.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-2 py-4 text-center text-slate-400">Sin datos financieros para los filtros seleccionados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  )
}
