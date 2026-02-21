'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

// ── Tipos ─────────────────────────────────────────────────────────────
type Responsable = { id: string; codigo: string | null; nombre: string; tipo: string; departamento: string | null; email: string | null; activo: boolean }
type Entidad = { id: string; codigo: string | null; nombre: string; tipo_entidad: string; categoria: string; departamento: string; centro_costo: string | null; responsable_proveedor_id: string | null; responsable: { nombre: string } | null }
type Plan = { id: string; codigo_plan: string | null; nombre: string; descripcion: string | null; departamento_dueno: string; centro_costo: string | null; moneda: string; entidad_objetivo_id: string; frecuencia_tipo: string; frecuencia_intervalo: number; fecha_inicio: string; fecha_fin: string; monto_total_planeado: number; esfuerzo_total_planeado: number; estado: string; entidad: { nombre: string } | null; responsable: { nombre: string } | null }
type AgendaItem = { id: string; ocurrencia_nro: number; due_date: string; monto_estimado: number; estado: string; prioridad: string }

const TABS = ['catálogos', 'planes', 'agenda'] as const
type Tab = typeof TABS[number]

const FREQ_LABELS: Record<string, string> = {
  daily: 'Diario', weekly: 'Semanal', monthly: 'Mensual',
  quarterly: 'Trimestral', yearly: 'Anual', custom_days: 'Personalizado',
}

const ESTADO_COLORS: Record<string, string> = {
  activo: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  pausado: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  cerrado: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  pendiente: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  en_proceso: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  completado: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  cancelado: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
}

