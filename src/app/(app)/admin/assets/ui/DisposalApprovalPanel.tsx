'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { approveDisposalRequest, rejectDisposalRequest } from '../disposal-actions'

type DisposalRequest = {
  id: string
  asset_id: string
  reason: string
  requested_at: string
  asset_snapshot: {
    asset_tag: string
    asset_type: string
    brand?: string
    model?: string
    serial_number?: string
    location_name?: string
    assigned_to_name?: string
    image_url?: string
  }
  requester: {
    full_name: string | null
    email: string | null
  } | null
  asset: {
    asset_tag: string
    asset_type: string
    brand?: string
    model?: string
    image_url?: string
  } | null
}

type Props = {
  requests: DisposalRequest[]
}

export default function DisposalApprovalPanel({ requests }: Props) {
  const router = useRouter()
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectNotes, setRejectNotes] = useState('')
  const [approveNotes, setApproveNotes] = useState('')
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (requests.length === 0) {
    return null
  }

  const handleApprove = async (requestId: string, assetId: string) => {
    setProcessingId(requestId)
    setError(null)
    
    try {
      const result = await approveDisposalRequest(requestId, assetId, approveNotes || undefined)
      
      if (result.success) {
        setApprovingId(null)
        setApproveNotes('')
        router.refresh()
      } else {
        setError(result.error || 'Error al aprobar')
      }
    } catch (err) {
      setError('Error inesperado')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (requestId: string) => {
    if (!rejectNotes.trim()) {
      setError('Debe proporcionar un motivo de rechazo')
      return
    }
    
    setProcessingId(requestId)
    setError(null)
    
    try {
      const result = await rejectDisposalRequest(requestId, rejectNotes)
      
      if (result.success) {
        setRejectingId(null)
        setRejectNotes('')
        router.refresh()
      } else {
        setError(result.error || 'Error al rechazar')
      }
    } catch (err) {
      setError('Error inesperado')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="card bg-red-50 border-2 border-red-200 shadow-lg">
      <div className="card-body p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-full">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-red-900">Solicitudes de Baja Pendientes</h2>
            <p className="text-sm text-red-700">{requests.length} solicitud{requests.length > 1 ? 'es' : ''} requiere{requests.length > 1 ? 'n' : ''} autorización</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-800 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {requests.map((request) => {
            const snapshot = request.asset_snapshot
            const isApproving = approvingId === request.id
            const isRejecting = rejectingId === request.id
            const isProcessing = processingId === request.id
            
            return (
              <div key={request.id} className="bg-white rounded-lg border border-red-200 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Imagen */}
                    {snapshot?.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={snapshot.image_url} 
                        alt={snapshot.asset_tag}
                        className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                      />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      {/* Info del activo */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-gray-900">{snapshot?.asset_tag}</span>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                          {snapshot?.asset_type?.replace(/_/g, ' ')}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mt-1">
                        {snapshot?.brand} {snapshot?.model}
                        {snapshot?.serial_number && <span className="text-gray-400"> • S/N: {snapshot.serial_number}</span>}
                      </p>
                      
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        {snapshot?.location_name && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            </svg>
                            {snapshot.location_name}
                          </span>
                        )}
                        {snapshot?.assigned_to_name && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {snapshot.assigned_to_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Motivo */}
                  <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                    <p className="text-xs font-semibold text-red-800 mb-1">Motivo de baja:</p>
                    <p className="text-sm text-red-700 italic">&quot;{request.reason}&quot;</p>
                  </div>
                  
                  {/* Solicitante */}
                  <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                    <span>
                      Solicitado por <strong>{request.requester?.full_name || 'Usuario'}</strong>
                      <span className="text-gray-400"> ({request.requester?.email})</span>
                    </span>
                    <span>
                      {new Date(request.requested_at).toLocaleString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
                
                {/* Acciones */}
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                  {isApproving ? (
                    <div className="space-y-3">
                      <textarea
                        value={approveNotes}
                        onChange={(e) => setApproveNotes(e.target.value)}
                        placeholder="Notas de aprobación (opcional)"
                        rows={2}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(request.id, request.asset_id)}
                          disabled={isProcessing}
                          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          {isProcessing ? 'Procesando...' : '✓ Confirmar Aprobación'}
                        </button>
                        <button
                          onClick={() => { setApprovingId(null); setApproveNotes('') }}
                          disabled={isProcessing}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : isRejecting ? (
                    <div className="space-y-3">
                      <textarea
                        value={rejectNotes}
                        onChange={(e) => setRejectNotes(e.target.value)}
                        placeholder="Motivo del rechazo (requerido)"
                        rows={2}
                        className="w-full px-3 py-2 text-sm border border-red-300 rounded-lg resize-none focus:ring-red-500 focus:border-red-500"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReject(request.id)}
                          disabled={isProcessing || !rejectNotes.trim()}
                          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                        >
                          {isProcessing ? 'Procesando...' : '✗ Confirmar Rechazo'}
                        </button>
                        <button
                          onClick={() => { setRejectingId(null); setRejectNotes('') }}
                          disabled={isProcessing}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setApprovingId(request.id)}
                        className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Aprobar Baja
                      </button>
                      <button
                        onClick={() => setRejectingId(request.id)}
                        className="flex-1 px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Rechazar
                      </button>
                      <a
                        href={`/admin/assets/${request.asset_id}`}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Ver
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
