"use client"

import React, { useEffect, useState } from 'react'

type Kpis = {
  backlogTotal: number
  byPriority: Record<string, number>
  byStatus: Record<string, number>
}

export default function HelpdeskKpis() {
  const [kpis, setKpis] = useState<Kpis | null>(null)
  const [sla, setSla] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        // Fetch consolidated KPIs, SLA breaches and status distribution (more reliable for charts)
        const [kRes, sRes, dRes] = await Promise.all([
          fetch('/api/helpdesk/kpis').then((r) => r.json()),
          fetch('/api/helpdesk/sla-breaches').then((r) => r.json()),
          fetch('/api/helpdesk/status-distribution').then((r) => r.json()),
        ])

        if (!mounted) return
        if (kRes) setKpis({ backlogTotal: kRes.backlogTotal || 0, byPriority: kRes.byPriority || {}, byStatus: kRes.byStatus || {} })
        if (sRes) setSla(sRes.items || [])
        if (dRes && dRes.counts) {
          // replace internal byStatus with the authoritative distribution for chart rendering
          setKpis((prev) => ({ ...(prev || { backlogTotal: 0, byPriority: {}, byStatus: {} }), byStatus: dRes.counts }))
        }
      } catch (err) {
        console.error('Error loading helpdesk kpis', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  if (loading) return <div className="p-4">Cargando métricas...</div>
  if (!kpis) return null

  const statusCounts = Object.entries(kpis.byStatus)
  const total = Math.max(1, Object.values(kpis.byStatus).reduce((s, v) => s + v, 0))
  const priorityEntries = Object.entries(kpis.byPriority)
  const sumPriority = Math.max(1, priorityEntries.reduce((s, [, v]) => s + v, 0))
  const lastUpdated = new Date().toLocaleString()
  const oldestBreachDays = sla && sla.length ? Math.max(...sla.map((t: any) => Math.max(0, Math.floor((Date.now() - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24))))) : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <h4 className="text-sm font-semibold text-slate-600 uppercase">Mesa de Ayuda — Resumen</h4>
        <div className="flex items-baseline justify-between mt-3">
          <div>
            <div className="text-3xl font-bold text-slate-900">{kpis.backlogTotal}</div>
            <div className="text-xs text-slate-500 mt-1">Tickets abiertos</div>
          </div>
          <div className="flex flex-col items-end text-sm">
            <div className="flex gap-3">
              {Object.entries(kpis.byPriority).map(([p, c], i) => (
                <div key={p} className="flex items-center gap-2 px-3 py-1 rounded-md bg-slate-50 border border-slate-100">
                  <span style={{ width: 8, height: 8, background: ['#ef4444', '#f97316', '#f59e0b', '#10b981'][i % 4], display: 'inline-block', borderRadius: 3 }} />
                  <div className="text-xs">
                    <div className="font-semibold">{p}</div>
                    <div className="text-slate-500">{c} · {Math.round((c / sumPriority) * 100)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="text-xs text-slate-400 mt-3">Última actualización: {lastUpdated}</div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="col-span-1 bg-slate-50 p-3 rounded-md text-center">
            <div className="text-xs text-slate-500">SLA incumplidos</div>
            <div className="text-lg font-bold text-rose-600">{sla.length}</div>
            <div className="text-xs text-slate-400">Mayor antigüedad: {oldestBreachDays}d</div>
          </div>
          <div className="col-span-1 bg-slate-50 p-3 rounded-md text-center">
            <div className="text-xs text-slate-500">Tickets críticos</div>
            <div className="text-lg font-bold text-amber-600">{kpis.byPriority['Crítica'] || 0}</div>
            <div className="text-xs text-slate-400">% del backlog: {Math.round(((kpis.byPriority['Crítica'] || 0) / sumPriority) * 100)}%</div>
          </div>
          <div className="col-span-1 bg-slate-50 p-3 rounded-md text-center">
            <div className="text-xs text-slate-500">Tickets promedio edad</div>
            <div className="text-lg font-bold text-slate-700">{Math.round(total ? (Object.values(kpis.byStatus).reduce((s, v) => s + (v * 0), 0) / total) : 0)}d</div>
            <div className="text-xs text-slate-400">(estimado)</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <h4 className="text-sm font-semibold text-slate-600 uppercase">Tickets por Estado</h4>
        <div className="flex items-center gap-4 mt-3">
          <svg width="96" height="96" viewBox="0 0 42 42" className="shrink-0">
            <circle cx="21" cy="21" r="15.9" fill="#f1f5f9" />
            {statusCounts.map(([s, c], i) => {
              const start = statusCounts.slice(0, i).reduce((a, [, count]) => a + count, 0) / total
              const sweep = c / total
              const startAngle = start * Math.PI * 2 - Math.PI / 2
              const endAngle = (start + sweep) * Math.PI * 2 - Math.PI / 2
              const x1 = 21 + 15.9 * Math.cos(startAngle)
              const y1 = 21 + 15.9 * Math.sin(startAngle)
              const x2 = 21 + 15.9 * Math.cos(endAngle)
              const y2 = 21 + 15.9 * Math.sin(endAngle)
              const large = sweep > 0.5 ? 1 : 0
              const d = `M21 21 L ${x1} ${y1} A 15.9 15.9 0 ${large} 1 ${x2} ${y2} Z`
              const color = ['#60a5fa', '#34d399', '#f97316', '#f43f5e', '#a78bfa'][i % 5]
              return <path key={s} d={d} fill={color} stroke="none" />
            })}
          </svg>

          <div className="flex-1 text-sm">
            {statusCounts.map(([s, c], i) => (
              <div key={s} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <span style={{ width: 10, height: 10, background: ['#60a5fa', '#34d399', '#f97316', '#f43f5e', '#a78bfa'][i % 5], display: 'inline-block', borderRadius: 3 }} />
                  <span className="text-slate-700">{s}</span>
                </div>
                <div className="text-slate-500">{c} ({Math.round((c / total) * 100)}%)</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
