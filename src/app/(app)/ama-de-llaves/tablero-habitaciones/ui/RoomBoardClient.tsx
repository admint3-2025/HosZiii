'use client';

import { useState, useEffect, useCallback } from 'react';
import RoomDetailsModal from './RoomDetailsModal';

// ──── Types ────
type RoomStatus = 'disponible' | 'ocupada' | 'sucia' | 'limpieza' | 'mantenimiento' | 'inspeccion' | 'bloqueada';

interface RoomIncidentInfo {
  ticketNumber: string;
  title: string;
  source: 'it' | 'maintenance';
  status: string;
  priority: string;
}

interface Room {
  id: string;
  number: string;
  floor: number;
  status: RoomStatus;
  roomType: string;
  hasIncident: boolean;
  incidents: RoomIncidentInfo[];
  notes: string | null;
  lastCleaning: string | null;
}

interface PropertyStats {
  disponible: number;
  ocupada: number;
  sucia: number;
  limpieza: number;
  mantenimiento: number;
  inspeccion: number;
  bloqueada: number;
  incidencias: number;
}

interface Property {
  id: string;
  name: string;
  brand: string;
  totalRooms: number;
  totalFloors: number;
  location: string | null;
  code: string;
  stats: PropertyStats;
  rooms: Room[];
  hasRooms: boolean;
}

// ──── Helpers ────
const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  disponible: { color: 'bg-green-500', label: 'Disponible' },
  ocupada: { color: 'bg-blue-500', label: 'Ocupada' },
  sucia: { color: 'bg-red-500', label: 'Sucia' },
  limpieza: { color: 'bg-yellow-500', label: 'En Limpieza' },
  mantenimiento: { color: 'bg-orange-500', label: 'Mantenimiento' },
  inspeccion: { color: 'bg-violet-500', label: 'Inspección' },
  bloqueada: { color: 'bg-gray-500', label: 'Bloqueada' },
};

function getStatusColor(status: string) {
  return STATUS_CONFIG[status]?.color || 'bg-gray-400';
}

function getStatusLabel(status: string) {
  return STATUS_CONFIG[status]?.label || status;
}

