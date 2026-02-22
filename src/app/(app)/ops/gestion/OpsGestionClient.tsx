'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

// ── Tipos ─────────────────────────────────────────────────────────────
type Responsable = { id: string; codigo: string | null; nombre: string; tipo: string; departamento: string | null; email: string | null; activo: boolean }
type Entidad = { id: string; codigo: string | null; nombre: string; tipo_entidad: string; categoria: string; departamento: string; centro_costo: string | null; responsable_proveedor_id: string | null; responsable: { nombre: string } | null }
type Plan = { id: string; codigo_plan: string | null; nombre: string; descripcion: string | null; departamento_dueno: string; centro_costo: string | null; moneda: string; entidad_objetivo_id: string; frecuencia_tipo: string; frecuencia_intervalo: number; fecha_inicio: string; fecha_fin: string; monto_total_planeado: number; esfuerzo_total_planeado: number; estado: string; entidad: { nombre: string } | null; responsable: { nombre: string } | null }
type AgendaItem = { id: string; ocurrencia_nro: number; due_date: string; monto_estimado: number; estado: string; prioridad: string }

const TABS = [
  { key: 'planes' as const, label: 'Planes Maestros', icon: '📋' },
  { key: 'catálogos' as const, label: 'Catálogos', icon: '📁' },
  { key: 'agenda' as const, label: 'Agenda', icon: '📅' },
]
type Tab = 'catálogos' | 'planes' | 'agenda'

const FREQ_LABELS: Record<string, string> = {
  daily: 'Diario', weekly: 'Semanal', monthly: 'Mensual',
  quarterly: 'Trimestral', yearly: 'Anual', custom_days: 'Personalizado',
}

const ESTADO_DOT: Record<string, string> = {
  activo: 'bg-emerald-400 shadow-emerald-400/50',
  pausado: 'bg-amber-400 shadow-amber-400/50',
  cerrado: 'bg-slate-500 shadow-slate-500/40',
  pendiente: 'bg-slate-400 shadow-slate-400/40',
  en_proceso: 'bg-blue-400 shadow-blue-400/50',
  completado: 'bg-emerald-400 shadow-emerald-400/50',
  cancelado: 'bg-rose-400 shadow-rose-400/50',
}

const ESTADO_LABEL: Record<string, string> = {
  activo: 'Activo', pausado: 'Pausado', cerrado: 'Cerrado',
  pendiente: 'Pendiente', en_proceso: 'En proceso',
  completado: 'Completado', cancelado: 'Cancelado',
  interno: 'Interno', externo: 'Externo',
  baja: 'Baja', media: 'Media', alta: 'Alta', critica: 'Crítica',
}

function StatusBadge({ value }: { value: string }) {
  const dot = ESTADO_DOT[value] || 'bg-slate-500'
  const label = ESTADO_LABEL[value] || value.replace('_', ' ')
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full shadow-sm ${dot}`} />
      <span className="text-sm font-medium text-slate-300 capitalize">{label}</span>
    </span>
  )
}

function formatMoney(v: number, c = 'USD') {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(Number(v || 0))
}

function formatShortDate(value: string) {
  const d = new Date(value + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Componentes de UI reutilizables ───────────────────────────────────
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-white/[0.06] bg-gradient-to-b from-slate-900/80 to-slate-950/90 shadow-xl shadow-black/20 backdrop-blur ${className}`}>{children}</div>
}

function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
      <div>
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

function EmptyRow({ cols, text }: { cols: number; text: string }) {
  return <tr><td colSpan={cols} className="px-4 py-8 text-center text-sm text-slate-600">{text}</td></tr>
}

