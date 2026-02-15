import Link from "next/link"
import { AssetAssignForm } from "./AssetAssignForm"
import TicketActions from "./TicketActions"
import TicketComments from "./TicketComments"
import TicketAttachments from "./TicketAttachments"
import RemoteConnectionInfo from "./RemoteConnectionInfo"
import { StatusBadge, PriorityBadge, LevelBadge } from "@/lib/ui/badges"
import { formatTicketCode } from "@/lib/tickets/code"
import { getAvatarInitial } from "@/lib/ui/avatar"
import { formatAssetType } from "@/lib/assets/format"

type AssetInfo = {
  id: string
  asset_tag: string
  asset_type: string
  brand?: string | null
  model?: string | null
  serial_number?: string | null
  status: string
  asset_location?: { id: string; code: string; name: string } | null
}

export default function TicketDetail({
  ticket,
  comments,
  currentAgentId,
  userRole,
  hasEscalationRequest = false,
  asset,
}: {
  ticket: any
  comments: any[]
  currentAgentId: string | null
  userRole: string
  hasEscalationRequest?: boolean
  asset?: AssetInfo | null
}) {
  const canPerformActions = ["agent_l1", "agent_l2", "supervisor", "corporate_admin", "admin"].includes(userRole)
  const canEditAsset = ["supervisor", "corporate_admin", "admin"].includes(userRole)
  const isRequester = ticket.current_user_id === ticket.requester_id

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 shadow-lg">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-24 -mt-24"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl -ml-32 -mb-32"></div>

        <div className="relative z-10 p-4">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30 flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span className="text-base font-bold text-white">
                  {formatTicketCode({ ticket_number: ticket.ticket_number, created_at: ticket.created_at })}
                </span>
              </div>
              <h1 className="text-xl font-bold text-white truncate">{ticket.title}</h1>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              <LevelBadge level={ticket.support_level} />
            </div>
          </div>

          {ticket.category_path ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white/10 backdrop-blur-sm rounded-md border border-white/20">
              <svg className="w-3 h-3 text-blue-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span className="text-xs text-blue-50">{ticket.category_path}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Layout principal */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Descripción */}
          <div className="card shadow-lg border-0">
            <div className="card-body pt-3 pb-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-blue-100 rounded-lg">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">Descripción</h3>
              </div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-xl p-4 border border-gray-200">
                {ticket.description}
              </div>
            </div>
          </div>

          {/* Resolución */}
          {ticket.resolution && (
            <div className="card shadow-lg border-0 bg-gradient-to-br from-emerald-50 to-green-50">
              <div className="card-body">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-green-900 uppercase tracking-wider">Resolución</h3>
                </div>
                <div className="text-sm text-green-900 whitespace-pre-wrap leading-relaxed bg-white/60 rounded-xl p-4 border border-green-200">
                  {ticket.resolution}
                </div>
              </div>
            </div>
          )}

          {/* Adjuntos */}
          <TicketAttachments ticketId={ticket.id} canDelete={canPerformActions} />

          {/* Comentarios */}
          <TicketComments
            ticketId={ticket.id}
            comments={comments}
            ticketStatus={ticket.status}
            ticketClosedAt={ticket.closed_at}
            isRequester={isRequester}
            userRole={userRole}
          />
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {!canPerformActions && (
            <div className="card shadow-lg border-0 bg-gradient-to-br from-blue-50 to-indigo-50">
              <div className="card-body">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-blue-900 uppercase tracking-wider">Información</h3>
                </div>
                <p className="text-xs text-blue-800 leading-relaxed">
                  Puedes ver el progreso del ticket y agregar comentarios. Los cambios de estado los realiza el equipo de soporte.
                </p>
              </div>
            </div>
          )}

          {/* Activo reportado */}
          <div className="card shadow-lg border-0 bg-gradient-to-br from-sky-50 to-cyan-50">
            <div className="card-body">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-sky-100 rounded-lg">
                  <svg className="w-5 h-5 text-sky-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-semibold text-sky-800 uppercase tracking-wider">Activo reportado</div>
                  {!asset && <div className="text-sm font-medium text-gray-600">No asociado</div>}
                </div>
              </div>

              {asset ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-sky-600 font-medium mb-1">Etiqueta</div>
                      <div className="text-sm font-bold text-sky-900">{asset.asset_tag}</div>
                    </div>
                    <div>
                      <div className="text-xs text-sky-600 font-medium mb-1">Tipo</div>
                          <div className="text-sm font-medium text-gray-800">{formatAssetType(asset)}</div>
                    </div>
                  </div>
                  
                  {(asset.brand || asset.model) && (
                    <div className="grid grid-cols-2 gap-3">
                      {asset.brand && (
                        <div>
                          <div className="text-xs text-sky-600 font-medium mb-1">Marca</div>
                          <div className="text-sm font-semibold text-gray-800">{asset.brand}</div>
                        </div>
                      )}
                      {asset.model && (
                        <div>
                          <div className="text-xs text-sky-600 font-medium mb-1">Modelo</div>
                          <div className="text-sm font-semibold text-gray-800">{asset.model}</div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {asset.serial_number && (
                    <div>
                      <div className="text-xs text-sky-600 font-medium mb-1">Número de serie</div>
                      <div className="font-mono text-xs text-sky-800 bg-sky-50 px-2.5 py-1.5 rounded border border-sky-200">{asset.serial_number}</div>
                    </div>
                  )}
                  
                  <div>
                    <div className="text-xs text-sky-600 font-medium mb-1">Estado</div>
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">{asset.status}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-700">No se ha asociado un activo a este ticket.</p>
              )}

              {asset && canPerformActions && (
                <div className="mt-3 flex">
                  <Link
                    href={`/assets/${asset.id}`}
                    className="btn btn-sm btn-primary w-full inline-flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Ver activo
                  </Link>
                </div>
              )}

              {canEditAsset && (
                <AssetAssignForm
                  ticketId={ticket.id}
                  defaultAssetId={asset?.id}
                  defaultAssetTag={asset?.asset_tag}
                  userRole={userRole}
                  ticketLocation={ticket.location}
                />
              )}
            </div>
          </div>

          {/* Información del ticket */}
          <div className="card shadow-lg border-0">
            <div className="card-body">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Información</h3>
              </div>

              <div className="space-y-4">
                {/* Solicitante */}
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Solicitado por</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {getAvatarInitial({
                          fullName: ticket.requester?.full_name,
                          email: ticket.requester?.email,
                        })}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {ticket.requester?.full_name || ticket.requester?.email || "Desconocido"}
                      </div>
                      {ticket.requester?.full_name && (
                        <div className="text-xs text-gray-500 truncate">{ticket.requester.email}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sede de origen */}
                {ticket.location && (
                    <div>
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Sede de origen</div>
                      <div className="flex items-center gap-2 text-sm text-gray-900">
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-50 text-indigo-500">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="h-4 w-4"
                          >
                            <path d="M10 2a5 5 0 0 0-5 5c0 3.25 3.4 6.72 4.47 7.76a.75.75 0 0 0 1.06 0C11.6 13.72 15 10.25 15 7a5 5 0 0 0-5-5Zm0 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z" />
                          </svg>
                        </div>
                        <div>
                          <div className="font-semibold">{ticket.location.name}</div>
                          {ticket.location.code && (
                            <div className="text-xs text-gray-500">{ticket.location.code}</div>
                          )}
                        </div>
                      </div>
                    </div>
                )}

                {/* Habitación vinculada */}
                {ticket.hk_room && (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Habitación</div>
                    <div className="flex items-center gap-2 text-sm text-gray-900">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-rose-50 text-rose-500">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold">Habitación {ticket.hk_room.number}</div>
                        <div className="text-xs text-gray-500">Piso {ticket.hk_room.floor}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Asignado a */}
                {ticket.assigned_agent ? (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Asignado a</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">
                          {getAvatarInitial({
                            fullName: ticket.assigned_agent.full_name,
                            email: ticket.assigned_agent.email,
                          })}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {ticket.assigned_agent.full_name || ticket.assigned_agent.email}
                        </div>
                        {ticket.assigned_agent.full_name && (
                          <div className="text-xs text-gray-500 truncate">{ticket.assigned_agent.email}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Asignado a</div>
                    <div className="text-sm text-gray-400 italic">Sin asignar</div>
                  </div>
                )}

                {/* Cerrado por */}
                {ticket.closed_by_user && (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Cerrado por</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-gray-500 to-gray-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">
                          {getAvatarInitial({
                            fullName: ticket.closed_by_user.full_name,
                            email: ticket.closed_by_user.email,
                          })}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {ticket.closed_by_user.full_name || ticket.closed_by_user.email}
                        </div>
                        {ticket.closed_by_user.full_name && (
                          <div className="text-xs text-gray-500 truncate">{ticket.closed_by_user.email}</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Conexión remota */}
                {ticket.remote_connection_type && (
                  <RemoteConnectionInfo
                    type={ticket.remote_connection_type}
                    id={ticket.remote_connection_id}
                    password={ticket.remote_connection_password}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Fechas */}
          <div className="card shadow-lg border-0">
            <div className="card-body">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Fechas</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Creado:</span>
                  <span className="text-gray-900 font-medium">
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
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Actualizado:</span>
                  <span className="text-gray-900 font-medium">
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
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Cerrado:</span>
                    <span className="text-gray-900 font-medium">
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
        </div>
      </div>

      {canPerformActions && (
        <TicketActions
          ticketId={ticket.id}
          currentStatus={ticket.status}
          supportLevel={ticket.support_level}
          currentAgentId={currentAgentId}
          userRole={userRole}
          hasEscalationRequest={hasEscalationRequest}
        />
      )}
    </div>
  )
}
