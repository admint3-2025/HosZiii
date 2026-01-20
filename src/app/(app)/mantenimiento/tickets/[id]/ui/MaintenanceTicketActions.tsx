'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import MaintenanceCloseTicketModal from './MaintenanceCloseTicketModal'
import { updateMaintenanceTicketStatus, escalateMaintenanceTicket } from '../actions'

const STATUSES = [
  'NEW',
  'ASSIGNED',
  'IN_PROGRESS',
  'ON_HOLD',
  'RESOLVED',
  'CLOSED',
] as const

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Nuevo',
  ASSIGNED: 'Asignado',
  IN_PROGRESS: 'En Progreso',
  ON_HOLD: 'En Espera',
  RESOLVED: 'Resuelto',
  CLOSED: 'Cerrado',
}

export default function MaintenanceTicketActions({
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
  const [agents, setAgents] = useState<{ id: string; full_name: string | null; email: string | null }[]>([])
  const [agentsL2, setAgentsL2] = useState<{ id: string; full_name: string | null; email: string | null }[]>([])
  const [escalateAgentId, setEscalateAgentId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [loadingAgents, setLoadingAgents] = useState(false)

  async function loadAgents() {
    if (agents.length > 0) return
    setLoadingAgents(true)
    try {
      console.log('[MaintenanceTicketActions] Cargando técnicos de mantenimiento...')
      
      // Obtener perfil del usuario actual para saber su sede y rol
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('location_id, role')
        .eq('id', user.id)
        .single()
      
      const isAdmin = currentProfile?.role === 'admin'
      const userLocationId = currentProfile?.location_id
      
      console.log('[MaintenanceTicketActions] Usuario:', { role: currentProfile?.role, location_id: userLocationId, isAdmin })
      
      let query = supabase
        .from('profiles')
        .select('id, full_name, role, asset_category, location_id')
        .in('role', ['agent_l1', 'agent_l2', 'supervisor', 'admin'])
      
      // Si NO es admin, filtrar solo por su sede
      if (!isAdmin && userLocationId) {
        query = query.eq('location_id', userLocationId)
        console.log('[MaintenanceTicketActions] Filtrando por sede:', userLocationId)
      }
      
      const { data, error } = await query.order('full_name')
      
      if (error) {
        console.error('[MaintenanceTicketActions] Error cargando técnicos:', error)
      } else {
        // Filtrar solo MAINTENANCE o admins del lado del cliente
        const filtered = (data || []).filter(
          agent => agent.asset_category === 'MAINTENANCE' || agent.role === 'admin'
        )
        console.log('[MaintenanceTicketActions] Técnicos encontrados:', data?.length, '| Filtrados:', filtered.length)
        setAgents(filtered.map(a => ({ ...a, email: null })))
      }
    } catch (err) {
      console.error('[MaintenanceTicketActions] Exception:', err)
    } finally {
      setLoadingAgents(false)
    }
  }

  async function loadAgentsL2() {
    if (agentsL2.length > 0) return
    try {
      console.log('[MaintenanceTicketActions] Cargando técnicos L2/Supervisor/Admin para escalamiento...')
      
      // Obtener perfil del usuario actual
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('location_id, role')
        .eq('id', user.id)
        .single()
      
      const isAdmin = currentProfile?.role === 'admin'
      const userLocationId = currentProfile?.location_id
      
      let query = supabase
        .from('profiles')
        .select('id, full_name, role, asset_category, location_id')
        .in('role', ['agent_l2', 'supervisor', 'admin'])
      
      // Si NO es admin, filtrar solo por su sede
      if (!isAdmin && userLocationId) {
        query = query.eq('location_id', userLocationId)
      }
      
      const { data, error } = await query.order('full_name')
      
      if (error) {
        console.error('[MaintenanceTicketActions] Error cargando técnicos L2:', error)
      } else {
        // Filtrar solo MAINTENANCE o admins
        const filtered = (data || []).filter(
          agent => agent.asset_category === 'MAINTENANCE' || agent.role === 'admin'
        )
        console.log('[MaintenanceTicketActions] Técnicos L2 encontrados:', filtered.length)
        setAgentsL2(filtered.map(a => ({ ...a, email: null })))
      }
    } catch (err) {
      console.error('[MaintenanceTicketActions] Exception cargando L2:', err)
    }
  }

  async function updateStatus() {
    setError(null)
    if (nextStatus === currentStatus && (nextStatus !== 'ASSIGNED' || assignedAgentId === currentAgentId)) return

    if (nextStatus === 'ASSIGNED' && !assignedAgentId) {
      setError('Selecciona un técnico para asignar el ticket.')
      return
    }

    // Si es cierre, mostrar modal
    if (nextStatus === 'CLOSED') {
      setShowCloseModal(true)
      return
    }

    setBusy(true)

    try {
      // Primero actualizar assigned_to si aplica
      if (nextStatus === 'ASSIGNED' && assignedAgentId) {
        const { error: assignError } = await supabase
          .from('tickets_maintenance')
          .update({ assigned_to: assignedAgentId })
          .eq('id', ticketId)
        
        if (assignError) throw assignError
      }

      // Luego actualizar estado con notificaciones
      const result = await updateMaintenanceTicketStatus({
        ticketId,
        newStatus: nextStatus,
      })

      if (result.error) throw new Error(result.error)

      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Error actualizando el ticket')
    } finally {
      setBusy(false)
    }
  }

  async function handleCloseTicket(resolution: string) {
    setBusy(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')
      
      // Primero guardar la resolución
      const { error: resolutionError } = await supabase
        .from('tickets_maintenance')
        .update({
          resolution,
          closed_at: new Date().toISOString(),
          closed_by: user.id,
        })
        .eq('id', ticketId)

      if (resolutionError) throw resolutionError

      // Crear comentario automático de cierre con la resolución
      const { error: commentError } = await supabase
        .from('maintenance_ticket_comments')
        .insert({
          ticket_id: ticketId,
          author_id: user.id,
          body: `🔒 **Ticket cerrado**\n\n**Resolución:**\n${resolution}`,
          visibility: 'public',
        })

      if (commentError) {
        console.error('Error creando comentario de cierre:', commentError)
      }

      // Luego cambiar estado con notificaciones
      const result = await updateMaintenanceTicketStatus({
        ticketId,
        newStatus: 'CLOSED',
      })

      if (result.error) throw new Error(result.error)

      setShowCloseModal(false)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Error cerrando el ticket')
    } finally {
      setBusy(false)
    }
  }

  async function handleReopenTicket() {
    if (!confirm('¿Estás seguro de reabrir este ticket?')) return
    
    setBusy(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      // Primero limpiar campos de cierre
      const { error: clearError } = await supabase
        .from('tickets_maintenance')
        .update({
          closed_at: null,
          closed_by: null,
          resolution: null,
        })
        .eq('id', ticketId)

      if (clearError) throw clearError

      // Crear comentario automático de reapertura
      const { error: commentError } = await supabase
        .from('maintenance_ticket_comments')
        .insert({
          ticket_id: ticketId,
          author_id: user.id,
          body: `🔄 **Ticket reabierto**\n\n_El ticket ha sido reabierto y vuelve a estar en progreso._`,
          visibility: 'public',
        })

      if (commentError) {
        console.error('Error creando comentario de reapertura:', commentError)
      }
      
      // Luego cambiar estado con notificaciones
      const result = await updateMaintenanceTicketStatus({
        ticketId,
        newStatus: 'IN_PROGRESS',
      })

      if (result.error) throw new Error(result.error)
      
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Error reabriendo el ticket')
    } finally {
      setBusy(false)
    }
  }

  async function escalateToL2() {
    setError(null)
    if (supportLevel === 2) return

    if (!escalateAgentId) {
      setError('Selecciona un técnico nivel 2, supervisor o administrador.')
      return
    }
    
    setBusy(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      const escalatedBy = currentProfile?.full_name || 'Sistema'

      const result = await escalateMaintenanceTicket({
        ticketId,
        newLevel: 2,
        assignToAgentId: escalateAgentId,
        escalatedBy,
      })

      if (result.error) throw new Error(result.error)
      
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Error escalando el ticket')
    } finally {
      setBusy(false)
    }
  }

  const isClosed = currentStatus === 'CLOSED'

  return (
    <>
      <div className="sticky top-6">
        <div className="bg-white rounded-2xl shadow-xl border border-orange-100 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-white border-b border-orange-100 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">⚡</span>
              <div>
                <h3 className="text-xs font-semibold text-orange-900 uppercase tracking-wide">Acciones del ticket</h3>
                <p className="mt-0.5 text-[11px] text-orange-700">Flujo operativo: estado, asignación, cierre y reapertura.</p>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-4 text-sm">
            {isClosed ? (
              <div className="pt-1">
                <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-green-100 rounded-lg">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-green-800">Ticket cerrado</p>
                        <p className="text-[11px] text-green-600">Si el trabajo no quedó resuelto, puedes reactivarlo.</p>
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
            ) : (
              <div className="space-y-4">
                {/* Cambiar estado */}
                <div>
                  <label className="block text-xs font-semibold text-orange-900 mb-1">Estado del ticket</label>
                  <p className="text-[11px] text-orange-700 mb-1">Define en qué etapa se encuentra la solicitud.</p>
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
                    <div className="mt-2 p-2.5 bg-amber-50 rounded border border-amber-200">
                      <label className="block text-xs font-semibold text-amber-900 mb-1">Asignar responsable</label>
                      <p className="text-[11px] text-amber-700 mb-1">Selecciona el técnico que quedará a cargo.</p>
                      <select
                        className="select select-sm w-full"
                        value={assignedAgentId}
                        onChange={(e) => setAssignedAgentId(e.target.value)}
                        onFocus={loadAgents}
                      >
                        <option value="">-- Seleccionar técnico --</option>
                        {loadingAgents ? (
                          <option disabled>Cargando…</option>
                        ) : (
                          agents.map((agent) => (
                            <option key={agent.id} value={agent.id}>
                              {agent.full_name || agent.email || agent.id}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  )}

                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={updateStatus}
                      disabled={busy || (nextStatus === currentStatus && assignedAgentId === currentAgentId)}
                      className="btn btn-sm bg-orange-600 hover:bg-orange-700 text-white px-4 disabled:opacity-50"
                    >
                      {busy ? 'Aplicando…' : 'Aplicar estado'}
                    </button>
                  </div>
                </div>

                {/* Acciones rápidas */}
                <div className="pt-3 border-t border-orange-100">
                  <p className="text-xs font-semibold text-orange-900 uppercase tracking-wide mb-2">Acciones rápidas</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setNextStatus('IN_PROGRESS')
                        setTimeout(updateStatus, 100)
                      }}
                      disabled={busy || currentStatus === 'IN_PROGRESS'}
                      className="btn btn-sm bg-yellow-100 hover:bg-yellow-200 text-yellow-900 border border-yellow-200"
                    >
                      En progreso
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNextStatus('RESOLVED')
                        setTimeout(updateStatus, 100)
                      }}
                      disabled={busy || currentStatus === 'RESOLVED'}
                      className="btn btn-sm bg-green-100 hover:bg-green-200 text-green-900 border border-green-200"
                    >
                      Resuelto
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Escalamiento - Solo cuando NO esté cerrado */}
            {!isClosed && (
              <>
                <div className="pt-3 border-t border-orange-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs">🔺</span>
                    <p className="text-xs font-semibold text-orange-900 uppercase tracking-wide">Escalamiento</p>
                  </div>
                  
                  {supportLevel === 2 ? (
                    <div className="p-2.5 bg-blue-50 rounded border border-blue-200 text-center">
                      <p className="text-xs text-blue-700">Ya está en Nivel 2</p>
                    </div>
                  ) : (
                    <>
                      {/* Admin, Supervisor, L2: Pueden escalar directamente */}
                      {['admin', 'supervisor', 'agent_l2'].includes(userRole) && supportLevel === 1 && (
                        <div className="space-y-2">
                          <select
                            className="select select-sm w-full"
                            value={escalateAgentId}
                            onChange={(e) => setEscalateAgentId(e.target.value)}
                            onFocus={loadAgentsL2}
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
                      )}

                      {/* L1: No tiene acceso a escalamiento directo en Mantenimiento */}
                      {userRole === 'agent_l1' && supportLevel === 1 && (
                        <div className="p-2.5 bg-gray-50 rounded border border-gray-200">
                          <p className="text-xs text-gray-600">
                            Solo Supervisores y Administradores pueden escalar tickets de mantenimiento.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
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

      {showCloseModal && (
        <MaintenanceCloseTicketModal
          onClose={() => setShowCloseModal(false)}
          onConfirm={handleCloseTicket}
          busy={busy}
        />
      )}
    </>
  )
}
