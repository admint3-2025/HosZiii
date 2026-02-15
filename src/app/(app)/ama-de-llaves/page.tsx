import { createSupabaseServerClient, getSafeServerUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HousekeepingDashboard from './ui/HousekeepingDashboard'

export const metadata = {
  title: 'Ama de Llaves | ZIII HoS',
  description: 'Dashboard operativo de Housekeeping',
}

export const dynamic = 'force-dynamic'

// ---------- tipos de demo ----------
type RoomStatus = 'limpia' | 'sucia' | 'en_limpieza' | 'mantenimiento' | 'inspeccion' | 'bloqueada'

interface Room {
  id: string
  number: string
  floor: number
  status: RoomStatus
  assignedTo: string | null
  lastCleaned: string | null
  hasIncident: boolean
  notes: string | null
  type: 'standard' | 'suite' | 'doble'
}

interface Staff {
  id: string
  name: string
  avatar: string
  status: 'activo' | 'descanso' | 'inactivo'
  roomsAssigned: number
  roomsCleaned: number
  avgMinutes: number
}

interface InventoryItem {
  id: string
  name: string
  category: 'amenidad' | 'blancos' | 'limpieza'
  stock: number
  minStock: number
  unit: string
}

// ---------- generadores de datos ----------
function generateRooms(): Room[] {
  const statuses: RoomStatus[] = ['limpia', 'sucia', 'en_limpieza', 'mantenimiento', 'inspeccion', 'bloqueada']
  const weights = [0.30, 0.30, 0.15, 0.08, 0.10, 0.07]
  const types: Room['type'][] = ['standard', 'standard', 'standard', 'doble', 'doble', 'suite']
  const staffNames = ['María G.', 'Rosa L.', 'Ana P.', 'Carmen S.', 'Lucía R.', 'Elena M.']

  const rooms: Room[] = []
  const totalFloors = 6
  const roomsPerFloor = 20

  for (let f = 1; f <= totalFloors; f++) {
    for (let r = 1; r <= roomsPerFloor; r++) {
      const rand = Math.random()
      let acc = 0
      let status: RoomStatus = 'limpia'
      for (let i = 0; i < weights.length; i++) {
        acc += weights[i]
        if (rand < acc) { status = statuses[i]; break }
      }

      const roomNum = `${f}${r.toString().padStart(2, '0')}`
      rooms.push({
        id: `room-${roomNum}`,
        number: roomNum,
        floor: f,
        status,
        assignedTo: status === 'en_limpieza' ? staffNames[Math.floor(Math.random() * staffNames.length)] : null,
        lastCleaned: status === 'limpia' ? new Date(Date.now() - Math.random() * 3600000 * 4).toISOString() : null,
        hasIncident: Math.random() < 0.05,
        notes: Math.random() < 0.08 ? 'Requiere atención especial' : null,
        type: types[Math.floor(Math.random() * types.length)],
      })
    }
  }
  return rooms
}

function generateStaff(): Staff[] {
  const names = [
    { name: 'María González', avatar: 'MG' },
    { name: 'Rosa López', avatar: 'RL' },
    { name: 'Ana Pérez', avatar: 'AP' },
    { name: 'Carmen Sánchez', avatar: 'CS' },
    { name: 'Lucía Ramírez', avatar: 'LR' },
    { name: 'Elena Mendoza', avatar: 'EM' },
    { name: 'Patricia Torres', avatar: 'PT' },
    { name: 'Sofía Hernández', avatar: 'SH' },
  ]

  return names.map((s, i) => ({
    id: `staff-${i + 1}`,
    name: s.name,
    avatar: s.avatar,
    status: i < 6 ? 'activo' : (i === 6 ? 'descanso' : 'inactivo') as Staff['status'],
    roomsAssigned: Math.floor(Math.random() * 8) + 8,
    roomsCleaned: Math.floor(Math.random() * 10) + 2,
    avgMinutes: Math.floor(Math.random() * 10) + 18,
  }))
}

function generateInventory(): InventoryItem[] {
  return [
    { id: 'inv-1', name: 'Champú (botella 30ml)', category: 'amenidad', stock: 450, minStock: 200, unit: 'pzas' },
    { id: 'inv-2', name: 'Jabón barra', category: 'amenidad', stock: 380, minStock: 150, unit: 'pzas' },
    { id: 'inv-3', name: 'Acondicionador (30ml)', category: 'amenidad', stock: 120, minStock: 200, unit: 'pzas' },
    { id: 'inv-4', name: 'Crema corporal (30ml)', category: 'amenidad', stock: 310, minStock: 150, unit: 'pzas' },
    { id: 'inv-5', name: 'Kit dental', category: 'amenidad', stock: 90, minStock: 100, unit: 'pzas' },
    { id: 'inv-6', name: 'Toallas de baño', category: 'blancos', stock: 280, minStock: 120, unit: 'pzas' },
    { id: 'inv-7', name: 'Toallas de mano', category: 'blancos', stock: 350, minStock: 120, unit: 'pzas' },
    { id: 'inv-8', name: 'Sábanas King', category: 'blancos', stock: 95, minStock: 80, unit: 'juegos' },
    { id: 'inv-9', name: 'Sábanas Queen', category: 'blancos', stock: 65, minStock: 80, unit: 'juegos' },
    { id: 'inv-10', name: 'Fundas de almohada', category: 'blancos', stock: 200, minStock: 100, unit: 'pzas' },
    { id: 'inv-11', name: 'Multiusos líquido', category: 'limpieza', stock: 24, minStock: 10, unit: 'litros' },
    { id: 'inv-12', name: 'Desinfectante', category: 'limpieza', stock: 8, minStock: 10, unit: 'litros' },
    { id: 'inv-13', name: 'Cloro', category: 'limpieza', stock: 15, minStock: 8, unit: 'litros' },
    { id: 'inv-14', name: 'Limpiavidrios', category: 'limpieza', stock: 6, minStock: 5, unit: 'litros' },
  ]
}

export default async function HousekeepingPage() {
  const user = await getSafeServerUser()
  if (!user) redirect('/login')

  const supabase = await createSupabaseServerClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, location_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const rooms = generateRooms()
  const staff = generateStaff()
  const inventory = generateInventory()

  return (
    <HousekeepingDashboard
      rooms={rooms}
      staff={staff}
      inventory={inventory}
      userName={profile.full_name || 'Usuario'}
    />
  )
}
