'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { updateTicketStatus, escalateTicket, softDeleteTicket, reopenTicket, requestEscalation, sendTicketByEmail } from '../actions'
import CloseTicketModal from './CloseTicketModal'

const STATUSES = [
  'NEW',
  'ASSIGNED',
  'IN_PROGRESS',
  'NEEDS_INFO',
  'WAITING_THIRD_PARTY',
  'RESOLVED',
  'CLOSED',
] as const

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Nuevo',
  ASSIGNED: 'Asignado',
  IN_PROGRESS: 'En progreso',
  NEEDS_INFO: 'Requiere información',
  WAITING_THIRD_PARTY: 'Esperando tercero',
  RESOLVED: 'Resuelto',
  CLOSED: 'Cerrado',
}

type Agent = { id: string; full_name: string | null; email: string | null }

export default function TicketActions({
  ticketId,
  currentStatus,
  supportLevel,
  currentAgentId,
  userRole,
  hasEscalationRequest = false,
}: {
  ticketId: string
  currentStatus: string
  supportLevel: number
  currentAgentId: string | null
  userRole: string
  hasEscalationRequest?: boolean
}) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [nextStatus, setNextStatus] = useState(currentStatus)
  const [assignedAgentId, setAssignedAgentId] = useState(currentAgentId ?? '')
  const [agents, setAgents] = useState<Agent[]>([])
  const [agentsL2, setAgentsL2] = useState<Agent[]>([])
  const [escalateAgentId, setEscalateAgentId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailRecipient, setEmailRecipient] = useState('')
  const [emailRecipientName, setEmailRecipientName] = useState('')
  const [emailReason, setEmailReason] = useState('')

  useEffect(() => {
    async function loadAgents() {
      // Cargar agentes L1, L2, supervisores y admin (filtrados por ubicación)
      try {
        const response = await fetch('/api/tickets/agents?level=all')
        if (response.ok) {
          const data = await response.json()
          setAgents(data.agents.map((p: any) => ({ 
            id: p.id, 
            full_name: p.full_name, 
            email: p.email 
          })))
        }
      } catch (err) {
        console.error('Error cargando agentes:', err)
      }

      // Cargar solo agentes L2, supervisores y admins para escalamiento (filtrados por ubicación)
      try {
        const response = await fetch('/api/tickets/agents?level=l2')
        if (response.ok) {
          const data = await response.json()
          setAgentsL2(data.agents.map((p: any) => ({ 
            id: p.id, 
            full_name: p.full_name, 
            email: p.email 
          })))
        }
      } catch (err) {
        console.error('Error cargando agentes L2:', err)
      }
    }
    loadAgents()
  }, [supabase])

  async function updateStatus() {
    setError(null)
    if (nextStatus === currentStatus && (nextStatus !== 'ASSIGNED' || assignedAgentId === currentAgentId)) return

    if (nextStatus === 'ASSIGNED' && !assignedAgentId) {
      setError('Selecciona un agente para asignar el ticket.')
      return
    }

    // Si es cierre, mostrar modal
    if (nextStatus === 'CLOSED') {
      setShowCloseModal(true)
      return
    }

    // Otros cambios de estado
    setBusy(true)

    const result = await updateTicketStatus({
      ticketId,
      currentStatus,
      nextStatus,
      assignedAgentId: nextStatus === 'ASSIGNED' ? assignedAgentId : null,
    })

    setBusy(false)
    
    if (result.error) {
      setError(result.error)
      return
    }
    
    router.refresh()
  }

  async function handleCloseTicket(resolution: string, attachmentFiles: File[]) {
    setBusy(true)

    const result = await updateTicketStatus({
      ticketId,
      currentStatus,
      nextStatus: 'CLOSED',
      resolution,
      attachments: attachmentFiles,
    })

    setBusy(false)
    
    if (result.error) {
      setError(result.error)
      return
    }

    setShowCloseModal(false)
    router.refresh()
  }

  async function escalateToL2() {
    setError(null)
    if (supportLevel === 2) return

    if (!escalateAgentId) {
      setError('Selecciona un técnico nivel 2, supervisor o administrador.')
      return
    }
    
    setBusy(true)
    
    const result = await escalateTicket(ticketId, supportLevel, escalateAgentId)
    
    setBusy(false)
    
    if (result.error) {
      setError(result.error)
      return
    }
    
    router.refresh()
  }

  async function handleRequestEscalation() {
    setError(null)
    const reason = prompt('Motivo de la solicitud de escalamiento (mínimo 20 caracteres):')
    if (!reason || reason.trim().length < 20) {
      setError('El motivo debe tener al menos 20 caracteres')
      return
    }
    
    console.log('[CLIENT] Llamando requestEscalation con reason:', reason.trim())
    setBusy(true)
    
    try {
      const result = await requestEscalation(ticketId, reason.trim())
      
      console.log('[CLIENT] Resultado de requestEscalation:', result)
      setBusy(false)
      
      if (result.error) {
        console.error('[CLIENT] Error recibido:', result.error)
        setError(result.error)
        return
      }
      
      alert('✓ Solicitud enviada al supervisor de tu sede')
      router.refresh()
    } catch (err) {
      console.error('[CLIENT] Exception en handleRequestEscalation:', err)
      setBusy(false)
      setError('Error inesperado: ' + (err as Error).message)
    }
  }

  async function handleSendTicketEmail() {
    setError(null)
    
    // Validar campos
    if (!emailRecipient.trim() || !emailRecipientName.trim()) {
      setError('Email y nombre del destinatario son requeridos')
      return
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailRecipient.trim())) {
      setError('Email inválido')
      return
    }

    setBusy(true)
    
    const result = await sendTicketByEmail({
      ticketId,
      recipientEmail: emailRecipient.trim(),
      recipientName: emailRecipientName.trim(),
      reason: emailReason.trim() || undefined,
    })
    
    setBusy(false)
    
    if (result.error) {
      setError(result.error)
      return
    }
    
    // Limpiar formulario y cerrar modal
    setEmailRecipient('')
    setEmailRecipientName('')
    setEmailReason('')
    setShowEmailModal(false)
    
    alert(`✓ ${result.message}`)
    router.refresh()
  }

  async function softDelete() {
    setError(null)
    const reason = prompt('Motivo de eliminación (auditoría):')
    if (!reason || !reason.trim()) return
    
    setBusy(true)
    
    const result = await softDeleteTicket(ticketId, reason.trim())
    
    setBusy(false)
    
    if (result.error) {
      setError(result.error)
      return
    }
    
    router.push('/tickets')
    router.refresh()
  }

  async function handleReopenTicket() {
    setError(null)
    const reason = prompt('Motivo de reapertura (mínimo 10 caracteres):')
    if (!reason || reason.trim().length < 10) {
      setError('El motivo de reapertura debe tener al menos 10 caracteres')
      return
    }
    
    setBusy(true)
    
    const result = await reopenTicket(ticketId, reason.trim())
    
    setBusy(false)
    
    if (result.error) {
      setError(result.error)
      return
    }
    
    router.refresh()
  }

  return (
    <>
      <CloseTicketModal
        isOpen={showCloseModal}
        onClose={() => setShowCloseModal(false)}
        onConfirm={handleCloseTicket}
        busy={busy}
      />

      <div className="sticky top-6">
        <div className="card shadow-sm border border-gray-200">
        <div className="bg-gradient-to-r from-indigo-50 via-sky-50 to-white border-b border-indigo-100 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 text-xs font-semibold">⚡</span>
            <div>
              <h3 className="text-xs font-semibold text-indigo-900 uppercase tracking-wide">Acciones del ticket</h3>
              <p className="mt-0.5 text-[11px] text-indigo-600">Flujo operativo: estado, escalamiento, correo y eliminación auditable.</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4 text-sm">
          {/* Cambiar estado */}
          <div>
            <label className="block text-xs font-semibold text-indigo-800 mb-1">
              Estado del ticket
            </label>
            <p className="text-[11px] text-indigo-600 mb-1">Define en qué etapa del ciclo de atención se encuentra.</p>
            <select
              className="select select-sm w-full"
              value={nextStatus}
              onChange={(e) => setNextStatus(e.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s] || s}
                </option>
              ))}
            </select>

            {nextStatus === 'ASSIGNED' && (
              <div className="mt-2 p-2.5 bg-blue-50 rounded border border-blue-200">
                <label className="block text-xs font-semibold text-blue-900 mb-1">
                  Asignar responsable
                </label>
                <p className="text-[11px] text-blue-700 mb-1">Selecciona el técnico que quedará como responsable del ticket.</p>
                <select
                  className="select select-sm w-full"
                  value={assignedAgentId}
                  onChange={(e) => setAssignedAgentId(e.target.value)}
                >
                  <option value="">-- Seleccionar técnico --</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.full_name || a.id}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="mt-2 flex justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={updateStatus}
                className="btn btn-sm btn-primary px-4"
              >
                {busy ? 'Aplicando…' : 'Aplicar estado'}
              </button>
            </div>
          </div>

          {/* Escalamiento */}
          <div className="pt-3 border-t border-gray-200">
            <label className="block text-xs font-semibold text-amber-800 mb-1">
              Escalamiento a Nivel 2
            </label>
            <p className="text-[11px] text-amber-700 mb-2">Usa esta sección cuando el caso requiere atención de un nivel superior.</p>
            
            {/* Técnico L1: Solo puede solicitar escalamiento */}
            {userRole === 'agent_l1' && supportLevel === 1 && currentStatus !== 'CLOSED' && (
              <>
                {hasEscalationRequest ? (
                  <div className="p-2.5 bg-amber-50 rounded border border-amber-200">
                    <p className="text-xs text-amber-900 font-medium">Solicitud pendiente</p>
                    <p className="text-xs text-amber-700 mt-0.5">Esperando aprobación.</p>
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={handleRequestEscalation}
                      className="btn btn-sm btn-outline bg-white text-amber-700 border-amber-300 hover:bg-amber-50"
                    >
                      Solicitar escalamiento
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Admin, Supervisor, L2: Pueden escalar directamente */}
            {['admin', 'supervisor', 'agent_l2'].includes(userRole) && supportLevel === 1 && currentStatus !== 'CLOSED' && (
              <>
                <div className="mt-1 space-y-2">
                  <select
                    className="select select-sm w-full"
                    value={escalateAgentId}
                    onChange={(e) => setEscalateAgentId(e.target.value)}
                    disabled={busy}
                  >
                    <option value="">-- Seleccionar técnico L2/Supervisor/Admin --</option>
                    {agentsL2.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.full_name || a.id}
                      </option>
                    ))}
                  </select>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={busy || !escalateAgentId}
                      onClick={escalateToL2}
                      className="btn btn-sm bg-amber-600 hover:bg-amber-700 text-white px-4 whitespace-nowrap"
                    >
                      Escalar a Nivel 2
                    </button>
                  </div>
                </div>
              </>
            )}
            
            {currentStatus === 'CLOSED' && (
              <div className="p-2.5 bg-gray-50 rounded border border-gray-200 text-center">
                <p className="text-xs text-gray-600">Ticket cerrado: no se puede escalar.</p>
              </div>
            )}

            {supportLevel === 2 && (
              <div className="p-2.5 bg-blue-50 rounded border border-blue-200 text-center">
                <p className="text-xs text-blue-700">Ya está en Nivel 2</p>
              </div>
            )}
          </div>

          {/* Reapertura */}
          {currentStatus === 'CLOSED' && (
            <div className="pt-3 border-t border-gray-200">
              <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-green-100 rounded-lg">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-green-800">¿Necesitas reabrir este ticket?</p>
                      <p className="text-[11px] text-green-600">Si el problema persiste, puedes reactivarlo</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleReopenTicket}
                    className="btn btn-sm bg-green-600 hover:bg-green-700 text-white shadow-sm whitespace-nowrap"
                  >
                    🔄 Reabrir
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Enviar ticket por email (solo admin y supervisor) y eliminación */}
          {(userRole === "admin" || userRole === "supervisor") && (
            <div className="pt-3 border-t border-gray-200 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-blue-800">Enviar por correo</p>
                  <p className="text-[11px] text-blue-600">Envía un resumen completo del ticket para investigación o deslinde.</p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setShowEmailModal(true)}
                  className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
                >
                  Enviar resumen
                </button>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={softDelete}
                className="btn btn-sm btn-outline btn-error"
              >
                Eliminar
              </button>
            </div>
          )}

          {/* Eliminación (para otros roles con permiso de borrar en el futuro) */}
          {(userRole !== "admin" && userRole !== "supervisor") && (
            <div className="pt-3 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={softDelete}
                className="btn btn-sm btn-outline btn-error"
              >
                Eliminar
              </button>
            </div>
          )}

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          ) : null}
        </div>
      </div>
      </div>

      {/* Modal para enviar ticket por email */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-xl">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Enviar Ticket por Correo
              </h3>
              <p className="text-sm text-blue-100 mt-1">
                Información completa para investigación
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  📧 Se enviará un correo con toda la información del ticket: descripción, comentarios, historial, tiempos, etc.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email del destinatario <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  placeholder="ejemplo@empresa.com"
                  className="input w-full"
                  disabled={busy}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nombre del destinatario <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={emailRecipientName}
                  onChange={(e) => setEmailRecipientName(e.target.value)}
                  placeholder="Juan Pérez"
                  className="input w-full"
                  disabled={busy}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Motivo del envío (opcional)
                </label>
                <textarea
                  value={emailReason}
                  onChange={(e) => setEmailReason(e.target.value)}
                  placeholder="Ej: Investigación de ticket no atendido, deslinde de responsabilidades, etc."
                  rows={3}
                  className="input w-full"
                  disabled={busy}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Este motivo se incluirá en el correo y en el historial del ticket
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 flex items-start gap-2">
                    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span>{error}</span>
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowEmailModal(false)
                    setEmailRecipient('')
                    setEmailRecipientName('')
                    setEmailReason('')
                    setError(null)
                  }}
                  disabled={busy}
                  className="btn flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSendTicketEmail}
                  disabled={busy || !emailRecipient.trim() || !emailRecipientName.trim()}
                  className="btn flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {busy ? 'Enviando...' : 'Enviar correo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