// ──── Component ────
export default function RoomBoardClient() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/housekeeping/board');
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setProperties(json.properties ?? []);
      setLastRefresh(new Date());
    } catch (e: any) {
      setError(e?.message || 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePropertyClick = (propertyId: string) => {
    const property = properties.find(p => p.id === propertyId);
    if (property) {
      setSelectedProperty(property);
      setIsModalOpen(true);
    }
  };

  // Global stats
  const globalStats = properties.reduce(
    (acc, property) => {
      acc.disponible += property.stats.disponible;
      acc.ocupada += property.stats.ocupada;
      acc.sucia += property.stats.sucia;
      acc.limpieza += property.stats.limpieza;
      acc.mantenimiento += property.stats.mantenimiento;
      acc.inspeccion += property.stats.inspeccion;
      acc.bloqueada += property.stats.bloqueada;
      acc.incidencias += property.stats.incidencias;
      acc.total += property.totalRooms;
      acc.registered += property.rooms.length;
      return acc;
    },
    { disponible: 0, ocupada: 0, sucia: 0, limpieza: 0, mantenimiento: 0, inspeccion: 0, bloqueada: 0, incidencias: 0, total: 0, registered: 0 }
  );

  const occupancyRate = globalStats.registered > 0
    ? ((globalStats.ocupada / globalStats.registered) * 100).toFixed(1)
    : '0.0';

  // Loading state
  if (loading) {
    return (
      <main className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Cargando tablero de habitaciones…</p>
        </div>
      </main>
    );
  }

  // Error state
  if (error) {
    return (
      <main className="p-6">
        <div className="card border-red-200 bg-red-50">
          <div className="card-body p-6 text-center">
            <p className="text-sm text-red-700 mb-3">{error}</p>
            <button onClick={fetchData} className="btn btn-primary text-sm">Reintentar</button>
          </div>
        </div>
      </main>
    );
  }

  // No properties
  if (properties.length === 0) {
    return (
      <main className="p-6">
        <div className="card">
          <div className="card-body p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Sin propiedades hoteleras</h3>
            <p className="text-sm text-slate-500">No hay sedes de tipo &quot;Hotel&quot; configuradas.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Tablero de Habitaciones</h1>
            <p className="text-sm text-slate-500 font-medium">
              Vista consolidada del estado operativo de todas las propiedades
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400">
              Actualizado: {lastRefresh.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <button
              onClick={fetchData}
              disabled={loading}
              className="btn btn-secondary gap-1.5 text-sm"
              title="Actualizar datos"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualizar
            </button>
          </div>
        </div>

        {/* KPIs Globales */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
          {[
            { key: 'disponible', label: 'Disponibles', value: globalStats.disponible },
            { key: 'ocupada', label: 'Ocupadas', value: globalStats.ocupada, sub: `${occupancyRate}% ocupación` },
            { key: 'sucia', label: 'Sucias', value: globalStats.sucia },
            { key: 'limpieza', label: 'En Limpieza', value: globalStats.limpieza },
            { key: 'mantenimiento', label: 'Mantenimiento', value: globalStats.mantenimiento },
            { key: 'inspeccion', label: 'Inspección', value: globalStats.inspeccion },
            { key: 'bloqueada', label: 'Bloqueadas', value: globalStats.bloqueada },
          ].map(kpi => (
            <div key={kpi.key} className="card">
              <div className="card-body p-4">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(kpi.key)}`} />
                  <div className="text-xs font-medium text-slate-500">{kpi.label}</div>
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{kpi.value}</div>
                {kpi.sub && <div className="text-xs text-slate-500 mt-1">{kpi.sub}</div>}
              </div>
            </div>
          ))}
        </div>

        {/* Incidencias alert with details */}
        {globalStats.incidencias > 0 && (() => {
          // Collect all incidents across properties
          const allIncidents = properties.flatMap(p =>
            p.rooms.filter(r => r.incidents?.length > 0).flatMap(r =>
              r.incidents.map(inc => ({ ...inc, roomNumber: r.number, propertyName: p.name }))
            )
          )
          return (
            <div className="card border-red-200 bg-red-50/50">
              <div className="card-body p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-sm font-semibold text-red-700">
                    {globalStats.incidencias} incidencia{globalStats.incidencias !== 1 ? 's' : ''} activa{globalStats.incidencias !== 1 ? 's' : ''} en total
                  </span>
                </div>
                {allIncidents.length > 0 && (
                  <div className="space-y-1 ml-5">
                    {allIncidents.slice(0, 5).map((inc, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${
                          inc.source === 'it' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {inc.source === 'it' ? 'IT' : 'MANT'}
                        </span>
                        <span className="font-semibold text-red-800">{inc.ticketNumber}</span>
                        <span className="text-red-600 truncate">{inc.title}</span>
                        <span className="text-red-400 flex-shrink-0">— Hab. {inc.roomNumber} ({inc.propertyName})</span>
                      </div>
                    ))}
                    {allIncidents.length > 5 && (
                      <p className="text-[10px] text-red-500">y {allIncidents.length - 5} más…</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {/* Properties without rooms warning */}
        {properties.some(p => !p.hasRooms) && (
          <div className="card border-amber-200 bg-amber-50/50">
            <div className="card-body p-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs text-amber-700">
                {properties.filter(p => !p.hasRooms).length} propiedad(es) sin habitaciones registradas.
                Carga las habitaciones desde <span className="font-bold">Dashboard → Gestión</span> o importa un CSV.
              </span>
            </div>
          </div>
        )}

        {/* Properties Grid */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Propiedades ({properties.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {properties.map(property => {
              const registered = property.rooms.length;
              const occupancy = registered > 0 ? ((property.stats.ocupada / registered) * 100).toFixed(0) : '—';
              const needsAttention = property.stats.sucia + property.stats.mantenimiento + property.stats.incidencias;

              return (
                <button
                  key={property.id}
                  onClick={() => handlePropertyClick(property.id)}
                  className={`card hover:shadow-lg transition-all duration-200 hover:scale-[1.02] text-left w-full ${!property.hasRooms ? 'opacity-60' : ''}`}
                >
                  <div className="card-body p-4">
                    {/* Brand Badge */}
                    <div className="flex items-start justify-between mb-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          property.brand.toLowerCase().includes('microtel')
                            ? 'bg-blue-100 text-blue-700'
                            : property.brand.toLowerCase().includes('ramada')
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {property.code || '—'}
                      </span>
                      {needsAttention > 0 && (
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      )}
                    </div>

                    {/* Property Name */}
                    <h3 className="text-sm font-bold text-slate-900 mb-1 line-clamp-2">{property.name}</h3>
                    <p className="text-xs text-slate-500 mb-3">{property.location || 'Sin ubicación'}</p>

                    {/* Stats Mini Grid */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div>
                        <div className="text-xs text-slate-500">Total</div>
                        <div className="text-sm font-bold text-slate-900">
                          {registered}
                          {property.totalRooms > 0 && registered !== property.totalRooms && (
                            <span className="text-[10px] text-slate-400 font-normal">/{property.totalRooms}</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Ocupación</div>
                        <div className="text-sm font-bold text-blue-600">{occupancy}{occupancy !== '—' ? '%' : ''}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Atención</div>
                        <div className={`text-sm font-bold ${needsAttention > 0 ? 'text-orange-600' : 'text-slate-400'}`}>{needsAttention}</div>
                      </div>
                    </div>

                    {/* Status Mini Bars */}
                    {property.hasRooms ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor('disponible')}`} />
                          <span className="text-slate-600 flex-1">Disponible</span>
                          <span className="font-semibold text-slate-900">{property.stats.disponible}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor('sucia')}`} />
                          <span className="text-slate-600 flex-1">Sucia</span>
                          <span className="font-semibold text-slate-900">{property.stats.sucia}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor('limpieza')}`} />
                          <span className="text-slate-600 flex-1">Limpieza</span>
                          <span className="font-semibold text-slate-900">{property.stats.limpieza}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-amber-600 font-medium italic">Sin habitaciones cargadas</p>
                    )}

                    {/* Incident summary in card */}
                    {property.stats.incidencias > 0 && (() => {
                      const cardIncidents = property.rooms
                        .filter(r => r.incidents?.length > 0)
                        .flatMap(r => r.incidents.map(inc => ({ ...inc, roomNumber: r.number })))
                      return (
                        <div className="mt-2 pt-2 border-t border-red-100">
                          <div className="flex items-center gap-1 mb-1">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-[10px] font-bold text-red-700">
                              {property.stats.incidencias} incidencia{property.stats.incidencias !== 1 ? 's' : ''}
                            </span>
                          </div>
                          {cardIncidents.slice(0, 2).map((inc, i) => (
                            <p key={i} className="text-[9px] text-red-600 truncate">
                              <span className={`inline-block px-0.5 rounded mr-0.5 font-bold ${
                                inc.source === 'it' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                              }`}>
                                {inc.source === 'it' ? 'IT' : 'M'}
                              </span>
                              Hab. {inc.roomNumber}: {inc.title}
                            </p>
                          ))}
                          {cardIncidents.length > 2 && (
                            <p className="text-[8px] text-red-400">+{cardIncidents.length - 2} más</p>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </main>

      {/* Modal */}
      {selectedProperty && (
        <RoomDetailsModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          property={selectedProperty}
          getStatusColor={getStatusColor}
          getStatusLabel={getStatusLabel}
        />
      )}
    </>
  );
}
