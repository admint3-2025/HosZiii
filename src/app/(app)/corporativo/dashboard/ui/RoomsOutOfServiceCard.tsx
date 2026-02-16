'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Clock, Send, AlertCircle, Users, X } from 'lucide-react'

interface Room {
  id: string
  number: string
  floor: number
  status: string
  daysOut: number
  hoursOut: number
  updatedAt: string
}

interface Property {
  location_id: string
  location_name: string
  rooms: Room[]
  total_rooms_out: number
  severityScore: number
  maxDaysOut: number
  maxHoursOut: number
}

export default function RoomsOutOfServiceCard() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [notifying, setNotifying] = useState<string | null>(null)

  type TemplateId = 'retro_eta' | 'bloqueadas_largas' | 'mantenimiento_eta'

  const TEMPLATES: { id: TemplateId; label: string; help: string }[] = [
    {
      id: 'retro_eta',
      label: 'Retro + ETA (general)',
      help: 'Solicita causa, responsable y ETA para todas las habitaciones OOS.',
    },
    {
      id: 'mantenimiento_eta',
      label: 'ETA mantenimiento + ticket',
      help: 'Enfocado en habitaciones en mantenimiento (ETA y referencia de ticket).',
    },
    {
      id: 'bloqueadas_largas',
      label: 'Bloqueadas prolongadas',
      help: 'Solicita justificación y fecha/condición de desbloqueo para bloqueos prolongados.',
    },
  ]

  const [templateByLocation, setTemplateByLocation] = useState<Record<string, TemplateId>>({})
  const [includeManagersByLocation, setIncludeManagersByLocation] = useState<Record<string, boolean>>({})
  const [extraEmailsByLocation, setExtraEmailsByLocation] = useState<Record<string, string>>({})
  const [minDaysByLocation, setMinDaysByLocation] = useState<Record<string, number>>({})
  const [selectedManagerEmailsByLocation, setSelectedManagerEmailsByLocation] = useState<Record<string, string[]>>({})
  const [recipientsPreview, setRecipientsPreview] = useState<{
    locationId: string
    loading: boolean
    error: string | null
    subject: string | null
    recipients: string[]
    managerOptions: { full_name: string | null; email: string }[]
    selectedManagerEmails: string[]
  } | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/corporativo/rooms-out-of-service')
        const data = await res.json().catch(() => ({} as any))

        if (!res.ok) {
          setError(data?.error || data?.message || 'Error al cargar habitaciones fuera de servicio')
          setProperties([])
          return
        }

        setError(null)
        setProperties(data.properties || [])
      } catch (error) {
        console.error('Error fetching rooms out of service:', error)
        setError(error instanceof Error ? error.message : 'Error al cargar habitaciones fuera de servicio')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [])

  function buildPreviewMessage(property: Property, templateId: TemplateId) {
    const maintenanceCount = property.rooms.filter(r => r.status === 'mantenimiento').length
    const blockedCount = property.rooms.filter(r => r.status === 'bloqueada').length
    const maxDays = property.rooms.reduce((max, r) => Math.max(max, r.daysOut), 0)
    const minDays = minDaysByLocation[property.location_id] ?? 3

    const scopeLine =
      templateId === 'mantenimiento_eta'
        ? 'Alcance: solo habitaciones en mantenimiento.'
        : templateId === 'bloqueadas_largas'
          ? `Alcance: bloqueadas con antigüedad ≥ ${minDays} días.`
          : 'Alcance: todas las habitaciones OOS (mantenimiento y bloqueadas).'

    const header = [
      `Hola equipo,`,
      ``,
      `Desde Corporativo solicitamos actualización sobre habitaciones fuera de servicio en: ${property.location_name}.`,
      `Total OOS: ${property.total_rooms_out} (Mantenimiento: ${maintenanceCount}, Bloqueadas: ${blockedCount}) · Máx antigüedad: ${maxDays}d.`,
      scopeLine,
      `Tiempo máximo de respuesta sugerido: 2 horas.`,
      ``,
    ]

    const askRetroEta = [
      `Por favor enviar:`,
      `1) Retro/causa por cada habitación`,
      `2) Responsable asignado`,
      `3) ETA (fecha/hora estimada de liberación o próximo hito)`,
      ``,
    ]

    const askMaintenance = [
      `Por favor confirmar para cada caso en mantenimiento:`,
      `1) Causa / intervención en curso`,
      `2) Ticket/orden de trabajo (si aplica)`,
      `3) ETA de liberación`,
      ``,
    ]

    const askBlocked = [
      `Por favor confirmar para cada bloqueo:`,
      `1) Justificación del bloqueo`,
      `2) Condición/fecha de desbloqueo`,
      `3) Responsable`,
      ``,
    ]

    const body =
      templateId === 'mantenimiento_eta'
        ? [...header, ...askMaintenance]
        : templateId === 'bloqueadas_largas'
          ? [...header, ...askBlocked]
          : [...header, ...askRetroEta]

    return body.join('\n')
  }

  useEffect(() => {
    if (!selectedProperty) return

    const locationId = selectedProperty.location_id
    const templateId = templateByLocation[locationId] || 'retro_eta'
    const includeLocationRecipients =
      typeof includeManagersByLocation[locationId] === 'boolean' ? includeManagersByLocation[locationId] : true
    const selectedManagerEmails = selectedManagerEmailsByLocation[locationId]
    const additionalEmails = (extraEmailsByLocation[locationId] || '')
      .split(',')
      .map(e => e.trim())
      .filter(e => !!e)
    const minDays = minDaysByLocation[locationId] ?? 3

    const controller = new AbortController()
    setRecipientsPreview({
      locationId,
      loading: true,
      error: null,
      subject: null,
      recipients: [],
      managerOptions: [],
      selectedManagerEmails: [],
    })

    ;(async () => {
      try {
        const res = await fetch('/api/corporativo/notify-rooms-out-of-service', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            location_id: locationId,
            template_id: templateId,
            includeLocationRecipients,
            managerEmails: includeLocationRecipients ? selectedManagerEmails : undefined,
            additionalEmails,
            min_days: minDays,
            dry_run: true,
          }),
        })

        const data = await res.json().catch(() => ({} as any))
        if (!res.ok) {
          setRecipientsPreview({
            locationId,
            loading: false,
            error: data?.error || data?.message || 'No se pudo calcular destinatarios',
            subject: null,
            recipients: [],
            managerOptions: [],
            selectedManagerEmails: [],
          })
          return
        }

        const managerOptions: { full_name: string | null; email: string }[] = Array.isArray(data?.managerOptions)
          ? data.managerOptions
          : []
        const selectedFromApi: string[] = Array.isArray(data?.selectedManagerEmails)
          ? data.selectedManagerEmails
          : []

        setSelectedManagerEmailsByLocation((prev) => {
          const existing = prev[locationId]
          const allowed = new Set(managerOptions.map((m) => m.email))

          if (existing && existing.length) {
            const filtered = existing.filter((e) => allowed.has(e))
            return filtered.length === existing.length ? prev : { ...prev, [locationId]: filtered }
          }

          const initial = selectedFromApi.length ? selectedFromApi : managerOptions.map((m) => m.email)
          const next = Array.from(new Set(initial)).filter((e) => allowed.has(e)).sort()
          return { ...prev, [locationId]: next }
        })

        setRecipientsPreview({
          locationId,
          loading: false,
          error: null,
          subject: data?.subject || null,
          recipients: Array.isArray(data?.recipients) ? data.recipients : [],
          managerOptions,
          selectedManagerEmails: selectedFromApi,
        })
      } catch (e) {
        if (controller.signal.aborted) return
        setRecipientsPreview({
          locationId,
          loading: false,
          error: e instanceof Error ? e.message : 'No se pudo calcular destinatarios',
          subject: null,
          recipients: [],
          managerOptions: [],
          selectedManagerEmails: [],
        })
      }
    })()

    return () => controller.abort()
  }, [
    selectedProperty,
    templateByLocation,
    includeManagersByLocation,
    extraEmailsByLocation,
    minDaysByLocation,
    selectedManagerEmailsByLocation,
  ])

  const handleNotify = async (property: Property) => {
    const location_id = property.location_id
    const location_name = property.location_name
    setNotifying(location_id)
    try {
      const templateId = templateByLocation[location_id] || 'retro_eta'
      const includeLocationRecipients =
        typeof includeManagersByLocation[location_id] === 'boolean' ? includeManagersByLocation[location_id] : true
      const managerEmails = includeLocationRecipients ? (selectedManagerEmailsByLocation[location_id] || []) : []
      const additionalEmails = (extraEmailsByLocation[location_id] || '')
        .split(',')
        .map(e => e.trim())
        .filter(e => !!e)
      const minDays = minDaysByLocation[location_id] ?? 3

      const res = await fetch('/api/corporativo/notify-rooms-out-of-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id,
          template_id: templateId,
          includeLocationRecipients,
          managerEmails: includeLocationRecipients ? managerEmails : undefined,
          additionalEmails,
          min_days: minDays,
        })
      })

      if (res.ok) {
        alert(`✓ Notificación enviada a gerentes de ${location_name}`)
        setExtraEmailsByLocation(prev => ({ ...prev, [location_id]: '' }))
      } else {
        const error = await res.json()
        alert(`Error: ${error.message || error.error}`)
      }
    } catch (error) {
      alert(`Error al enviar notificación: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setNotifying(null)
    }
  }

  const totalRoomsOut = properties.reduce((sum, p) => sum + p.total_rooms_out, 0)
  const maxAgingDays = properties.flatMap(p => p.rooms).reduce((max, r) => Math.max(max, r.daysOut), 0)
  const propertiesAffected = properties.length
  const previewLimit = 3

  const selectedMaintenanceCount = selectedProperty?.rooms.filter(r => r.status === 'mantenimiento').length ?? 0
  const selectedBlockedCount = selectedProperty?.rooms.filter(r => r.status === 'bloqueada').length ?? 0

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-64 mb-2"></div>
        <div className="h-3 bg-gray-100 rounded w-96 mb-4"></div>
        <div className="flex gap-2">
          <div className="h-7 bg-gray-100 rounded w-28"></div>
          <div className="h-7 bg-gray-100 rounded w-28"></div>
          <div className="h-7 bg-gray-100 rounded w-28"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white border border-red-200 rounded-lg p-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-red-50 border border-red-200 rounded-md flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-4 h-4 text-red-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">No se pudo cargar el monitoreo</h3>
            <p className="text-xs text-gray-600 mt-1">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (properties.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-50 border border-emerald-200 rounded-md flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-emerald-700" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Sin incidencias</h3>
            <p className="text-xs text-gray-500">No hay habitaciones en mantenimiento o bloqueadas.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 bg-red-50 border border-red-200 rounded-md flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[13px] font-semibold text-gray-900 truncate">Habitaciones fuera de servicio</h3>
            <p className="text-[11px] text-gray-500 truncate">Mantenimiento y bloqueadas</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-gray-200 bg-gray-50 text-[11px] font-semibold text-gray-700 tabular-nums">
            <AlertTriangle className="w-3 h-3 text-red-600" />
            {totalRoomsOut}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-gray-200 bg-gray-50 text-[11px] font-semibold text-gray-700 tabular-nums">
            <Clock className="w-3 h-3 text-orange-600" />
            {maxAgingDays}d
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-gray-200 bg-gray-50 text-[11px] font-semibold text-gray-700 tabular-nums">
            <Users className="w-3 h-3 text-indigo-600" />
            {propertiesAffected}
          </span>
        </div>
      </div>

      {/* Properties */}
      <div className="p-2 space-y-1">
        {properties.slice(0, previewLimit).map(property => {
          const maintenanceCount = property.rooms.filter(r => r.status === 'mantenimiento').length
          const blockedCount = property.rooms.filter(r => r.status === 'bloqueada').length

          const severity =
            property.total_rooms_out > 5
              ? { label: 'Crítico', cls: 'bg-red-50 text-red-700 border-red-200' }
              : property.total_rooms_out > 2
                ? { label: 'Alto', cls: 'bg-orange-50 text-orange-700 border-orange-200' }
                : { label: 'Medio', cls: 'bg-amber-50 text-amber-700 border-amber-200' }

          return (
            <div key={property.location_id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setSelectedProperty(property)}
                className="w-full px-3 py-2 hover:bg-gray-50 transition-colors flex items-center justify-between gap-2"
              >
                <div className="min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-gray-100 text-gray-900 text-[11px] font-bold tabular-nums">
                      {property.total_rooms_out}
                    </span>
                    <h4 className="text-sm font-semibold text-gray-900 truncate">{property.location_name}</h4>
                  </div>
                  <div className="mt-0.5 text-[11px] text-gray-500 flex flex-wrap gap-x-2 gap-y-1">
                    <span className="tabular-nums">Máx. {property.maxDaysOut}d {property.maxHoursOut}h</span>
                    <span className="tabular-nums">Mant.: {maintenanceCount}</span>
                    <span className="tabular-nums">Bloq.: {blockedCount}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md border text-[11px] font-semibold ${severity.cls}`}>{severity.label}</span>
                </div>
              </button>
            </div>
          )
        })}

        {properties.length > previewLimit && (
          <button
            type="button"
            onClick={() => setSelectedProperty(properties[0] || null)}
            className="w-full text-left px-3 py-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="text-[11px] font-semibold text-gray-700">
              Ver detalle ({propertiesAffected} sedes)
            </div>
            <div className="text-[11px] text-gray-500">Abre un resumen completo por sede.</div>
          </button>
        )}
      </div>

      {/* Detail Modal */}
      {selectedProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="text-sm font-bold text-gray-900 truncate">{selectedProperty.location_name}</div>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-gray-200 bg-white text-[11px] font-semibold text-gray-700 tabular-nums">
                    <AlertTriangle className="w-3 h-3 text-red-600" />
                    {selectedProperty.total_rooms_out}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-gray-200 bg-white text-[11px] font-semibold text-gray-700 tabular-nums">
                    <Clock className="w-3 h-3 text-orange-600" />
                    Máx. {selectedProperty.maxDaysOut}d {selectedProperty.maxHoursOut}h
                  </span>
                </div>
                <div className="text-[11px] text-gray-500 mt-1">
                  Mantenimiento: <span className="font-semibold text-gray-800 tabular-nums">{selectedMaintenanceCount}</span>
                  <span className="mx-2 text-gray-300">|</span>
                  Bloqueadas: <span className="font-semibold text-gray-800 tabular-nums">{selectedBlockedCount}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedProperty(null)}
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-500"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="rounded-lg border border-gray-200 bg-white">
                <div className="px-3 py-2 border-b border-gray-100">
                  <div className="text-[11px] font-bold text-gray-800 uppercase tracking-wide">Habitaciones afectadas</div>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="text-left py-2 px-3 font-semibold text-gray-700">Habitación</th>
                        <th className="text-left py-2 px-3 font-semibold text-gray-700">Estado</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-700">Antigüedad</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedProperty.rooms.map(room => (
                        <tr key={room.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="py-2 px-3">
                            <div className="font-semibold text-gray-900">#{room.number}</div>
                            <div className="text-[11px] text-gray-500">Piso {room.floor}</div>
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-semibold ${
                                room.status === 'bloqueada'
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : 'bg-orange-50 text-orange-700 border-orange-200'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${room.status === 'bloqueada' ? 'bg-red-500' : 'bg-orange-500'}`} />
                              {room.status === 'bloqueada' ? 'Bloqueada' : 'Mantenimiento'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums font-semibold text-gray-900">
                            {room.daysOut}d {room.hoursOut}h
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-gray-900">
                      <AlertCircle className="w-4 h-4 inline mr-2 text-blue-600" />
                      Solicitud predefinida (retro / ETA)
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      Selecciona una plantilla y envía sin escribir.
                    </div>
                  </div>
                </div>

                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">Tipo de mensaje</label>
                      <select
                        value={templateByLocation[selectedProperty.location_id] || 'retro_eta'}
                        onChange={(e) =>
                          setTemplateByLocation(prev => ({ ...prev, [selectedProperty.location_id]: e.target.value as TemplateId }))
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {TEMPLATES.map(t => (
                          <option key={t.id} value={t.id}>{t.label}</option>
                        ))}
                      </select>
                      <p className="text-[11px] text-gray-500 mt-1">
                        {TEMPLATES.find(t => t.id === (templateByLocation[selectedProperty.location_id] || 'retro_eta'))?.help}
                      </p>

                      {(templateByLocation[selectedProperty.location_id] || 'retro_eta') === 'bloqueadas_largas' && (
                        <div className="mt-2">
                          <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                            Umbral de antigüedad (días)
                          </label>
                          <select
                            value={minDaysByLocation[selectedProperty.location_id] ?? 3}
                            onChange={(e) =>
                              setMinDaysByLocation(prev => ({ ...prev, [selectedProperty.location_id]: Number(e.target.value) }))
                            }
                            className="w-full rounded-lg border border-gray-300 bg-white px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            {[1, 2, 3, 5, 7, 14].map((d) => (
                              <option key={d} value={d}>
                                {d} día{d === 1 ? '' : 's'}
                              </option>
                            ))}
                          </select>
                          <p className="text-[11px] text-gray-500 mt-1">
                            Se incluirán solo bloqueadas con antigüedad igual o mayor al umbral.
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold text-gray-700 mb-1">Destinatarios</p>
                      <label className="flex items-start gap-2 text-[11px] text-gray-700">
                        <input
                          type="checkbox"
                          className="mt-0.5 h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={
                            typeof includeManagersByLocation[selectedProperty.location_id] === 'boolean'
                              ? includeManagersByLocation[selectedProperty.location_id]
                              : true
                          }
                          onChange={(e) =>
                            setIncludeManagersByLocation(prev => ({ ...prev, [selectedProperty.location_id]: e.target.checked }))
                          }
                        />
                        <span>Enviar automáticamente a responsables/gerentes de la sede.</span>
                      </label>

                      {(typeof includeManagersByLocation[selectedProperty.location_id] === 'boolean'
                        ? includeManagersByLocation[selectedProperty.location_id]
                        : true) && (
                        <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-2 py-2">
                          <div className="text-[11px] font-semibold text-gray-700 mb-1">Responsables detectados</div>
                          {recipientsPreview?.locationId === selectedProperty.location_id && recipientsPreview.loading ? (
                            <div className="text-[11px] text-gray-500">Cargando…</div>
                          ) : (recipientsPreview?.locationId === selectedProperty.location_id && recipientsPreview.managerOptions.length) ? (
                            <div className="space-y-1">
                              {recipientsPreview.managerOptions.map((m) => {
                                const email = m.email
                                const selected = (selectedManagerEmailsByLocation[selectedProperty.location_id] || []).includes(email)
                                return (
                                  <label key={email} className="flex items-start gap-2 text-[11px] text-gray-700">
                                    <input
                                      type="checkbox"
                                      className="mt-0.5 h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                      checked={selected}
                                      onChange={(e) => {
                                        setSelectedManagerEmailsByLocation((prev) => {
                                          const current = prev[selectedProperty.location_id] || []
                                          const next = e.target.checked
                                            ? Array.from(new Set([...current, email])).sort()
                                            : current.filter((x) => x !== email)
                                          return { ...prev, [selectedProperty.location_id]: next }
                                        })
                                      }}
                                    />
                                    <span className="min-w-0">
                                      <span className="font-semibold text-gray-800">{m.full_name || 'Responsable'}</span>{' '}
                                      <span className="text-gray-500">({email})</span>
                                    </span>
                                  </label>
                                )
                              })}
                              <p className="text-[11px] text-gray-500 mt-1">Desmarca si no debe recibir el correo.</p>
                            </div>
                          ) : (
                            <div className="text-[11px] text-gray-500">No se encontraron responsables con correo válido.</div>
                          )}
                        </div>
                      )}

                      <div className="mt-2">
                        <p className="text-[11px] text-gray-600 mb-1">Correos adicionales (separados por coma)</p>
                        <input
                          type="text"
                          value={extraEmailsByLocation[selectedProperty.location_id] || ''}
                          onChange={(e) =>
                            setExtraEmailsByLocation(prev => ({ ...prev, [selectedProperty.location_id]: e.target.value }))
                          }
                          placeholder="ej: gerente@empresa.com, director@empresa.com"
                          className="w-full rounded-lg border border-gray-300 bg-white px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Cuerpo del mensaje (prellenado)</label>
                    <textarea
                      readOnly
                      value={buildPreviewMessage(selectedProperty, templateByLocation[selectedProperty.location_id] || 'retro_eta')}
                      className="w-full px-3 py-2 text-[11px] border border-gray-200 rounded-lg bg-gray-50 text-gray-800 resize-none"
                      rows={6}
                    />
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[11px] font-semibold text-gray-800 uppercase tracking-wide">Vista previa de destinatarios</div>
                      <div className="text-[11px] text-gray-500">
                        {recipientsPreview?.locationId === selectedProperty.location_id && recipientsPreview.loading
                          ? 'Calculando…'
                          : recipientsPreview?.locationId === selectedProperty.location_id
                            ? `${recipientsPreview.recipients.length} correo(s)`
                            : ''}
                      </div>
                    </div>

                    {recipientsPreview?.locationId === selectedProperty.location_id && recipientsPreview.error && (
                      <div className="mt-2 text-[11px] text-red-600">{recipientsPreview.error}</div>
                    )}

                    {recipientsPreview?.locationId === selectedProperty.location_id && !recipientsPreview.loading && !recipientsPreview.error && (
                      <div className="mt-2 space-y-1">
                        {recipientsPreview.subject && (
                          <div className="text-[11px] text-gray-700">
                            <span className="font-semibold">Asunto:</span> {recipientsPreview.subject}
                          </div>
                        )}
                        <div className="text-[11px] text-gray-700">
                          <span className="font-semibold">Enviar a:</span>{' '}
                          {recipientsPreview.recipients.length
                            ? recipientsPreview.recipients.join(', ')
                            : 'Sin destinatarios'}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleNotify(selectedProperty)}
                    disabled={notifying === selectedProperty.location_id}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-semibold transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    {notifying === selectedProperty.location_id ? 'Enviando...' : 'Enviar notificación'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
