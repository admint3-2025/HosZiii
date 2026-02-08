import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

type Role =
  | 'requester'
  | 'agent_l1'
  | 'agent_l2'
  | 'supervisor'
  | 'auditor'
  | 'corporate_admin'
  | 'admin'

type HubModuleId = 'it-helpdesk' | 'mantenimiento' | 'corporativo' | 'academia' | 'administracion'
type HubModules = Record<HubModuleId, boolean>

function isMissingHubModulesColumnError(err: unknown): boolean {
  const msg = (err as any)?.message
  if (typeof msg !== 'string') return false
  const msgLower = msg.toLowerCase()
  // Catch both "does not exist" and "could not find the ... column ... in the schema cache"
  return msgLower.includes('hub_visible_modules') && 
         (msgLower.includes('does not exist') || msgLower.includes('schema cache'))
}

function parseHubModules(value: unknown): HubModules | null {
  if (!value || typeof value !== 'object') return null
  const obj = value as Record<string, unknown>
  const keys: HubModuleId[] = ['it-helpdesk', 'mantenimiento', 'corporativo', 'academia', 'administracion']
  const result: Partial<HubModules> = {}
  for (const key of keys) {
    if (obj[key] === undefined) continue
    if (typeof obj[key] !== 'boolean') return null
    result[key] = obj[key] as boolean
  }
  if (Object.keys(result).length === 0) return null
  return result as HubModules
}

function isValidRole(role: unknown): role is Role {
  return (
    role === 'requester' ||
    role === 'agent_l1' ||
    role === 'agent_l2' ||
    role === 'supervisor' ||
    role === 'auditor' ||
    role === 'corporate_admin' ||
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
  const isAdminLike = profile?.role === 'admin'
  if (!isAdminLike) return new Response('Forbidden', { status: 403 })

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

  // Manejo de múltiples sedes
  if (body?.location_ids !== undefined) {
    const locationIds = Array.isArray(body.location_ids) 
      ? body.location_ids.filter((id: unknown) => typeof id === 'string') 
      : []
    
    // Guardar primera sede en profiles (retrocompatibilidad)
    updates.location_id = locationIds[0] || null
    
    // Actualizar user_locations (eliminar y reinsertar)
    await admin.from('user_locations').delete().eq('user_id', id)
    
    if (locationIds.length > 0) {
      const userLocations = locationIds.map((locId: string) => ({
        user_id: id,
        location_id: locId
      }))
      await admin.from('user_locations').insert(userLocations)
    }
  }

  if (body?.can_view_beo !== undefined) {
    updates.can_view_beo = Boolean(body.can_view_beo)
  }

  if (body?.can_manage_assets !== undefined) {
    updates.can_manage_assets = Boolean(body.can_manage_assets)
  }

  if (body?.is_it_supervisor !== undefined) {
    updates.is_it_supervisor = Boolean(body.is_it_supervisor)
  }

  if (body?.is_maintenance_supervisor !== undefined) {
    updates.is_maintenance_supervisor = Boolean(body.is_maintenance_supervisor)
  }

  if (body?.asset_category !== undefined) {
    const assetCategory = typeof body.asset_category === 'string' && body.asset_category.trim() !== '' 
      ? body.asset_category.trim() 
      : null
    updates.asset_category = assetCategory
  }

  if (body?.allowed_departments !== undefined) {
    const allowedDepartments = Array.isArray(body.allowed_departments) && body.allowed_departments.length > 0
      ? body.allowed_departments
      : null
    updates.allowed_departments = allowedDepartments
  }

  if (body?.hub_visible_modules !== undefined) {
    const hubModules = parseHubModules(body.hub_visible_modules)
    if (body.hub_visible_modules !== null && hubModules === null) {
      return new Response('Invalid hub_visible_modules', { status: 400 })
    }
    if (hubModules) {
      updates.hub_visible_modules = hubModules
    }
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await admin.from('profiles').update(updates).eq('id', id)
    if (error) {
      // Backward-compat: allow edits even if DB migration wasn't applied yet.
      if (updates.hub_visible_modules !== undefined && isMissingHubModulesColumnError(error)) {
        const { hub_visible_modules: _ignored, ...updatesWithoutHubModules } = updates
        const { error: retryErr } = await admin.from('profiles').update(updatesWithoutHubModules).eq('id', id)
        if (retryErr) return new Response(retryErr.message, { status: 400 })
      } else {
        return new Response(error.message, { status: 400 })
      }
    }
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
        location_ids: body?.location_ids,
        asset_category: body?.asset_category,
        can_view_beo: body?.can_view_beo,
        can_manage_assets: body?.can_manage_assets,
        hub_visible_modules: body?.hub_visible_modules,
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
  const isAdminLike = profile?.role === 'admin'
  if (!isAdminLike) return new Response('Forbidden', { status: 403 })

  const admin = createSupabaseAdminClient()

  // Verificar que el usuario a eliminar existe
  const { data: targetUser, error: getUserError } = await admin.auth.admin.getUserById(id)
  if (getUserError || !targetUser) {
    return new Response('Usuario no encontrado', { status: 404 })
  }

  // Verificar que no es el único admin
  const { data: adminProfiles, error: adminErr } = await admin
    .from('profiles')
    .select('id, role')
    .eq('role', 'admin')

  if (adminErr) {
    return new Response(adminErr.message, { status: 400 })
  }

  const adminCount = (adminProfiles ?? []).length
  const { data: targetProfile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', id)
    .single()

  const isTargetAdmin = targetProfile?.role === 'admin'

  if (isTargetAdmin && adminCount <= 1) {
    return new Response('No se puede eliminar el único usuario administrador del sistema', { status: 400 })
  }

  // Primero desactivamos el usuario en profiles
  await admin.from('profiles').update({ active: false }).eq('id', id)

  // Soft delete keeps records around in Auth for traceability
  const { error } = await admin.auth.admin.deleteUser(id, true)
  if (error) {
    return new Response(
      `Error al eliminar usuario: ${error.message}. Intenta primero desactivar el usuario.`, 
      { status: 400 }
    )
  }

  await admin.from('audit_log').insert({
    entity_type: 'user',
    entity_id: id,
    action: 'DELETE',
    actor_id: user.id,
    metadata: {
      soft_delete: true,
      target_email: targetUser.user.email,
    },
  })

  return new Response('OK')
}
