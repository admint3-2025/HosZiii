/**
 * POST /api/housekeeping/seed-rooms
 * Genera automáticamente las habitaciones para una sede hotelera
 * basándose en total_rooms y total_floors de la tabla locations.
 *
 * Body: { location_id: string, force?: boolean, room_types?: Record<string, number> }
 *
 * Si force=true, elimina TODAS las habitaciones existentes antes de generar.
 *
 * Distribución por defecto (Microtel-style):
 *   80% standard, 10% doble, 5% suite, 5% accesible
 *
 * Numeración: piso * 100 + secuencial → 101, 102, ..., 201, 202, ...
 * Nota: Hoteles marca "Encore" no tienen habitaciones en piso 1,
 *       por lo que la numeración comienza desde el piso 2.
 * No inserta duplicados (usa ON CONFLICT DO NOTHING).
 */
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || !['admin', 'corporate_admin'].includes(profile.role))
    return new Response('Solo administradores pueden generar habitaciones', { status: 403 })

  const body = await request.json().catch(() => ({}))
  const locationId = body.location_id
  if (!locationId) return new Response('location_id requerido', { status: 400 })

  const admin = createSupabaseAdminClient()

  // Obtener datos del hotel
  const { data: location, error: locErr } = await admin
    .from('locations')
    .select('id, name, business_type, total_rooms, total_floors, brand')
    .eq('id', locationId)
    .single()

  if (locErr || !location) return new Response('Sede no encontrada', { status: 404 })
  if (location.business_type !== 'hotel') return new Response('La sede no es de tipo hotel', { status: 400 })

  const totalRooms = location.total_rooms ?? 120
  const totalFloors = location.total_floors ?? 6

  if (totalRooms < 1 || totalFloors < 1)
    return new Response('total_rooms y total_floors deben ser > 0', { status: 400 })

  // Encore hotels: no rooms on floor 1 (lobby/amenities), rooms start on floor 2
  const isEncore = (location.brand ?? '').toLowerCase().includes('encore')
  const startFloor = isEncore ? 2 : 1
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

  // Distribución de tipos por defecto
  const roomsPerFloor = Math.ceil(totalRooms / totalFloors)
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
        status: 'sucia', // estado inicial
        is_active: true,
      })
      roomCount++
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
    message: `Se generaron ${totalCreated} habitaciones en ${totalFloors} pisos (pisos ${startFloor}–${endFloor}) para ${location.name}`,
    created: totalCreated,
    floors: totalFloors,
    startFloor,
    locationName: location.name,
  })
}
