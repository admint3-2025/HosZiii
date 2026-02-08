'use client'

import { useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
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

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function ImagePreview({ attachment }: { attachment: Attachment }) {
  const [url, setUrl] = useState<string | null>(null)
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    async function loadUrl() {
      const { data } = await supabase.storage
        .from('maintenance-attachments')
        .createSignedUrl(attachment.storage_path, 3600)
      if (data?.signedUrl) setUrl(data.signedUrl)
    }
    loadUrl()
  }, [attachment.storage_path])

  if (!url) {
    return <div className="w-full h-full bg-gray-200 animate-pulse" />
  }

  return (
    <img
      src={url}
      alt={attachment.file_name}
      className="w-full h-full object-cover"
    />
  )
}

export default function MaintenanceTicketAttachments({ 
  ticketId, 
  canDelete = false
}: { 
  ticketId: string
  canDelete?: boolean
}) {
  const supabase = createSupabaseBrowserClient()
  const router = useRouter()
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewAlt, setPreviewAlt] = useState<string>('')

  useEffect(() => {
    loadAttachments()
  }, [ticketId])

  async function loadAttachments() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('ticket_attachments_maintenance')
        .select('id, file_name, file_size, mime_type, file_path, uploaded_by, created_at')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading attachments:', error)
        setAttachments([])
      } else {
        const mappedData = (data || []).map(item => ({
          id: item.id,
          file_name: item.file_name,
          file_size: item.file_size || 0,
          file_type: item.mime_type || 'application/octet-stream',
          storage_path: item.file_path,
          uploaded_by: item.uploaded_by,
          created_at: item.created_at,
        }))
        setAttachments(mappedData)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleView(attachment: Attachment) {
    const { data } = await supabase.storage
      .from('maintenance-attachments')
      .createSignedUrl(attachment.storage_path, 3600)
    
    if (data?.signedUrl) {
      if (attachment.file_type.startsWith('image/')) {
        setPreviewUrl(data.signedUrl)
        setPreviewAlt(attachment.file_name)
      } else {
        window.open(data.signedUrl, '_blank')
      }
    }
  }

  const closePreview = useCallback(() => {
    setPreviewUrl(null)
    setPreviewAlt('')
  }, [])

  async function handleDelete(attachmentId: string) {
    if (!confirm('¿Estás seguro de eliminar este archivo?')) return
    
    setDeletingId(attachmentId)
    const attachment = attachments.find(a => a.id === attachmentId)
    
    if (attachment) {
      await supabase.storage
        .from('maintenance-attachments')
        .remove([attachment.storage_path])
      
      await supabase
        .from('ticket_attachments_maintenance')
        .delete()
        .eq('id', attachmentId)
    }
    
    setDeletingId(null)
    setAttachments(prev => prev.filter(a => a.id !== attachmentId))
    router.refresh()
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Archivos adjuntos</h3>
          </div>
          <div className="flex justify-center py-6">
            <svg className="animate-spin w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24">
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
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Archivos adjuntos</h3>
          </div>
          <div className="text-center py-6 bg-gradient-to-br from-gray-50 to-orange-50/30 rounded-xl border border-dashed border-orange-200">
            <svg className="w-10 h-10 text-orange-200 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            <p className="text-sm text-gray-500">No hay archivos adjuntos</p>
            <p className="text-xs text-gray-400 mt-1">Los adjuntos se agregan desde los comentarios</p>
          </div>
        </div>
      </div>
    )
  }

  const images = attachments.filter(a => a.file_type.startsWith('image/'))
  const files = attachments.filter(a => !a.file_type.startsWith('image/'))

  return (
    <>
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Archivos adjuntos</h3>
              <p className="text-xs text-gray-500">{attachments.length} archivo{attachments.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {/* Grid de imágenes - Miniaturas */}
          {images.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Imágenes</p>
              <div className="flex flex-wrap gap-2">
                {images.map((img) => (
                  <div key={img.id} className="relative group">
                    <div 
                      onClick={() => handleView(img)}
                      className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 cursor-pointer border border-gray-200 hover:border-orange-400 hover:shadow-md transition"
                    >
                      <ImagePreview attachment={img} />
                    </div>
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition rounded-lg flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleView(img)}
                        className="p-1 bg-white rounded-full hover:bg-gray-100 transition"
                        title="Ver"
                      >
                        <svg className="w-3 h-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(img.id)}
                          disabled={deletingId === img.id}
                          className="p-1 bg-red-500 rounded-full hover:bg-red-600 transition disabled:opacity-50"
                          title="Eliminar"
                        >
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lista de archivos */}
          {files.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Documentos</p>
              <div className="space-y-2">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-orange-300 transition"
                  >
                    <button
                      onClick={() => handleView(file)}
                      className="flex items-center gap-3 flex-1 text-left"
                    >
                      <div className="p-2 bg-white rounded-lg border border-gray-200">
                        {file.file_type === 'application/pdf' ? (
                          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{file.file_name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(file.file_size)}</p>
                      </div>
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(file.id)}
                        disabled={deletingId === file.id}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                        title="Eliminar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de preview */}
      {previewUrl && (
        <EvidenceLightbox url={previewUrl} alt={previewAlt || 'Preview'} onClose={closePreview} />
      )}
    </>
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
