'use client'

import { useEffect, useState } from 'react'
import { 
  getPendingKBArticles, 
  approveKBArticle, 
  rejectKBArticle,
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
  const [filter, setFilter] = useState<'pending' | 'all'>('pending')

  useEffect(() => {
    loadArticles()
  }, [])

  async function loadArticles() {
    setLoading(true)
    const result = await getPendingKBArticles()
    if (result.success && result.articles) {
      setArticles(result.articles)
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
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Base de Conocimientos</h1>
            <p className="text-gray-600 mt-1">Revisa y aprueba artículos generados automáticamente desde tickets cerrados</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'pending'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Pendientes ({articles.length})
          </button>
        </div>
      </div>

      {/* Lista de artículos */}
      {articles.length === 0 ? (
        <div className="card shadow-lg border-0">
          <div className="card-body text-center py-12">
            <div className="mb-4">
              <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay artículos pendientes</h3>
            <p className="text-gray-500">Los artículos se generan automáticamente cuando se cierran tickets con resoluciones de calidad.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {articles.map((article) => (
            <div key={article.id} className="card shadow-lg border-0 hover:shadow-xl transition-shadow">
              <div className="card-body">
                {/* Header del artículo */}
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{article.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">{article.summary}</p>
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
                <div className="flex gap-2 pt-4 border-t">
                  <button
                    onClick={() => setSelectedArticle(article)}
                    className="btn btn-sm flex-1 bg-blue-600 hover:bg-blue-700 text-white border-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Ver detalle
                  </button>
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
                </div>
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

              {/* Rechazar con razón */}
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
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
