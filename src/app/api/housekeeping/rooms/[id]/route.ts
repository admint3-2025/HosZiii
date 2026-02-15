/**
 * /api/housekeeping/rooms/[id]
 *
 * PATCH – Actualizar una habitación (type, floor, number, status, notes)
 * DELETE – Desactivar (soft delete) una habitación
 */
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'

const VALID_TYPES = ['standard', 'doble', 'suite', 'accesible', 'conectada'] as const
const VALID_STATUSES = ['limpia', 'sucia', 'en_limpieza', 'mantenimiento', 'inspeccion', 'bloqueada'] as const

async function authorize(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'corporate_admin'].includes(profile.role)) return null
  return user
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient()
  const user = await authorize(supabase)
  if (!user) return Response.json({ error: 'Sin permisos' }, { status: 403 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))

  // Build update object with only provided fields
  const update: Record<string, unknown> = {}

  if (body.number !== undefined) update.number = String(body.number).trim()
  if (body.floor !== undefined) update.floor = Number(body.floor)
  if (body.room_type !== undefined) {
    if (!VALID_TYPES.includes(body.room_type))
      return Response.json({ error: `Tipo inválido. Válidos: ${VALID_TYPES.join(', ')}` }, { status: 400 })
    update.room_type = body.room_type
  }
  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status))
      return Response.json({ error: `Estado inválido. Válidos: ${VALID_STATUSES.join(', ')}` }, { status: 400 })
    update.status = body.status
  }
  if (body.notes !== undefined) update.notes = body.notes || null
  if (body.is_active !== undefined) update.is_active = Boolean(body.is_active)

  if (Object.keys(update).length === 0)
    return Response.json({ error: 'Nada que actualizar' }, { status: 400 })

  const admin = createSupabaseAdminClient()

  const { data, error } = await admin
    .from('hk_rooms')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return Response.json({ error: `Ya existe una habitación con ese número en esta sede` }, { status: 409 })
    }
    return Response.json({ error: error.message }, { status: 500 })
  }

  if (!data) return Response.json({ error: 'Habitación no encontrada' }, { status: 404 })

  return Response.json({ success: true, room: data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient()
  const user = await authorize(supabase)
  if (!user) return Response.json({ error: 'Sin permisos' }, { status: 403 })

  const { id } = await params
  const admin = createSupabaseAdminClient()

  // Soft-delete: set is_active = false
  const { error } = await admin
    .from('hk_rooms')
    .update({ is_active: false })
    .eq('id', id)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ success: true })
}
