'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { getSignedUrl } from '@/lib/storage/attachments'

function AttachmentLink({ attachment, isImage }: { attachment: any; isImage: boolean }) {
  const [url, setUrl] = useState<string | null>(null)

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    const signedUrl = await getSignedUrl(attachment.storage_path)
    if (signedUrl) {
      window.open(signedUrl, '_blank')
    }
  }

  return (
    <button
      onClick={handleClick}
      className="group relative flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors text-sm cursor-pointer"
    >
      {isImage ? (
        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
      )}
      <span className="text-blue-700 font-medium truncate max-w-[200px]">{attachment.file_name}</span>
      <span className="text-xs text-blue-600">
        ({(attachment.file_size / 1024).toFixed(1)} KB)
      </span>
    </button>
  )
}

export default function TicketComments({
  ticketId,
  comments,
  ticketStatus,
  ticketClosedAt,
  isRequester,
  userRole,
}: {
  ticketId: string
  comments: any[]
  ticketStatus: string
  ticketClosedAt: string | null
  isRequester: boolean
  userRole: string
}) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [body, setBody] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'internal'>('public')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reopening, setReopening] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])

  // Verificar si el ticket está cerrado
  const isClosed = ticketStatus === 'CLOSED'
  
  // Verificar si se puede reabrir (mismo día del cierre)
  const canReopen = isClosed && ticketClosedAt && isRequester && (() => {
    const closedDate = new Date(ticketClosedAt)
    const today = new Date()
    return closedDate.toDateString() === today.toDateString()
  })()

  // Los usuarios estándar no pueden comentar en tickets cerrados
  const canComment = !isClosed || userRole !== 'requester'

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    const imageFiles = files.filter(f => f.type.startsWith('image/'))
    
    if (imageFiles.length !== files.length) {
      setError('Solo se permiten archivos de imagen')
      return
    }
    
    // Validar tamaño máximo 10MB por archivo
    const oversized = imageFiles.filter(f => f.size > 10 * 1024 * 1024)
    if (oversized.length > 0) {
      setError('Las imágenes no deben superar 10MB cada una')
      return
    }
    
    setError(null)
    setAttachments(prev => [...prev, ...imageFiles])
    
    // Crear URLs de preview
    imageFiles.forEach(file => {
      const url = URL.createObjectURL(file)
      setPreviewUrls(prev => [...prev, url])
    })
  }

  function removeAttachment(index: number) {
    setAttachments(prev => prev.filter((_, i) => i !== index))
    URL.revokeObjectURL(previewUrls[index])
    setPreviewUrls(prev => prev.filter((_, i) => i !== index))
  }

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

    // Crear el comentario primero
    const { data: commentData, error: commentErr } = await supabase
      .from('ticket_comments')
      .insert({
        ticket_id: ticketId,
        author_id: authorId,
        body,
        visibility,
      })
      .select()
      .single()

    if (commentErr) {
      setBusy(false)
      setError(commentErr.message)
      return
    }

    // Subir archivos adjuntos si los hay
    if (attachments.length > 0 && commentData) {
      for (const file of attachments) {
        try {
          const timestamp = Date.now()
          const randomStr = Math.random().toString(36).substring(2, 8)
          const fileExt = file.name.split('.').pop()
          const storagePath = `${ticketId}/${timestamp}-${randomStr}.${fileExt}`

          // Subir a storage
          const { error: uploadErr } = await supabase.storage
            .from('ticket-attachments')
            .upload(storagePath, file, {
              cacheControl: '3600',
              upsert: false,
            })

          if (uploadErr) {
            console.error('Error subiendo imagen:', uploadErr)
            continue
          }

          // Registrar en tabla de adjuntos
          const { error: attachErr } = await supabase
            .from('ticket_attachments')
            .insert({
              ticket_id: ticketId,
              comment_id: commentData.id,
              file_name: file.name,
              file_size: file.size,
              file_type: file.type,
              storage_path: storagePath,
              uploaded_by: authorId,
            })

          if (attachErr) {
            console.error('Error registrando adjunto:', attachErr)
          }
        } catch (err) {
          console.error('Error procesando archivo:', err)
        }
      }
    }

    // Limpiar estado y refrescar
    setBusy(false)
    setBody('')
    setAttachments([])
    previewUrls.forEach(url => URL.revokeObjectURL(url))
    setPreviewUrls([])
    router.refresh()
  }

  async function reopenTicket() {
    setReopening(true)
    setError(null)

    try {
      const response = await fetch(`/api/tickets/${ticketId}/reopen`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al reabrir el ticket')
      }

      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setReopening(false)
    }
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
              <div className="ml-12 space-y-3">
                <div className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">{c.body}</div>
                
                {/* Mostrar adjuntos si los hay */}
                {c.ticket_attachments && c.ticket_attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {c.ticket_attachments.map((att: any) => {
                      const isImage = att.file_type?.startsWith('image/')
                      
                      return (
                        <AttachmentLink
                          key={att.id}
                          attachment={att}
                          isImage={isImage}
                        />
                      )
                    })}
                  </div>
                )}
              </div>
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

        {/* Formulario de nuevo comentario o botón de reapertura */}
        {isClosed && isRequester && !canComment ? (
          <div className="pt-4 border-t border-gray-200 space-y-4">
            {canReopen ? (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-amber-900">Ticket cerrado</p>
                      <p className="text-xs text-amber-700 mt-1">
                        Si la incidencia volvió a ocurrir, puedes reabrir este ticket hasta el final del día de hoy.
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={reopenTicket}
                  disabled={reopening}
                  className="btn btn-warning w-full flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {reopening ? 'Reabriendo…' : 'La incidencia volvió a ocurrir'}
                </button>
              </>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Ticket cerrado</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Este ticket ha sido cerrado. No es posible agregar más comentarios. Si necesitas ayuda con una nueva incidencia, crea un nuevo ticket.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}
          </div>
        ) : canComment ? (
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
          
          {/* Selector de imágenes */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wider">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Adjuntar Imágenes
            </label>
            <div className="flex items-center gap-2">
              <label className="btn btn-secondary text-sm cursor-pointer inline-flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Seleccionar imágenes
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={busy}
                />
              </label>
              {attachments.length > 0 && (
                <span className="text-xs text-gray-600">
                  {attachments.length} imagen{attachments.length !== 1 ? 'es' : ''} seleccionada{attachments.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            
            {/* Preview de imágenes */}
            {previewUrls.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                {previewUrls.map((url, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={url}
                      alt={attachments[idx].name}
                      className="w-full h-24 object-cover rounded-lg border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="absolute top-1 right-1 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Eliminar"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <div className="absolute bottom-1 left-1 right-1 bg-black bg-opacity-60 text-white text-xs px-1.5 py-0.5 rounded truncate">
                      {attachments[idx].name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
        ) : null}
      </div>
    </section>
  )
}
