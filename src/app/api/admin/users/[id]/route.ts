import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

type Role = 'requester' | 'agent_l1' | 'agent_l2' | 'supervisor' | 'auditor' | 'admin'

function isValidRole(role: unknown): role is Role {
  return (
    role === 'requester' ||
    role === 'agent_l1' ||
    role === 'agent_l2' ||
    role === 'supervisor' ||
    role === 'auditor' ||
    role === 'admin'
  )
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  if (body?.full_name !== undefined) {
    const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : ''
    updates.full_name = fullName || null

    // Keep metadata roughly in sync
    await admin.auth.admin.updateUserById(id, {
      user_metadata: fullName ? { full_name: fullName } : {},
    })
  }

  if (body?.role !== undefined) {
    if (!isValidRole(body.role)) return new Response('Invalid role', { status: 400 })
    updates.role = body.role
  }

  if (body?.department !== undefined) {
    const department = typeof body.department === 'string' ? body.department.trim() : ''
    updates.department = department || null
  }

  if (body?.phone !== undefined) {
    const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
    updates.phone = phone || null
  }

  if (body?.building !== undefined) {
    const building = typeof body.building === 'string' ? body.building.trim() : ''
    updates.building = building || null
  }

  if (body?.floor !== undefined) {
    const floor = typeof body.floor === 'string' ? body.floor.trim() : ''
    updates.floor = floor || null
  }

  if (body?.position !== undefined) {
    const position = typeof body.position === 'string' ? body.position.trim() : ''
    updates.position = position || null
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await admin.from('profiles').update(updates).eq('id', id)
    if (error) return new Response(error.message, { status: 400 })
  }

  if (body?.active !== undefined) {
    const active = Boolean(body.active)
    const ban_duration: string | 'none' = active ? 'none' : '876000h'
    const { error } = await admin.auth.admin.updateUserById(id, { ban_duration })
    if (error) return new Response(error.message, { status: 400 })
  }

  await admin.from('audit_log').insert({
    entity_type: 'user',
    entity_id: id,
    action: 'UPDATE',
    actor_id: user.id,
    metadata: {
      updates: {
        full_name: body?.full_name,
        role: body?.role,
        department: body?.department,
        phone: body?.phone,
        building: body?.building,
        floor: body?.floor,
        position: body?.position,
        active: body?.active,
      },
    },
  })

  return new Response('OK')
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return new Response('Forbidden', { status: 403 })

  const admin = createSupabaseAdminClient()

  // Soft delete keeps records around in Auth for traceability
  const { error } = await admin.auth.admin.deleteUser(id, true)
  if (error) return new Response(error.message, { status: 400 })

  await admin.from('audit_log').insert({
    entity_type: 'user',
    entity_id: id,
    action: 'DELETE',
    actor_id: user.id,
    metadata: {
      soft_delete: true,
    },
  })

  return new Response('OK')
}
