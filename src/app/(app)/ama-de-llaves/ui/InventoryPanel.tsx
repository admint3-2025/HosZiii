'use client'

import { useState, useMemo } from 'react'
import type { InventoryItem } from './HousekeepingDashboard'

interface Props {
  items: InventoryItem[]
}

type CategoryFilter = 'all' | 'amenidad' | 'blancos' | 'limpieza'

const categoryConfig: Record<InventoryItem['category'], { label: string; badge: string }> = {
  amenidad: { label: 'Amenidades', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  blancos: { label: 'Blancos', badge: 'bg-violet-50 text-violet-700 border-violet-200' },
  limpieza: { label: 'Limpieza', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
}

export default function InventoryPanel({ items }: Props) {
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filtered = useMemo(() => {
    let result = items
    if (category !== 'all') result = result.filter(i => i.category === category)
    if (searchQuery) result = result.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()))
    return result
  }, [items, category, searchQuery])

  const lowStockItems = items.filter(i => i.stock <= i.minStock)
  const totalItems = items.reduce((sum, i) => sum + i.stock, 0)

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { amenidad: 0, blancos: 0, limpieza: 0 }
    items.forEach(i => counts[i.category]++)
    return counts
  }, [items])

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card">
          <div className="card-body p-4">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Total Artículos</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{items.length}</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body p-4">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Unidades en Stock</p>
            <p className="text-2xl font-extrabold text-blue-700 mt-1">{totalItems.toLocaleString()}</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body p-4">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Stock Bajo</p>
            <p className={`text-2xl font-extrabold mt-1 ${lowStockItems.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {lowStockItems.length}
            </p>
          </div>
        </div>
        <div className="card">
          <div className="card-body p-4">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Categorías</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">3</p>
          </div>
        </div>
      </div>

      {/* Low stock alert */}
      {lowStockItems.length > 0 && (
        <div className="card border-red-200 bg-red-50/50">
          <div className="card-body p-4">
            <h3 className="text-sm font-bold text-red-800 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Artículos con stock bajo ({lowStockItems.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {lowStockItems.map(item => (
                <span key={item.id} className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-red-100 text-red-700 border border-red-200">
                  {item.name}
                  <span className="text-red-500">({item.stock}/{item.minStock} {item.unit})</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar artículo..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="input pl-9 w-52"
          />
        </div>

        <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
          {([['all', 'Todos'] as const, ...Object.entries(categoryConfig).map(([k, v]) => [k, v.label] as const)]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setCategory(key as CategoryFilter)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all
                ${category === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {label} {key !== 'all' && <span className="text-slate-400 ml-0.5">({categoryCounts[key] || 0})</span>}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-400 ml-auto">{filtered.length} artículos</span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Artículo</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Categoría</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Stock Actual</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Mínimo</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nivel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(item => {
                const isLow = item.stock <= item.minStock
                const ratio = item.stock / item.minStock
                const levelColor = ratio < 0.7 ? 'bg-red-500' : ratio < 1 ? 'bg-amber-500' : ratio < 1.5 ? 'bg-emerald-400' : 'bg-emerald-500'
                const cfg = categoryConfig[item.category]

                return (
                  <tr key={item.id} className={`hover:bg-slate-50/50 transition-colors ${isLow ? 'bg-red-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm font-bold ${isLow ? 'text-red-600' : 'text-slate-900'}`}>
                        {item.stock}
                      </span>
                      <span className="text-xs text-slate-400 ml-1">{item.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-slate-500">{item.minStock}</span>
                      <span className="text-xs text-slate-400 ml-1">{item.unit}</span>
                    </td>
                    <td className="px-4 py-3">
                      {isLow ? (
                        <span className="badge badge-danger text-[10px]">Bajo</span>
                      ) : (
                        <span className="badge badge-success text-[10px]">OK</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${levelColor} transition-all`} style={{ width: `${Math.min(100, ratio * 50)}%` }} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
