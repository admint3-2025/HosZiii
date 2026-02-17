/**
 * POST /api/housekeeping/seed-rooms
 * Genera automáticamente las habitaciones para una sede hotelera.
 *
 * Usa configuraciones DEFINITIVAS por sede (HOTEL_ROOM_CONFIGS) cuando existen.
 * Para sedes sin config explícita usa el algoritmo genérico basado en
 * total_rooms y total_floors de la tabla locations.
 *
 * Body: { location_id: string, force?: boolean, room_types?: Record<string, number> }
 *
 * Si force=true, elimina TODAS las habitaciones existentes antes de generar.
 * No inserta duplicados (usa ON CONFLICT DO NOTHING).
 */
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'

// ─── Configuraciones DEFINITIVAS de habitaciones por sede hotelera ───────────
// Cada entrada define los pisos y rangos exactos de habitaciones.
// floor: número de piso
// from/to: rango de numeración inclusivo (ej. 201–231 = habitaciones 201,202,...,231)
// type (opcional): tipo de habitación para ese rango; si no se indica, se usa 'standard'

type FloorRange = { floor: number; from: number; to: number; type?: string }
type HotelRoomConfig = { floors: FloorRange[]; totalRooms: number; totalFloors: number; startFloor: number }

const HOTEL_ROOM_CONFIGS: Record<string, HotelRoomConfig> = {
  // ── EGDLS – Encore Guadalajara Sur ─────────────────────────────────
  // 5 pisos operativos (2-6), 135 habitaciones total
  // Numeración validada con formato COD-151 rev 12/02/19
  // Piso 2: habitaciones específicas (22)
  // Pisos 3-6: x01-x31 excepto x16, x26, x28 (28 por piso)
  EGDLS: {
    totalRooms: 135,
    totalFloors: 5,
    startFloor: 2,
    floors: [
      // Piso 2: solo habitaciones específicas
      { floor: 2, from: 202, to: 202 },
      { floor: 2, from: 204, to: 213 },
      { floor: 2, from: 215, to: 215 },
      { floor: 2, from: 218, to: 218 },
      { floor: 2, from: 220, to: 220 },
      { floor: 2, from: 222, to: 225 },
      { floor: 2, from: 227, to: 227 },
      { floor: 2, from: 229, to: 231 },
      // Pisos 3-6: x01-x31 excepto x16, x26, x28
      { floor: 3, from: 301, to: 315 },
      { floor: 3, from: 317, to: 325 },
      { floor: 3, from: 327, to: 327 },
      { floor: 3, from: 329, to: 331 },
      { floor: 4, from: 401, to: 415 },
      { floor: 4, from: 417, to: 425 },
      { floor: 4, from: 427, to: 427 },
      { floor: 4, from: 429, to: 431 },
      { floor: 5, from: 501, to: 515 },
      { floor: 5, from: 517, to: 525 },
      { floor: 5, from: 527, to: 527 },
      { floor: 5, from: 529, to: 531 },
      { floor: 6, from: 601, to: 615 },
      { floor: 6, from: 617, to: 625 },
      { floor: 6, from: 627, to: 627 },
      { floor: 6, from: 629, to: 631 },
    ],
  },
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_corporate')
    .eq('id', user.id)
    .single()
  // Solo admin o supervisor corporativo pueden crear habitaciones de prueba
  if (!profile || !(profile.role === 'admin' || (profile.role === 'supervisor' && profile.is_corporate)))
    return new Response('Solo admin o supervisor corporativo pueden generar habitaciones', { status: 403 })

  const body = await request.json().catch(() => ({}))
  const locationId = body.location_id
  if (!locationId) return new Response('location_id requerido', { status: 400 })

  const admin = createSupabaseAdminClient()

  // Obtener datos del hotel (incluye code para buscar config definitiva)
  const { data: location, error: locErr } = await admin
    .from('locations')
    .select('id, name, code, business_type, total_rooms, total_floors, brand')
    .eq('id', locationId)
    .single()

  if (locErr || !location) return new Response('Sede no encontrada', { status: 404 })
  if (location.business_type !== 'hotel') return new Response('La sede no es de tipo hotel', { status: 400 })

  // ── Determinar si hay config DEFINITIVA para esta sede ──
  const locCode = (location.code ?? '').toUpperCase()
  const definitive = HOTEL_ROOM_CONFIGS[locCode] ?? null
  const usingDefinitive = definitive !== null

  // Valores efectivos
  const totalRooms = definitive?.totalRooms ?? location.total_rooms ?? 120
  const totalFloors = definitive?.totalFloors ?? location.total_floors ?? 6

  if (totalRooms < 1 || totalFloors < 1)
    return new Response('total_rooms y total_floors deben ser > 0', { status: 400 })

  // Para sedes sin config definitiva: lógica genérica
  const isEncore = (location.brand ?? '').toLowerCase().includes('encore')
  const startFloor = definitive?.startFloor ?? (isEncore ? 2 : 1)
  const endFloor = startFloor + totalFloors - 1

  // Si force=true, eliminar todas las habitaciones existentes antes de regenerar
  const force = body.force === true

  const { count: existingCount } = await admin
    .from('hk_rooms')
    .select('id', { count: 'exact', head: true })
    .eq('location_id', locationId)

  if ((existingCount ?? 0) > 0) {
    if (!force) {
      return Response.json({
        success: false,
        message: `Ya existen ${existingCount} habitaciones. Usa force=true para regenerar desde cero.`,
        created: 0,
        existing: existingCount,
      })
    }

    // Borrar todas las habitaciones de esta sede
    const { error: delErr } = await admin
      .from('hk_rooms')
      .delete()
      .eq('location_id', locationId)

    if (delErr) {
      console.error('[seed-rooms] Error borrando habitaciones:', delErr)
      return new Response(`Error eliminando habitaciones existentes: ${delErr.message}`, { status: 500 })
    }
  }

  // Distribución de tipos por defecto (para algoritmo genérico)
  const typeDistribution = body.room_types ?? {
    standard: 0.80,
    doble: 0.10,
    suite: 0.05,
    accesible: 0.05,
  }

  // Generar filas
  const rows: {
    location_id: string
    number: string
    floor: number
    room_type: string
    status: string
    is_active: boolean
  }[] = []

  if (usingDefinitive) {
    // ── Config DEFINITIVA: usar rangos exactos de habitaciones ──
    for (const range of definitive!.floors) {
      for (let num = range.from; num <= range.to; num++) {
        rows.push({
          location_id: locationId,
          number: String(num),
          floor: range.floor,
          room_type: range.type ?? 'standard',
          status: 'sucia',
          is_active: true,
        })
      }
    }
  } else {
    // ── Algoritmo genérico: piso × 100 + secuencial ──
    const roomsPerFloor = Math.ceil(totalRooms / totalFloors)
    let roomCount = 0

    for (let floor = startFloor; floor <= endFloor && roomCount < totalRooms; floor++) {
      const roomsThisFloor = Math.min(roomsPerFloor, totalRooms - roomCount)

      for (let seq = 1; seq <= roomsThisFloor; seq++) {
        const roomNumber = String(floor * 100 + seq)

        // Determinar tipo según distribución porcentual
        const position = seq / roomsThisFloor
        let roomType = 'standard'
        let cumulative = 0
        for (const [type, pct] of Object.entries(typeDistribution) as [string, number][]) {
          cumulative += pct
          if (position <= cumulative) {
            roomType = type
            break
          }
        }

        rows.push({
          location_id: locationId,
          number: roomNumber,
          floor,
          room_type: roomType,
          status: 'sucia',
          is_active: true,
        })
        roomCount++
      }
    }
  }

  // Insertar en lotes de 100 (Supabase tiene límite por request)
  let totalCreated = 0
  const batchSize = 100

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const { data, error } = await admin
      .from('hk_rooms')
      .upsert(batch, { onConflict: 'location_id,number', ignoreDuplicates: true })
      .select('id')

    if (error) {
      console.error(`[seed-rooms] Error en batch ${i / batchSize + 1}:`, error)
      return new Response(`Error insertando habitaciones: ${error.message}`, { status: 500 })
    }

    totalCreated += (data?.length ?? 0)
  }

  return Response.json({
    success: true,
    message: `Se generaron ${totalCreated} habitaciones en ${totalFloors} pisos (pisos ${startFloor}–${endFloor}) para ${location.name}${usingDefinitive ? ' [config definitiva]' : ''}`,
    created: totalCreated,
    floors: totalFloors,
    startFloor,
    locationName: location.name,
    configUsed: usingDefinitive ? locCode : 'generic',
  })
}
