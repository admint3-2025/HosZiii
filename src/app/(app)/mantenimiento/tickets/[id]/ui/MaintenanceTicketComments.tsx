'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { useRouter } from 'next/navigation'
import { getAvatarInitial } from '@/lib/ui/avatar'
import { uploadMaintenanceTicketAttachment } from '@/lib/storage/attachments'
import { addMaintenanceTicketComment } from '../actions'

type CommentAttachment = {
  id: string
  file_name: string
  file_path: string
  mime_type: string
  file_size: number
}

type Comment = {
  id: string
  body: string
  visibility: string
  created_at: string
  author_id: string
  author?: {
    full_name?: string
    email?: string
  }
  attachments?: CommentAttachment[]
}

export default function MaintenanceTicketComments({
  ticketId,
  comments: initialComments,
  ticketStatus,
  ticketClosedAt,
  isRequester,
  userRole,
}: {
  ticketId: string
  comments: Comment[]
  ticketStatus: string
  ticketClosedAt?: string | null
  isRequester: boolean
  userRole: string
}) {
  const supabase = createSupabaseBrowserClient()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [newComment, setNewComment] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'internal'>('public')
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [lightboxAlt, setLightboxAlt] = useState<string>('')

  const isClosed = ticketStatus === 'CLOSED'
  const canAddComment = !isClosed
  const canSeeInternal = ['maintenance_tech', 'maintenance_supervisor', 'supervisor', 'admin', 'agent_l1', 'agent_l2'].includes(userRole)

  // Filtrar comentarios según visibilidad
  const visibleComments = comments.filter(c => 
    c.visibility === 'public' || canSeeInternal
  )

  const openLightbox = useCallback((url: string, alt: string) => {
    setLightboxUrl(url)
    setLightboxAlt(alt)
  }, [])

  const closeLightbox = useCallback(() => {
    setLightboxUrl(null)
    setLightboxAlt('')
  }, [])

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (files) {
      setPendingFiles(prev => [...prev, ...Array.from(files)])
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function removeFile(index: number) {
    setPendingFiles(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!newComment.trim() && pendingFiles.length === 0) return
    
    setError(null)
    setBusy(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      console.log('[MaintenanceTicketComments] Llamando a addMaintenanceTicketComment...')
      console.log('[MaintenanceTicketComments] Params:', { ticketId, body: newComment.trim() || '[adjuntos]', visibility })
      
      // 1. Crear el comentario usando server action (incluye notificaciones)
      const result = await addMaintenanceTicketComment({
        ticketId,
        body: newComment.trim() || (pendingFiles.length > 0 ? `[Adjuntos: ${pendingFiles.length} archivo(s)]` : ''),
        visibility,
      })
      
      console.log('[MaintenanceTicketComments] Resultado del action:', result)
      
      if (result.error || !result.comment) {
        console.error('[MaintenanceTicketComments] Error en el action:', result.error)
        throw new Error(result.error || 'Error al crear comentario')
      }
      
      const commentData = result.comment

      // 2. Subir archivos adjuntos al comentario
      const uploadedAttachments: CommentAttachment[] = []
      
      for (const file of pendingFiles) {
        const uploadResult = await uploadMaintenanceTicketAttachment(ticketId, file, user.id)
        
        if (uploadResult.success && uploadResult.path) {
          // Actualizar el registro para asociarlo al comentario
          const { data: attachmentData } = await supabase
            .from('ticket_attachments_maintenance')
            .update({ comment_id: commentData.id })
            .eq('file_path', uploadResult.path)
            .select('id, file_name, file_path, mime_type, file_size')
            .single()
          
          if (attachmentData) {
            uploadedAttachments.push(attachmentData)
          }
        }
      }

      // 3. Agregar al estado local
      setComments(prev => [...prev, {
        ...commentData,
        author: {
          full_name: user.user_metadata?.full_name,
          email: user.email,
        },
        attachments: uploadedAttachments,
      }])
      
      setNewComment('')
      setPendingFiles([])
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Error al agregar comentario')
    } finally {
      setBusy(false)
    }
  }

  async function getSignedUrl(filePath: string) {
    const { data } = await supabase.storage
      .from('maintenance-attachments')
      .createSignedUrl(filePath, 3600)
    return data?.signedUrl
  }

  async function handleViewAttachment(attachment: CommentAttachment) {
    const url = await getSignedUrl(attachment.file_path)
    if (url) {
      if (attachment.mime_type?.startsWith('image/')) {
        openLightbox(url, attachment.file_name || 'Imagen')
      } else {
        window.open(url, '_blank')
      }
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border-0">
      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-orange-100 rounded-lg">
            <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">
            Comentarios ({visibleComments.length})
          </h3>
        </div>

        {/* Lista de comentarios */}
        <div className="space-y-4 mb-6">
          {visibleComments.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-xl">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-sm text-gray-500">No hay comentarios aún</p>
            </div>
          ) : (
            visibleComments.map((comment) => (
              <div 
                key={comment.id} 
                className={`p-4 rounded-xl border ${
                  comment.visibility === 'internal' 
                    ? 'bg-amber-50 border-amber-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {getAvatarInitial({
                        fullName: comment.author?.full_name,
                        email: comment.author?.email,
                      })}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900">
                        {comment.author?.full_name || comment.author?.email || 'Usuario'}
                      </span>
                      {comment.visibility === 'internal' && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-amber-200 text-amber-800 rounded">
                          Interno
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {new Date(comment.created_at).toLocaleString('es-MX', {
                          timeZone: 'America/Mexico_City',
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.body}</p>
                    
                    {/* Adjuntos del comentario */}
                    {comment.attachments && comment.attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {comment.attachments.map((att) => (
                          <button
                            key={att.id}
                            onClick={() => handleViewAttachment(att)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 hover:bg-gray-50 hover:border-orange-300 transition"
                          >
                            {att.mime_type?.startsWith('image/') ? (
                              <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                            )}
                            <span className="truncate max-w-[150px]">{att.file_name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Formulario nuevo comentario */}
        {canAddComment ? (
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-3">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Escribe un comentario o adjunta evidencia del seguimiento..."
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                disabled={busy}
              />

              {/* Archivos pendientes */}
              {pendingFiles.length > 0 && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-xs font-medium text-orange-700 mb-2">
                    Archivos a adjuntar ({pendingFiles.length}):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {pendingFiles.map((file, idx) => (
                      <div 
                        key={idx}
                        className="inline-flex items-center gap-2 px-2.5 py-1.5 bg-white border border-orange-200 rounded-lg text-xs"
                      >
                        {file.type.startsWith('image/') ? (
                          <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        )}
                        <span className="truncate max-w-[120px] text-gray-700">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {/* Botón adjuntar */}
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 cursor-pointer transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    Adjuntar
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                      onChange={handleFileSelect}
                      className="hidden"
                      disabled={busy}
                    />
                  </label>

                  {canSeeInternal && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-gray-600">Visibilidad:</label>
                      <select
                        value={visibility}
                        onChange={(e) => setVisibility(e.target.value as 'public' | 'internal')}
                        className="text-xs border border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-orange-500"
                        disabled={busy}
                      >
                        <option value="public">Público</option>
                        <option value="internal">Interno</option>
                      </select>
                    </div>
                  )}
                </div>
                
                <button
                  type="submit"
                  disabled={busy || (!newComment.trim() && pendingFiles.length === 0)}
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg text-sm font-semibold hover:from-orange-600 hover:to-amber-600 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {busy ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      Enviando...
                    </span>
                  ) : 'Enviar'}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="p-4 bg-gray-100 rounded-xl text-center">
            <p className="text-sm text-gray-600">
              Este ticket está cerrado. No se pueden agregar más comentarios.
            </p>
          </div>
        )}
      </div>

      {lightboxUrl && (
        <EvidenceLightbox url={lightboxUrl} alt={lightboxAlt || 'Imagen'} onClose={closeLightbox} />
      )}
    </div>
  )
}

function EvidenceLightbox({
  url,
  alt,
  onClose,
}: {
  url: string
  alt: string
  onClose: () => void
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-[10000] p-2 rounded-full bg-white/20 hover:bg-white/40 transition-colors text-white"
        title="Cerrar (Esc)"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[10000] px-4 py-2 rounded-full bg-white/20 text-white text-xs">
        Clic fuera o presiona Esc para cerrar
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="max-w-[95vw] max-h-[90vh] object-contain rounded-lg shadow-2xl cursor-default select-none"
        draggable={false}
      />
    </div>
  )
}
