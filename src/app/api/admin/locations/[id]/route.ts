import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return new Response('Forbidden', { status: 403 })

  let body: any
  try {
    body = await request.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const admin = createSupabaseAdminClient()

  const updates: Record<string, any> = {}

  if (body?.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) return new Response('Nombre no puede estar vacío', { status: 400 })
    updates.name = name
  }

  if (body?.code !== undefined) {
    const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : ''
    if (!code) return new Response('Código no puede estar vacío', { status: 400 })
    updates.code = code
  }

  if (body?.business_type !== undefined) {
    const validTypes = ['hotel', 'corporate', 'office', 'warehouse', 'other']
    if (validTypes.includes(body.business_type)) {
      updates.business_type = body.business_type
    }
  }

  if (body?.city !== undefined) {
    updates.city = typeof body.city === 'string' ? body.city.trim() || null : null
  }

  if (body?.state !== undefined) {
    updates.state = typeof body.state === 'string' ? body.state.trim() || null : null
  }

  if (body?.country !== undefined) {
    updates.country = typeof body.country === 'string' ? body.country.trim() || null : null
  }

  if (body?.address !== undefined) {
    updates.address = typeof body.address === 'string' ? body.address.trim() || null : null
  }

  if (body?.phone !== undefined) {
    updates.phone = typeof body.phone === 'string' ? body.phone.trim() || null : null
  }

  if (body?.email !== undefined) {
    updates.email = typeof body.email === 'string' ? body.email.trim() || null : null
  }

  if (body?.manager_name !== undefined) {
    updates.manager_name = typeof body.manager_name === 'string' ? body.manager_name.trim() || null : null
  }

  if (body?.total_rooms !== undefined) {
    updates.total_rooms = typeof body.total_rooms === 'number' && body.total_rooms > 0 ? body.total_rooms : null
  }

  if (body?.total_floors !== undefined) {
    updates.total_floors = typeof body.total_floors === 'number' && body.total_floors > 0 ? body.total_floors : null
  }

  if (body?.brand !== undefined) {
    updates.brand = typeof body.brand === 'string' ? body.brand.trim() || null : null
  }

  if (body?.is_active !== undefined) {
    updates.is_active = Boolean(body.is_active)
  }

  if (Object.keys(updates).length > 0) {
    updates.updated_at = new Date().toISOString()

    const { error } = await admin.from('locations').update(updates).eq('id', id)
    if (error) return new Response(error.message, { status: 400 })
  }

  await admin.from('audit_log').insert({
    entity_type: 'location',
    entity_id: id,
    action: 'UPDATE',
    actor_id: user.id,
    metadata: { updates },
  })

  return new Response('OK')
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return new Response('Forbidden', { status: 403 })

  const admin = createSupabaseAdminClient()

  // Verificar que no tenga usuarios o tickets asociados
  const { data: profileCount } = await admin.from('profiles').select('id', { count: 'exact', head: true }).eq('location_id', id)
  const { data: ticketCount } = await admin.from('tickets').select('id', { count: 'exact', head: true }).eq('location_id', id)

  if ((profileCount as any)?.count > 0 || (ticketCount as any)?.count > 0) {
    return new Response('No se puede eliminar: tiene usuarios o tickets asociados', { status: 400 })
  }

  const { error } = await admin.from('locations').delete().eq('id', id)
  if (error) return new Response(error.message, { status: 400 })

  await admin.from('audit_log').insert({
    entity_type: 'location',
    entity_id: id,
    action: 'DELETE',
    actor_id: user.id,
    metadata: {},
  })

  return new Response('OK')
}
