'use client'

import { useState, useEffect } from 'react'
import { getTicketAttachments, getSignedUrl, deleteAttachment, formatFileSize, getFileIcon } from '@/lib/storage/attachments'
import { useRouter } from 'next/navigation'

type Attachment = {
  id: string
  file_name: string
  file_size: number
  file_type: string
  storage_path: string
  uploaded_by: string
  created_at: string
}

type Props = {
  ticketId: string
  canDelete: boolean
}

export default function TicketAttachments({ ticketId, canDelete }: Props) {
  const router = useRouter()
const [attachments, setAttachments] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [previewImage, setPreviewImage] = useState<Attachment | null>(null)

  useEffect(() => {
    loadAttachments()
  }, [ticketId])

  async function loadAttachments() {
    try {
      setLoading(true)
      const data = await getTicketAttachments(ticketId)
      setAttachments(data || [])
    } catch (error) {
      console.error('Error loading attachments:', error)
      setAttachments([])
    } finally {
      setLoading(false)
    }
  }

  async function handleDownload(attachment: Attachment) {
    const signedUrl = await getSignedUrl(attachment.storage_path)
    if (signedUrl) {
      window.open(signedUrl, '_blank')
    }
  }

  async function handleDelete(attachmentId: string) {
    if (!confirm('¿Estás seguro de eliminar este archivo?')) return

    setDeletingId(attachmentId)
    const success = await deleteAttachment(attachmentId)
    setDeletingId(null)

    if (success) {
      setAttachments(prev => prev.filter(a => a.id !== attachmentId))
      router.refresh()
    } else {
      alert('Error al eliminar el archivo')
    }
  }

  if (loading) {
    return (
      <div className="card shadow-lg border-0">
        <div className="card-body pt-3 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-green-100 rounded-lg">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </div>
            <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">Archivos adjuntos</h3>
          </div>
          <div className="flex items-center justify-center py-8">
            <svg className="animate-spin w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        </div>
      </div>
    )
  }

  if (attachments.length === 0) {
    return (
      <div className="card shadow-lg border-0 bg-gray-50">
        <div className="card-body pt-3 pb-4">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="p-1.5 bg-gray-200 rounded-lg">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </div>
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Archivos adjuntos</h3>
          </div>
          <p className="text-sm text-gray-500 text-center py-3">
            No hay archivos adjuntos en este ticket
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="card shadow-lg border-0">
      <div className="card-body pt-3 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-green-100 rounded-lg">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </div>
          <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">
            Archivos adjuntos ({attachments.length})
          </h3>
        </div>

        <div className="space-y-2">
          {attachments.map((attachment) => {
            const isImage = attachment.file_type.startsWith('image/')
            
            return (
              <div
                key={attachment.id}
                className="flex items-center gap-3 p-3 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg hover:shadow-md transition-shadow group"
              >
                {/* Ícono/Preview */}
                <div className="flex-shrink-0">
                  {isImage ? (
                    <div 
                      className="w-12 h-12 bg-white rounded border border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                      onClick={() => setPreviewImage(attachment)}
                      title="Click para vista previa"
                    >
                      <AttachmentPreview attachment={attachment} />
                    </div>
                  ) : (
                    <div className="w-12 h-12 flex items-center justify-center bg-white border border-gray-300 rounded text-2xl">
                      {getFileIcon(attachment.file_type)}
                    </div>
                  )}
                </div>

                {/* Info del archivo */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {attachment.file_name}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-gray-500">
                      {formatFileSize(attachment.file_size)}
                    </span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">
                      {new Date(attachment.created_at).toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2">
                  {/* Botón descargar */}
                  <button
                    type="button"
                    onClick={() => handleDownload(attachment)}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Descargar archivo"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>

                  {/* Botón eliminar (solo staff) */}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => handleDelete(attachment.id)}
                      disabled={deletingId === attachment.id}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                      title="Eliminar archivo"
                    >
                      {deletingId === attachment.id ? (
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal de vista previa */}
      {previewImage && (
        <AttachmentLightbox attachment={previewImage} onClose={() => setPreviewImage(null)} />
      )}
    </div>
  )
}

// Componente para preview de imágenes (thumbnail)
function AttachmentPreview({ attachment }: { attachment: Attachment }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)

  useEffect(() => {
    async function loadUrl() {
      const url = await getSignedUrl(attachment.storage_path)
      setSignedUrl(url)
    }
    loadUrl()
  }, [attachment.storage_path])

  if (!signedUrl) {
    return (
      <svg className="w-6 h-6 text-gray-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={signedUrl} alt={attachment.file_name} className="w-full h-full object-cover" />
  )
}

function AttachmentLightbox({
  attachment,
  onClose,
}: {
  attachment: Attachment
  onClose: () => void
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

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

  useEffect(() => {
    let cancelled = false
    async function loadUrl() {
      setLoading(true)
      const url = await getSignedUrl(attachment.storage_path)
      if (cancelled) return
      setSignedUrl(url)
      setLoading(false)
    }
    loadUrl()
    return () => {
      cancelled = true
    }
  }, [attachment.storage_path])

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

      {loading || !signedUrl ? (
        <div className="flex items-center justify-center w-full h-96" onClick={(e) => e.stopPropagation()}>
          <svg className="animate-spin w-12 h-12 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={signedUrl}
          alt={attachment.file_name}
          onClick={(e) => e.stopPropagation()}
          className="max-w-[95vw] max-h-[90vh] object-contain rounded-lg shadow-2xl cursor-default select-none"
          draggable={false}
        />
      )}
    </div>
  )
}
