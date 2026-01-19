'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import MaintenanceCloseTicketModal from './MaintenanceCloseTicketModal'
import { updateMaintenanceTicketStatus } from '../actions'

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
      
      // Primero guardar la resolución
      const { error: resolutionError } = await supabase
        .from('tickets_maintenance')
        .update({
          resolution,
          closed_at: new Date().toISOString(),
          closed_by: user?.id,
        })
        .eq('id', ticketId)

      if (resolutionError) throw resolutionError

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

  const isClosed = currentStatus === 'CLOSED'

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg border-0">
        <div className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Acciones</h3>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {isClosed ? (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-sm text-gray-600">Este ticket está cerrado</p>
              </div>
              <button
                onClick={handleReopenTicket}
                disabled={busy}
                className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition disabled:opacity-50"
              >
                {busy ? 'Procesando...' : 'Reabrir Ticket'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Cambiar Estado */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Cambiar Estado
                </label>
                <select
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Asignar técnico (solo si el estado es ASSIGNED) */}
              {nextStatus === 'ASSIGNED' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Asignar a
                  </label>
                  <select
                    value={assignedAgentId}
                    onChange={(e) => setAssignedAgentId(e.target.value)}
                    onFocus={loadAgents}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="">Seleccionar técnico...</option>
                    {loadingAgents ? (
                      <option disabled>Cargando...</option>
                    ) : (
                      agents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.full_name || agent.email}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}

              {/* Botón aplicar cambios */}
              <button
                onClick={updateStatus}
                disabled={busy || (nextStatus === currentStatus && assignedAgentId === currentAgentId)}
                className="w-full px-4 py-2.5 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Procesando...
                  </span>
                ) : (
                  'Aplicar Cambios'
                )}
              </button>

              {/* Acciones rápidas */}
              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Acciones Rápidas</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setNextStatus('IN_PROGRESS')
                      setTimeout(updateStatus, 100)
                    }}
                    disabled={busy || currentStatus === 'IN_PROGRESS'}
                    className="px-3 py-2 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition disabled:opacity-50"
                  >
                    En Progreso
                  </button>
                  <button
                    onClick={() => {
                      setNextStatus('RESOLVED')
                      setTimeout(updateStatus, 100)
                    }}
                    disabled={busy || currentStatus === 'RESOLVED'}
                    className="px-3 py-2 text-xs font-medium bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition disabled:opacity-50"
                  >
                    Resuelto
                  </button>
                </div>
              </div>
            </div>
          )}
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
