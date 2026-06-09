'use client'

import { useEffect, useState } from 'react'
import { 
  getPendingKBArticles,
  getApprovedKBArticles,
  approveKBArticle, 
  rejectKBArticle,
  updateKBArticle,
  deleteKBArticle,
  setKBArticleScore,
  type KBArticle
} from '@/lib/knowledge-base/actions'

type PendingArticle = KBArticle & {
  creator?: { full_name: string }
  source_ticket?: { ticket_number: number; title: string }
}

export default function KBAdminView() {
  const [articles, setArticles] = useState<PendingArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedArticle, setSelectedArticle] = useState<PendingArticle | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [processing, setProcessing] = useState(false)
  const [filter, setFilter] = useState<'approved' | 'pending'>('approved')
  const [pendingCount, setPendingCount] = useState(0)
  const [editingArticle, setEditingArticle] = useState<PendingArticle | null>(null)
  const [editForm, setEditForm] = useState({
    title: '', summary: '', solution: '',
    tags: '', category_level1: '', category_level2: '', category_level3: ''
  })
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({})
  const [savingScore, setSavingScore] = useState<Record<string, boolean>>({})

  useEffect(() => {
    loadArticles()
  }, [filter])

  async function loadArticles() {
    setLoading(true)
    if (filter === 'pending') {
      const result = await getPendingKBArticles()
      if (result.success && result.articles) {
        setArticles(result.articles)
        setPendingCount(result.articles.length)
      }
    } else {
      const result = await getApprovedKBArticles()
      if (result.success && result.articles) {
        setArticles(result.articles)
      }
      // También cargar conteo de pendientes
      const pendingResult = await getPendingKBArticles()
      if (pendingResult.success && pendingResult.articles) {
        setPendingCount(pendingResult.articles.length)
      }
    }
    setLoading(false)
  }

  async function handleApprove(articleId: string) {
    setProcessing(true)
    const result = await approveKBArticle(articleId)
    if (result.success) {
      setArticles(articles.filter(a => a.id !== articleId))
      setSelectedArticle(null)
    } else {
      alert('Error al aprobar: ' + result.error)
    }
    setProcessing(false)
  }

  async function handleReject(articleId: string) {
    if (!rejectionReason.trim()) {
      alert('Por favor proporciona una razón para el rechazo')
      return
    }

    setProcessing(true)
    const result = await rejectKBArticle(articleId, rejectionReason)
    if (result.success) {
      setArticles(articles.filter(a => a.id !== articleId))
      setSelectedArticle(null)
      setRejectionReason('')
    } else {
      alert('Error al rechazar: ' + result.error)
    }
    setProcessing(false)
  }

  function openEdit(article: PendingArticle) {
    setEditingArticle(article)
    setEditForm({
      title: article.title,
      summary: article.summary || '',
      solution: article.solution,
      tags: (article.tags || []).join(', '),
      category_level1: article.category_level1,
      category_level2: article.category_level2 || '',
      category_level3: article.category_level3 || '',
    })
  }

  async function handleSaveEdit() {
    if (!editingArticle) return
    setProcessing(true)
    const result = await updateKBArticle(editingArticle.id, {
      title: editForm.title,
      summary: editForm.summary,
      solution: editForm.solution,
      tags: editForm.tags.split(',').map(t => t.trim()).filter(Boolean),
      category_level1: editForm.category_level1,
      category_level2: editForm.category_level2 || null,
      category_level3: editForm.category_level3 || null,
    })
    if (result.success) {
      setEditingArticle(null)
      await loadArticles()
    } else {
      alert('Error al guardar: ' + result.error)
    }
    setProcessing(false)
  }

  async function handleDelete(articleId: string) {
    setProcessing(true)
    const result = await deleteKBArticle(articleId)
    if (result.success) {
      setDeleteConfirmId(null)
      setArticles(articles.filter(a => a.id !== articleId))
    } else {
      alert('Error al eliminar: ' + result.error)
    }
    setProcessing(false)
  }

  async function handleSaveScore(articleId: string) {
    const scoreStr = scoreInputs[articleId]
    const score = parseFloat(scoreStr)
    if (isNaN(score) || score < 0 || score > 100) {
      alert('Score debe ser entre 0 y 100')
      return
    }
    setSavingScore(prev => ({ ...prev, [articleId]: true }))
    const result = await setKBArticleScore(articleId, score)
    if (result.success) {
      setArticles(articles.map(a => a.id === articleId ? { ...a, relevance_score: score } : a))
      setScoreInputs(prev => ({ ...prev, [articleId]: '' }))
    } else {
      alert('Error al ajustar score: ' + result.error)
    }
    setSavingScore(prev => ({ ...prev, [articleId]: false }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 mx-auto mb-4 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Cargando artículos pendientes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header moderno */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 p-6 shadow-xl">
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl -mr-36 -mt-36"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-3xl -ml-24 -mb-24"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Base de Conocimientos</h1>
              <p className="text-white/80 text-sm mt-0.5">Artículos generados desde tickets resueltos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Banner informativo - Diseño moderno */}
      <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-2xl p-5">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 p-2 bg-teal-100 rounded-xl">
            <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-slate-800 mb-2">
              🚀 Sistema de Base de Conocimientos Inteligente
            </h3>
            <p className="text-sm text-slate-600 mb-3">
              Revoluciona la resolución de incidencias técnicas en tu equipo.
            </p>
            <div className="grid sm:grid-cols-2 gap-2 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span><strong>Aprendizaje automático</strong> de tickets resueltos</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span><strong>Soluciones validadas</strong> y probadas</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span><strong>Resolución ágil</strong> con documentación accesible</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-teal-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span><strong>Sistema activo</strong> y en mejora continua</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('approved')}
          className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
              filter === 'approved'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/25'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ✓ Aprobados ({articles.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
              filter === 'pending'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ⏳ Pendientes {pendingCount > 0 && (
              <span className="ml-1.5 px-2 py-0.5 bg-white text-orange-600 rounded-full text-xs font-bold">
                {pendingCount}
              </span>
            )}
          </button>
      </div>

      {/* Lista de artículos */}
      {articles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-center py-12 px-6">
            <div className="mb-4">
              <svg className="w-16 h-16 mx-auto text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              {filter === 'pending' ? 'No hay artículos pendientes' : 'No hay artículos aprobados'}
            </h3>
            <p className="text-slate-500">
              {filter === 'pending' 
                ? 'Los artículos se generan automáticamente cuando se cierran tickets con resoluciones de calidad.'
                : 'Aprueba artículos pendientes para que aparezcan aquí.'
              }
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {articles.map((article, idx) => (
            <div key={article.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-teal-300 transition-all p-5">
              {/* Ranking badge (solo para aprobados) */}
              {filter === 'approved' && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl leading-none">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null}
                  </span>
                  {idx > 2 && (
                    <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                      {idx + 1}
                    </span>
                  )}
                  <span className="ml-auto text-xs font-bold text-purple-600 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full">
                    Score: {article.relevance_score.toFixed(1)}
                  </span>
                </div>
              )}
              {/* Header del artículo */}
              <div className="mb-4">
                <h3 className="text-lg font-bold text-slate-800 mb-2">{article.title}</h3>
                <p className="text-sm text-slate-600 line-clamp-2">{article.summary}</p>
                </div>

                {/* Metadata */}
                <div className="space-y-2 text-xs text-gray-600 mb-4">
                  {article.source_ticket?.ticket_number && (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                      </svg>
                      <span className="font-medium">Ticket #{article.source_ticket.ticket_number}</span>
                      {article.source_ticket.title && (
                        <span className="text-gray-500">• {article.source_ticket.title}</span>
                      )}
                    </div>
                  )}

                  {article.creator?.full_name && (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>Creado por: {article.creator.full_name}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span>
                      {article.category_level1}
                      {article.category_level2 && ` → ${article.category_level2}`}
                      {article.category_level3 && ` → ${article.category_level3}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{new Date(article.created_at).toLocaleString('es-CO')}</span>
                  </div>

                  {/* Estadísticas de artículos aprobados */}
                  {filter === 'approved' && (
                    <div className="flex items-center gap-4 pt-2 border-t mt-2">
                      <div className="flex items-center gap-1 text-green-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                        </svg>
                        <span className="text-xs font-medium">{article.helpful_count} útil</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span className="text-xs">{article.views_count} vistas</span>
                      </div>
                      <div className="flex items-center gap-1 text-blue-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs">{article.times_used} usos</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {article.tags && article.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {article.tags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Acciones */}
                <div className="space-y-2 pt-4 border-t">
                  {/* Score manual (solo aprobados) */}
                  {filter === 'approved' && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-slate-500 font-medium whitespace-nowrap">Score:</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        placeholder={article.relevance_score.toFixed(1)}
                        value={scoreInputs[article.id] ?? ''}
                        onChange={e => setScoreInputs(prev => ({ ...prev, [article.id]: e.target.value }))}
                        className="w-24 border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                      />
                      <button
                        onClick={() => handleSaveScore(article.id)}
                        disabled={!scoreInputs[article.id] || savingScore[article.id]}
                        className="btn btn-xs bg-purple-600 hover:bg-purple-700 text-white border-0 disabled:opacity-40"
                      >
                        Guardar
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedArticle(article)}
                      className="btn btn-sm flex-1 bg-blue-600 hover:bg-blue-700 text-white border-0"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Ver
                    </button>
                    <button
                      onClick={() => openEdit(article)}
                      className="btn btn-sm bg-amber-500 hover:bg-amber-600 text-white border-0"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Editar
                    </button>
                    {filter === 'pending' && (
                      <button
                        onClick={() => handleApprove(article.id)}
                        disabled={processing}
                        className="btn btn-sm bg-green-600 hover:bg-green-700 text-white border-0 disabled:opacity-50"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Aprobar
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteConfirmId(article.id)}
                      title="Eliminar artículo"
                      className="btn btn-sm bg-red-500 hover:bg-red-600 text-white border-0"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  {/* Confirmación de eliminación */}
                  {deleteConfirmId === article.id && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm">
                      <p className="text-red-700 font-medium mb-2">¿Eliminar este artículo? Esta acción no se puede deshacer.</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDelete(article.id)}
                          disabled={processing}
                          className="btn btn-xs bg-red-600 hover:bg-red-700 text-white border-0 disabled:opacity-50"
                        >
                          Sí, eliminar
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="btn btn-xs bg-slate-200 hover:bg-slate-300 text-slate-700 border-0"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de detalle */}
      {selectedArticle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-2">{selectedArticle.title}</h2>
                  <p className="text-blue-100">{selectedArticle.summary}</p>
                </div>
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Solución */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Solución
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">
                    {selectedArticle.solution}
                  </pre>
                </div>
              </div>

              {/* Metadata adicional */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-bold text-gray-600 uppercase mb-2">Categorías</h4>
                  <div className="text-sm text-gray-800">
                    <div>{selectedArticle.category_level1}</div>
                    {selectedArticle.category_level2 && (
                      <div className="ml-4">↳ {selectedArticle.category_level2}</div>
                    )}
                    {selectedArticle.category_level3 && (
                      <div className="ml-8">↳ {selectedArticle.category_level3}</div>
                    )}
                  </div>
                </div>

                {selectedArticle.tags && selectedArticle.tags.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-600 uppercase mb-2">Etiquetas</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedArticle.tags.map((tag, idx) => (
                        <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Rechazar con razón - solo para pendientes */}
              {filter === 'pending' && (
                <>
                  <div className="border-t pt-4">
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">
                      Razón de rechazo (opcional):
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="textarea w-full text-sm"
                      rows={3}
                      placeholder="Ej: Información incompleta, solución incorrecta, duplicado, etc."
                    />
                  </div>

                  {/* Acciones */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprove(selectedArticle.id)}
                      disabled={processing}
                      className="btn flex-1 bg-green-600 hover:bg-green-700 text-white border-0 disabled:opacity-50"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Aprobar artículo
                    </button>
                    <button
                      onClick={() => handleReject(selectedArticle.id)}
                      disabled={processing}
                      className="btn flex-1 bg-red-600 hover:bg-red-700 text-white border-0 disabled:opacity-50"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Rechazar artículo
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de edición */}
      {editingArticle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Editar artículo</h2>
                <button
                  onClick={() => setEditingArticle(null)}
                  className="text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1 block">Título</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1 block">Resumen</label>
                <textarea
                  value={editForm.summary}
                  onChange={e => setEditForm(f => ({ ...f, summary: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1 block">Solución</label>
                <textarea
                  value={editForm.solution}
                  onChange={e => setEditForm(f => ({ ...f, solution: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
                  rows={7}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-1 block">Categoría 1</label>
                  <input
                    type="text"
                    value={editForm.category_level1}
                    onChange={e => setEditForm(f => ({ ...f, category_level1: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-1 block">Categoría 2</label>
                  <input
                    type="text"
                    value={editForm.category_level2}
                    onChange={e => setEditForm(f => ({ ...f, category_level2: e.target.value }))}
                    placeholder="Opcional"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-1 block">Categoría 3</label>
                  <input
                    type="text"
                    value={editForm.category_level3}
                    onChange={e => setEditForm(f => ({ ...f, category_level3: e.target.value }))}
                    placeholder="Opcional"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1 block">Etiquetas (separadas por coma)</label>
                <input
                  type="text"
                  value={editForm.tags}
                  onChange={e => setEditForm(f => ({ ...f, tags: e.target.value }))}
                  placeholder="windows, bsod, arranque"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div className="flex gap-3 pt-2 border-t">
                <button
                  onClick={handleSaveEdit}
                  disabled={processing}
                  className="btn flex-1 bg-amber-500 hover:bg-amber-600 text-white border-0 disabled:opacity-50"
                >
                  {processing ? 'Guardando...' : 'Guardar cambios'}
                </button>
                <button
                  onClick={() => setEditingArticle(null)}
                  className="btn bg-slate-200 hover:bg-slate-300 text-slate-700 border-0"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
