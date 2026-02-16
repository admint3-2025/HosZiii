'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Clock, DollarSign, Send, ChevronDown, ChevronUp } from 'lucide-react'

interface Room {
  id: string
  number: string
  floor: number
  status: string
  daysOut: number
  hoursOut: number
  updatedAt: string
  lostRevenue: number
}

interface Property {
  location_id: string
  location_name: string
  nightly_rate: number
  rooms: Room[]
  total_rooms_out: number
  totalLostRevenue: number
  severityScore: number
}

export default function RoomsOutOfServiceCard() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedLocation, setExpandedLocation] = useState<string | null>(null)
  const [notifying, setNotifying] = useState<string | null>(null)
  const [explanation, setExplanation] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/corporativo/rooms-out-of-service')
        const data = await res.json()
        setProperties(data.properties || [])
      } catch (error) {
        console.error('Error fetching rooms out of service:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 60000) // Refrescar cada minuto
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
          explanation: explanation || undefined
        })
      })

      if (res.ok) {
        alert(`✓ Notificación enviada a gerentes de ${location_name}`)
        setExplanation('')
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
  const totalLostRevenue = properties.reduce((sum, p) => sum + p.totalLostRevenue, 0)

  if (loading) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 animate-pulse">
        <div className="h-6 bg-amber-200 rounded w-48 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-amber-200 rounded w-full"></div>
          <div className="h-4 bg-amber-200 rounded w-3/4"></div>
        </div>
      </div>
    )
  }

  if (properties.length === 0) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6">
        <div className="flex items-center gap-3 text-emerald-700">
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
            ✓
          </div>
          <div>
            <h3 className="font-semibold">Excelente Estado</h3>
            <p className="text-sm opacity-75">No hay habitaciones fuera de servicio</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-red-200 bg-red-50">
      {/* Header con estadísticas críticas */}
      <div className="border-b border-red-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-900">Habitaciones Fuera de Servicio</h3>
              <p className="text-sm text-red-700/70">Impacto en ingresos del hotel</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-red-600">{totalRoomsOut}</div>
            <div className="text-xs text-red-600/70 uppercase tracking-wide">Habitaciones</div>
          </div>
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-lg p-3 border border-red-200">
            <div className="flex items-center gap-2 text-red-600 mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs uppercase font-semibold">Ingresos Perdidos</span>
            </div>
            <div className="text-2xl font-bold text-red-900">${totalLostRevenue.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-red-200">
            <div className="flex items-center gap-2 text-orange-600 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs uppercase font-semibold">Mayor Antigüedad</span>
            </div>
            <div className="text-2xl font-bold text-orange-900">
              {properties[0]?.rooms[0]?.daysOut || 0}d
            </div>
          </div>
        </div>
      </div>

      {/* Lista de propiedades */}
      <div className="divide-y divide-red-200">
        {properties.map(property => (
          <div key={property.location_id} className="p-4 hover:bg-red-100/30 transition-colors">
            {/* Header de propiedad */}
            <button
              onClick={() => setExpandedLocation(
                expandedLocation === property.location_id ? null : property.location_id
              )}
              className="w-full text-left flex items-center justify-between"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-red-600">{property.total_rooms_out}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-red-900 truncate">{property.location_name}</h4>
                  <div className="text-xs text-red-600/70 space-x-2">
                    <span>Tarifa: ${property.nightly_rate}/noche</span>
                    <span>•</span>
                    <span className="font-semibold">Pérdida: ${property.totalLostRevenue.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              {expandedLocation === property.location_id ? (
                <ChevronUp className="w-5 h-5 text-red-600 flex-shrink-0" />
              ) : (
                <ChevronDown className="w-5 h-5 text-red-600 flex-shrink-0" />
              )}
            </button>

            {/* Detalles expandidos */}
            {expandedLocation === property.location_id && (
              <div className="mt-4 space-y-3 pt-4 border-t border-red-200">
                {/* Tabla de habitaciones fuera de servicio */}
                <div className="bg-white rounded-lg border border-red-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-red-100">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-red-900">Habitación</th>
                        <th className="px-3 py-2 text-left font-semibold text-red-900">Estado</th>
                        <th className="px-3 py-2 text-center font-semibold text-red-900">Antigüedad</th>
                        <th className="px-3 py-2 text-right font-semibold text-red-900">Pérdida</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-200">
                      {property.rooms.map(room => (
                        <tr key={room.id} className="hover:bg-red-50">
                          <td className="px-3 py-2">
                            <div className="font-semibold text-red-900">#{room.number}</div>
                            <div className="text-xs text-red-600/60">Piso {room.floor}</div>
                          </td>
                          <td className="px-3 py-2">
                            <span className={`inline-block px-2 py-1 text-xs rounded font-semibold ${
                              room.status === 'bloqueada'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-orange-100 text-orange-700'
                            }`}>
                              {room.status === 'bloqueada' ? 'Bloqueada' : 'Mantenimiento'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <div className="font-semibold text-red-900">{room.daysOut}d</div>
                            <div className="text-xs text-red-600/60">{room.hoursOut}h</div>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="font-bold text-red-600">${room.lostRevenue.toLocaleString()}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Campo de explicación y botón de notificación */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-red-900">
                    Mensaje para el gerente (opcional):
                  </label>
                  <textarea
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    placeholder="Ej: Solicitar explicación sobre la demora en resolución..."
                    className="w-full px-3 py-2 text-sm border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                    rows={2}
                  />
                  <button
                    onClick={() => handleNotify(property.location_id, property.location_name)}
                    disabled={notifying === property.location_id}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    {notifying === property.location_id ? 'Enviando...' : 'Enviar Notificación al Gerente'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
