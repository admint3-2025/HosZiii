import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import RoomBoardClient from './ui/RoomBoardClient';

export const metadata = {
  title: 'Tablero de Habitaciones | ZIII HoS',
  description: 'Vista consolidada del estado operativo de habitaciones en todas las propiedades',
};

// Definición de propiedades
const PROPERTIES = [
  {
    id: 'microtel-gdl-sur',
    name: 'Microtel Guadalajara Sur',
    brand: 'Microtel Inn & Suites by Wyndham',
    totalRooms: 120,
    totalFloors: 6,
    location: 'Guadalajara, Jalisco',
    code: 'MGDLS',
  },
  {
    id: 'microtel-irapuato',
    name: 'Microtel Irapuato',
    brand: 'Microtel Inn & Suites by Wyndham',
    totalRooms: 120,
    totalFloors: 6,
    location: 'Irapuato, Guanajuato',
    code: 'MIRA',
  },
  {
    id: 'microtel-slp',
    name: 'Microtel S.L.P.',
    brand: 'Microtel Inn & Suites by Wyndham',
    totalRooms: 120,
    totalFloors: 6,
    location: 'San Luis Potosí',
    code: 'MSLP',
  },
  {
    id: 'encore-aguascalientes',
    name: 'Ramada Encore Aguascalientes',
    brand: 'Ramada Encore By Wyndham',
    totalRooms: 138,
    totalFloors: 7,
    location: 'Aguascalientes',
    code: 'EAGS',
  },
  {
    id: 'encore-gdl-aeropuerto',
    name: 'Ramada Encore Guadalajara Aeropuerto',
    brand: 'Ramada Encore by Wyndham',
    totalRooms: 148,
    totalFloors: 7,
    location: 'Guadalajara, Jalisco',
    code: 'EAPTO',
  },
  {
    id: 'encore-monterrey',
    name: 'Ramada Encore Monterrey Apodaca',
    brand: 'Ramada Encore by Wyndham',
    totalRooms: 148,
    totalFloors: 7,
    location: 'Monterrey, Nuevo León',
    code: 'EMTY',
  },
  {
    id: 'encore-puebla',
    name: 'Ramada Encore Puebla',
    brand: 'Ramada Encore by Wyndham',
    totalRooms: 138,
    totalFloors: 7,
    location: 'Puebla',
    code: 'EPUE',
  },
  {
    id: 'encore-gdl-sur',
    name: 'Ramada Encore Guadalajara Sur',
    brand: 'Ramada Encore',
    totalRooms: 135,
    totalFloors: 6,
    location: 'Guadalajara, Jalisco',
    code: 'EGDLS',
  },
  {
    id: 'encore-queretaro',
    name: 'Ramada Encore Querétaro',
    brand: 'Ramada Encore',
    totalRooms: 138,
    totalFloors: 7,
    location: 'Querétaro',
    code: 'EQRO',
  },
  {
    id: 'encore-slp',
    name: 'Ramada Encore San Luis Potosí',
    brand: 'Ramada Encore',
    totalRooms: 138,
    totalFloors: 7,
    location: 'San Luis Potosí',
    code: 'ESLP',
  },
];

type RoomStatus = 'disponible' | 'ocupada' | 'sucia' | 'limpieza' | 'mantenimiento' | 'bloqueada';

// Generar datos de ejemplo para habitaciones
function generateRoomData(propertyId: string, totalRooms: number, totalFloors: number) {
  const statuses: RoomStatus[] = ['disponible', 'ocupada', 'sucia', 'limpieza', 'mantenimiento', 'bloqueada'];
  const statusWeights = [0.3, 0.35, 0.15, 0.1, 0.05, 0.05]; // Probabilidades

  const roomsPerFloor = Math.ceil(totalRooms / totalFloors);
  const rooms = [];
  
  for (let i = 1; i <= totalRooms; i++) {
    const rand = Math.random();
    let accumulated = 0;
    let status: RoomStatus = 'disponible';
    
    for (let j = 0; j < statusWeights.length; j++) {
      accumulated += statusWeights[j];
      if (rand < accumulated) {
        status = statuses[j];
        break;
      }
    }

    const roomNumber = i.toString().padStart(3, '0');
    const floor = Math.min(Math.floor((i - 1) / roomsPerFloor) + 1, totalFloors);
    
    rooms.push({
      id: `${propertyId}-${roomNumber}`,
      number: roomNumber,
      floor,
      status,
      lastCleaning: status === 'limpieza' ? new Date() : new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
      hasIncident: Math.random() < 0.05, // 5% tienen incidencia
      notes: Math.random() < 0.1 ? 'Requiere atención especial' : null,
    });
  }

  return rooms;
}

export default async function RoomBoardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Generar datos de habitaciones para cada propiedad
  const propertiesWithRooms = PROPERTIES.map(property => ({
    ...property,
    rooms: generateRoomData(property.id, property.totalRooms, property.totalFloors),
  }));

  // Calcular estadísticas por propiedad
  const propertiesWithStats = propertiesWithRooms.map(property => {
    const stats = {
      disponible: 0,
      ocupada: 0,
      sucia: 0,
      limpieza: 0,
      mantenimiento: 0,
      bloqueada: 0,
      incidencias: 0,
    };

    property.rooms.forEach(room => {
      stats[room.status as keyof typeof stats]++;
      if (room.hasIncident) stats.incidencias++;
    });

    return {
      ...property,
      stats,
    };
  });

  return (
    <RoomBoardClient
      properties={propertiesWithStats}
    />
  );
}
