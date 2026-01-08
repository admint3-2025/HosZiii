'use client'

import { useState } from 'react'
import Link from 'next/link'
import { approveDisposalRequest, rejectDisposalRequest } from '../../disposal-actions'

interface Ticket {
  id: string
  ticket_number: number
  title: string
  status: string
  priority: string
  created_at: string
}

interface Change {
  id: string
  field_name: string
  old_value: string | null
  new_value: string | null
  changed_at: string
}

interface DisposalRequest {
  id: string
  asset_id: string
  requested_by: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  requested_at: string
  reviewed_at: string | null
  review_notes: string | null
  asset: {
    id: string
    asset_tag: string
    asset_type: string
    brand: string | null
    model: string | null
    serial_number: string | null
    location: { name: string; code: string } | null
  }
  requester_name: string
  reviewer_name: string | null
  tickets: Ticket[]
  changes: Change[]
}

interface Props {
  requests: DisposalRequest[]
}

const fieldLabels: Record<string, string> = {
  asset_tag: 'Etiqueta',
  asset_type: 'Tipo',
  brand: 'Marca',
  model: 'Modelo',
  serial_number: 'Serie',
  status: 'Estado',
  assigned_to: 'Asignado a',
  location_id: 'Sede',
  notes: 'Notas',
  created: 'Creado'
}

export default function DisposalActionsClient({ requests }: Props) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [approvalNotes, setApprovalNotes] = useState('')
  const [modal, setModal] = useState<{ type: 'approve' | 'reject'; id: string } | null>(null)

  const filtered = requests.filter(r => filter === 'all' ? true : r.status === filter)

  const handleApprove = async () => {
    if (!modal) return
    const req = requests.find(r => r.id === modal.id)
    if (!req) return

    setProcessingId(modal.id)
    try {
      const result = await approveDisposalRequest(modal.id, req.asset_id, approvalNotes || undefined)
      if (!result.success) alert('Error: ' + result.error)
      else window.location.reload()
    } catch (e) {
      alert('Error: ' + e)
    } finally {
      setProcessingId(null)
      setModal(null)
      setApprovalNotes('')
    }
  }

  const handleReject = async () => {
    if (!modal || rejectReason.length < 10) return

    setProcessingId(modal.id)
    try {
      const result = await rejectDisposalRequest(modal.id, rejectReason)
      if (!result.success) alert('Error: ' + result.error)
      else window.location.reload()
    } catch (e) {
      alert('Error: ' + e)
    } finally {
      setProcessingId(null)
      setModal(null)
      setRejectReason('')
    }
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })

  const formatField = (name: string, val: string | null): string => {
    if (!val || val === 'null') return '(vacío)'
    if (/^[0-9a-f-]{36}$/i.test(val)) return '(ref)'
    return val
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6 -mb-px">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                filter === tab 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'all' ? 'Todas' : tab === 'pending' ? 'Pendientes' : tab === 'approved' ? 'Aprobadas' : 'Rechazadas'}
              {tab !== 'all' && (
                <span className="ml-2 text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                  {requests.filter(r => r.status === tab).length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No hay solicitudes
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {filtered.map((req) => (
            <div key={req.id} className="py-4">
              {/* Row principal */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link 
                      href={`/admin/assets/${req.asset_id}`}
                      className="font-medium text-gray-900 hover:text-blue-600"
                    >
                      {req.asset?.asset_tag}
                    </Link>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      req.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      req.status === 'approved' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {req.status === 'pending' ? 'Pendiente' : req.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                    </span>
                    {req.tickets.length > 0 && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                        {req.tickets.length} incidencia{req.tickets.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {req.asset?.brand} {req.asset?.model} • {req.asset?.location?.name || 'Sin sede'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Solicitado por: <span className="text-gray-600">{req.requester_name}</span> · {formatDate(req.requested_at)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {req.status === 'pending' && (
                    <>
                      <button
                        onClick={() => setModal({ type: 'approve', id: req.id })}
                        disabled={processingId === req.id}
                        className="text-sm text-green-600 hover:text-green-700 font-medium"
                      >
                        Aprobar
                      </button>
                      <button
                        onClick={() => setModal({ type: 'reject', id: req.id })}
                        disabled={processingId === req.id}
                        className="text-sm text-gray-500 hover:text-red-600"
                      >
                        Rechazar
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <svg className={`w-4 h-4 transition-transform ${expandedId === req.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Expandido */}
              {expandedId === req.id && (
                <div className="mt-4 pl-4 border-l-2 border-gray-100 space-y-4">
                  {/* Motivo */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Motivo de la Solicitud</h4>
                    <p className="text-sm text-gray-700">"{req.reason}"</p>
                  </div>

                  {/* Resolución */}
                  {req.status !== 'pending' && (
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        {req.status === 'approved' ? 'Aprobación' : 'Rechazo'}
                      </h4>
                      <p className="text-sm text-gray-700">
                        {req.review_notes || '(sin notas)'} — <span className="text-gray-500">{req.reviewer_name}</span>
                      </p>
                      {req.reviewed_at && <p className="text-xs text-gray-400">{formatDate(req.reviewed_at)}</p>}
                    </div>
                  )}

                  {/* Tickets */}
                  {req.tickets.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                        Incidencias ({req.tickets.length})
                      </h4>
                      <div className="space-y-1">
                        {req.tickets.slice(0, 5).map(t => (
                          <div key={t.id} className="flex items-center justify-between text-sm">
                            <div>
                              <Link href={`/admin/tickets/${t.id}`} className="text-blue-600 hover:underline">
                                #{t.ticket_number}
                              </Link>
                              <span className="text-gray-600 ml-2">{t.title}</span>
                            </div>
                            <span className="text-xs text-gray-400">{t.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cambios */}
                  {req.changes.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                        Cambios ({req.changes.length})
                      </h4>
                      <div className="space-y-1 text-sm">
                        {req.changes.slice(0, 5).map(c => (
                          <div key={c.id} className="flex items-center gap-2">
                            <span className="text-gray-500 text-xs w-32">{formatDate(c.changed_at).split(',')[0]}</span>
                            <span className="text-gray-700">{fieldLabels[c.field_name] || c.field_name}</span>
                            <span className="text-gray-400">{formatField(c.field_name, c.old_value)}</span>
                            <span className="text-gray-400">→</span>
                            <span className="text-gray-700">{formatField(c.field_name, c.new_value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Aprobar */}
      {modal?.type === 'approve' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setModal(null)}>
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Aprobar Solicitud</h3>
            <p className="text-sm text-gray-600 mb-4">El activo será dado de baja y se notificará al solicitante.</p>
            <textarea
              className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Notas (opcional)"
              value={approvalNotes}
              onChange={e => setApprovalNotes(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setModal(null)} className="text-sm text-gray-500 hover:text-gray-700">
                Cancelar
              </button>
              <button
                onClick={handleApprove}
                disabled={processingId === modal.id}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {processingId === modal.id ? 'Procesando...' : 'Aprobar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Rechazar */}
      {modal?.type === 'reject' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setModal(null)}>
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Rechazar Solicitud</h3>
            <p className="text-sm text-gray-600 mb-4">Indica el motivo del rechazo.</p>
            <textarea
              className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Motivo del rechazo (mínimo 10 caracteres)"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => { setModal(null); setRejectReason('') }} className="text-sm text-gray-500 hover:text-gray-700">
                Cancelar
              </button>
              <button
                onClick={handleReject}
                disabled={processingId === modal.id || rejectReason.length < 10}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {processingId === modal.id ? 'Procesando...' : 'Rechazar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
