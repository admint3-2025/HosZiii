'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { updateTicketStatus, escalateTicket, softDeleteTicket } from '../actions'

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
}: {
  ticketId: string
  currentStatus: string
  supportLevel: number
  currentAgentId: string | null
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

  useEffect(() => {
    async function loadAgents() {
      const { data } = await supabase
        .from('profiles')
        .select('id,full_name')
        .in('role', ['agent_l1', 'agent_l2', 'supervisor', 'admin'])
      if (data) {
        setAgents(data.map((p) => ({ id: p.id, full_name: p.full_name, email: null })))
      }

      // Cargar solo agentes L2, supervisores y admins para escalamiento
      const { data: l2Data } = await supabase
        .from('profiles')
        .select('id,full_name')
        .in('role', ['agent_l2', 'supervisor', 'admin'])
      if (l2Data) {
        setAgentsL2(l2Data.map((p) => ({ id: p.id, full_name: p.full_name, email: null })))
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

    // Validar resolución obligatoria al cerrar
    let resolution: string | null = null
    if (nextStatus === 'CLOSED') {
      resolution = prompt('Resolución del ticket (mínimo 20 caracteres):')
      if (!resolution || resolution.trim().length < 20) {
        setError('La resolución es obligatoria y debe tener al menos 20 caracteres.')
        return
      }
      resolution = resolution.trim()
    }

    setBusy(true)

    const result = await updateTicketStatus({
      ticketId,
      currentStatus,
      nextStatus,
      assignedAgentId: nextStatus === 'ASSIGNED' ? assignedAgentId : null,
      resolution: resolution || undefined,
    })

    setBusy(false)
    
    if (result.error) {
      setError(result.error)
      return
    }
    
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

  return (
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
            
            {supportLevel === 1 && (
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
            )}
            
            <button
              type="button"
              disabled={busy || supportLevel === 2}
              onClick={escalateToL2}
              className="btn btn-secondary w-full flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
              </svg>
              {supportLevel === 2 ? 'Ya está en Nivel 2' : 'Escalar a Nivel 2'}
            </button>
          </div>

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
  )
}
