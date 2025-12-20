'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

export default function TicketComments({
  ticketId,
  comments,
}: {
  ticketId: string
  comments: any[]
}) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [body, setBody] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'internal'>('public')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function addComment(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)

    const { data: userRes } = await supabase.auth.getUser()
    const authorId = userRes.user?.id
    if (!authorId) {
      setBusy(false)
      setError('Sesión inválida. Vuelve a iniciar sesión.')
      return
    }

    const { error } = await supabase.from('ticket_comments').insert({
      ticket_id: ticketId,
      author_id: authorId,
      body,
      visibility,
    })

    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }

    setBody('')
    router.refresh()
  }

  return (
    <section className="card shadow-lg border-0">
      <div className="card-body space-y-6">
        {/* Header de comentarios */}
        <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
          <div className="p-2 bg-green-100 rounded-lg">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Comentarios</h2>
            <p className="text-xs text-gray-600">Seguimiento puntual por incidencia</p>
          </div>
        </div>

        {/* Lista de comentarios */}
        <div className="space-y-4">
          {(comments ?? []).map((c) => (
            <div key={c.id} className="group relative bg-gradient-to-br from-white to-gray-50 rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {/* Avatar del autor */}
                  <div className="flex-shrink-0 w-9 h-9 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center ring-2 ring-purple-100">
                    <span className="text-white text-sm font-bold">
                      {c.author?.full_name?.[0]?.toUpperCase() || c.author?.email?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                  
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">
                        {c.author?.full_name || c.author?.email || 'Usuario desconocido'}
                      </span>
                      {c.visibility === 'internal' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          Interno
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                          </svg>
                          Público
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {new Date(c.created_at).toLocaleString('es-ES', { 
                        day: '2-digit', 
                        month: 'short', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              </div>
              <div className="ml-12 whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">{c.body}</div>
            </div>
          ))}
          {comments?.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-3">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-sm text-gray-600 font-medium">Aún no hay comentarios</p>
              <p className="text-xs text-gray-500 mt-1">Sé el primero en comentar</p>
            </div>
          ) : null}
        </div>

        {/* Formulario de nuevo comentario */}
        <form onSubmit={addComment} className="space-y-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Visibilidad</label>
            <select
              className="select w-auto text-sm"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as any)}
            >
              <option value="public">📢 Público</option>
              <option value="internal">🔒 Interno</option>
            </select>
          </div>
          <textarea
            className="textarea min-h-32 text-sm"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            placeholder="Escribe un comentario para dar seguimiento..."
          />
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="btn btn-primary w-full flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            {busy ? 'Publicando…' : 'Publicar comentario'}
          </button>
        </form>
      </div>
    </section>
  )
}