function Badge({ label }: { label: string }) {
  const c = ESTADO_COLORS[label] || 'bg-slate-700 text-slate-300 border-slate-600'
  return <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${c}`}>{label.replace('_', ' ')}</span>
}

function formatMoney(v: number, c = 'USD') {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: c, maximumFractionDigits: 2 }).format(Number(v || 0))
}

// ── Componente principal ──────────────────────────────────────────────
export default function OpsGestionClient() {
  const [tab, setTab] = useState<Tab>('planes')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Data
  const [responsables, setResponsables] = useState<Responsable[]>([])
  const [entidades, setEntidades] = useState<Entidad[]>([])
  const [planes, setPlanes] = useState<Plan[]>([])
  const [agenda, setAgenda] = useState<AgendaItem[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)

  // Forms visibility
  const [showNewResp, setShowNewResp] = useState(false)
  const [showNewEnt, setShowNewEnt] = useState(false)
  const [showNewPlan, setShowNewPlan] = useState(false)

  const clearMessages = () => { setError(null); setSuccess(null) }

  // ── Fetchers ────────────────────────────────────────────────────────
  const fetchResponsables = useCallback(async () => {
    const res = await fetch('/api/ops/responsables')
    const json = await res.json()
    if (json.ok) setResponsables(json.data)
    else throw new Error(json.error)
  }, [])

  const fetchEntidades = useCallback(async () => {
    const res = await fetch('/api/ops/entidades')
    const json = await res.json()
    if (json.ok) setEntidades(json.data)
    else throw new Error(json.error)
  }, [])

  const fetchPlanes = useCallback(async () => {
    const res = await fetch('/api/ops/planes')
    const json = await res.json()
    if (json.ok) setPlanes(json.data)
    else throw new Error(json.error)
  }, [])

  const fetchAgenda = useCallback(async (planId: string) => {
    const res = await fetch(`/api/ops/agenda?plan_id=${planId}`)
    const json = await res.json()
    if (json.ok) setAgenda(json.data)
    else throw new Error(json.error)
  }, [])

  // Load data on tab change
  useEffect(() => {
    clearMessages()
    setLoading(true)
    const run = async () => {
      try {
        if (tab === 'catálogos') { await Promise.all([fetchResponsables(), fetchEntidades()]) }
        if (tab === 'planes') { await Promise.all([fetchPlanes(), fetchEntidades(), fetchResponsables()]) }
      } catch (e: any) { setError(String(e?.message ?? e)) }
      finally { setLoading(false) }
    }
    run()
  }, [tab, fetchResponsables, fetchEntidades, fetchPlanes])

  // ── Handlers ────────────────────────────────────────────────────────
  async function handleCreateResponsable(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    clearMessages()
    const fd = new FormData(e.currentTarget)
    const body = {
      nombre: fd.get('nombre') as string,
      tipo: fd.get('tipo') as string,
      departamento: (fd.get('departamento') as string) || undefined,
      email: (fd.get('email') as string) || undefined,
      codigo: (fd.get('codigo') as string) || undefined,
    }
    try {
      setLoading(true)
      const res = await fetch('/api/ops/responsables', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      setSuccess('Responsable creado')
      setShowNewResp(false)
      await fetchResponsables()
    } catch (err: any) { setError(String(err?.message ?? err)) }
    finally { setLoading(false) }
  }

  async function handleDeleteResponsable(id: string) {
    if (!confirm('¿Eliminar este responsable?')) return
    try {
      setLoading(true)
      const res = await fetch(`/api/ops/responsables?id=${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      await fetchResponsables()
    } catch (err: any) { setError(String(err?.message ?? err)) }
    finally { setLoading(false) }
  }

  async function handleCreateEntidad(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    clearMessages()
    const fd = new FormData(e.currentTarget)
    const body = {
      nombre: fd.get('nombre') as string,
      tipo_entidad: fd.get('tipo_entidad') as string,
      categoria: fd.get('categoria') as string,
      departamento: fd.get('departamento') as string,
      centro_costo: (fd.get('centro_costo') as string) || undefined,
      responsable_proveedor_id: (fd.get('responsable_proveedor_id') as string) || undefined,
      codigo: (fd.get('codigo') as string) || undefined,
    }
    try {
      setLoading(true)
      const res = await fetch('/api/ops/entidades', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      setSuccess('Entidad creada')
      setShowNewEnt(false)
      await fetchEntidades()
    } catch (err: any) { setError(String(err?.message ?? err)) }
    finally { setLoading(false) }
  }

  async function handleDeleteEntidad(id: string) {
    if (!confirm('¿Eliminar esta entidad?')) return
    try {
      setLoading(true)
      const res = await fetch(`/api/ops/entidades?id=${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      await fetchEntidades()
    } catch (err: any) { setError(String(err?.message ?? err)) }
    finally { setLoading(false) }
  }

  async function handleCreatePlan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    clearMessages()
    const fd = new FormData(e.currentTarget)
    const body = {
      nombre: fd.get('nombre') as string,
      departamento_dueno: fd.get('departamento_dueno') as string,
      centro_costo: (fd.get('centro_costo') as string) || undefined,
      moneda: (fd.get('moneda') as string) || 'USD',
      entidad_objetivo_id: fd.get('entidad_objetivo_id') as string,
      responsable_proveedor_id: (fd.get('responsable_proveedor_id') as string) || undefined,
      fecha_inicio: fd.get('fecha_inicio') as string,
      fecha_fin: fd.get('fecha_fin') as string,
      frecuencia_tipo: fd.get('frecuencia_tipo') as string,
      frecuencia_intervalo: Number(fd.get('frecuencia_intervalo') || 1),
      monto_total_planeado: Number(fd.get('monto_total_planeado') || 0),
      esfuerzo_total_planeado: Number(fd.get('esfuerzo_total_planeado') || 0),
      descripcion: (fd.get('descripcion') as string) || undefined,
      codigo_plan: (fd.get('codigo_plan') as string) || undefined,
    }
    try {
      setLoading(true)
      const res = await fetch('/api/ops/planes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      setSuccess('Plan creado')
      setShowNewPlan(false)
      await fetchPlanes()
    } catch (err: any) { setError(String(err?.message ?? err)) }
    finally { setLoading(false) }
  }

  async function handleSeedPlan(planId: string) {
    clearMessages()
    try {
      setLoading(true)
      const res = await fetch(`/api/ops/plans/${planId}/seed`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ replace: false }) })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      setSuccess(`Agenda sembrada: ${json.data?.created ?? 0} ocurrencias generadas`)
      await fetchPlanes()
    } catch (err: any) { setError(String(err?.message ?? err)) }
    finally { setLoading(false) }
  }

  async function handlePlanEstado(id: string, estado: string) {
    try {
      setLoading(true)
      const res = await fetch('/api/ops/planes', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, estado }) })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      await fetchPlanes()
    } catch (err: any) { setError(String(err?.message ?? err)) }
    finally { setLoading(false) }
  }

  async function handleDeletePlan(id: string) {
    if (!confirm('¿Eliminar este plan y toda su agenda?')) return
    try {
      setLoading(true)
      const res = await fetch(`/api/ops/planes?id=${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      await fetchPlanes()
    } catch (err: any) { setError(String(err?.message ?? err)) }
    finally { setLoading(false) }
  }

  async function handleSelectPlanAgenda(planId: string) {
    clearMessages()
    setSelectedPlanId(planId)
    setTab('agenda')
    setLoading(true)
    try { await fetchAgenda(planId) }
    catch (err: any) { setError(String(err?.message ?? err)) }
    finally { setLoading(false) }
  }

  async function handleAgendaEstado(id: string, estado: string) {
    try {
      setLoading(true)
      const res = await fetch('/api/ops/agenda', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, estado }) })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      if (selectedPlanId) await fetchAgenda(selectedPlanId)
    } catch (err: any) { setError(String(err?.message ?? err)) }
    finally { setLoading(false) }
  }

  // ── Shared styles ───────────────────────────────────────────────────
  const inputCls = 'h-9 w-full rounded border border-slate-700 bg-slate-900 px-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none'
  const btnPrimary = 'h-9 rounded border border-indigo-500 bg-indigo-600 px-4 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50'
  const btnSecondary = 'h-9 rounded border border-slate-600 bg-slate-800 px-3 text-xs font-medium text-slate-200 hover:bg-slate-700'
  const btnDanger = 'rounded border border-rose-700/50 bg-rose-900/30 px-2 py-1 text-[10px] font-medium text-rose-300 hover:bg-rose-800/50'

  const selectedPlan = planes.find(p => p.id === selectedPlanId)

  return (
    <div className="space-y-4">
      {/* Header */}
      <header className="rounded-lg border border-slate-800 bg-slate-950 p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-base md:text-lg font-semibold text-slate-100">Gestión Operacional</h1>
            <p className="text-xs text-slate-400">Administra catálogos, planes maestros y agenda operativa</p>
          </div>
          <Link href="/ops" className={btnSecondary}>← Volver al Dashboard</Link>
        </div>
      </header>

      {/* Messages */}
      {error && (
        <div className="rounded-lg border border-rose-900/60 bg-rose-950/30 p-3">
          <p className="text-xs text-rose-300">{error}</p>
          <button onClick={clearMessages} className="mt-1 text-[10px] text-rose-400 underline">Cerrar</button>
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/30 p-3">
          <p className="text-xs text-emerald-300">{success}</p>
          <button onClick={clearMessages} className="mt-1 text-[10px] text-emerald-400 underline">Cerrar</button>
        </div>
      )}

      {/* Tabs */}
      <nav className="flex gap-2 text-xs">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); clearMessages() }}
            className={`rounded border px-3 py-1.5 capitalize ${t === tab ? 'border-slate-500 bg-slate-700 text-slate-100' : 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'}`}
          >
            {t}
          </button>
        ))}
      </nav>

      {loading && <div className="text-xs text-slate-400 animate-pulse">Cargando...</div>}

      {/* ═══════════════ CATÁLOGOS ═══════════════ */}
      {tab === 'catálogos' && (
        <div className="space-y-6">
          {/* Responsables */}
          <section className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-200">Responsables / Proveedores</h2>
              <button onClick={() => setShowNewResp(!showNewResp)} className={btnSecondary}>{showNewResp ? 'Cancelar' : '+ Nuevo'}</button>
            </div>

            {showNewResp && (
              <form onSubmit={handleCreateResponsable} className="grid grid-cols-1 gap-2 md:grid-cols-5 border border-slate-800 bg-slate-900/50 rounded p-3">
                <input name="nombre" required placeholder="Nombre *" className={inputCls} />
                <select name="tipo" required className={inputCls}>
                  <option value="interno">Interno</option>
                  <option value="externo">Externo</option>
                </select>
                <input name="departamento" placeholder="Departamento" className={inputCls} />
                <input name="email" type="email" placeholder="Email" className={inputCls} />
                <button type="submit" disabled={loading} className={btnPrimary}>Crear</button>
              </form>
            )}

            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-900 text-slate-400">
                  <tr className="text-left"><th className="px-2 py-2">Nombre</th><th className="px-2 py-2">Tipo</th><th className="px-2 py-2">Departamento</th><th className="px-2 py-2">Email</th><th className="px-2 py-2 w-16"></th></tr>
                </thead>
                <tbody>
                  {responsables.map(r => (
                    <tr key={r.id} className="border-t border-slate-800 text-slate-200">
                      <td className="px-2 py-1.5 font-medium">{r.nombre}</td>
                      <td className="px-2 py-1.5"><Badge label={r.tipo} /></td>
                      <td className="px-2 py-1.5">{r.departamento || '-'}</td>
                      <td className="px-2 py-1.5">{r.email || '-'}</td>
                      <td className="px-2 py-1.5"><button onClick={() => handleDeleteResponsable(r.id)} className={btnDanger}>Eliminar</button></td>
                    </tr>
                  ))}
                  {responsables.length === 0 && <tr><td colSpan={5} className="px-2 py-4 text-center text-slate-500">Sin responsables registrados</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          {/* Entidades */}
          <section className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-200">Entidades Objetivo</h2>
              <button onClick={() => setShowNewEnt(!showNewEnt)} className={btnSecondary}>{showNewEnt ? 'Cancelar' : '+ Nueva'}</button>
            </div>

            {showNewEnt && (
              <form onSubmit={handleCreateEntidad} className="grid grid-cols-1 gap-2 md:grid-cols-6 border border-slate-800 bg-slate-900/50 rounded p-3">
                <input name="nombre" required placeholder="Nombre *" className={inputCls} />
                <input name="tipo_entidad" required placeholder="Tipo (ej: equipo, área) *" className={inputCls} />
                <input name="categoria" required placeholder="Categoría *" className={inputCls} />
                <input name="departamento" required placeholder="Departamento *" className={inputCls} />
                <select name="responsable_proveedor_id" className={inputCls}>
                  <option value="">Sin responsable</option>
                  {responsables.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                </select>
                <button type="submit" disabled={loading} className={btnPrimary}>Crear</button>
              </form>
            )}

            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-900 text-slate-400">
                  <tr className="text-left"><th className="px-2 py-2">Nombre</th><th className="px-2 py-2">Tipo</th><th className="px-2 py-2">Categoría</th><th className="px-2 py-2">Departamento</th><th className="px-2 py-2">Responsable</th><th className="px-2 py-2 w-16"></th></tr>
                </thead>
                <tbody>
                  {entidades.map(e => (
                    <tr key={e.id} className="border-t border-slate-800 text-slate-200">
                      <td className="px-2 py-1.5 font-medium">{e.nombre}</td>
                      <td className="px-2 py-1.5">{e.tipo_entidad}</td>
                      <td className="px-2 py-1.5">{e.categoria}</td>
                      <td className="px-2 py-1.5">{e.departamento}</td>
                      <td className="px-2 py-1.5">{e.responsable?.nombre || '-'}</td>
                      <td className="px-2 py-1.5"><button onClick={() => handleDeleteEntidad(e.id)} className={btnDanger}>Eliminar</button></td>
                    </tr>
                  ))}
                  {entidades.length === 0 && <tr><td colSpan={6} className="px-2 py-4 text-center text-slate-500">Sin entidades registradas</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ═══════════════ PLANES MAESTROS ═══════════════ */}
      {tab === 'planes' && (
        <section className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">Planes Maestros</h2>
            <button onClick={() => setShowNewPlan(!showNewPlan)} className={btnSecondary}>{showNewPlan ? 'Cancelar' : '+ Nuevo Plan'}</button>
          </div>

          {showNewPlan && (
            <form onSubmit={handleCreatePlan} className="space-y-3 border border-slate-800 bg-slate-900/50 rounded p-4">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Nombre del Plan *</label>
                  <input name="nombre" required className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Departamento Dueño *</label>
                  <input name="departamento_dueno" required className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Centro de Costo</label>
                  <input name="centro_costo" className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Entidad Objetivo *</label>
                  <select name="entidad_objetivo_id" required className={inputCls}>
                    <option value="">Seleccionar...</option>
                    {entidades.map(e => <option key={e.id} value={e.id}>{e.nombre} ({e.departamento})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Responsable</label>
                  <select name="responsable_proveedor_id" className={inputCls}>
                    <option value="">Sin asignar</option>
                    {responsables.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Moneda</label>
                  <select name="moneda" className={inputCls}>
                    <option value="USD">USD</option>
                    <option value="MXN">MXN</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Fecha Inicio *</label>
                  <input name="fecha_inicio" type="date" required className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Fecha Fin *</label>
                  <input name="fecha_fin" type="date" required className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Frecuencia *</label>
                  <select name="frecuencia_tipo" required className={inputCls}>
                    <option value="daily">Diario</option>
                    <option value="weekly">Semanal</option>
                    <option value="monthly" selected>Mensual</option>
                    <option value="quarterly">Trimestral</option>
                    <option value="yearly">Anual</option>
                    <option value="custom_days">Personalizado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Intervalo</label>
                  <input name="frecuencia_intervalo" type="number" min="1" defaultValue="1" className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Monto Total Planeado</label>
                  <input name="monto_total_planeado" type="number" step="0.01" min="0" defaultValue="0" className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Esfuerzo Total (hrs)</label>
                  <input name="esfuerzo_total_planeado" type="number" step="0.01" min="0" defaultValue="0" className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Descripción</label>
                  <input name="descripcion" className={inputCls} />
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={loading} className={btnPrimary}>Crear Plan</button>
              </div>
            </form>
          )}

          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-900 text-slate-400">
                <tr className="text-left">
                  <th className="px-2 py-2">Plan</th>
                  <th className="px-2 py-2">Departamento</th>
                  <th className="px-2 py-2">Entidad</th>
                  <th className="px-2 py-2">Frecuencia</th>
                  <th className="px-2 py-2">Rango</th>
                  <th className="px-2 py-2 text-right">Monto</th>
                  <th className="px-2 py-2">Estado</th>
                  <th className="px-2 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {planes.map(p => (
                  <tr key={p.id} className="border-t border-slate-800 text-slate-200">
                    <td className="px-2 py-1.5 font-medium max-w-[200px] truncate">{p.nombre}</td>
                    <td className="px-2 py-1.5">{p.departamento_dueno}</td>
                    <td className="px-2 py-1.5">{p.entidad?.nombre || '-'}</td>
                    <td className="px-2 py-1.5">{FREQ_LABELS[p.frecuencia_tipo] || p.frecuencia_tipo} ×{p.frecuencia_intervalo}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{p.fecha_inicio} → {p.fecha_fin}</td>
                    <td className="px-2 py-1.5 text-right">{formatMoney(p.monto_total_planeado, p.moneda)}</td>
                    <td className="px-2 py-1.5"><Badge label={p.estado} /></td>
                    <td className="px-2 py-1.5 text-right">
                      <div className="flex gap-1 justify-end flex-wrap">
                        <button onClick={() => handleSelectPlanAgenda(p.id)} className="rounded border border-indigo-600/50 bg-indigo-900/30 px-2 py-1 text-[10px] text-indigo-300 hover:bg-indigo-800/50">Ver Agenda</button>
                        {p.estado === 'activo' && (
                          <button onClick={() => handleSeedPlan(p.id)} className="rounded border border-emerald-600/50 bg-emerald-900/30 px-2 py-1 text-[10px] text-emerald-300 hover:bg-emerald-800/50">Sembrar</button>
                        )}
                        {p.estado === 'activo' && (
                          <button onClick={() => handlePlanEstado(p.id, 'pausado')} className="rounded border border-amber-600/50 bg-amber-900/30 px-2 py-1 text-[10px] text-amber-300 hover:bg-amber-800/50">Pausar</button>
                        )}
                        {p.estado === 'pausado' && (
                          <button onClick={() => handlePlanEstado(p.id, 'activo')} className="rounded border border-emerald-600/50 bg-emerald-900/30 px-2 py-1 text-[10px] text-emerald-300 hover:bg-emerald-800/50">Reactivar</button>
                        )}
                        {(p.estado === 'activo' || p.estado === 'pausado') && (
                          <button onClick={() => handlePlanEstado(p.id, 'cerrado')} className="rounded border border-slate-600/50 bg-slate-800/50 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-700/50">Cerrar</button>
                        )}
                        <button onClick={() => handleDeletePlan(p.id)} className={btnDanger}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {planes.length === 0 && <tr><td colSpan={8} className="px-2 py-4 text-center text-slate-500">Sin planes maestros. Crea uno para comenzar.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ═══════════════ AGENDA ═══════════════ */}
      {tab === 'agenda' && (
        <section className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">
                Agenda Operativa {selectedPlan ? `· ${selectedPlan.nombre}` : ''}
              </h2>
              {!selectedPlanId && <p className="text-xs text-slate-400 mt-1">Selecciona un plan en la pestaña &quot;Planes&quot; → botón &quot;Ver Agenda&quot;</p>}
            </div>
            {selectedPlanId && (
              <button onClick={() => { setTab('planes'); setSelectedPlanId(null) }} className={btnSecondary}>← Volver a Planes</button>
            )}
          </div>

          {selectedPlanId && (
            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-900 text-slate-400">
                  <tr className="text-left">
                    <th className="px-2 py-2">#</th>
                    <th className="px-2 py-2">Vence</th>
                    <th className="px-2 py-2 text-right">Estimado</th>
                    <th className="px-2 py-2">Prioridad</th>
                    <th className="px-2 py-2">Estado</th>
                    <th className="px-2 py-2 text-right">Cambiar Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {agenda.map(a => (
                    <tr key={a.id} className="border-t border-slate-800 text-slate-200">
                      <td className="px-2 py-1.5 font-medium">{a.ocurrencia_nro}</td>
                      <td className="px-2 py-1.5">{a.due_date}</td>
                      <td className="px-2 py-1.5 text-right">{formatMoney(a.monto_estimado)}</td>
                      <td className="px-2 py-1.5"><Badge label={a.prioridad} /></td>
                      <td className="px-2 py-1.5"><Badge label={a.estado} /></td>
                      <td className="px-2 py-1.5 text-right">
                        <select
                          value={a.estado}
                          onChange={(e) => handleAgendaEstado(a.id, e.target.value)}
                          className="h-7 rounded border border-slate-700 bg-slate-900 px-1 text-[10px] text-slate-200"
                        >
                          <option value="pendiente">Pendiente</option>
                          <option value="en_proceso">En proceso</option>
                          <option value="completado">Completado</option>
                          <option value="cancelado">Cancelado</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                  {agenda.length === 0 && <tr><td colSpan={6} className="px-2 py-4 text-center text-slate-500">Sin ítems de agenda. Usa &quot;Sembrar&quot; en el plan para generar ocurrencias.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Guía rápida */}
      <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-xs text-slate-400 space-y-1">
        <p className="font-semibold text-slate-300">Flujo de trabajo:</p>
        <ol className="list-decimal list-inside space-y-0.5">
          <li><strong>Catálogos</strong> → Crea responsables/proveedores y entidades objetivo (el &quot;quién&quot; y el &quot;qué&quot;)</li>
          <li><strong>Planes</strong> → Define planes maestros con frecuencia, fechas y montos</li>
          <li><strong>Sembrar</strong> → El botón &quot;Sembrar&quot; genera automáticamente la agenda (ocurrencias recurrentes)</li>
          <li><strong>Agenda</strong> → Cambia el estado de cada ítem conforme se ejecuta</li>
          <li><strong>Dashboard</strong> → El tablero <Link href="/ops" className="text-indigo-400 underline">principal</Link> refleja todo en tiempo real con semáforos</li>
        </ol>
      </section>
    </div>
  )
}
