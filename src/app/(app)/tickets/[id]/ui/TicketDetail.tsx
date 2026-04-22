import Link from "next/link"
import { AssetAssignForm } from "./AssetAssignForm"
import TicketActions from "./TicketActions"
import TicketComments from "./TicketComments"
import TicketAttachments from "./TicketAttachments"
import RemoteConnectionInfo from "./RemoteConnectionInfo"
import TicketPdfExportButton from "@/components/TicketPdfExportButton"
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
  const canPerformActions = ["agent_l1", "agent_l2", "supervisor", "admin"].includes(userRole)
  const canEditAsset = ["supervisor", "admin"].includes(userRole)
  const isRequester = ticket.current_user_id === ticket.requester_id
  const surfaceCardClass = "card rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-200/70"
  const ticketCode = formatTicketCode({ ticket_number: ticket.ticket_number, created_at: ticket.created_at })
  const detailPdfFilename = `ticket-it-${ticketCode.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`
  const locationCode = ticket?.location?.code ?? ticket?.location_code ?? null

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="relative overflow-hidden rounded-[1.75rem] border border-slate-200/70 bg-gradient-to-br from-white via-slate-50 to-indigo-50/80 shadow-xl shadow-slate-200/60">
        <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-indigo-200/40 blur-3xl -mr-20 -mt-24"></div>
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-slate-200/60 blur-3xl -ml-24 -mb-32"></div>

        <div className="relative z-10 p-5 md:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm shadow-slate-200/60 flex-shrink-0">
                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span className="text-base font-bold text-slate-700">
                  {ticketCode}
                </span>
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                    <svg className="h-3.5 w-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {new Date(ticket.created_at).toLocaleDateString("es-MX", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-600">Detalle del ticket</span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 truncate">{ticket.title}</h1>

                {ticket.category_path ? (
                  <div className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-100 bg-white/80 px-3 py-1.5 backdrop-blur-sm">
                    <svg className="w-3 h-3 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span className="text-xs font-medium text-slate-600">{ticket.category_path}</span>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0 xl:justify-end">
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              <LevelBadge level={ticket.support_level} />
            </div>
          </div>
        </div>
      </div>

      {/* Layout principal */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Descripción */}
          <div className={surfaceCardClass}>
            <div className="card-body pt-3 pb-4">
              <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-700">Descripción</h3>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                {ticket.description}
              </div>
            </div>
          </div>

          {/* Resolución */}
          {ticket.resolution && (
            <div className="card rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-green-50 shadow-sm shadow-emerald-100/70">
              <div className="card-body">
                <div className="mb-4 flex items-center gap-3 border-b border-emerald-100/80 pb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-green-200 bg-green-100 text-green-600">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-green-900">Resolución</h3>
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
            <div className="card relative overflow-hidden rounded-2xl border-0 bg-slate-900 text-white shadow-lg">
              <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-indigo-500/20 blur-3xl"></div>
              <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-slate-500/20 blur-3xl"></div>
              <div className="card-body relative">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-indigo-300 ring-1 ring-white/10">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-white">Información</h3>
                </div>
                <p className="text-sm leading-relaxed text-slate-300">
                  Puedes ver el progreso del ticket y agregar comentarios. Los cambios de estado los realiza el equipo de soporte.
                </p>
              </div>
            </div>
          )}

          {/* Activo reportado */}
          <div className="card rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white via-slate-50 to-indigo-50/60 shadow-sm shadow-slate-200/70">
            <div className="card-body">
              <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-700">Activo reportado</div>
                  {!asset && <div className="text-sm font-medium text-slate-500">No asociado</div>}
                </div>
              </div>

              {asset ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Etiqueta</div>
                      <div className="text-sm font-bold text-slate-900">{asset.asset_tag}</div>
                    </div>
                    <div>
                      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Tipo</div>
                      <div className="text-sm font-medium text-slate-800">{formatAssetType(asset)}</div>
                    </div>
                  </div>

                  {(asset.brand || asset.model) && (
                    <div className="grid grid-cols-2 gap-3">
                      {asset.brand && (
                        <div>
                          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Marca</div>
                          <div className="text-sm font-semibold text-slate-800">{asset.brand}</div>
                        </div>
                      )}
                      {asset.model && (
                        <div>
                          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Modelo</div>
                          <div className="text-sm font-semibold text-slate-800">{asset.model}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {asset.serial_number && (
                    <div>
                      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Número de serie</div>
                      <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-700">{asset.serial_number}</div>
                    </div>
                  )}

                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</div>
                    <span className="inline-block rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">{asset.status}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-600">No se ha asociado un activo a este ticket.</p>
              )}

              {asset && canPerformActions && (
                <div className="mt-3 flex">
                  <Link
                    href={`/assets/${asset.id}`}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition-all hover:-translate-y-0.5 hover:bg-slate-800"
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
          <div className={surfaceCardClass}>
            <div className="card-body">
              <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-700">Información</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Solicitado por</div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 shadow-sm shadow-indigo-200">
                      <span className="text-xs font-bold text-white">
                        {getAvatarInitial({
                          fullName: ticket.requester?.full_name,
                          email: ticket.requester?.email,
                        })}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-900">
                        {ticket.requester?.full_name || ticket.requester?.email || "Desconocido"}
                      </div>
                      {ticket.requester?.full_name && (
                        <div className="truncate text-xs text-slate-500">{ticket.requester.email}</div>
                      )}
                    </div>
                  </div>
                </div>

                {ticket.location && (
                  <div>
                    <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Sede de origen</div>
                    <div className="flex items-center gap-2 text-sm text-slate-900">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-50 text-indigo-500 ring-1 ring-indigo-100">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                          <path d="M10 2a5 5 0 0 0-5 5c0 3.25 3.4 6.72 4.47 7.76a.75.75 0 0 0 1.06 0C11.6 13.72 15 10.25 15 7a5 5 0 0 0-5-5Zm0 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold">{ticket.location.name}</div>
                        {ticket.location.code && <div className="text-xs text-slate-500">{ticket.location.code}</div>}
                      </div>
                    </div>
                  </div>
                )}

                {ticket.hk_room && (
                  <div>
                    <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Habitación</div>
                    <div className="flex items-center gap-2 text-sm text-slate-900">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-rose-50 text-rose-500">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold">Habitación {ticket.hk_room.number}</div>
                        <div className="text-xs text-slate-500">Piso {ticket.hk_room.floor}</div>
                      </div>
                    </div>
                  </div>
                )}

                {ticket.assigned_agent ? (
                  <div>
                    <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Asignado a</div>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600">
                        <span className="text-xs font-bold text-white">
                          {getAvatarInitial({
                            fullName: ticket.assigned_agent.full_name,
                            email: ticket.assigned_agent.email,
                          })}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-slate-900">
                          {ticket.assigned_agent.full_name || ticket.assigned_agent.email}
                        </div>
                        {ticket.assigned_agent.full_name && (
                          <div className="truncate text-xs text-slate-500">{ticket.assigned_agent.email}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Asignado a</div>
                    <div className="text-sm italic text-slate-400">Sin asignar</div>
                  </div>
                )}

                {ticket.closed_by_user && (
                  <div>
                    <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Cerrado por</div>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-500 to-slate-600">
                        <span className="text-xs font-bold text-white">
                          {getAvatarInitial({
                            fullName: ticket.closed_by_user.full_name,
                            email: ticket.closed_by_user.email,
                          })}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-slate-900">
                          {ticket.closed_by_user.full_name || ticket.closed_by_user.email}
                        </div>
                        {ticket.closed_by_user.full_name && (
                          <div className="truncate text-xs text-slate-500">{ticket.closed_by_user.email}</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

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
          <div className={surfaceCardClass}>
            <div className="card-body">
              <div className="mb-3 flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-700">Fechas</div>
                  <div className="text-xs text-slate-500">Trazabilidad de apertura y cierre</div>
                </div>
              </div>
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

      <div className="flex justify-end">
        <TicketPdfExportButton
          ticketId={String(ticket.id)}
          ticketType="IT"
          locationCode={locationCode}
          filename={detailPdfFilename}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50"
          title="Descargar reporte ejecutivo del ticket en PDF"
        >
          <svg className="h-4 w-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" />
          </svg>
          Descargar PDF ejecutivo
        </TicketPdfExportButton>
      </div>
    </div>
  )
}
