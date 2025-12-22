import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

// Mapeos para traducir términos técnicos
const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Creación',
  UPDATE: 'Modificación',
  SOFT_DELETE: 'Eliminación',
  LOGIN: 'Inicio de sesión',
  LOGOUT: 'Cierre de sesión',
}

const ENTITY_LABELS: Record<string, string> = {
  ticket: 'Ticket/Incidencia',
  user: 'Usuario',
  category: 'Categoría',
  comment: 'Comentario',
  attachment: 'Archivo adjunto',
}

export default async function AuditPage() {
  const supabase = await createSupabaseServerClient()
  const adminClient = createSupabaseAdminClient()
  
  // Verificar que el usuario sea administrador
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }
  
  const { data: audit } = await supabase
    .from('audit_log')
    .select('id,action,entity_type,entity_id,actor_id,metadata,created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  // Obtener información completa de usuarios actores (con rol)
  const actorIds = [...new Set((audit ?? []).map(a => a.actor_id).filter(Boolean))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id,full_name,email,role')
    .in('id', actorIds)

  const userMap = new Map<string, any>()
  
  // Obtener emails desde auth.users para usuarios que no tienen profile
  for (const actorId of actorIds) {
    const profile = profiles?.find(p => p.id === actorId)
    if (profile) {
      userMap.set(actorId, profile)
    } else {
      // Intentar obtener de auth.users
      try {
        const { data: authUser } = await adminClient.auth.admin.getUserById(actorId)
        if (authUser?.user) {
          userMap.set(actorId, {
            id: actorId,
            email: authUser.user.email,
            full_name: authUser.user.user_metadata?.full_name || authUser.user.email?.split('@')[0],
            role: 'user',
          })
        }
      } catch (err) {
        console.error('Error obteniendo usuario:', err)
      }
    }
  }

  // Estadísticas
  const actionCounts = (audit ?? []).reduce((acc, a) => {
    const label = ACTION_LABELS[a.action] || a.action
    acc[label] = (acc[label] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <main className="p-6 space-y-6">
      {/* Header compacto */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 shadow-md">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-24 -mt-24"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-400/20 rounded-full blur-3xl -ml-24 -mb-24"></div>

        <div className="relative z-10 px-5 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-md">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Auditoría</h1>
                <p className="text-blue-100 text-[11px]">Registro completo de acciones críticas del sistema</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                className="px-2.5 py-1.5 text-[11px] font-semibold rounded-md bg-white/10 text-white border border-white/20 backdrop-blur-sm hover:bg-white/15 transition-colors"
                href="/audit/export"
              >
                CSV
              </a>
              <a
                className="px-2.5 py-1.5 text-[11px] font-semibold rounded-md bg-white/10 text-white border border-white/20 backdrop-blur-sm hover:bg-white/15 transition-colors"
                href="/reports"
              >
                ← Volver
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas compactas */}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(actionCounts).map(([action, count]) => {
          const colorMap: Record<string, string> = {
            'Eliminación': 'bg-red-50 border-red-200 text-red-700',
            'Modificación': 'bg-blue-50 border-blue-200 text-blue-700',
            'Creación': 'bg-green-50 border-green-200 text-green-700',
          }
          const color = colorMap[action] || 'bg-gray-50 border-gray-200 text-gray-700'
          
          return (
            <div key={action} className={`card border ${color}`}>
              <div className="p-3">
                <div className="text-[10px] font-semibold opacity-80 uppercase">{action}</div>
                <div className="text-lg font-bold mt-0.5">{count}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Tabla compacta de auditoría */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 text-left text-gray-600">
              <tr>
                <th className="px-3 py-2 font-semibold uppercase tracking-wider text-[10px]">Acción</th>
                <th className="px-3 py-2 font-semibold uppercase tracking-wider text-[10px]">¿Qué se modificó?</th>
                <th className="px-3 py-2 font-semibold uppercase tracking-wider text-[10px]">¿Quién lo hizo?</th>
                <th className="px-3 py-2 font-semibold uppercase tracking-wider text-[10px]">Información adicional</th>
                <th className="px-3 py-2 font-semibold uppercase tracking-wider text-[10px]">Fecha y hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(audit ?? []).map((a) => {
                const actor = a.actor_id ? userMap.get(a.actor_id) : null
                const actionLabel = ACTION_LABELS[a.action] || a.action
                const entityLabel = ENTITY_LABELS[a.entity_type] || a.entity_type
                
                const actionColors: Record<string, string> = {
                  SOFT_DELETE: 'bg-red-100 text-red-800 border-red-300',
                  UPDATE: 'bg-blue-100 text-blue-800 border-blue-300',
                  CREATE: 'bg-green-100 text-green-800 border-green-300',
                }
                const actionColor = actionColors[a.action] || 'bg-gray-100 text-gray-800 border-gray-300'

                // Extraer información relevante del metadata
                const metadata = a.metadata as any
                let additionalInfo = ''
                
                if (a.action === 'SOFT_DELETE' && metadata?.deleted_reason) {
                  additionalInfo = `Motivo: ${metadata.deleted_reason}`
                } else if (a.action === 'UPDATE' && metadata?.changes) {
                  const changes = Object.keys(metadata.changes).join(', ')
                  additionalInfo = `Campos modificados: ${changes}`
                } else if (a.action === 'CREATE' && a.entity_type === 'ticket' && metadata?.ticket_number) {
                  additionalInfo = `Ticket #${metadata.ticket_number}`
                } else if (a.entity_type === 'user' && metadata?.email) {
                  additionalInfo = `Usuario: ${metadata.email}`
                }

                const roleLabels: Record<string, string> = {
                  admin: 'Administrador',
                  supervisor: 'Supervisor',
                  agent_l1: 'Agente Nivel 1',
                  agent_l2: 'Agente Nivel 2',
                  user: 'Usuario',
                  requester: 'Solicitante',
                }

                return (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <span className={`inline-flex px-2 py-1 rounded-md text-[11px] font-bold border ${actionColor}`}>
                        {actionLabel}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-semibold text-gray-900 text-xs">{entityLabel}</div>
                      {a.entity_type === 'ticket' && metadata?.ticket_number && (
                        <div className="text-[11px] text-blue-600 font-medium">
                          Ticket #{metadata.ticket_number}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {actor ? (
                        <div className={a.action === 'SOFT_DELETE' ? 'bg-red-50 border border-red-200 rounded px-2 py-1' : ''}>
                          <div className="font-semibold text-gray-900 text-xs">
                            {actor.full_name || 'Sin nombre'}
                          </div>
                          <div className="text-[10px] text-gray-600">{actor.email}</div>
                          <div className="text-[10px] mt-0.5">
                            <span className="inline-flex px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-medium">
                              {roleLabels[actor.role] || actor.role}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-xs">Sistema automático</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {additionalInfo ? (
                        <div className="text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                          {additionalInfo}
                        </div>
                      ) : a.metadata ? (
                        <div className="max-w-xs">
                          <details className="text-[11px]">
                            <summary className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium">
                              Ver detalles técnicos
                            </summary>
                            <pre className="mt-1.5 p-2 bg-gray-50 rounded border border-gray-200 overflow-x-auto text-[10px] max-h-32 overflow-y-auto">
                              {JSON.stringify(a.metadata, null, 2)}
                            </pre>
                          </details>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-[10px]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap text-[11px]">
                      {new Date(a.created_at).toLocaleString('es-MX', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                )
              })}
              {audit?.length === 0 && (
                <tr>
                  <td className="px-3 py-8 text-center text-gray-500" colSpan={5}>
                    <div className="text-3xl mb-1.5">📋</div>
                    <div className="font-medium text-sm">No hay eventos de auditoría</div>
                    <div className="text-[11px] mt-0.5">Las acciones registradas aparecerán aquí</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Nota informativa compacta */}
      <div className="card bg-blue-50 border-blue-200">
        <div className="p-3">
          <div className="flex gap-2.5">
            <div className="text-xl">🔒</div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 text-sm mb-0.5">Política de retención</h3>
              <p className="text-[11px] text-blue-700 leading-relaxed">
                Los registros de auditoría se mantienen indefinidamente para cumplimiento normativo.
                Incluyen timestamp preciso, usuario responsable, tipo de acción y metadata contextual.
                Esta información es inmutable y no puede ser alterada.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
