'use client';

import { useState } from 'react';
import RoomDetailsModal from './RoomDetailsModal';

type RoomStatus = 'disponible' | 'ocupada' | 'sucia' | 'limpieza' | 'mantenimiento' | 'bloqueada';

interface Room {
  id: string;
  number: string;
  floor: number;
  status: RoomStatus;
  lastCleaning: Date;
  hasIncident: boolean;
  notes: string | null;
}

interface PropertyStats {
  disponible: number;
  ocupada: number;
  sucia: number;
  limpieza: number;
  mantenimiento: number;
  bloqueada: number;
  incidencias: number;
}

interface Property {
  id: string;
  name: string;
  brand: string;
  totalRooms: number;
  location: string;
  code: string;
  stats: PropertyStats;
}

interface PropertyWithRooms extends Property {
  rooms: Room[];
}

interface RoomBoardClientProps {
  properties: PropertyWithRooms[];
}

export default function RoomBoardClient({ properties }: RoomBoardClientProps) {
  const [selectedProperty, setSelectedProperty] = useState<PropertyWithRooms | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handlePropertyClick = (propertyId: string) => {
    const property = properties.find(p => p.id === propertyId);
    if (property) {
      setSelectedProperty(property);
      setIsModalOpen(true);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      disponible: 'bg-green-500',
      ocupada: 'bg-blue-500',
      sucia: 'bg-red-500',
      limpieza: 'bg-yellow-500',
      mantenimiento: 'bg-orange-500',
      bloqueada: 'bg-gray-500',
    };
    return colors[status] || 'bg-gray-400';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      disponible: 'Disponible',
      ocupada: 'Ocupada',
      sucia: 'Sucia',
      limpieza: 'En Limpieza',
      mantenimiento: 'Mantenimiento',
      bloqueada: 'Bloqueada',
    };
    return labels[status] || status;
  };

  // Calcular estadísticas globales
  const globalStats = properties.reduce(
    (acc, property) => {
      acc.disponible += property.stats.disponible;
      acc.ocupada += property.stats.ocupada;
      acc.sucia += property.stats.sucia;
      acc.limpieza += property.stats.limpieza;
      acc.mantenimiento += property.stats.mantenimiento;
      acc.bloqueada += property.stats.bloqueada;
      acc.incidencias += property.stats.incidencias;
      acc.total += property.totalRooms;
      return acc;
    },
    {
      disponible: 0,
      ocupada: 0,
      sucia: 0,
      limpieza: 0,
      mantenimiento: 0,
      bloqueada: 0,
      incidencias: 0,
      total: 0,
    }
  );

  const occupancyRate = ((globalStats.ocupada / globalStats.total) * 100).toFixed(1);

  return (
    <>
      <main className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Tablero de Habitaciones</h1>
          <p className="text-sm text-slate-500 font-medium">
            Vista consolidada del estado operativo de todas las propiedades
          </p>
        </div>

        {/* KPIs Globales */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="card">
            <div className="card-body p-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getStatusColor('disponible')}`}></div>
                <div className="text-xs font-medium text-slate-500">Disponibles</div>
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{globalStats.disponible}</div>
            </div>
          </div>

          <div className="card">
            <div className="card-body p-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getStatusColor('ocupada')}`}></div>
                <div className="text-xs font-medium text-slate-500">Ocupadas</div>
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{globalStats.ocupada}</div>
              <div className="text-xs text-slate-500 mt-1">{occupancyRate}% ocupación</div>
            </div>
          </div>

          <div className="card">
            <div className="card-body p-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getStatusColor('sucia')}`}></div>
                <div className="text-xs font-medium text-slate-500">Sucias</div>
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{globalStats.sucia}</div>
            </div>
          </div>

          <div className="card">
            <div className="card-body p-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getStatusColor('limpieza')}`}></div>
                <div className="text-xs font-medium text-slate-500">En Limpieza</div>
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{globalStats.limpieza}</div>
            </div>
          </div>

          <div className="card">
            <div className="card-body p-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getStatusColor('mantenimiento')}`}></div>
                <div className="text-xs font-medium text-slate-500">Mantenimiento</div>
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{globalStats.mantenimiento}</div>
            </div>
          </div>

          <div className="card">
            <div className="card-body p-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-600"></div>
                <div className="text-xs font-medium text-slate-500">Incidencias</div>
              </div>
              <div className="mt-2 text-2xl font-bold text-red-600">{globalStats.incidencias}</div>
            </div>
          </div>
        </div>

        {/* Grid de Propiedades */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Propiedades ({properties.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {properties.map(property => {
              const occupancy = ((property.stats.ocupada / property.totalRooms) * 100).toFixed(0);
              const needsAttention = property.stats.sucia + property.stats.mantenimiento + property.stats.incidencias;

              return (
                <button
                  key={property.id}
                  onClick={() => handlePropertyClick(property.id)}
                  className="card hover:shadow-lg transition-all duration-200 hover:scale-[1.02] text-left w-full"
                >
                  <div className="card-body p-4">
                    {/* Brand Badge */}
                    <div className="flex items-start justify-between mb-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          property.brand.includes('Microtel')
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {property.code}
                      </span>
                      {needsAttention > 0 && (
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                      )}
                    </div>

                    {/* Property Name */}
                    <h3 className="text-sm font-bold text-slate-900 mb-1 line-clamp-2">
                      {property.name}
                    </h3>
                    <p className="text-xs text-slate-500 mb-3">{property.location}</p>

                    {/* Stats Mini Grid */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div>
                        <div className="text-xs text-slate-500">Total</div>
                        <div className="text-sm font-bold text-slate-900">{property.totalRooms}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Ocupación</div>
                        <div className="text-sm font-bold text-blue-600">{occupancy}%</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Atención</div>
                        <div className="text-sm font-bold text-orange-600">{needsAttention}</div>
                      </div>
                    </div>

                    {/* Status Mini Bars */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor('disponible')}`}></div>
                        <span className="text-slate-600 flex-1">Disponible</span>
                        <span className="font-semibold text-slate-900">{property.stats.disponible}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor('sucia')}`}></div>
                        <span className="text-slate-600 flex-1">Sucia</span>
                        <span className="font-semibold text-slate-900">{property.stats.sucia}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor('limpieza')}`}></div>
                        <span className="text-slate-600 flex-1">Limpieza</span>
                        <span className="font-semibold text-slate-900">{property.stats.limpieza}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </main>

      {/* Modal de Detalle */}
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
