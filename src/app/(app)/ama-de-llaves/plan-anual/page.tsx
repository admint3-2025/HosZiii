export const metadata = {
  title: 'Plan Anual | Ama de Llaves | ZIII HoS',
}

type Pillar = {
  key: 'conservacion' | 'inventarios' | 'calidad' | 'capital_humano'
  label: string
  objectiveLabel: string
  value: number
  max: number
}

type AnnualCommitment = {
  id: string
  pillarLabel: string
  title: string
  frequencyOrDeadline: string
  progressLabel: string
  progress: number
  targetLabel: string
  status: 'En Tiempo' | 'Riesgo' | 'Completado' | 'Precaución' | 'Pendiente'
  evidenceCount: number
}

function StatusPill({ status }: { status: AnnualCommitment['status'] }) {
  const styles: Record<AnnualCommitment['status'], string> = {
    'En Tiempo': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    Riesgo: 'bg-rose-50 text-rose-700 border-rose-200',
    Completado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Precaución: 'bg-amber-50 text-amber-700 border-amber-200',
    Pendiente: 'bg-slate-50 text-slate-700 border-slate-200',
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${styles[status]}`}>
      {status}
    </span>
  )
}

function ProgressBar({ progress, tone }: { progress: number; tone: 'indigo' | 'emerald' | 'rose' | 'amber' | 'slate' }) {
  const tones: Record<typeof tone, string> = {
    indigo: 'bg-indigo-600',
    emerald: 'bg-emerald-600',
    rose: 'bg-rose-600',
    amber: 'bg-amber-600',
    slate: 'bg-slate-600',
  }

  return (
    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
      <div className={`h-full ${tones[tone]} rounded-full`} style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
    </div>
  )
}

export default function HousekeepingAnnualPlanPage() {
  const pillars: Pillar[] = [
    { key: 'conservacion', label: 'Conservación', objectiveLabel: '95% Obj.', value: 82, max: 100 },
    { key: 'inventarios', label: 'Inventarios', objectiveLabel: '95% Obj.', value: 82, max: 100 },
    { key: 'calidad', label: 'Calidad', objectiveLabel: '95% Obj.', value: 82, max: 100 },
    { key: 'capital_humano', label: 'Capital Humano', objectiveLabel: '95% Obj.', value: 82, max: 100 },
  ]

  const rows: AnnualCommitment[] = [
    {
      id: 'HK-PA-001',
      pillarLabel: 'CONSERVACIÓN ACTIVO',
      title: 'Volteo de Colchones (Total Propiedad)',
      frequencyOrDeadline: 'Vence: 30 Mar 2026',
      progressLabel: '75 %',
      progress: 75,
      targetLabel: 'Meta: 100',
      status: 'En Tiempo',
      evidenceCount: 2,
    },
    {
      id: 'HK-PA-002',
      pillarLabel: 'CONSERVACIÓN ACTIVO',
      title: 'Lavado Profundo Alfombras Pasillos',
      frequencyOrDeadline: 'Vence: 30 Jun 2026',
      progressLabel: '15 %',
      progress: 15,
      targetLabel: 'Meta: 100',
      status: 'Riesgo',
      evidenceCount: 1,
    },
    {
      id: 'HK-PA-003',
      pillarLabel: 'INVENTARIOS',
      title: 'Inventario Físico Blancos (Mensual)',
      frequencyOrDeadline: 'Vence: 28 Feb 2026',
      progressLabel: '100 Ejecutado',
      progress: 100,
      targetLabel: 'Meta: 100',
      status: 'Completado',
      evidenceCount: 1,
    },
    {
      id: 'HK-PA-004',
      pillarLabel: 'CALIDAD',
      title: 'Inspecciones LUD (Limpieza Último Detalle)',
      frequencyOrDeadline: 'Vence: Anual',
      progressLabel: '92 Puntaje',
      progress: 92,
      targetLabel: 'Meta: 95',
      status: 'Precaución',
      evidenceCount: 56,
    },
    {
      id: 'HK-PA-005',
      pillarLabel: 'CAPITAL HUMANO',
      title: 'Capacitación "Manejo de Químicos"',
      frequencyOrDeadline: 'Vence: 15 May 2026',
      progressLabel: '0 % Staff',
      progress: 0,
      targetLabel: 'Meta: 100',
      status: 'Pendiente',
      evidenceCount: 0,
    },
  ]

  const statusTone: Record<AnnualCommitment['status'], Parameters<typeof ProgressBar>[0]['tone']> = {
    'En Tiempo': 'indigo',
    Riesgo: 'rose',
    Completado: 'emerald',
    Precaución: 'amber',
    Pendiente: 'slate',
  }

  return (
    <main className="p-6 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Plan Anual de Compromisos HK</h1>
          <p className="text-sm text-slate-500 font-medium">Gestión de Cumplimiento 2026 • Todas las Sedes</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-bold hover:bg-slate-50 transition-colors"
          >
            Reporte Ejecutivo
          </button>
          <button
            type="button"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold hover:shadow-lg transition-all"
          >
            + Nuevo Compromiso
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {pillars.map((p) => {
          const pct = p.max > 0 ? Math.round((p.value / p.max) * 100) : 0
          return (
            <div key={p.key} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">{p.label}</div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                  {p.objectiveLabel}
                </span>
              </div>

              <div className="mt-3 flex items-baseline gap-1">
                <div className="text-2xl font-extrabold text-slate-900">{p.value}</div>
                <div className="text-xs font-bold text-slate-400">/{p.max}%</div>
              </div>

              <div className="mt-3">
                <ProgressBar progress={pct} tone="indigo" />
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="grid grid-cols-12 gap-4 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
            <div className="col-span-4">Categoría / Compromiso</div>
            <div className="col-span-2">Frecuencia / Deadline</div>
            <div className="col-span-3">Avance vs Meta</div>
            <div className="col-span-2">Estado</div>
            <div className="col-span-1 text-right">Acción</div>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {rows.map((r) => (
            <div key={r.id} className="px-5 py-4">
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-4">
                  <div className="text-[11px] font-extrabold text-indigo-600 uppercase tracking-wider">{r.pillarLabel}</div>
                  <div className="mt-1 text-sm font-bold text-slate-900">{r.title}</div>
                </div>

                <div className="col-span-2">
                  <div className="text-xs font-bold text-rose-600">{r.frequencyOrDeadline}</div>
                </div>

                <div className="col-span-3">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-800">{r.progressLabel}</span>
                    <span className="text-slate-400">{r.targetLabel}</span>
                  </div>
                  <div className="mt-2">
                    <ProgressBar progress={r.progress} tone={statusTone[r.status]} />
                  </div>
                </div>

                <div className="col-span-2">
                  <StatusPill status={r.status} />
                </div>

                <div className="col-span-1 flex justify-end">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50"
                    aria-label="Acciones"
                    title="Acciones"
                  >
                    ⋯
                  </button>
                </div>
              </div>

              <div className="mt-3 text-[11px] text-slate-500 font-semibold">
                Evidencia: <span className="text-slate-700 font-bold">{r.evidenceCount}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
