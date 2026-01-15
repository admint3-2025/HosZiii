'use client'

import { useState, useRef } from 'react'
import { validateFile, formatFileSize, getFileIcon } from '@/lib/storage/attachments'

type AttachmentFile = {
  file: File
  preview?: string
}

type Props = {
  onFilesChange: (files: File[]) => void
  maxFiles?: number
}

export default function AttachmentUploader({ onFilesChange, maxFiles = 5 }: Props) {
  const [files, setFiles] = useState<AttachmentFile[]>([])
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    setError(null)

    if (files.length + selectedFiles.length > maxFiles) {
      setError(`Máximo ${maxFiles} archivos permitidos`)
      return
    }

    // Validar cada archivo
    const validFiles: AttachmentFile[] = []
    for (const file of selectedFiles) {
      const validation = validateFile(file)
      if (!validation.valid) {
        setError(validation.error || 'Archivo inválido')
        return
      }

      // Crear preview para imágenes
      let preview: string | undefined
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file)
      }

      validFiles.push({ file, preview })
    }

    const newFiles = [...files, ...validFiles]
    setFiles(newFiles)
    onFilesChange(newFiles.map(f => f.file))
  }

  const removeFile = (index: number) => {
    // Liberar URL de preview
    if (files[index].preview) {
      URL.revokeObjectURL(files[index].preview!)
    }

    const newFiles = files.filter((_, i) => i !== index)
    setFiles(newFiles)
    onFilesChange(newFiles.map(f => f.file))
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
          Archivos adjuntos (opcional)
        </label>
        
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={files.length >= maxFiles}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-sm rounded-lg border border-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Agregar archivo
          </button>
          
          <span className="text-xs text-gray-500">
            {files.length}/{maxFiles} archivos • Máx 10MB cada uno
          </span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          multiple
        />

        <p className="mt-2 text-xs text-gray-500">
          Formatos: Imágenes, PDF, Word, Excel, Texto
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg group hover:bg-gray-100 transition-colors"
            >
              {/* Preview o ícono */}
              <div className="flex-shrink-0">
                {item.preview ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.preview}
                      alt={item.file.name}
                      className="w-12 h-12 object-cover rounded border border-gray-300"
                    />
                  </>
                ) : (
                  <div className="w-12 h-12 flex items-center justify-center bg-white border border-gray-300 rounded text-2xl">
                    {getFileIcon(item.file.type)}
                  </div>
                )}
              </div>

              {/* Info del archivo */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {item.file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(item.file.size)}
                </p>
              </div>

              {/* Botón eliminar */}
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Eliminar archivo"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
