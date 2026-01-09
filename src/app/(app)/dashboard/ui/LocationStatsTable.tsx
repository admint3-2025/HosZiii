"use client"

import { useMemo, useState, useEffect } from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase/browser"

type LocationStatsRow = {
  location_id: string
  location_code: string
  location_name: string
  total_tickets: number
  open_tickets: number
  closed_tickets: number
  avg_resolution_days: number
}

type TopAgent = {
  agent_id: string
  agent_name: string
  tickets_closed: number
  avg_resolution_days: number
}

export default function LocationStatsTable({ rows }: { rows: LocationStatsRow[] }) {
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    rows[0]?.location_id ?? null
  )

  const maxTotalTickets = useMemo(
    () => rows.reduce((max, r) => (r.total_tickets > max ? r.total_tickets : max), 0) || 1,
    [rows]
  )

  const selected = useMemo(
    () => rows.find((r) => r.location_id === selectedLocationId) ?? rows[0],
    [rows, selectedLocationId]
  )

  const [sending, setSending] = useState(false)
  const [sendMessage, setSendMessage] = useState<string | null>(null)

  const [showModal, setShowModal] = useState(false)
  const [includeResponsables, setIncludeResponsables] = useState(true)
  const [extraEmails, setExtraEmails] = useState('')

  const [topAgents, setTopAgents] = useState<TopAgent[]>([])
  const [loadingAgents, setLoadingAgents] = useState(false)

  // Cargar agentes más activos cuando cambia la sede seleccionada
  useEffect(() => {
    if (!selectedLocationId) return

    const loadTopAgents = async () => {
      setLoadingAgents(true)
      try {
        const supabase = createSupabaseBrowserClient()
        
        // Tickets cerrados en esta ubicación (histórico completo)
        // Usar closed_by para ver quién cerró el ticket
        const { data: tickets, error: ticketsError } = await supabase
          .from('tickets')
          .select('closed_by, created_at, closed_at')
          .eq('location_id', selectedLocationId)
          .eq('status', 'CLOSED')
          .not('closed_by', 'is', null)
          .not('closed_at', 'is', null)
          .limit(500)

        if (ticketsError) {
          console.error('Error cargando tickets:', ticketsError)
          setTopAgents([])
          setLoadingAgents(false)
          return
        }

        if (!tickets || tickets.length === 0) {
          setTopAgents([])
          setLoadingAgents(false)
          return
        }

        // Obtener IDs únicos de agentes (quienes cerraron tickets)
        const agentIds = [...new Set(tickets.map(t => t.closed_by).filter(id => id))]
        
        if (agentIds.length === 0) {
          setTopAgents([])
          setLoadingAgents(false)
          return
        }

        // Obtener nombres de agentes
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', agentIds)

        if (profilesError) {
          console.error('Error cargando perfiles:', profilesError)
        }

        const profileMap = new Map((profiles || []).map(p => [p.id, p.full_name]))

        // Agrupar por agente y calcular métricas
        const agentMap = new Map<string, { name: string; count: number; totalDays: number }>()
        
        tickets.forEach((ticket) => {
          const agentId = ticket.closed_by
          if (!agentId) return
          
          const agentName = profileMap.get(agentId) || 'Sin nombre'
          const createdAt = new Date(ticket.created_at)
          const closedAt = new Date(ticket.closed_at)
          const resolutionDays = Math.max(0, (closedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))

          if (!agentMap.has(agentId)) {
            agentMap.set(agentId, { name: agentName, count: 0, totalDays: 0 })
          }

          const agent = agentMap.get(agentId)!
          agent.count++
          agent.totalDays += resolutionDays
        })

        // Convertir a array y ordenar por tickets cerrados
        const agents: TopAgent[] = Array.from(agentMap.entries())
          .map(([id, stats]) => ({
            agent_id: id,
            agent_name: stats.name,
            tickets_closed: stats.count,
            avg_resolution_days: stats.count > 0 ? stats.totalDays / stats.count : 0
          }))
          .sort((a, b) => b.tickets_closed - a.tickets_closed)
          .slice(0, 5)

        setTopAgents(agents)
      } catch (err) {
        console.error('Error general:', err)
        setTopAgents([])
      } finally {
        setLoadingAgents(false)
      }
    }

    loadTopAgents()
  }, [selectedLocationId])

  if (!rows || rows.length === 0) {
    return null
  }

  const openPct = selected.total_tickets
    ? Math.round((selected.open_tickets / selected.total_tickets) * 100)
    : 0
  const closedPct = selected.total_tickets
    ? Math.round((selected.closed_tickets / selected.total_tickets) * 100)
    : 0
  const otherPct = Math.max(0, 100 - openPct - closedPct)

  async function handleSendSummary() {
    if (!selected.location_id || sending) return
    setSending(true)
    setSendMessage(null)
    try {
      const additionalEmails = extraEmails
        .split(',')
        .map((e) => e.trim())
        .filter((e) => !!e)

      const res = await fetch('/api/reports/location-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locationId: selected.location_id,
          includeLocationRecipients: includeResponsables,
          additionalEmails,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setSendMessage(
          data?.error || 'No se pudo enviar el resumen por correo. Intenta nuevamente o contacta a IT.'
        )
        return
      }

      setSendMessage('Resumen enviado por correo a los destinatarios seleccionados.')
      setShowModal(false)
      setExtraEmails('')
      setIncludeResponsables(true)
    } catch (error) {
      console.error('Error enviando resumen por sede:', error)
      setSendMessage('Ocurrió un error al enviar el resumen por correo.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="card shadow-lg border border-gray-100 bg-gradient-to-br from-white to-gray-50/30">
      <div className="card-body">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 tracking-tight">Estadísticas por Sede</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Selecciona una ubicación para ver detalles operativos
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium text-blue-700">{rows.length} sedes activas</span>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {/* Tabla interactiva de sedes */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr className="text-left text-[10px] uppercase text-gray-600 font-semibold tracking-wider border-b-2 border-gray-200">
                    <th className="py-3 px-4">Sede</th>
                    <th className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                          <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
                        </svg>
                        <span>Total</span>
                      </div>
                    </th>
                    <th className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <svg className="w-3.5 h-3.5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                        </svg>
                        <span>Abiertos</span>
                      </div>
                    </th>
                    <th className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <svg className="w-3.5 h-3.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                        </svg>
                        <span>Cerrados</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((row) => {
                    const isSelected = row.location_id === selectedLocationId
                    const barWidth = `${(row.total_tickets / maxTotalTickets) * 100}%`
                    return (
                      <tr
                        key={row.location_id}
                        className={`cursor-pointer transition-all duration-150 ${
                          isSelected 
                            ? "bg-gradient-to-r from-blue-50 to-indigo-50 shadow-inner" 
                            : "hover:bg-gray-50"
                        }`}
                        onClick={() => setSelectedLocationId(row.location_id)}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {isSelected && (
                              <div className="w-1 h-10 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-r-full -ml-4 mr-2"></div>
                            )}
                            <div className="flex flex-col">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md w-fit">
                                {row.location_code}
                              </span>
                              <span className="text-xs text-gray-900 font-medium mt-1 truncate max-w-[200px]">
                                {row.location_name}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-lg">
                            <span className="text-sm font-bold text-gray-900">{row.total_tickets}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg">
                            <span className="text-sm font-bold text-amber-700">{row.open_tickets}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg">
                            <span className="text-sm font-bold text-emerald-700">{row.closed_tickets}</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Panel de detalle de la sede seleccionada */}
          <div className="border-2 border-blue-200 rounded-xl p-4 bg-gradient-to-br from-blue-50 via-white to-indigo-50 shadow-md flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                  </svg>
                  <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Sede Seleccionada</p>
                </div>
                <p className="text-sm font-bold text-gray-900 leading-tight">
                  {selected.location_name}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">{selected.location_code}</p>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 px-3 py-1.5 shadow-md">
                <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
                </svg>
                <span className="text-xs font-bold text-white">{selected.total_tickets}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white border-2 border-amber-200 p-3 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="p-1.5 bg-amber-100 rounded-lg">
                    <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <p className="text-[10px] font-semibold text-amber-700 uppercase">Abiertos</p>
                </div>
                <p className="text-2xl font-bold text-amber-700 mb-0.5">{selected.open_tickets}</p>
                <div className="flex items-center gap-1">
                  <div className="h-1.5 flex-1 bg-amber-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${openPct}%` }}></div>
                  </div>
                  <span className="text-[10px] font-bold text-amber-700">{openPct}%</span>
                </div>
              </div>

              <div className="rounded-xl bg-white border-2 border-emerald-200 p-3 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="p-1.5 bg-emerald-100 rounded-lg">
                    <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <p className="text-[10px] font-semibold text-emerald-700 uppercase">Cerrados</p>
                </div>
                <p className="text-2xl font-bold text-emerald-700 mb-0.5">{selected.closed_tickets}</p>
                <div className="flex items-center gap-1">
                  <div className="h-1.5 flex-1 bg-emerald-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${closedPct}%` }}></div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700">{closedPct}%</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-white border border-gray-200 p-3 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Tiempo promedio</p>
                </div>
                <p className="text-lg font-bold text-gray-900">
                  {selected.avg_resolution_days?.toFixed
                    ? selected.avg_resolution_days.toFixed(1)
                    : selected.avg_resolution_days}
                  <span className="text-xs text-gray-500 ml-0.5">días</span>
                </p>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden flex shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-500"
                  style={{ width: `${openPct}%` }}
                  title={`${openPct}% abiertos`}
                ></div>
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500"
                  style={{ width: `${closedPct}%` }}
                  title={`${closedPct}% cerrados`}
                ></div>
                {otherPct > 0 && (
                  <div
                    className="h-full bg-gradient-to-r from-blue-300 to-blue-400"
                    style={{ width: `${otherPct}%` }}
                    title={`${otherPct}% otros estados`}
                  ></div>
                )}
              </div>
              <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">
                {openPct > 0
                  ? `${openPct}% de tickets en proceso • Distribución actualizada`
                  : "✓ Todos los tickets han sido atendidos"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:-translate-y-0.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              Generar resumen ejecutivo
            </button>

            {/* Agentes más activos */}
            <div className="mt-3 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200 p-3">
              <div className="flex items-center gap-2 mb-2.5">
                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h4 className="text-xs font-bold text-slate-700">Agentes más activos</h4>
              </div>

              {loadingAgents ? (
                <div className="flex items-center justify-center py-4">
                  <svg className="w-5 h-5 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : topAgents.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-3">
                  No hay tickets cerrados en esta sede
                </p>
              ) : (
                <div className="space-y-1.5">
                  {topAgents.map((agent, idx) => {
                    const maxTickets = topAgents[0]?.tickets_closed || 1
                    const widthPct = (agent.tickets_closed / maxTickets) * 100
                    
                    return (
                      <div key={agent.agent_id} className="flex items-center gap-2">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className="text-[11px] font-semibold text-slate-800 truncate">
                              {agent.agent_name}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px]">
                              <span className="font-bold text-indigo-700">{agent.tickets_closed}</span>
                              <span className="text-slate-500">tickets</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500"
                                style={{ width: `${widthPct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-500 whitespace-nowrap">
                              {agent.avg_resolution_days.toFixed(1)}d avg
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {sendMessage && (
              <div className={`rounded-lg px-3 py-2 text-[10px] ${
                sendMessage.includes('enviado') || sendMessage.includes('✓')
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {sendMessage}
              </div>
            )}
          </div>
        </div>
      {showModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 text-xs">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="border-b border-slate-200 px-4 py-2.5 flex items-center justify-between bg-slate-50">
              <div>
                <p className="text-[10px] font-semibold text-sky-700 uppercase tracking-wide">Resumen por sede</p>
                <p className="text-xs font-semibold text-gray-900">
                  [{selected.location_code}] {selected.location_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-500 hover:text-slate-700 text-sm"
              >
                ✕
              </button>
            </div>
            <div className="px-4 py-3 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-slate-50 border border-slate-200 px-2 py-1.5">
                  <p className="text-[10px] text-slate-500">Tickets totales</p>
                  <p className="text-sm font-semibold text-slate-900">{selected.total_tickets}</p>
                </div>
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-2 py-1.5">
                  <p className="text-[10px] text-amber-700">Abiertos</p>
                  <p className="text-sm font-semibold text-amber-700">{selected.open_tickets}</p>
                </div>
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-1.5">
                  <p className="text-[10px] text-emerald-700">Cerrados</p>
                  <p className="text-sm font-semibold text-emerald-700">{selected.closed_tickets}</p>
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                <p className="text-[10px] text-slate-500">Promedio de resolución</p>
                <p className="text-sm font-semibold text-slate-900">
                  {selected.avg_resolution_days?.toFixed
                    ? selected.avg_resolution_days.toFixed(1)
                    : selected.avg_resolution_days}{' '}
                  días
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">
                  Destinatarios del resumen
                </p>
                <label className="flex items-start gap-2 text-[11px] text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-3 w-3 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    checked={includeResponsables}
                    onChange={(e) => setIncludeResponsables(e.target.checked)}
                  />
                  <span>
                    Enviar automáticamente a responsables de la sede (supervisores / administradores con acceso a esta
                    ubicación).
                  </span>
                </label>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-600">Correos adicionales (separados por coma)</p>
                  <input
                    type="text"
                    value={extraEmails}
                    onChange={(e) => setExtraEmails(e.target.value)}
                    placeholder="ej: gerente@empresa.com, director@empresa.com"
                    className="w-full rounded-md border border-slate-300 px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <p className="text-[10px] text-slate-500">
                  Se generará un resumen ejecutivo con KPIs y listado de tickets abiertos más relevantes de esta sede.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSendSummary}
                    disabled={sending}
                    className="rounded-md bg-sky-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {sending ? 'Enviando…' : 'Enviar resumen'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