// ── Componente principal ──────────────────────────────────────────────
export default function OpsGestionClient() {
  const [tab, setTab] = useState<Tab>('planes')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [responsables, setResponsables] = useState<Responsable[]>([])
  const [entidades, setEntidades] = useState<Entidad[]>([])
  const [planes, setPlanes] = useState<Plan[]>([])
  const [agenda, setAgenda] = useState<AgendaItem[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)

  const [showNewResp, setShowNewResp] = useState(false)
  const [showNewEnt, setShowNewEnt] = useState(false)
  const [showNewPlan, setShowNewPlan] = useState(false)

  const clearMessages = () => { setError(null); setSuccess(null) }
  const flash = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(null), 4000) }

  // ── Fetchers ────────────────────────────────────────────────────────
  const fetchResponsables = useCallback(async () => {
    const res = await fetch('/api/ops/responsables')
    const json = await res.json()
    if (json.ok) setResponsables(json.data); else throw new Error(json.error)
  }, [])

  const fetchEntidades = useCallback(async () => {
    const res = await fetch('/api/ops/entidades')
    const json = await res.json()
    if (json.ok) setEntidades(json.data); else throw new Error(json.error)
  }, [])

  const fetchPlanes = useCallback(async () => {
    const res = await fetch('/api/ops/planes')
    const json = await res.json()
    if (json.ok) setPlanes(json.data); else throw new Error(json.error)
  }, [])

  const fetchAgenda = useCallback(async (planId: string) => {
    const res = await fetch(`/api/ops/agenda?plan_id=${planId}`)
    const json = await res.json()
    if (json.ok) setAgenda(json.data); else throw new Error(json.error)
  }, [])

  useEffect(() => {
    clearMessages()
    setLoading(true)
    const run = async () => {
      try {
        if (tab === 'catálogos') await Promise.all([fetchResponsables(), fetchEntidades()])
        if (tab === 'planes') await Promise.all([fetchPlanes(), fetchEntidades(), fetchResponsables()])
      } catch (e: any) { setError(String(e?.message ?? e)) }
      finally { setLoading(false) }
    }
    run()
  }, [tab, fetchResponsables, fetchEntidades, fetchPlanes])

  // ── Handlers ────────────────────────────────────────────────────────
  async function handleCreateResponsable(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); clearMessages()
    const fd = new FormData(e.currentTarget)
    const body = { nombre: fd.get('nombre') as string, tipo: fd.get('tipo') as string, departamento: (fd.get('departamento') as string) || undefined, email: (fd.get('email') as string) || undefined }
    try {
      setLoading(true)
      const res = await fetch('/api/ops/responsables', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      flash('Responsable creado'); setShowNewResp(false); await fetchResponsables()
    } catch (err: any) { setError(String(err?.message ?? err)) } finally { setLoading(false) }
  }

  async function handleDeleteResponsable(id: string) {
    if (!confirm('¿Eliminar este responsable?')) return
    try { setLoading(true); const res = await fetch(`/api/ops/responsables?id=${id}`, { method: 'DELETE' }); const json = await res.json(); if (!json.ok) throw new Error(json.error); await fetchResponsables() }
    catch (err: any) { setError(String(err?.message ?? err)) } finally { setLoading(false) }
  }

  async function handleCreateEntidad(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); clearMessages()
    const fd = new FormData(e.currentTarget)
    const body = { nombre: fd.get('nombre') as string, tipo_entidad: fd.get('tipo_entidad') as string, categoria: fd.get('categoria') as string, departamento: fd.get('departamento') as string, centro_costo: (fd.get('centro_costo') as string) || undefined, responsable_proveedor_id: (fd.get('responsable_proveedor_id') as string) || undefined }
    try {
      setLoading(true)
      const res = await fetch('/api/ops/entidades', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      flash('Entidad creada'); setShowNewEnt(false); await fetchEntidades()
    } catch (err: any) { setError(String(err?.message ?? err)) } finally { setLoading(false) }
  }

  async function handleDeleteEntidad(id: string) {
    if (!confirm('¿Eliminar esta entidad?')) return
    try { setLoading(true); const res = await fetch(`/api/ops/entidades?id=${id}`, { method: 'DELETE' }); const json = await res.json(); if (!json.ok) throw new Error(json.error); await fetchEntidades() }
    catch (err: any) { setError(String(err?.message ?? err)) } finally { setLoading(false) }
  }

  async function handleCreatePlan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); clearMessages()
    const fd = new FormData(e.currentTarget)
    const body = {
      nombre: fd.get('nombre') as string, departamento_dueno: fd.get('departamento_dueno') as string,
      centro_costo: (fd.get('centro_costo') as string) || undefined, moneda: (fd.get('moneda') as string) || 'USD',
      entidad_objetivo_id: fd.get('entidad_objetivo_id') as string,
      responsable_proveedor_id: (fd.get('responsable_proveedor_id') as string) || undefined,
      fecha_inicio: fd.get('fecha_inicio') as string, fecha_fin: fd.get('fecha_fin') as string,
      frecuencia_tipo: fd.get('frecuencia_tipo') as string, frecuencia_intervalo: Number(fd.get('frecuencia_intervalo') || 1),
      monto_total_planeado: Number(fd.get('monto_total_planeado') || 0),
      esfuerzo_total_planeado: Number(fd.get('esfuerzo_total_planeado') || 0),
      descripcion: (fd.get('descripcion') as string) || undefined,
    }
    try {
      setLoading(true)
      const res = await fetch('/api/ops/planes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      flash('Plan creado exitosamente'); setShowNewPlan(false); await fetchPlanes()
    } catch (err: any) { setError(String(err?.message ?? err)) } finally { setLoading(false) }
  }

  async function handleSeedPlan(planId: string) {
    clearMessages()
    try {
      setLoading(true)
      const res = await fetch(`/api/ops/plans/${planId}/seed`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ replace: false }) })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      flash(`Agenda generada: ${json.data?.created ?? 0} ocurrencias`); await fetchPlanes()
    } catch (err: any) { setError(String(err?.message ?? err)) } finally { setLoading(false) }
  }

  async function handlePlanEstado(id: string, estado: string) {
    try { setLoading(true); const res = await fetch('/api/ops/planes', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, estado }) }); const json = await res.json(); if (!json.ok) throw new Error(json.error); await fetchPlanes() }
    catch (err: any) { setError(String(err?.message ?? err)) } finally { setLoading(false) }
  }

  async function handleDeletePlan(id: string) {
    if (!confirm('¿Eliminar este plan y toda su agenda?')) return
    try { setLoading(true); const res = await fetch(`/api/ops/planes?id=${id}`, { method: 'DELETE' }); const json = await res.json(); if (!json.ok) throw new Error(json.error); await fetchPlanes() }
    catch (err: any) { setError(String(err?.message ?? err)) } finally { setLoading(false) }
  }

  async function handleSelectPlanAgenda(planId: string) {
    clearMessages(); setSelectedPlanId(planId); setTab('agenda'); setLoading(true)
    try { await fetchAgenda(planId) } catch (err: any) { setError(String(err?.message ?? err)) } finally { setLoading(false) }
  }

  async function handleAgendaEstado(id: string, estado: string) {
    try { setLoading(true); const res = await fetch('/api/ops/agenda', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, estado }) }); const json = await res.json(); if (!json.ok) throw new Error(json.error); if (selectedPlanId) await fetchAgenda(selectedPlanId) }
    catch (err: any) { setError(String(err?.message ?? err)) } finally { setLoading(false) }
  }

  // ── Shared styles ───────────────────────────────────────────────────
  const inputCls = 'h-10 w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-slate-200 placeholder:text-slate-600 focus:border-indigo-500/50 focus:bg-white/[0.06] focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all'
  const selectCls = `${inputCls} appearance-none`

  const selectedPlan = planes.find(p => p.id === selectedPlanId)

  // ── Stats ───────────────────────────────────────────────────────────
  const stats = {
    planes: planes.length,
    activos: planes.filter(p => p.estado === 'activo').length,
    entidades: entidades.length,
    responsables: responsables.length,
  }

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Gestión Operacional</h1>
          <p className="text-sm text-slate-500">Catálogos · Planes Maestros · Agenda</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Mini stats */}
          <div className="hidden md:flex items-center gap-2">
            {[
              { n: stats.planes, l: 'Planes', color: 'text-indigo-400' },
              { n: stats.activos, l: 'Activos', color: 'text-emerald-400' },
              { n: stats.entidades, l: 'Entidades', color: 'text-amber-400' },
            ].map(s => (
              <div key={s.l} className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1.5">
                <span className={`text-base font-bold ${s.color}`}>{s.n}</span>
                <span className="text-xs text-slate-500">{s.l}</span>
              </div>
            ))}
          </div>
          <Link
            href="/ops"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/[0.08] hover:text-white transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Dashboard
          </Link>
        </div>
      </div>

      {/* ── Messages ───────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-rose-500/20 bg-rose-500/[0.06] px-4 py-2.5 animate-in fade-in duration-200">
          <span className="h-2 w-2 rounded-full bg-rose-400 shadow-sm shadow-rose-400/50" />
          <p className="flex-1 text-sm text-rose-300">{error}</p>
          <button onClick={clearMessages} className="text-xs text-rose-400/70 hover:text-rose-300">✕</button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-2.5 animate-in fade-in duration-200">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
          <p className="flex-1 text-sm text-emerald-300">{success}</p>
          <button onClick={clearMessages} className="text-xs text-emerald-400/70 hover:text-emerald-300">✕</button>
        </div>
      )}

      {/* ── Tabs ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); clearMessages() }}
            className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
              t.key === tab
                ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 shadow-sm shadow-indigo-500/10'
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <span className="text-base">{t.icon}</span>
            {t.label}
          </button>
        ))}
        {loading && <span className="ml-auto mr-2 h-4 w-4 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-400" />}
      </div>

      {/* ═══════════════ CATÁLOGOS ═══════════════ */}
      {tab === 'catálogos' && (
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Responsables */}
          <Card>
            <CardHeader
              title="Responsables / Proveedores"
              subtitle={`${responsables.length} registrados`}
              action={
                <button onClick={() => setShowNewResp(!showNewResp)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${showNewResp ? 'bg-white/[0.06] text-slate-400' : 'bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25'}`}>
                  {showNewResp ? '✕ Cancelar' : '+ Nuevo'}
                </button>
              }
            />
            <div className="p-4 space-y-3">
              {showNewResp && (
                <form onSubmit={handleCreateResponsable} className="rounded-lg border border-indigo-500/10 bg-indigo-500/[0.03] p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input name="nombre" required placeholder="Nombre *" className={inputCls} />
                    <select name="tipo" required className={selectCls}>
                      <option value="interno">Interno</option>
                      <option value="externo">Externo</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input name="departamento" placeholder="Departamento" className={inputCls} />
                    <input name="email" type="email" placeholder="Email" className={inputCls} />
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" disabled={loading} className="rounded-lg bg-indigo-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50 transition-colors">
                      Crear Responsable
                    </button>
                  </div>
                </form>
              )}
              <div className="space-y-1">
                {responsables.map(r => (
                  <div key={r.id} className="group flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/[0.03] transition-colors">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 text-xs font-bold flex-shrink-0">
                      {r.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{r.nombre}</p>
                      <p className="text-xs text-slate-500">{r.departamento || 'Sin depto.'} · {r.email || 'Sin email'}</p>
                    </div>
                    <StatusBadge value={r.tipo} />
                    <button onClick={() => handleDeleteResponsable(r.id)} className="opacity-0 group-hover:opacity-100 rounded p-1 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all" title="Eliminar">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))}
                {responsables.length === 0 && <p className="py-6 text-center text-sm text-slate-600">Sin responsables. Crea el primero.</p>}
              </div>
            </div>
          </Card>

          {/* Entidades */}
          <Card>
            <CardHeader
              title="Entidades Objetivo"
              subtitle={`${entidades.length} registradas`}
              action={
                <button onClick={() => setShowNewEnt(!showNewEnt)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${showNewEnt ? 'bg-white/[0.06] text-slate-400' : 'bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25'}`}>
                  {showNewEnt ? '✕ Cancelar' : '+ Nueva'}
                </button>
              }
            />
            <div className="p-4 space-y-3">
              {showNewEnt && (
                <form onSubmit={handleCreateEntidad} className="rounded-lg border border-indigo-500/10 bg-indigo-500/[0.03] p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input name="nombre" required placeholder="Nombre *" className={inputCls} />
                    <input name="tipo_entidad" required placeholder="Tipo (equipo, área…) *" className={inputCls} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input name="categoria" required placeholder="Categoría *" className={inputCls} />
                    <input name="departamento" required placeholder="Departamento *" className={inputCls} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input name="centro_costo" placeholder="Centro de costo" className={inputCls} />
                    <select name="responsable_proveedor_id" className={selectCls}>
                      <option value="">Sin responsable</option>
                      {responsables.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                    </select>
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" disabled={loading} className="rounded-lg bg-indigo-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50 transition-colors">
                      Crear Entidad
                    </button>
                  </div>
                </form>
              )}
              <div className="space-y-1">
                {entidades.map(e => (
                  <div key={e.id} className="group flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/[0.03] transition-colors">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 text-xs font-bold flex-shrink-0">
                      {e.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{e.nombre}</p>
                      <p className="text-xs text-slate-500">{e.tipo_entidad} · {e.categoria} · {e.departamento}</p>
                    </div>
                    {e.responsable && <span className="text-xs text-slate-500 hidden sm:inline">{e.responsable.nombre}</span>}
                    <button onClick={() => handleDeleteEntidad(e.id)} className="opacity-0 group-hover:opacity-100 rounded p-1 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all" title="Eliminar">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))}
                {entidades.length === 0 && <p className="py-6 text-center text-sm text-slate-600">Sin entidades. Crea la primera.</p>}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ═══════════════ PLANES MAESTROS ═══════════════ */}
      {tab === 'planes' && (
        <Card>
          <CardHeader
            title="Planes Maestros"
            subtitle={`${planes.length} planes · ${stats.activos} activos`}
            action={
              <button onClick={() => setShowNewPlan(!showNewPlan)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${showNewPlan ? 'bg-white/[0.06] text-slate-400' : 'bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25'}`}>
                {showNewPlan ? '✕ Cancelar' : '+ Nuevo Plan'}
              </button>
            }
          />

          {showNewPlan && (
            <div className="border-b border-white/[0.06] px-5 py-4">
              <form onSubmit={handleCreatePlan} className="rounded-xl border border-indigo-500/10 bg-indigo-500/[0.03] p-4 space-y-3">
                <p className="text-sm font-semibold text-indigo-300 uppercase tracking-wider">Nuevo Plan Maestro</p>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div><label className="block text-xs text-slate-500 mb-1">Nombre *</label><input name="nombre" required className={inputCls} placeholder="Ej: Mantenimiento aires acondicionados" /></div>
                  <div><label className="block text-xs text-slate-500 mb-1">Departamento *</label><input name="departamento_dueno" required className={inputCls} placeholder="Ej: Mantenimiento" /></div>
                  <div><label className="block text-xs text-slate-500 mb-1">Centro de costo</label><input name="centro_costo" className={inputCls} placeholder="Opcional" /></div>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Entidad Objetivo *</label>
                    <select name="entidad_objetivo_id" required className={selectCls}>
                      <option value="">Seleccionar…</option>
                      {entidades.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Responsable</label>
                    <select name="responsable_proveedor_id" className={selectCls}>
                      <option value="">Sin asignar</option>
                      {responsables.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Moneda</label>
                    <select name="moneda" className={selectCls}>
                      <option value="USD">USD</option><option value="MXN">MXN</option><option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div><label className="block text-xs text-slate-500 mb-1">Inicio *</label><input name="fecha_inicio" type="date" required className={inputCls} /></div>
                  <div><label className="block text-xs text-slate-500 mb-1">Fin *</label><input name="fecha_fin" type="date" required className={inputCls} /></div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Frecuencia *</label>
                    <select name="frecuencia_tipo" required className={selectCls} defaultValue="monthly">
                      <option value="daily">Diario</option><option value="weekly">Semanal</option><option value="monthly">Mensual</option><option value="quarterly">Trimestral</option><option value="yearly">Anual</option><option value="custom_days">Personalizado</option>
                    </select>
                  </div>
                  <div><label className="block text-xs text-slate-500 mb-1">Intervalo</label><input name="frecuencia_intervalo" type="number" min="1" defaultValue="1" className={inputCls} /></div>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div><label className="block text-xs text-slate-500 mb-1">Monto planeado</label><input name="monto_total_planeado" type="number" step="0.01" min="0" defaultValue="0" className={inputCls} /></div>
                  <div><label className="block text-xs text-slate-500 mb-1">Esfuerzo (hrs)</label><input name="esfuerzo_total_planeado" type="number" step="0.01" min="0" defaultValue="0" className={inputCls} /></div>
                  <div><label className="block text-xs text-slate-500 mb-1">Descripción</label><input name="descripcion" className={inputCls} placeholder="Opcional" /></div>
                </div>

                <div className="flex justify-end pt-1">
                  <button type="submit" disabled={loading} className="rounded-lg bg-indigo-500 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50 shadow-lg shadow-indigo-500/20 transition-all">
                    Crear Plan
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="divide-y divide-white/[0.04]">
            {planes.map(p => (
              <div key={p.id} className="group px-5 py-3 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-start gap-4">
                  {/* Icono + info principal */}
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/15 to-purple-500/15 border border-indigo-500/10 flex-shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-base font-semibold text-white truncate">{p.nombre}</h3>
                      <StatusBadge value={p.estado} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-sm text-slate-500">
                      <span>{p.departamento_dueno}</span>
                      <span>{p.entidad?.nombre || '-'}</span>
                      <span>{FREQ_LABELS[p.frecuencia_tipo] || p.frecuencia_tipo} ×{p.frecuencia_intervalo}</span>
                      <span>{formatShortDate(p.fecha_inicio)} → {formatShortDate(p.fecha_fin)}</span>
                      <span className="font-medium text-slate-300">{formatMoney(p.monto_total_planeado, p.moneda)}</span>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => handleSelectPlanAgenda(p.id)} className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1.5 text-xs font-medium text-indigo-300 hover:bg-indigo-500/20 transition-colors">
                      Agenda
                    </button>
                    {p.estado === 'activo' && (
                      <button onClick={() => handleSeedPlan(p.id)} className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 transition-colors">
                        Sembrar
                      </button>
                    )}
                    <div className="relative group/menu">
                      <button className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-1.5 text-slate-500 hover:text-white hover:bg-white/[0.08] transition-colors">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" /></svg>
                      </button>
                      <div className="absolute right-0 top-full mt-1 w-36 rounded-lg border border-white/[0.08] bg-slate-900 shadow-xl shadow-black/40 opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-20 py-1">
                        {p.estado === 'activo' && <button onClick={() => handlePlanEstado(p.id, 'pausado')} className="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-white/[0.06]">⏸ Pausar</button>}
                        {p.estado === 'pausado' && <button onClick={() => handlePlanEstado(p.id, 'activo')} className="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-white/[0.06]">▶ Reactivar</button>}
                        {(p.estado === 'activo' || p.estado === 'pausado') && <button onClick={() => handlePlanEstado(p.id, 'cerrado')} className="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-white/[0.06]">🔒 Cerrar</button>}
                        <button onClick={() => handleDeletePlan(p.id)} className="w-full text-left px-3 py-1.5 text-sm text-rose-400 hover:bg-rose-500/10">🗑 Eliminar</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {planes.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/10 mb-4">
                  <svg className="w-7 h-7 text-indigo-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>
                </div>
                <p className="text-base font-medium text-slate-400">Sin planes maestros</p>
                <p className="text-sm text-slate-600 mt-1">Crea el primero para comenzar a gestionar operaciones</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ═══════════════ AGENDA ═══════════════ */}
      {tab === 'agenda' && (
        <Card>
          <CardHeader
            title={selectedPlan ? `Agenda · ${selectedPlan.nombre}` : 'Agenda Operativa'}
            subtitle={selectedPlan ? `${agenda.length} ocurrencias · ${agenda.filter(a => a.estado === 'completado').length} completadas` : undefined}
            action={
              selectedPlanId ? (
                <button onClick={() => { setTab('planes'); setSelectedPlanId(null) }} className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all">
                  ← Planes
                </button>
              ) : undefined
            }
          />

          {!selectedPlanId && (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/10 mb-4">
                <span className="text-2xl">📅</span>
              </div>
              <p className="text-base font-medium text-slate-400">Selecciona un plan</p>
              <p className="text-sm text-slate-600 mt-1">Ve a la pestaña <button onClick={() => setTab('planes')} className="text-indigo-400 underline decoration-indigo-400/30">Planes Maestros</button> y presiona &quot;Agenda&quot; en un plan</p>
            </div>
          )}

          {selectedPlanId && (
            <div className="overflow-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">#</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Vence</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Estimado</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Prioridad</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Estado</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {agenda.map(a => (
                    <tr key={a.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-2 text-sm font-mono text-slate-500">{a.ocurrencia_nro}</td>
                      <td className="px-4 py-2 text-sm text-slate-300">{formatShortDate(a.due_date)}</td>
                      <td className="px-4 py-2 text-sm text-right text-slate-300 font-medium">{formatMoney(a.monto_estimado)}</td>
                      <td className="px-4 py-2"><StatusBadge value={a.prioridad} /></td>
                      <td className="px-4 py-2"><StatusBadge value={a.estado} /></td>
                      <td className="px-4 py-2 text-right">
                        <select
                          value={a.estado}
                          onChange={(e) => handleAgendaEstado(a.id, e.target.value)}
                          className="h-9 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 text-xs text-slate-300 focus:border-indigo-500/50 focus:outline-none cursor-pointer"
                        >
                          <option value="pendiente">Pendiente</option>
                          <option value="en_proceso">En proceso</option>
                          <option value="completado">Completado</option>
                          <option value="cancelado">Cancelado</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                  {agenda.length === 0 && <EmptyRow cols={6} text="Sin ocurrencias. Usa 'Sembrar' en el plan para generarlas automáticamente." />}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Guía */}
      <div className="rounded-xl border border-white/[0.04] bg-white/[0.015] px-5 py-4">
        <p className="text-sm font-semibold text-slate-400 mb-2">Flujo de trabajo</p>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {[
            { step: '1', title: 'Catálogos', desc: 'Responsables y entidades' },
            { step: '2', title: 'Plan', desc: 'Define frecuencia y montos' },
            { step: '3', title: 'Sembrar', desc: 'Genera la agenda automáticamente' },
            { step: '4', title: 'Ejecutar', desc: 'Cambia estados en la agenda' },
            { step: '5', title: 'Dashboard', desc: 'Semáforos en tiempo real' },
          ].map((s, i) => (
            <div key={s.step} className="flex items-start gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/15 text-xs font-bold text-indigo-400 flex-shrink-0 mt-0.5">{s.step}</span>
              <div>
                <p className="text-sm font-medium text-slate-300">{s.title}</p>
                <p className="text-xs text-slate-600">{s.desc}</p>
              </div>
              {i < 4 && <span className="hidden sm:inline text-slate-700 ml-auto">→</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
