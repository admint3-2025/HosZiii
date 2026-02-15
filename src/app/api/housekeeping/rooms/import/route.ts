/**
 * POST /api/housekeeping/rooms/import
 *
 * Importación masiva de habitaciones desde un array JSON.
 * Body: { location_id: string, rooms: Array<{ number, floor, room_type?, status?, notes? }> }
 *
 * - Valida cada fila
 * - Usa upsert con ON CONFLICT DO NOTHING para ignorar duplicados
 * - Devuelve conteo de creadas y omitidas
 */
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'

const VALID_TYPES = ['standard', 'doble', 'suite', 'accesible', 'conectada'] as const
const VALID_STATUSES = ['limpia', 'sucia', 'en_limpieza', 'mantenimiento', 'inspeccion', 'bloqueada'] as const
type RoomType = typeof VALID_TYPES[number]
type RoomStatus = typeof VALID_STATUSES[number]

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || !['admin', 'corporate_admin'].includes(profile.role))
    return Response.json({ error: 'Sin permisos' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const { location_id, rooms } = body

  if (!location_id)
    return Response.json({ error: 'location_id requerido' }, { status: 400 })
  if (!Array.isArray(rooms) || rooms.length === 0)
    return Response.json({ error: 'Se requiere un array "rooms" con al menos un elemento' }, { status: 400 })
  if (rooms.length > 2000)
    return Response.json({ error: 'Máximo 2000 habitaciones por importación' }, { status: 400 })

  // Validate each row
  const errors: string[] = []
  const validRows: {
    location_id: string
    number: string
    floor: number
    room_type: RoomType
    status: RoomStatus
    notes: string | null
    is_active: boolean
  }[] = []

  rooms.forEach((r: any, idx: number) => {
    const rowNum = idx + 1
    if (!r.number) { errors.push(`Fila ${rowNum}: número requerido`); return }
    if (r.floor === undefined || r.floor === null || isNaN(Number(r.floor))) { errors.push(`Fila ${rowNum}: piso requerido`); return }

    const roomType: RoomType = r.room_type && VALID_TYPES.includes(r.room_type) ? r.room_type : 'standard'
    const roomStatus: RoomStatus = r.status && VALID_STATUSES.includes(r.status) ? r.status : 'sucia'

    if (r.room_type && !VALID_TYPES.includes(r.room_type)) {
      errors.push(`Fila ${rowNum}: tipo "${r.room_type}" inválido. Válidos: ${VALID_TYPES.join(', ')}`)
      return
    }

    validRows.push({
      location_id,
      number: String(r.number).trim(),
      floor: Number(r.floor),
      room_type: roomType,
      status: roomStatus,
      notes: r.notes ? String(r.notes).trim() : null,
      is_active: true,
    })
  })

  if (errors.length > 0 && validRows.length === 0) {
    return Response.json({ error: 'Todas las filas tienen errores', details: errors }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()

  // Insert in batches
  let totalCreated = 0
  const batchSize = 100

  for (let i = 0; i < validRows.length; i += batchSize) {
    const batch = validRows.slice(i, i + batchSize)
    const { data, error } = await admin
      .from('hk_rooms')
      .upsert(batch, { onConflict: 'location_id,number', ignoreDuplicates: true })
      .select('id')

    if (error) {
      return Response.json({
        error: `Error en lote ${Math.floor(i / batchSize) + 1}: ${error.message}`,
        created_so_far: totalCreated,
      }, { status: 500 })
    }

    totalCreated += (data?.length ?? 0)
  }

  const skipped = validRows.length - totalCreated

  return Response.json({
    success: true,
    message: `${totalCreated} habitaciones creadas${skipped > 0 ? `, ${skipped} omitidas (ya existían)` : ''}${errors.length > 0 ? `. ${errors.length} filas con errores.` : ''}`,
    created: totalCreated,
    skipped,
    validationErrors: errors.length > 0 ? errors : undefined,
    total_submitted: rooms.length,
  })
}
