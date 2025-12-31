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
}: {
  ticketId: string
  currentStatus: string
  supportLevel: number
  currentAgentId: string | null
  userRole: string
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
    
    setBusy(true)
    
    const result = await requestEscalation(ticketId, reason.trim())
    
    setBusy(false)
    
    if (result.error) {
      setError(result.error)
      return
    }
    
    alert('✓ Solicitud enviada al supervisor de tu sede')
    router.refresh()
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
        <div className="card shadow-lg border-0 overflow-hidden">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 px-5 py-4">
          <div className="flex items-center gap-2 text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h3 className="text-sm font-semibold uppercase tracking-wider">Acciones</h3>
          </div>
        </div>

        <div className="card-body space-y-4">
          {/* Cambiar estado */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wider">
              <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Estado
            </label>
            <select
              className="select w-full text-sm"
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
              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <label className="flex items-center gap-2 text-xs font-semibold text-blue-800 mb-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Asignar a
                </label>
                <select
                  className="select w-full text-sm"
                  value={assignedAgentId}
                  onChange={(e) => setAssignedAgentId(e.target.value)}
                >
                  <option value="">-- Seleccionar agente --</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.full_name || a.id}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              disabled={busy}
              onClick={updateStatus}
              className="btn btn-primary w-full flex items-center justify-center gap-2 mt-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {busy ? 'Aplicando…' : 'Aplicar cambio'}
            </button>
          </div>

          {/* Escalamiento */}
          <div className="pt-4 border-t border-gray-200">
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
              </svg>
              Escalamiento
            </label>
            
            {/* Técnico L1: Solo puede solicitar escalamiento */}
            {userRole === 'agent_l1' && supportLevel === 1 && currentStatus !== 'CLOSED' && (
              <>
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 mb-3">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-xs text-amber-900 font-semibold mb-1">Solicitar aprobación</p>
                      <p className="text-xs text-amber-700">Como técnico L1, debes solicitar al supervisor de tu sede que apruebe el escalamiento a Nivel 2.</p>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleRequestEscalation}
                  className="btn w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Solicitar escalamiento
                </button>
              </>
            )}

            {/* Admin, Supervisor, L2: Pueden escalar directamente */}
            {['admin', 'supervisor', 'agent_l2'].includes(userRole) && supportLevel === 1 && currentStatus !== 'CLOSED' && (
              <>
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-100 mb-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-orange-800 mb-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Asignar a (Nivel 2)
                  </label>
                  <select
                    className="select w-full text-sm"
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
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={escalateToL2}
                  className="btn btn-secondary w-full flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                  </svg>
                  Escalar a Nivel 2
                </button>
              </>
            )}
            
            {currentStatus === 'CLOSED' && (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 mb-2 text-center">
                <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <p className="text-xs text-gray-600 font-medium">Ticket cerrado</p>
                <p className="text-xs text-gray-500 mt-1">El escalamiento no está disponible</p>
              </div>
            )}

            {supportLevel === 2 && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-center">
                <svg className="w-8 h-8 text-blue-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-blue-700 font-medium">Ya está en Nivel 2</p>
              </div>
            )}
          </div>

          {/* Reapertura */}
          {currentStatus === 'CLOSED' && (
            <div className="pt-4 border-t border-gray-200">
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Reabrir Ticket
              </label>
              <div className="p-3 bg-green-50 rounded-lg border border-green-100 mb-2">
                <p className="text-xs text-green-800 mb-2">
                  ℹ️ El ticket se reabrirá en estado <strong>En progreso</strong> y se te asignará automáticamente.
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={handleReopenTicket}
                className="btn w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
                Reabrir ticket
              </button>
            </div>
          )}

          {/* Enviar ticket por email (solo admin y supervisor) */}
          {(userRole === 'admin' || userRole === 'supervisor') && (
            <div className="pt-4 border-t border-gray-200">
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Enviar por Correo
              </label>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 mb-2">
                <p className="text-xs text-blue-800">
                  📧 Envía la información completa del ticket para investigación o deslinde de responsabilidades.
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => setShowEmailModal(true)}
                className="btn w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                Enviar información del ticket
              </button>
            </div>
          )}

          {/* Eliminación */}
          <div className="pt-4 border-t border-gray-200">
            <button
              type="button"
              disabled={busy}
              onClick={softDelete}
              className="btn btn-danger w-full flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Eliminar (auditable)
            </button>
          </div>

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
