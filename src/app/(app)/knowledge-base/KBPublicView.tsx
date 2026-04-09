'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  getApprovedKBArticles,
  searchKBArticlesByText,
  registerKBArticleUsage,
  type KBArticle,
} from '@/lib/knowledge-base/actions'
import {
  BookOpen,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Star,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Award,
  Zap,
  BarChart2,
} from 'lucide-react'

type Article = KBArticle & {
  creator?: { full_name: string }
  source_ticket?: { ticket_number: number; title: string }
}

const MEDAL = ['🥇', '🥈', '🥉']

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 40
      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
      : score >= 20
      ? 'bg-blue-100 text-blue-700 border-blue-200'
      : 'bg-slate-100 text-slate-500 border-slate-200'
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${color}`}>
      <BarChart2 size={11} />
      {score.toFixed(1)} pts
    </span>
  )
}

export default function KBPublicView({ userId }: { userId: string }) {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [voted, setVoted] = useState<Record<string, 'up' | 'down'>>({})
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    const result = await getApprovedKBArticles()
    if (result.success && result.articles) {
      setArticles(result.articles)
    }
    setLoading(false)
  }

  async function handleSearch(q: string) {
    setSearch(q)
    if (!q.trim()) {
      loadAll()
      return
    }
    setSearching(true)
    const result = await searchKBArticlesByText(q.trim())
    if (result.success && result.articles) {
      setArticles(result.articles as Article[])
    }
    setSearching(false)
  }

  async function handleVote(articleId: string, helpful: boolean) {
    if (voted[articleId]) return
    setVoted((prev) => ({ ...prev, [articleId]: helpful ? 'up' : 'down' }))
    startTransition(async () => {
      await registerKBArticleUsage(articleId, null, helpful)
      // Refrescar scores
      loadAll()
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-sm">Cargando base de conocimientos…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 p-6 shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-xl">
            <BookOpen size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Base de Conocimientos</h1>
            <p className="text-white/75 text-sm mt-0.5">
              Soluciones validadas · Ranking por votos y uso real
            </p>
          </div>
          <div className="ml-auto hidden sm:flex items-center gap-2 text-white/70 text-sm">
            <Award size={16} />
            <span>{articles.length} artículos</span>
          </div>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Buscar soluciones: red, impresora, acceso, contraseña…"
          className="w-full pl-11 pr-10 py-3 border border-slate-200 rounded-xl text-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none bg-white shadow-sm"
        />
        {search && (
          <button
            onClick={() => handleSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        )}
        {searching && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {/* Leyenda de scoring */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
        <div className="flex items-center gap-1.5 font-medium text-slate-600">
          <Zap size={13} className="text-amber-500" /> Cómo se calcula el ranking:
        </div>
        <span className="flex items-center gap-1"><ThumbsUp size={11} className="text-emerald-500" /> Votos útiles <strong>×3</strong></span>
        <span className="flex items-center gap-1"><Star size={11} className="text-blue-500" /> Usos reales <strong>×2</strong></span>
        <span className="flex items-center gap-1"><Eye size={11} className="text-slate-400" /> Vistas <strong>×0.5</strong></span>
        <span className="flex items-center gap-1">⏱ Recencia hasta <strong>+10</strong></span>
      </div>

      {/* Lista con ranking */}
      {articles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <BookOpen size={48} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">
            {search ? 'No se encontraron artículos para esa búsqueda.' : 'Aún no hay artículos aprobados.'}
          </p>
          {search && (
            <button onClick={() => handleSearch('')} className="mt-3 text-sm text-emerald-600 hover:underline">
              Ver todos
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {articles.map((article, idx) => {
            const isOpen = expanded === article.id
            const myVote = voted[article.id]
            const totalVotes = article.helpful_count + article.not_helpful_count
            const helpfulPct = totalVotes > 0 ? Math.round((article.helpful_count / totalVotes) * 100) : null
            const medal = MEDAL[idx] ?? null

            return (
              <div
                key={article.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                {/* Card header - always visible */}
                <div className="p-5">
                  <div className="flex items-start gap-3">
                    {/* Rank */}
                    <div className="flex-shrink-0 flex flex-col items-center gap-1 w-10">
                      {medal ? (
                        <span className="text-2xl leading-none">{medal}</span>
                      ) : (
                        <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                          {idx + 1}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-base font-semibold text-slate-800 leading-snug">
                          {article.title}
                        </h3>
                        <ScoreBadge score={article.relevance_score} />
                      </div>

                      {article.summary && (
                        <p className="text-sm text-slate-500 line-clamp-2 mb-2">{article.summary}</p>
                      )}

                      {/* Meta row */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Eye size={12} /> {article.views_count} vistas
                        </span>
                        <span className="flex items-center gap-1">
                          <Star size={12} className="text-blue-400" /> {article.times_used} usos
                        </span>
                        {helpfulPct !== null && (
                          <span className="flex items-center gap-1 text-emerald-600 font-medium">
                            <ThumbsUp size={12} /> {helpfulPct}% útil ({totalVotes} votos)
                          </span>
                        )}
                        <span>
                          {article.category_level1}
                          {article.category_level2 && ` › ${article.category_level2}`}
                          {article.category_level3 && ` › ${article.category_level3}`}
                        </span>
                        {article.source_ticket && (
                          <span className="text-indigo-400 font-medium">
                            Ticket #{article.source_ticket.ticket_number}
                          </span>
                        )}
                      </div>

                      {/* Tags */}
                      {article.tags && article.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {article.tags.map((t, i) => (
                            <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded-full">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Expand toggle */}
                    <button
                      onClick={() => setExpanded(isOpen ? null : article.id)}
                      className="flex-shrink-0 p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
                    >
                      {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>

                {/* Expanded solution */}
                {isOpen && (
                  <div className="border-t border-slate-100 px-5 pb-5 pt-4 space-y-4">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Solución</h4>
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <pre className="whitespace-pre-wrap text-sm text-slate-800 font-sans leading-relaxed">
                          {article.solution}
                        </pre>
                      </div>
                    </div>

                    {/* Feedback */}
                    <div className="flex items-center gap-3 pt-1">
                      <span className="text-sm text-slate-500">¿Te fue útil esta solución?</span>
                      <button
                        onClick={() => handleVote(article.id, true)}
                        disabled={!!myVote || isPending}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                          myVote === 'up'
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-400 hover:text-emerald-600 disabled:opacity-50'
                        }`}
                      >
                        <ThumbsUp size={14} />
                        Sí, útil {article.helpful_count > 0 && `(${article.helpful_count})`}
                      </button>
                      <button
                        onClick={() => handleVote(article.id, false)}
                        disabled={!!myVote || isPending}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                          myVote === 'down'
                            ? 'bg-red-100 border-red-300 text-red-700'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-red-400 hover:text-red-500 disabled:opacity-50'
                        }`}
                      >
                        <ThumbsDown size={14} />
                        No
                      </button>
                      {myVote && (
                        <span className="text-xs text-emerald-600 font-medium">¡Gracias por tu voto!</span>
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
  )
}
