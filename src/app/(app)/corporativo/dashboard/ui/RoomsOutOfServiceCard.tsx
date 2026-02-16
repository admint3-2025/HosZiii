'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Clock, DollarSign, Send, ChevronDown, ChevronUp, AlertCircle, Lightbulb, Users } from 'lucide-react'

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
  const totalLostRevenue = properties.reduce((sum, p) => sum + p.totalLostRevenue, 0)
  const maxAging = properties.flatMap(p => p.rooms).reduce((max, r) => Math.max(max, r.daysOut), 0)

  // Calcular severidad total
  const totalSeverity = properties.reduce((sum, p) => sum + p.severityScore, 0)

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border border-red-200 p-6 animate-pulse">
          <div className="h-8 bg-red-200 rounded w-2/3 mb-4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-red-100 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border border-red-200 p-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-red-900">No se pudo cargar el monitoreo</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <p className="text-xs text-red-600 mt-2">Revisa conexión a Supabase o permisos de acceso.</p>
          </div>
        </div>
      </div>
    )
  }

  if (properties.length === 0) {
    return (
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-300 p-8">
        <div className="flex items-center justify-center gap-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-emerald-900">¡Excelente Estado! 🎉</h3>
            <p className="text-emerald-700 mt-1">No hay habitaciones fuera de servicio</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="bg-gradient-to-r from-red-600 via-red-500 to-orange-500 rounded-xl p-1">
        <div className="bg-white rounded-lg p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-red-600" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Habitaciones Fuera de Servicio</h3>
                <p className="text-gray-600 text-sm mt-1">Monitoreo de impacto en ingresos</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-red-600">{totalRoomsOut}</div>
              <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-semibold">Habitaciones</p>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-4 gap-4">
            {/* Métrica 1: Ingresos Perdidos */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-red-600" />
                <span className="text-xs font-bold text-red-700 uppercase tracking-wide">Ingresos Perdidos</span>
              </div>
              <div className="text-2xl font-bold text-red-900">${(totalLostRevenue / 1000).toFixed(1)}K</div>
              <p className="text-xs text-red-600 mt-1">Días acumulados</p>
            </div>

            {/* Métrica 2: Mayor Antigüedad */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-orange-600" />
                <span className="text-xs font-bold text-orange-700 uppercase tracking-wide">Mayor Antigüedad</span>
              </div>
              <div className="text-2xl font-bold text-orange-900">{maxAging}d</div>
              <p className="text-xs text-orange-600 mt-1">Fuera de servicio</p>
            </div>

            {/* Métrica 3: Promedio por Habitación */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-5 h-5 text-amber-600" />
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">Pérdida Promedio</span>
              </div>
              <div className="text-2xl font-bold text-amber-900">${(totalLostRevenue / Math.max(totalRoomsOut, 1)).toFixed(0)}</div>
              <p className="text-xs text-amber-600 mt-1">Por habitación</p>
            </div>

            {/* Métrica 4: Propiedades Afectadas */}
            <div className="bg-gradient-to-br from-rose-50 to-rose-100 rounded-lg p-4 border border-rose-200">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-rose-600" />
                <span className="text-xs font-bold text-rose-700 uppercase tracking-wide">Propiedades</span>
              </div>
              <div className="text-2xl font-bold text-rose-900">{properties.length}</div>
              <p className="text-xs text-rose-600 mt-1">Con impacto</p>
            </div>
          </div>
        </div>
      </div>

      {/* Properties List */}
      <div className="space-y-3">
        {properties.map(property => (
          <div key={property.location_id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
            {/* Property Header */}
            <button
              onClick={() => setExpandedLocation(expandedLocation === property.location_id ? null : property.location_id)}
              className="w-full px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-150 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-white ${
                  property.total_rooms_out > 5 ? 'bg-gradient-to-br from-red-600 to-red-700' :
                  property.total_rooms_out > 2 ? 'bg-gradient-to-br from-orange-500 to-orange-600' :
                  'bg-gradient-to-br from-amber-500 to-amber-600'
                }`}>
                  {property.total_rooms_out}
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-gray-900 text-lg">{property.location_name}</h4>
                  <div className="flex gap-4 mt-1 text-sm">
                    <span className="text-gray-600">
                      <span className="font-semibold text-red-600">${property.totalLostRevenue.toLocaleString()}</span> en pérdidas
                    </span>
                    <span className="text-gray-600">
                      Tarifa: <span className="font-semibold">${property.nightly_rate}/noche</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Severity Indicator */}
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                  property.total_rooms_out > 5 ? 'bg-red-100 text-red-700' :
                  property.total_rooms_out > 2 ? 'bg-orange-100 text-orange-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {property.total_rooms_out > 5 ? '🔴 Crítico' : property.total_rooms_out > 2 ? '🟠 Alto' : '🟡 Medio'}
                </div>
                {expandedLocation === property.location_id ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </button>

            {/* Expanded Content */}
            {expandedLocation === property.location_id && (
              <div className="border-t border-gray-200 p-6 bg-gradient-to-b from-gray-50 to-white space-y-4">
                {/* Rooms Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-3 px-4 font-bold text-gray-700">Habitación</th>
                        <th className="text-left py-3 px-4 font-bold text-gray-700">Estado</th>
                        <th className="text-center py-3 px-4 font-bold text-gray-700">Antigüedad</th>
                        <th className="text-right py-3 px-4 font-bold text-gray-700">Pérdida Estimada</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {property.rooms.map(room => (
                        <tr key={room.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-gray-900">Habitación #{room.number}</div>
                            <div className="text-xs text-gray-500 mt-1">Piso {room.floor}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${
                              room.status === 'bloqueada'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-orange-100 text-orange-700'
                            }`}>
                              <span className={`w-2 h-2 rounded-full ${
                                room.status === 'bloqueada' ? 'bg-red-500' : 'bg-orange-500'
                              }`}></span>
                              {room.status === 'bloqueada' ? 'Bloqueada' : 'Mantenimiento'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="font-bold text-gray-900">{room.daysOut}d {room.hoursOut}h</div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="font-bold text-red-600">${room.lostRevenue.toLocaleString()}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Message Box & Action */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    <AlertCircle className="w-4 h-4 inline mr-2 text-blue-600" />
                    Mensaje para el gerente (opcional)
                  </label>
                  <textarea
                    value={messages[property.location_id] || ''}
                    onChange={(e) => setMessages(prev => ({ ...prev, [property.location_id]: e.target.value }))}
                    placeholder="Ej: Solicitar actualización sobre la demora en resolución y ETA de entrega..."
                    className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={2}
                  />
                  <button
                    onClick={() => handleNotify(property.location_id, property.location_name)}
                    disabled={notifying === property.location_id}
                    className="w-full mt-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-400 disabled:to-blue-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all transform hover:scale-105"
                  >
                    <Send className="w-5 h-5" />
                    {notifying === property.location_id ? 'Enviando Notificación...' : 'Enviar Notificación al Gerente'}
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
