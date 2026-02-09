'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

interface PolicyCategory {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string
  color: string
}

interface Policy {
  id: string
  title: string
  summary: string | null
  content: string
  version: string
  status: string
  is_mandatory: boolean
  effective_date: string | null
  attachment_url: string | null
  attachment_name: string | null
  created_at: string
  category: PolicyCategory | null
  acknowledgment: { policy_id: string; acknowledged_at: string; version_read: string | null } | null
}

interface PoliciesCatalogProps {
  categories: PolicyCategory[]
  policies: Policy[]
  isAdmin: boolean
  userName: string
  userId: string
}

export default function PoliciesCatalog({ categories, policies, isAdmin, userName, userId }: PoliciesCatalogProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showOnlyMandatory, setShowOnlyMandatory] = useState(false)
  const [showOnlyPending, setShowOnlyPending] = useState(false)
  const [expandedPolicy, setExpandedPolicy] = useState<string | null>(null)
  const [acknowledging, setAcknowledging] = useState<string | null>(null)
  const [localAcks, setLocalAcks] = useState<Set<string>>(new Set())

  const filteredPolicies = useMemo(() => {
    return policies.filter(policy => {
      if (selectedCategory && policy.category?.id !== selectedCategory) return false
      if (showOnlyMandatory && !policy.is_mandatory) return false
      if (showOnlyPending && (policy.acknowledgment || localAcks.has(policy.id))) return false
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchTitle = policy.title.toLowerCase().includes(query)
        const matchSummary = policy.summary?.toLowerCase().includes(query)
        if (!matchTitle && !matchSummary) return false
      }
      return true
    })
  }, [policies, selectedCategory, searchQuery, showOnlyMandatory, showOnlyPending, localAcks])

  const stats = useMemo(() => {
    const total = policies.length
    const mandatory = policies.filter(p => p.is_mandatory).length
    const read = policies.filter(p => p.acknowledgment || localAcks.has(p.id)).length
    const pending = mandatory - policies.filter(p => p.is_mandatory && (p.acknowledgment || localAcks.has(p.id))).length
    return { total, mandatory, read, pending }
  }, [policies, localAcks])

  const handleAcknowledge = async (policyId: string, version: string) => {
    setAcknowledging(policyId)
    try {
      const supabase = createSupabaseBrowserClient()
      await supabase.from('policy_acknowledgments').upsert({
        policy_id: policyId,
        user_id: userId,
        version_read: version,
        acknowledged_at: new Date().toISOString(),
      }, { onConflict: 'policy_id,user_id' })
      setLocalAcks(prev => new Set(prev).add(policyId))
    } catch (err) {
      console.error('Error acknowledging policy:', err)
    } finally {
      setAcknowledging(null)
    }
  }

  const clearFilters = () => {
    setSelectedCategory(null)
    setSearchQuery('')
    setShowOnlyMandatory(false)
    setShowOnlyPending(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">📜</span>
                <h1 className="text-3xl font-bold">Políticas y Estándares</h1>
              </div>
              <p className="text-indigo-100">
                Bienvenido, {userName}. Consulta las políticas y estándares de la organización.
              </p>
            </div>

            <div className="flex items-center gap-4">
              {isAdmin && (
                <Link
                  href="/corporativo/politicas/admin"
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Administrar
                </Link>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold">{stats.total}</div>
              <div className="text-sm text-indigo-100">Políticas</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold">{stats.mandatory}</div>
              <div className="text-sm text-indigo-100">Obligatorias</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold">{stats.read}</div>
              <div className="text-sm text-indigo-100">Leídas</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-amber-300">{stats.pending}</div>
              <div className="text-sm text-indigo-100">Pendientes</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Filtros */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Búsqueda */}
            <div className="flex-1">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Buscar políticas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Categoría */}
            <select
              value={selectedCategory || ''}
              onChange={(e) => setSelectedCategory(e.target.value || null)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Todas las categorías</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
              ))}
            </select>

            {/* Toggles */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlyMandatory}
                  onChange={(e) => setShowOnlyMandatory(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Obligatorias
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlyPending}
                  onChange={(e) => setShowOnlyPending(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Pendientes
              </label>
            </div>

            {(selectedCategory || searchQuery || showOnlyMandatory || showOnlyPending) && (
              <button
                onClick={clearFilters}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium whitespace-nowrap"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {/* Categorías como chips */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                !selectedCategory
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
              }`}
            >
              Todas
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === cat.id
                    ? 'text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
                }`}
                style={selectedCategory === cat.id ? { backgroundColor: cat.color } : {}}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Lista de políticas */}
        {filteredPolicies.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No hay políticas disponibles</h3>
            <p className="text-sm text-slate-500">
              {searchQuery || selectedCategory ? 'Intenta ajustar los filtros de búsqueda.' : 'Aún no se han publicado políticas.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPolicies.map(policy => {
              const isRead = !!(policy.acknowledgment || localAcks.has(policy.id))
              const isExpanded = expandedPolicy === policy.id
              return (
                <div
                  key={policy.id}
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-200 ${
                    policy.is_mandatory && !isRead
                      ? 'border-amber-300 ring-1 ring-amber-200'
                      : 'border-slate-200'
                  }`}
                >
                  {/* Header de la política */}
                  <button
                    onClick={() => setExpandedPolicy(isExpanded ? null : policy.id)}
                    className="w-full text-left p-6 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      {/* Icono categoría */}
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                        style={{ backgroundColor: (policy.category?.color || '#6366f1') + '15' }}
                      >
                        {policy.category?.icon || '📋'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-slate-900 truncate">{policy.title}</h3>
                          {policy.is_mandatory && (
                            <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 uppercase">
                              Obligatoria
                            </span>
                          )}
                          {isRead && (
                            <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase">
                              ✓ Leída
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 line-clamp-2">{policy.summary || 'Sin descripción'}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                          {policy.category && (
                            <span className="inline-flex items-center gap-1">
                              <span>{policy.category.icon}</span>
                              {policy.category.name}
                            </span>
                          )}
                          <span>v{policy.version}</span>
                          {policy.effective_date && (
                            <span>Vigente: {new Date(policy.effective_date).toLocaleDateString('es-MX')}</span>
                          )}
                        </div>
                      </div>

                      {/* Chevron */}
                      <svg
                        className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Contenido expandido */}
                  {isExpanded && (
                    <div className="border-t border-slate-100">
                      <div className="p-6">
                        {/* Contenido de la política */}
                        <div
                          className="prose prose-sm prose-slate max-w-none mb-6"
                          dangerouslySetInnerHTML={{ __html: policy.content.replace(/\n/g, '<br/>') }}
                        />

                        {/* Adjunto */}
                        {policy.attachment_url && (
                          <div className="mb-6">
                            <a
                              href={policy.attachment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm text-slate-700 transition-colors"
                            >
                              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              {policy.attachment_name || 'Descargar documento'}
                            </a>
                          </div>
                        )}

                        {/* Botón de confirmar lectura */}
                        {!isRead && (
                          <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-xl">
                            <div>
                              <p className="text-sm font-medium text-indigo-900">
                                {policy.is_mandatory ? '⚠️ Lectura obligatoria' : 'Confirma tu lectura'}
                              </p>
                              <p className="text-xs text-indigo-600 mt-0.5">
                                Al confirmar, aceptas haber leído y comprendido esta política.
                              </p>
                            </div>
                            <button
                              onClick={() => handleAcknowledge(policy.id, policy.version)}
                              disabled={acknowledging === policy.id}
                              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
                            >
                              {acknowledging === policy.id ? 'Registrando...' : 'He leído esta política'}
                            </button>
                          </div>
                        )}

                        {isRead && (
                          <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl text-sm text-emerald-700">
                            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Lectura confirmada
                            {policy.acknowledgment?.acknowledged_at && (
                              <span className="text-emerald-500 text-xs">
                                — {new Date(policy.acknowledgment.acknowledged_at).toLocaleDateString('es-MX')}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
