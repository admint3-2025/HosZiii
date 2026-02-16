'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Clock, Send, ChevronDown, ChevronUp, AlertCircle, Users } from 'lucide-react'

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
  const [expandedLocation, setExpandedLocation] = useState<string | null>(null)
  const [notifying, setNotifying] = useState<string | null>(null)
  const [messages, setMessages] = useState<Record<string, string>>({})

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

  const handleNotify = async (location_id: string, location_name: string) => {
    setNotifying(location_id)
    try {
      const res = await fetch('/api/corporativo/notify-rooms-out-of-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id,
          explanation: messages[location_id] || undefined
        })
      })

      if (res.ok) {
        alert(`✓ Notificación enviada a gerentes de ${location_name}`)
        setMessages(prev => ({ ...prev, [location_id]: '' }))
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

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
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
      <div className="bg-white border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 bg-red-50 border border-red-200 rounded-md flex items-center justify-center flex-shrink-0">
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
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-50 border border-emerald-200 rounded-md flex items-center justify-center">
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
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 bg-red-50 border border-red-200 rounded-md flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 truncate">Habitaciones fuera de servicio</h3>
            <p className="text-xs text-gray-500 truncate">Mantenimiento y bloqueadas</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-700 tabular-nums">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            {totalRoomsOut}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-700 tabular-nums">
            <Clock className="w-3.5 h-3.5 text-orange-600" />
            {maxAgingDays}d
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-700 tabular-nums">
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            {propertiesAffected}
          </span>
        </div>
      </div>

      {/* Properties */}
      <div className="p-3 space-y-2">
        {properties.map(property => {
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
                onClick={() => setExpandedLocation(expandedLocation === property.location_id ? null : property.location_id)}
                className="w-full px-3 py-3 hover:bg-gray-50 transition-colors flex items-center justify-between gap-3"
              >
                <div className="min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 text-gray-900 text-xs font-bold tabular-nums">
                      {property.total_rooms_out}
                    </span>
                    <h4 className="text-sm font-semibold text-gray-900 truncate">{property.location_name}</h4>
                  </div>
                  <div className="mt-1 text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-1">
                    <span className="tabular-nums">Máx. {property.maxDaysOut}d {property.maxHoursOut}h</span>
                    <span className="tabular-nums">Mantenimiento: {maintenanceCount}</span>
                    <span className="tabular-nums">Bloqueadas: {blockedCount}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`inline-flex items-center px-2 py-1 rounded-md border text-xs font-semibold ${severity.cls}`}>{severity.label}</span>
                  {expandedLocation === property.location_id ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </button>

              {expandedLocation === property.location_id && (
                <div className="border-t border-gray-200 bg-gray-50 px-3 py-3 space-y-3">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 pr-3 font-semibold text-gray-700">Habitación</th>
                          <th className="text-left py-2 pr-3 font-semibold text-gray-700">Estado</th>
                          <th className="text-right py-2 font-semibold text-gray-700">Antigüedad</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {property.rooms.map(room => (
                          <tr key={room.id} className="hover:bg-white/60 transition-colors">
                            <td className="py-2 pr-3">
                              <div className="font-semibold text-gray-900">#{room.number}</div>
                              <div className="text-[11px] text-gray-500">Piso {room.floor}</div>
                            </td>
                            <td className="py-2 pr-3">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-semibold ${
                                  room.status === 'bloqueada'
                                    ? 'bg-red-50 text-red-700 border-red-200'
                                    : 'bg-orange-50 text-orange-700 border-orange-200'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${room.status === 'bloqueada' ? 'bg-red-500' : 'bg-orange-500'}`}
                                />
                                {room.status === 'bloqueada' ? 'Bloqueada' : 'Mantenimiento'}
                              </span>
                            </td>
                            <td className="py-2 text-right tabular-nums font-semibold text-gray-900">
                              {room.daysOut}d {room.hoursOut}h
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <label className="block text-xs font-semibold text-gray-900 mb-2">
                      <AlertCircle className="w-4 h-4 inline mr-2 text-blue-600" />
                      Mensaje para el gerente (opcional)
                    </label>
                    <textarea
                      value={messages[property.location_id] || ''}
                      onChange={(e) => setMessages(prev => ({ ...prev, [property.location_id]: e.target.value }))}
                      placeholder="Ej: Solicitar actualización y ETA de resolución..."
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={2}
                    />
                    <button
                      onClick={() => handleNotify(property.location_id, property.location_name)}
                      disabled={notifying === property.location_id}
                      className="w-full mt-3 inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-semibold transition-colors"
                    >
                      <Send className="w-4 h-4" />
                      {notifying === property.location_id ? 'Enviando...' : 'Enviar notificación'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
