'use client';

import { useState, useMemo } from 'react';

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

interface RoomDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property;
  getStatusColor: (status: string) => string;
  getStatusLabel: (status: string) => string;
}

export default function RoomDetailsModal({
  isOpen,
  onClose,
  property,
  getStatusColor,
  getStatusLabel,
}: RoomDetailsModalProps) {
  const [filterStatus, setFilterStatus] = useState<RoomStatus | 'all' | 'incidents'>('all');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  // Agrupar habitaciones por piso
  const roomsByFloor = useMemo(() => {
    const grouped: Record<number, Room[]> = {};
    property.rooms.forEach(room => {
      if (!grouped[room.floor]) {
        grouped[room.floor] = [];
      }
      grouped[room.floor].push(room);
    });
    return grouped;
  }, [property.rooms]);

  const floors = Object.keys(roomsByFloor)
    .map(Number)
    .sort((a, b) => b - a); // Ordenar de mayor a menor (piso más alto primero)

  // Filtrar habitaciones
  const filteredRooms = useMemo(() => {
    if (filterStatus === 'all') return property.rooms;
    if (filterStatus === 'incidents') return property.rooms.filter(r => r.hasIncident);
    return property.rooms.filter(r => r.status === filterStatus);
  }, [property.rooms, filterStatus]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span
                className={`text-xs font-bold px-2 py-1 rounded ${
                  property.brand.includes('Microtel')
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-purple-100 text-purple-700'
                }`}
              >
                {property.code}
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900">{property.name}</h2>
            </div>
            <p className="text-sm text-slate-500">{property.location || 'Sin ubicación'}</p>
            <p className="text-sm text-slate-600 mt-1">
              {property.rooms.length} habitaciones{property.totalRooms > 0 && property.rooms.length !== property.totalRooms ? ` de ${property.totalRooms}` : ''} • {floors.length} pisos
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 transition-colors p-2 hover:bg-slate-100 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                filterStatus === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              Todas ({property.rooms.length})
            </button>
            <button
              onClick={() => setFilterStatus('disponible')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                filterStatus === 'disponible'
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              Disponibles ({property.stats.disponible})
            </button>
            <button
              onClick={() => setFilterStatus('ocupada')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                filterStatus === 'ocupada'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              Ocupadas ({property.stats.ocupada})
            </button>
            <button
              onClick={() => setFilterStatus('sucia')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                filterStatus === 'sucia'
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              Sucias ({property.stats.sucia})
            </button>
            <button
              onClick={() => setFilterStatus('limpieza')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                filterStatus === 'limpieza'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              En Limpieza ({property.stats.limpieza})
            </button>
            <button
              onClick={() => setFilterStatus('mantenimiento')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                filterStatus === 'mantenimiento'
                  ? 'bg-orange-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              Mantenimiento ({property.stats.mantenimiento})
            </button>
            <button
              onClick={() => setFilterStatus('inspeccion')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                filterStatus === 'inspeccion'
                  ? 'bg-violet-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              Inspección ({property.stats.inspeccion})
            </button>
            <button
              onClick={() => setFilterStatus('incidents')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                filterStatus === 'incidents'
                  ? 'bg-red-700 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              🚨 Incidencias ({property.stats.incidencias})
            </button>
          </div>
        </div>

        {/* Room Matrix */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-8">
            {floors.map(floor => {
              const floorRooms = roomsByFloor[floor].filter(room =>
                filteredRooms.some(fr => fr.id === room.id)
              );

              if (floorRooms.length === 0) return null;

              return (
                <div key={floor}>
                  <div className="sticky top-0 bg-white z-10 pb-3 mb-4 border-b-2 border-slate-200">
                    <h3 className="text-lg font-bold text-slate-900">
                      Piso {floor}
                      <span className="ml-2 text-sm font-normal text-slate-500">
                        ({floorRooms.length} habitaciones)
                      </span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-15 xl:grid-cols-20 gap-2">
                    {floorRooms
                      .sort((a, b) => a.number.localeCompare(b.number))
                      .map(room => {
                        const isSelected = selectedRoom?.id === room.id;
                        return (
                          <button
                            key={room.id}
                            onClick={() => setSelectedRoom(room)}
                            className={`relative aspect-square rounded-lg border-2 transition-all ${
                              isSelected
                                ? 'border-slate-900 shadow-lg scale-110 z-20'
                                : 'border-transparent hover:border-slate-300 hover:shadow-md'
                            } ${getStatusColor(room.status)}`}
                            title={`${room.number} - ${getStatusLabel(room.status)}`}
                          >
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-1">
                              <span className="text-[10px] font-bold text-white drop-shadow-md">
                                {room.number}
                              </span>
                              {room.hasIncident && (
                                <span className="absolute top-0 right-0 w-2 h-2 bg-red-600 rounded-full border border-white"></span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Room Details Panel (si hay selección) */}
        {selectedRoom && (
          <div className="border-t border-slate-200 bg-slate-50 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-xl font-bold text-slate-900">Habitación {selectedRoom.number}</h3>
                  <span
                    className={`px-2 py-1 text-xs font-bold rounded text-white ${getStatusColor(
                      selectedRoom.status
                    )}`}
                  >
                    {getStatusLabel(selectedRoom.status)}
                  </span>
                  {selectedRoom.hasIncident && (
                    <span className="px-2 py-1 text-xs font-bold rounded bg-red-600 text-white">
                      🚨 {selectedRoom.incidents?.length || 1} Incidencia{(selectedRoom.incidents?.length || 1) > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Incident details */}
                {selectedRoom.incidents?.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {selectedRoom.incidents.map((inc, i) => (
                      <div key={i} className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            inc.source === 'it' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                            {inc.source === 'it' ? 'IT' : 'MANT'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-red-900">{inc.ticketNumber}</p>
                          <p className="text-xs text-red-700 truncate">{inc.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-red-500 font-medium">Estado: {inc.status}</span>
                            <span className="text-[10px] text-red-500 font-medium">Prioridad: {inc.priority}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Piso:</span>
                    <span className="ml-2 font-semibold text-slate-900">{selectedRoom.floor}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Última limpieza:</span>
                    <span className="ml-2 font-semibold text-slate-900">
                      {selectedRoom.lastCleaning ? new Date(selectedRoom.lastCleaning).toLocaleDateString('es-MX') : 'Sin registro'}
                    </span>
                  </div>
                  {selectedRoom.notes && (
                    <div className="col-span-2">
                      <span className="text-slate-500">Notas:</span>
                      <span className="ml-2 font-semibold text-slate-900">{selectedRoom.notes}</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => setSelectedRoom(null)}
                className="ml-4 text-slate-400 hover:text-slate-900"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
