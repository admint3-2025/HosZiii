/**
 * POST /api/housekeeping/room-status
 * Cambiar estado de una habitación (llama a la RPC hk_change_room_status)
 * Body: { room_id, new_status, notes? }
 */
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
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
  if (!profile || !['admin', 'supervisor', 'corporate_admin'].includes(profile.role))
    return new Response('Forbidden', { status: 403 })

  let body: any
  try {
    body = await request.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const { room_id, new_status, notes } = body || {}
  if (!room_id || !new_status) return new Response('room_id y new_status requeridos', { status: 400 })

  const validStatuses = ['limpia', 'sucia', 'en_limpieza', 'mantenimiento', 'inspeccion', 'bloqueada']
  if (!validStatuses.includes(new_status)) return new Response('Estado inválido', { status: 400 })

  const admin = createSupabaseAdminClient()

  // Use RPC for transactional status change
  const { error } = await admin.rpc('hk_change_room_status', {
    p_room_id: room_id,
    p_new_status: new_status,
    p_notes: notes || null,
  })

  if (error) return new Response(error.message, { status: 500 })

  return Response.json({ ok: true })
}
