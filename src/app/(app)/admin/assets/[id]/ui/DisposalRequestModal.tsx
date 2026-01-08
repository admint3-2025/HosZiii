'use client'

import { useState } from 'react'
import { createDisposalRequest } from '../../disposal-actions'

type Props = {
  assetId: string
  assetTag: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function DisposalRequestModal({ assetId, assetTag, isOpen, onClose, onSuccess }: Props) {
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!reason.trim()) {
      setError('Debe proporcionar un motivo para la solicitud de baja')
      return
    }
    
    if (reason.trim().length < 20) {
      setError('El motivo debe tener al menos 20 caracteres para documentar correctamente')
      return
    }
    
    setIsSubmitting(true)
    setError(null)
    
    try {
      const result = await createDisposalRequest(assetId, reason.trim())
      
      if (result.success) {
        onSuccess()
        onClose()
        setReason('')
      } else {
        setError(result.error || 'Error al crear la solicitud')
      }
    } catch (err) {
      setError('Error inesperado. Intente nuevamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 bg-red-50">
          <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-full">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Solicitar Baja de Activo</h2>
            <p className="text-sm text-gray-600">
              <span className="font-mono font-semibold text-red-700">{assetTag}</span>
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
            {/* Aviso */}
            <div className="flex gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="text-sm text-amber-800">
                <p className="font-semibold">Flujo de autorización</p>
                <p className="mt-1">Esta solicitud será enviada a los administradores para su aprobación. Se notificará por correo al responsable del activo, supervisores de la sede y administradores.</p>
              </div>
            </div>

            {/* Campo de razón */}
            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                Motivo de la solicitud de baja <span className="text-red-500">*</span>
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explique detalladamente por qué se solicita dar de baja este activo. Incluya información como: daño irreparable, obsolescencia, pérdida, robo, etc."
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none text-sm"
                disabled={isSubmitting}
                autoFocus
              />
              <div className="flex justify-between mt-1">
                <p className="text-xs text-gray-500">Mínimo 20 caracteres</p>
                <p className={`text-xs ${reason.length < 20 ? 'text-amber-600' : 'text-green-600'}`}>
                  {reason.length} caracteres
                </p>
              </div>
            </div>

            {/* Información que se incluirá */}
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-xs font-medium text-gray-600 mb-2">📋 Se incluirá en la notificación:</p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• Snapshot completo del estado actual del activo</li>
                <li>• Historial de cambios recientes (últimos 10)</li>
                <li>• Información del solicitante y fecha/hora</li>
                <li>• Responsable actual y ubicación</li>
              </ul>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || reason.trim().length < 20}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Enviando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Enviar Solicitud
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
