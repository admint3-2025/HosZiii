'use client'

import { useRouter } from 'next/navigation'

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
  asset: 'Activo',
  report: 'Reporte',
}

function formatChanges(metadata: any, entityType: string): string {
  if (!metadata?.changes) return ''
  
  const changes = metadata.changes
  const parts: string[] = []
  
  if (entityType === 'asset') {
    if (changes.status) {
      parts.push(`Estado: ${changes.status.from} → ${changes.status.to}`)
    }
    if (changes.location) {
      parts.push(`Sede: ${changes.location.from || 'Sin asignar'} → ${changes.location.to}`)
    }
    if (changes.assigned_to) {
      parts.push(`Responsable: ${changes.assigned_to.from || 'Sin asignar'} → ${changes.assigned_to.to || 'Sin asignar'}`)
    }
  }
  
  return parts.join(' | ')
}

function getResourceLink(entityType: string, entityId: string): string | null {
  switch (entityType) {
    case 'asset':
      return `/assets/${entityId}`
    case 'ticket':
      return `/tickets/${entityId}`
    case 'user':
      return `/admin/users`
    default:
      return null
  }
}

type AuditLog = {
  id: string
  action: string
  entity_type: string
  entity_id: string
  actor_id: string | null
  metadata: any
  created_at: string
}

type AuditTableProps = {
  audit: AuditLog[]
  userMap: Map<string, any>
}

export default function AuditTable({ audit, userMap }: AuditTableProps) {
  const router = useRouter()

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    supervisor: 'Supervisor',
    agent_l1: 'Agente Nivel 1',
    agent_l2: 'Agente Nivel 2',
    user: 'Usuario',
    requester: 'Solicitante',
  }

  const handleRowClick = (link: string | null) => {
    if (link) {
      router.push(link)
    }
  }

  return (
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
        {audit.map((a) => {
          const actor = a.actor_id ? userMap.get(a.actor_id) : null
          const actionLabel = ACTION_LABELS[a.action] || a.action
          const entityLabel = ENTITY_LABELS[a.entity_type] || a.entity_type
          
          const actionColors: Record<string, string> = {
            SOFT_DELETE: 'bg-red-100 text-red-800 border-red-300',
            UPDATE: 'bg-blue-100 text-blue-800 border-blue-300',
            CREATE: 'bg-green-100 text-green-800 border-green-300',
          }
          const actionColor = actionColors[a.action] || 'bg-gray-100 text-gray-800 border-gray-300'

          const metadata = a.metadata as any
          let additionalInfo = ''
          
          if (a.action === 'SOFT_DELETE' && metadata?.deleted_reason) {
            additionalInfo = `Motivo: ${metadata.deleted_reason}`
          } else if (a.action === 'UPDATE' && metadata?.changes) {
            const formattedChanges = formatChanges(metadata, a.entity_type)
            additionalInfo = formattedChanges || `Cambios: ${Object.keys(metadata.changes).join(', ')}`
          } else if (a.action === 'CREATE' && a.entity_type === 'ticket' && metadata?.ticket_number) {
            additionalInfo = `Ticket #${metadata.ticket_number}`
          } else if (a.action === 'CREATE' && a.entity_type === 'asset') {
            additionalInfo = `${metadata.asset_tag} - ${metadata.asset_type} (${metadata.brand || 'Sin marca'} ${metadata.model || ''})`
          } else if (a.action === 'DELETE' && a.entity_type === 'asset') {
            additionalInfo = `${metadata.asset_tag} - ${metadata.asset_type} (${metadata.previous_status})`
          } else if (a.entity_type === 'user' && metadata?.email) {
            additionalInfo = `Usuario: ${metadata.email}`
          }

          const resourceLink = getResourceLink(a.entity_type, a.entity_id)
          const isClickable = !!resourceLink

          return (
            <tr 
              key={a.id} 
              onClick={() => handleRowClick(resourceLink)}
              className={isClickable ? "hover:bg-blue-50 transition-colors cursor-pointer" : "hover:bg-gray-50"}
            >
              <td className="px-3 py-2">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold border ${actionColor}`}>
                  {actionLabel}
                  {isClickable && (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  )}
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
        {audit.length === 0 && (
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
  )
}
