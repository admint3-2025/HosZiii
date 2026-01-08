'use client'

import { useState, useRef } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

type AssetImageUploadProps = {
  assetId?: string
  currentImageUrl?: string | null
  onImageUploaded: (url: string) => void
  onImageRemoved?: () => void
}

export default function AssetImageUpload({
  assetId,
  currentImageUrl,
  onImageUploaded,
  onImageRemoved,
}: AssetImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo de archivo
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      setError('Tipo de archivo no válido. Use JPG, PNG, WebP o GIF.')
      return
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen es demasiado grande. Máximo 5MB.')
      return
    }

    setError(null)
    setIsUploading(true)

    try {
      const supabase = createSupabaseBrowserClient()

      // Generar nombre único para el archivo
      const fileExt = file.name.split('.').pop()
      const fileName = `${assetId || 'new'}-${Date.now()}.${fileExt}`
      const filePath = `assets/${fileName}`

      // Subir archivo
      const { error: uploadError } = await supabase.storage
        .from('asset-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) {
        throw uploadError
      }

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('asset-images')
        .getPublicUrl(filePath)

      setPreviewUrl(publicUrl)
      onImageUploaded(publicUrl)
    } catch (err: unknown) {
      console.error('Error uploading image:', err)
      setError(err instanceof Error ? err.message : 'Error al subir la imagen')
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveImage = async () => {
    if (!previewUrl) return

    try {
      const supabase = createSupabaseBrowserClient()

      // Extraer path del archivo de la URL
      const urlParts = previewUrl.split('/asset-images/')
      if (urlParts.length > 1) {
        const filePath = urlParts[1]
        await supabase.storage.from('asset-images').remove([filePath])
      }

      setPreviewUrl(null)
      onImageRemoved?.()
    } catch (err) {
      console.error('Error removing image:', err)
    }
  }

  return (
    <div className="space-y-2">

      {previewUrl ? (
        <div className="relative">
          <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200">
            <img
              src={previewUrl}
              alt="Imagen del activo"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="absolute top-2 right-2 flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 bg-white/90 hover:bg-white rounded-lg shadow-md transition-colors"
              title="Cambiar imagen"
            >
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleRemoveImage}
              className="p-2 bg-white/90 hover:bg-white rounded-lg shadow-md transition-colors"
              title="Eliminar imagen"
            >
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`
            w-full h-48 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors
            ${isUploading ? 'border-blue-300 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}
          `}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <svg className="w-8 h-8 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
              </svg>
              <span className="text-sm text-blue-600">Subiendo imagen...</span>
            </div>
          ) : (
            <>
              <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm text-gray-500">Click para subir imagen</span>
              <span className="text-xs text-gray-400 mt-1">JPG, PNG, WebP o GIF (máx. 5MB)</span>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        className="hidden"
      />

      {error && (
        <div className="text-sm text-red-600 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}
    </div>
  )
}
