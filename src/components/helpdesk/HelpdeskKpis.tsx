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
        const [kRes, sRes] = await Promise.all([
          fetch('/api/helpdesk/kpis').then((r) => r.json()),
          fetch('/api/helpdesk/sla-breaches').then((r) => r.json()),
        ])

        if (!mounted) return
        if (kRes) setKpis({ backlogTotal: kRes.backlogTotal || 0, byPriority: kRes.byPriority || {}, byStatus: kRes.byStatus || {} })
        if (sRes) setSla(sRes.items || [])
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <h4 className="text-sm font-semibold text-slate-600 uppercase">Backlog</h4>
        <div className="flex items-baseline justify-between mt-3">
          <div>
            <div className="text-3xl font-bold text-slate-900">{kpis.backlogTotal}</div>
            <div className="text-xs text-slate-500 mt-1">Tickets abiertos</div>
          </div>
          <div className="text-sm text-slate-500">
            {Object.entries(kpis.byPriority).map(([p, c]) => (
              <div key={p} className="flex items-center gap-2">
                <span className="font-semibold">{p}:</span>
                <span>{c}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <h4 className="text-sm font-semibold text-slate-600 uppercase">Incumplimientos SLA</h4>
        <div className="mt-3">
          <div className="text-2xl font-bold text-rose-600">{sla.length}</div>
          <div className="text-xs text-slate-500 mt-1">Críticos {'>'} 48h</div>

          <ul className="mt-3 space-y-2 text-sm">
            {sla.slice(0, 5).map((t: any) => (
              <li key={t.id} className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{t.title || 'Sin título'}</div>
                  <div className="text-xs text-slate-500">Sede: {t.location_id || '—'}</div>
                </div>
                <div className="text-xs text-slate-400">{Math.max(0, Math.floor((Date.now() - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24)))}d</div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <h4 className="text-sm font-semibold text-slate-600 uppercase">Tickets por Estado</h4>
        <div className="flex items-center gap-4 mt-3">
          <svg width="96" height="96" viewBox="0 0 42 42" className="shrink-0">
            <circle cx="21" cy="21" r="15.9" fill="#f1f5f9" />
            {statusCounts.map(([s, c], i) => {
              const start = statusCounts.slice(0, i).reduce((a, [_s, _c]) => a + _c, 0) / total
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
                <div className="text-slate-500">{c}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
