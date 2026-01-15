'use client'

import { useState, useEffect } from 'react'
import { searchKBArticlesByCategory, registerKBArticleUsage, type KBArticle } from '@/lib/knowledge-base/actions'

interface KBSuggestionsProps {
  categoryLevel1: string | null
  categoryLevel2?: string | null
  categoryLevel3?: string | null
  ticketId?: string | null
}

export default function KBSuggestions({
  categoryLevel1,
  categoryLevel2,
  categoryLevel3,
  ticketId
}: KBSuggestionsProps) {
  const [articles, setArticles] = useState<KBArticle[]>([])
  const [selectedArticle, setSelectedArticle] = useState<KBArticle | null>(null)
  const [feedbackSent, setFeedbackSent] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let cancelled = false

    async function loadSuggestions() {
      if (!categoryLevel1) {
        setArticles([])
        return
      }

      const result = await searchKBArticlesByCategory(categoryLevel1, categoryLevel2, categoryLevel3)

      if (cancelled) return

      if (result.success && result.articles) {
        setArticles(result.articles.slice(0, 3)) // Top 3
      } else {
        setArticles([])
      }
    }

    void loadSuggestions()

    return () => {
      cancelled = true
    }
  }, [categoryLevel1, categoryLevel2, categoryLevel3])

  function handleArticleClick(article: KBArticle) {
    setSelectedArticle(article)
  }

  async function handleFeedback(articleId: string, wasHelpful: boolean) {
    await registerKBArticleUsage(articleId, ticketId || null, wasHelpful, undefined)
    setFeedbackSent(prev => ({ ...prev, [articleId]: true }))
  }

  if (!categoryLevel1 || articles.length === 0) {
    return null
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-blue-900 mb-1">
            💡 Soluciones Similares Encontradas
          </h3>
          <p className="text-sm text-blue-700">
            Basados en la categoría seleccionada, encontramos {articles.length} {articles.length === 1 ? 'solución' : 'soluciones'} que podrían ayudarte
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {articles.map((article) => (
          <div
            key={article.id}
            className="bg-white rounded-lg p-3 border border-blue-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer"
            onClick={() => handleArticleClick(article)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 text-sm mb-1">
                  {article.title}
                </h4>
                {article.summary && (
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {article.summary}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs">
                  <span className="flex items-center gap-1 text-green-600">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                    </svg>
                    {article.helpful_count}
                  </span>
                  <span className="flex items-center gap-1 text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    {article.views_count}
                  </span>
                  <span className="text-blue-600 font-medium">
                    Score: {article.relevance_score.toFixed(1)}
                  </span>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleArticleClick(article)
                }}
                className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center gap-1"
              >
                Ver más
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de detalle */}
      {selectedArticle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                {selectedArticle.title}
              </h3>
              <button
                onClick={() => setSelectedArticle(null)}
                className="text-white hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {selectedArticle.summary && (
                <div className="bg-blue-50 p-4 rounded-lg mb-4 border-l-4 border-blue-500">
                  <p className="text-sm text-gray-700">{selectedArticle.summary}</p>
                </div>
              )}

              <div className="mb-4">
                <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Solución
                </h4>
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap bg-gray-50 p-4 rounded-lg text-sm text-gray-800 border border-gray-200">
{selectedArticle.solution}
                  </pre>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  {selectedArticle.category_level1}
                  {selectedArticle.category_level2 && ` > ${selectedArticle.category_level2}`}
                  {selectedArticle.category_level3 && ` > ${selectedArticle.category_level3}`}
                </span>
              </div>

              {!feedbackSent[selectedArticle.id] && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">
                    ¿Te ayudó esta solución?
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleFeedback(selectedArticle.id, true)}
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                      </svg>
                      Sí, me ayudó
                    </button>
                    <button
                      onClick={() => handleFeedback(selectedArticle.id, false)}
                      className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.105-1.79l-.05-.025A4 4 0 0011.055 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
                      </svg>
                      No me ayudó
                    </button>
                  </div>
                </div>
              )}

              {feedbackSent[selectedArticle.id] && (
                <div className="border-t pt-4 text-center">
                  <p className="text-sm text-green-600 font-medium flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    ¡Gracias por tu feedback!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
