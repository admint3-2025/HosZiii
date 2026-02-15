'use client'

import Link from "next/link"
import MaintenanceTicketActions from "./MaintenanceTicketActions"
import MaintenanceTicketComments from "./MaintenanceTicketComments"
import MaintenanceTicketAttachments from "./MaintenanceTicketAttachments"
import { getAvatarInitial } from "@/lib/ui/avatar"

type AssetInfo = {
  id: string
  asset_tag: string
  asset_type: string
  brand?: string | null
  model?: string | null
  serial_number?: string | null
  status: string
  location?: { id: string; code: string; name: string } | null
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  NEW: { label: 'Nuevo', bg: 'bg-blue-500', text: 'text-white' },
  ASSIGNED: { label: 'Asignado', bg: 'bg-purple-500', text: 'text-white' },
  IN_PROGRESS: { label: 'En Progreso', bg: 'bg-yellow-500', text: 'text-white' },
  ON_HOLD: { label: 'En Espera', bg: 'bg-gray-500', text: 'text-white' },
  RESOLVED: { label: 'Resuelto', bg: 'bg-green-500', text: 'text-white' },
  CLOSED: { label: 'Cerrado', bg: 'bg-gray-400', text: 'text-white' },
}

const PRIORITY_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  CRITICAL: { label: 'Crítica', bg: 'bg-red-500', text: 'text-white' },
  HIGH: { label: 'Alta', bg: 'bg-orange-500', text: 'text-white' },
  MEDIUM: { label: 'Media', bg: 'bg-blue-500', text: 'text-white' },
  LOW: { label: 'Baja', bg: 'bg-gray-400', text: 'text-white' },
}

import { formatMaintenanceTicketCode } from '@/lib/tickets/code'

function formatTicketCode(ticket: { ticket_number: string | number; created_at: string }) {
  return formatMaintenanceTicketCode({ ticket_number: ticket.ticket_number, created_at: ticket.created_at })
}

export default function MaintenanceTicketDetail({
  ticket,
  comments,
  currentUserId,
  userRole,
  userAssetCategory,
  asset,
  requester,
  assignedAgent,
  closedByUser,
}: {
  ticket: any
  comments: any[]
  currentUserId: string | null
  userRole: string
  userAssetCategory: string | null
  asset?: AssetInfo | null
  requester?: { id: string; email: string; full_name?: string } | null
  assignedAgent?: { id: string; email: string; full_name?: string } | null
  closedByUser?: { id: string; email: string; full_name?: string } | null
}) {
  // Admin siempre puede gestionar, otros roles solo si tienen asset_category MAINTENANCE
  const canPerformActions = userRole === 'admin' || 
    (["supervisor", "agent_l1", "agent_l2"].includes(userRole) && userAssetCategory === 'MAINTENANCE')
  const isRequester = currentUserId === ticket.requester_id

  const status = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.NEW
  const priority = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.MEDIUM

  return (
    <div className="space-y-6">
      {/* Header compacto (evitar doble franja) */}
      <div className="rounded-2xl bg-white shadow-md border border-orange-100 p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-xl border border-orange-100 font-semibold text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{formatTicketCode({ ticket_number: ticket.ticket_number || '', created_at: ticket.created_at })}</span>
          </div>

          {ticket.service_area && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-xl border border-orange-100 text-sm font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span>{ticket.service_area}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-3 py-1.5 rounded-lg text-sm font-bold ${status.bg} ${status.text} shadow-sm`}>
            {status.label}
          </span>
          <span className={`px-3 py-1.5 rounded-lg text-sm font-bold ${priority.bg} ${priority.text} shadow-sm`}>
            {priority.label}
          </span>
          <span className="px-3 py-1.5 rounded-lg text-sm font-bold bg-indigo-500 text-white shadow-sm">
            N{ticket.support_level || 1}
          </span>
        </div>
      </div>

      {/* ============ LAYOUT PRINCIPAL ============ */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* COLUMNA PRINCIPAL */}
        <div className="lg:col-span-2 space-y-6">
          {/* DESCRIPCIÓN */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Descripción</h3>
              </div>
              <div className="text-gray-700 whitespace-pre-wrap leading-relaxed bg-gradient-to-br from-orange-50/50 to-amber-50/50 rounded-xl p-5 border border-orange-100">
                {ticket.description || 'Sin descripción'}
              </div>
            </div>
          </div>

          {/* RESOLUCIÓN (si existe) */}
          {ticket.resolution && (
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl shadow-xl overflow-hidden border border-green-200">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-green-900 uppercase tracking-wider">Resolución</h3>
                </div>
                <div className="text-green-900 whitespace-pre-wrap leading-relaxed bg-white/60 rounded-xl p-5 border border-green-200">
                  {ticket.resolution}
                </div>
              </div>
            </div>
          )}

          {/* ADJUNTOS */}
          <MaintenanceTicketAttachments 
            ticketId={ticket.id} 
            canDelete={canPerformActions}
          />

          {/* COMENTARIOS */}
          <MaintenanceTicketComments
            ticketId={ticket.id}
            comments={comments}
            ticketStatus={ticket.status}
            ticketClosedAt={ticket.closed_at}
            isRequester={isRequester}
            userRole={userRole}
          />
        </div>

        {/* SIDEBAR */}
        <div className="lg:col-span-1 space-y-6">
          {/* Info para usuarios sin permisos */}
          {!canPerformActions && (
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl shadow-xl overflow-hidden border border-orange-200">
              <div className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-orange-100 rounded-xl">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-orange-900 uppercase tracking-wider">Información</h3>
                </div>
                <p className="text-sm text-orange-800 leading-relaxed">
                  Puedes ver el progreso del ticket y agregar comentarios. Los cambios de estado los realiza el equipo de mantenimiento.
                </p>
              </div>
            </div>
          )}

          {/* ACTIVO REPORTADO */}
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl shadow-xl overflow-hidden border border-amber-200">
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-amber-100 rounded-xl">
                  <svg className="w-5 h-5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wider">Activo Reportado</h3>
                  {!asset && <p className="text-xs text-amber-700">No asociado</p>}
                </div>
              </div>

              {asset ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/60 rounded-lg p-3 border border-amber-200">
                      <p className="text-xs text-amber-600 font-medium mb-1">Etiqueta</p>
                      <p className="text-sm font-bold text-amber-900">{asset.asset_tag}</p>
                    </div>
                    <div className="bg-white/60 rounded-lg p-3 border border-amber-200">
                      <p className="text-xs text-amber-600 font-medium mb-1">Tipo</p>
                      <p className="text-sm font-semibold text-gray-800">{asset.asset_type}</p>
                    </div>
                  </div>
                  
                  {(asset.brand || asset.model) && (
                    <div className="grid grid-cols-2 gap-3">
                      {asset.brand && (
                        <div className="bg-white/60 rounded-lg p-3 border border-amber-200">
                          <p className="text-xs text-amber-600 font-medium mb-1">Marca</p>
                          <p className="text-sm font-semibold text-gray-800">{asset.brand}</p>
                        </div>
                      )}
                      {asset.model && (
                        <div className="bg-white/60 rounded-lg p-3 border border-amber-200">
                          <p className="text-xs text-amber-600 font-medium mb-1">Modelo</p>
                          <p className="text-sm font-semibold text-gray-800">{asset.model}</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {asset.serial_number && (
                    <div className="bg-white/60 rounded-lg p-3 border border-amber-200">
                      <p className="text-xs text-amber-600 font-medium mb-1">Número de serie</p>
                      <p className="font-mono text-xs text-amber-800 bg-amber-100 px-2 py-1 rounded inline-block">{asset.serial_number}</p>
                    </div>
                  )}

                  {canPerformActions && (
                    <Link
                      href={`/mantenimiento/activos/${asset.id}`}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-orange-600 transition shadow-lg"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Ver activo
                    </Link>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <svg className="w-12 h-12 text-amber-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
                  </svg>
                  <p className="text-sm text-amber-700">No se ha asociado un activo</p>
                </div>
              )}
            </div>
          </div>

          {/* INFORMACIÓN DEL TICKET */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Información</h3>
              </div>

              <div className="space-y-5">
                {/* Solicitante */}
                {requester && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Solicitado por</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-white text-sm font-bold">
                          {getAvatarInitial({ fullName: requester.full_name, email: requester.email })}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{requester.full_name || requester.email}</p>
                        {requester.full_name && <p className="text-xs text-gray-500">{requester.email}</p>}
                      </div>
                    </div>
                  </div>
                )}

                {/* Habitación vinculada */}
                {ticket.hk_room && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Habitación</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Habitación {ticket.hk_room.number}</p>
                        <p className="text-xs text-gray-500">Piso {ticket.hk_room.floor}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sede */}
                {ticket.locations && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Sede</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{ticket.locations.name}</p>
                        {ticket.locations.code && <p className="text-xs text-gray-500">{ticket.locations.code}</p>}
                      </div>
                    </div>
                  </div>
                )}

                {/* Asignado a */}
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Asignado a</p>
                  {assignedAgent ? (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-500 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-white text-sm font-bold">
                          {getAvatarInitial({ fullName: assignedAgent.full_name, email: assignedAgent.email })}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{assignedAgent.full_name || assignedAgent.email}</p>
                        {assignedAgent.full_name && <p className="text-xs text-gray-500">{assignedAgent.email}</p>}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Sin asignar</p>
                  )}
                </div>

                {/* Cerrado por */}
                {closedByUser && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Cerrado por</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-gray-500 to-gray-600 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-white text-sm font-bold">
                          {getAvatarInitial({ fullName: closedByUser.full_name, email: closedByUser.email })}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{closedByUser.full_name || closedByUser.email}</p>
                        {closedByUser.full_name && <p className="text-xs text-gray-500">{closedByUser.email}</p>}
                      </div>
                    </div>
                  </div>
                )}

                {/* Impacto y Urgencia */}
                {(ticket.impact || ticket.urgency) && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                    {ticket.impact && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs font-bold text-gray-500 uppercase mb-1">Impacto</p>
                        <p className="text-lg font-bold text-gray-900">{ticket.impact}</p>
                      </div>
                    )}
                    {ticket.urgency && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs font-bold text-gray-500 uppercase mb-1">Urgencia</p>
                        <p className="text-lg font-bold text-gray-900">{ticket.urgency}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* FECHAS */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Fechas</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Creado</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {new Date(ticket.created_at).toLocaleString("es-MX", {
                      timeZone: "America/Mexico_City",
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Actualizado</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {new Date(ticket.updated_at).toLocaleString("es-MX", {
                      timeZone: "America/Mexico_City",
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {ticket.closed_at && (
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-500">Cerrado</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {new Date(ticket.closed_at).toLocaleString("es-MX", {
                        timeZone: "America/Mexico_City",
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ACCIONES (solo para usuarios con permisos) */}
          {canPerformActions && (
            <MaintenanceTicketActions
              ticketId={ticket.id}
              currentStatus={ticket.status}
              supportLevel={ticket.support_level || 1}
              currentAgentId={ticket.assigned_to}
              userRole={userRole}
            />
          )}
        </div>
      </div>
    </div>
  )
}
