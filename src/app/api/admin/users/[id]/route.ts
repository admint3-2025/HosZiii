import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

type Role =
  | 'requester'
  | 'agent_l1'
  | 'agent_l2'
  | 'supervisor'
  | 'auditor'
  | 'admin'

type HubModuleId = 'it-helpdesk' | 'mantenimiento' | 'corporativo' | 'academia' | 'politicas' | 'ama-de-llaves' | 'administracion' | 'planificacion'
type ModuleAccess = 'user' | 'supervisor'
type HubModules = Record<HubModuleId, ModuleAccess | false>

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
  const keys: HubModuleId[] = ['it-helpdesk', 'mantenimiento', 'corporativo', 'academia', 'politicas', 'ama-de-llaves', 'administracion', 'planificacion']
  const result: Partial<HubModules> = {}
  for (const key of keys) {
    const v = key === 'planificacion' ? (obj.planificacion ?? obj.ops) : obj[key]
    if (v === undefined) continue
    if (v === 'supervisor') result[key] = 'supervisor'
    else if (v === 'user' || v === true) result[key] = 'user'
    else if (v === false) result[key] = false
    else return null
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
    role === 'admin'
  )
}

type AdminClient = ReturnType<typeof createSupabaseAdminClient>

function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message ?? 'Unknown error')
  }
  return 'Unknown error'
}

function isMissingDbObjectError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase()
  return (
    message.includes('does not exist') ||
    message.includes('schema cache') ||
    message.includes('could not find')
  )
}

async function safeUpdate(
  admin: AdminClient,
  tableName: string,
  matchColumn: string,
  matchValue: string,
  values: Record<string, unknown>,
) {
  try {
    const { error } = await (admin as any).from(tableName).update(values).eq(matchColumn, matchValue)
    if (error && !isMissingDbObjectError(error)) {
      throw new Error(`${tableName}.${matchColumn}: ${getErrorMessage(error)}`)
    }
  } catch (error) {
    if (!isMissingDbObjectError(error)) throw error
  }
}

async function safeDelete(
  admin: AdminClient,
  tableName: string,
  matchColumn: string,
  matchValue: string,
) {
  try {
    const { error } = await (admin as any).from(tableName).delete().eq(matchColumn, matchValue)
    if (error && !isMissingDbObjectError(error)) {
      throw new Error(`${tableName}.${matchColumn}: ${getErrorMessage(error)}`)
    }
  } catch (error) {
    if (!isMissingDbObjectError(error)) throw error
  }
}

async function annotateCommentBodies(
  admin: AdminClient,
  tableName: string,
  authorColumn: string,
  authorId: string,
  descriptor: string,
) {
  try {
    const { data, error } = await (admin as any)
      .from(tableName)
      .select('id,body')
      .eq(authorColumn, authorId)

    if (error) {
      if (isMissingDbObjectError(error)) return
      throw new Error(`${tableName}.${authorColumn}: ${getErrorMessage(error)}`)
    }

    for (const row of data ?? []) {
      const body = typeof row.body === 'string' ? row.body : ''
      if (body.startsWith(`[${descriptor}]`)) continue

      const nextBody = body.trim().length > 0 ? `[${descriptor}]\n\n${body}` : `[${descriptor}]`
      const { error: updateError } = await (admin as any)
        .from(tableName)
        .update({ body: nextBody })
        .eq('id', row.id)

      if (updateError && !isMissingDbObjectError(updateError)) {
        throw new Error(`${tableName}.body: ${getErrorMessage(updateError)}`)
      }
    }
  } catch (error) {
    if (!isMissingDbObjectError(error)) throw error
  }
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

  if (body?.is_corporate !== undefined) {
    const nextRole = body?.role
    updates.is_corporate = nextRole && nextRole !== 'supervisor' ? false : Boolean(body.is_corporate)
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
        is_corporate: body?.is_corporate,
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

  if (id === user.id) {
    return new Response('No puedes hacer hard reset de tu propio usuario desde el panel.', { status: 400 })
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdminLike = profile?.role === 'admin'
  if (!isAdminLike) return new Response('Forbidden', { status: 403 })

  const admin = createSupabaseAdminClient()

  // Verificar que el usuario a eliminar existe
  const { data: targetUserData, error: getUserError } = await admin.auth.admin.getUserById(id)
  const targetUser = targetUserData?.user
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
    .select('role, full_name')
    .eq('id', id)
    .single()

  const isTargetAdmin = targetProfile?.role === 'admin'

  if (isTargetAdmin && adminCount <= 1) {
    return new Response('No se puede eliminar el único usuario administrador del sistema', { status: 400 })
  }

  const targetFullName =
    targetProfile?.role && typeof (targetProfile as any)?.full_name === 'string'
      ? String((targetProfile as any).full_name).trim()
      : ''
  const targetLabel =
    targetFullName ||
    String(targetUser.user_metadata?.full_name ?? '').trim() ||
    targetUser.email ||
    `usuario-${id.slice(0, 8)}`
  const deletionDescriptor = `Usuario eliminado: ${targetLabel}${targetUser.email ? ` <${targetUser.email}>` : ''}`

  try {
    await annotateCommentBodies(admin, 'ticket_comments', 'author_id', id, deletionDescriptor)
    await annotateCommentBodies(admin, 'maintenance_ticket_comments', 'author_id', id, deletionDescriptor)

    await safeDelete(admin, 'login_audits', 'user_id', id)
    await safeDelete(admin, 'policy_acknowledgments', 'user_id', id)
    await safeDelete(admin, 'user_telegram_chat_ids', 'user_id', id)
    await safeDelete(admin, 'knowledge_base_usage', 'used_by', id)
    await safeDelete(admin, 'academy_quiz_attempts', 'user_id', id)
    await safeDelete(admin, 'academy_progress', 'user_id', id)
    await safeDelete(admin, 'academy_enrollments', 'user_id', id)
    await safeDelete(admin, 'academy_bookmarks', 'user_id', id)
    await safeDelete(admin, 'academy_certificates', 'user_id', id)
    await safeDelete(admin, 'hk_staff', 'profile_id', id)
    await safeDelete(admin, 'user_locations', 'user_id', id)
    await safeDelete(admin, 'notifications', 'user_id', id)

    await safeUpdate(admin, 'notifications', 'actor_id', id, { actor_id: user.id })
    await safeUpdate(admin, 'user_locations', 'created_by', id, { created_by: user.id })
    await safeUpdate(admin, 'academy_enrollments', 'enrolled_by', id, { enrolled_by: user.id })
    await safeUpdate(admin, 'academy_certificates', 'issued_by_id', id, { issued_by_id: user.id })
    await safeUpdate(admin, 'academy_courses', 'created_by', id, { created_by: user.id })
    await safeUpdate(admin, 'hk_rooms', 'assigned_to', id, { assigned_to: null })
    await safeUpdate(admin, 'hk_room_status_log', 'changed_by', id, { changed_by: user.id })

    await safeUpdate(admin, 'tickets', 'requester_id', id, { requester_id: user.id })
    await safeUpdate(admin, 'tickets', 'assigned_agent_id', id, { assigned_agent_id: null })
    await safeUpdate(admin, 'tickets', 'closed_by', id, { closed_by: user.id })
    await safeUpdate(admin, 'tickets', 'deleted_by', id, { deleted_by: user.id })
    await safeUpdate(admin, 'ticket_comments', 'author_id', id, { author_id: user.id })
    await safeUpdate(admin, 'ticket_attachments', 'uploaded_by', id, { uploaded_by: user.id })
    await safeUpdate(admin, 'ticket_attachments', 'deleted_by', id, { deleted_by: user.id })
    await safeUpdate(admin, 'ticket_status_history', 'actor_id', id, { actor_id: user.id })

    await safeUpdate(admin, 'tickets_it', 'requester_id', id, { requester_id: user.id })
    await safeUpdate(admin, 'tickets_it', 'assigned_agent_id', id, { assigned_agent_id: null })
    await safeUpdate(admin, 'tickets_it', 'created_by', id, { created_by: user.id })
    await safeUpdate(admin, 'tickets_maintenance', 'requester_id', id, { requester_id: user.id })
    await safeUpdate(admin, 'tickets_maintenance', 'assigned_agent_id', id, { assigned_agent_id: null })
    await safeUpdate(admin, 'tickets_maintenance', 'created_by', id, { created_by: user.id })
    await safeUpdate(admin, 'maintenance_ticket_comments', 'author_id', id, { author_id: user.id })
    await safeUpdate(admin, 'ticket_comments_it', 'created_by', id, { created_by: user.id })
    await safeUpdate(admin, 'ticket_comments_maintenance', 'created_by', id, { created_by: user.id })
    await safeUpdate(admin, 'ticket_attachments_it', 'uploaded_by', id, { uploaded_by: user.id })
    await safeUpdate(admin, 'ticket_attachments_maintenance', 'uploaded_by', id, { uploaded_by: user.id })

    await safeUpdate(admin, 'audit_log', 'actor_id', id, { actor_id: user.id })
    await safeUpdate(admin, 'asset_changes', 'changed_by', id, { changed_by: user.id })
    await safeUpdate(admin, 'asset_assignment_changes', 'changed_by', id, { changed_by: user.id })
    await safeUpdate(admin, 'asset_assignment_changes', 'from_user_id', id, { from_user_id: user.id })
    await safeUpdate(admin, 'asset_assignment_changes', 'to_user_id', id, { to_user_id: user.id })
    await safeUpdate(admin, 'assets_it', 'assigned_to_user_id', id, { assigned_to_user_id: null })
    await safeUpdate(admin, 'assets_it', 'created_by', id, { created_by: user.id })
    await safeUpdate(admin, 'assets_maintenance', 'assigned_to_user_id', id, { assigned_to_user_id: null })
    await safeUpdate(admin, 'assets_maintenance', 'created_by', id, { created_by: user.id })
    await safeUpdate(admin, 'asset_disposal_requests', 'requested_by', id, { requested_by: user.id })
    await safeUpdate(admin, 'asset_disposal_requests', 'reviewed_by', id, { reviewed_by: user.id })
    await safeUpdate(admin, 'asset_processors', 'created_by', id, { created_by: user.id })
    await safeUpdate(admin, 'asset_operating_systems', 'created_by', id, { created_by: user.id })
    await safeUpdate(admin, 'asset_custom_types', 'created_by', id, { created_by: user.id })
    await safeUpdate(admin, 'departments', 'created_by', id, { created_by: user.id })
    await safeUpdate(admin, 'brands', 'created_by', id, { created_by: user.id })
    await safeUpdate(admin, 'job_positions', 'created_by', id, { created_by: user.id })
    await safeUpdate(admin, 'policies', 'created_by', id, { created_by: user.id })
    await safeUpdate(admin, 'policies', 'updated_by', id, { updated_by: user.id })
    await safeUpdate(admin, 'knowledge_base_articles', 'created_by', id, { created_by: user.id })
    await safeUpdate(admin, 'knowledge_base_articles', 'approved_by', id, { approved_by: user.id })
    await safeUpdate(admin, 'knowledge_base_articles', 'deleted_by', id, { deleted_by: user.id })
    await safeUpdate(admin, 'knowledge_base_suggestions', 'reviewed_by', id, { reviewed_by: user.id })
    await safeUpdate(admin, 'inspections_rrhh', 'inspector_user_id', id, { inspector_user_id: user.id })
    await safeUpdate(admin, 'inspections_rrhh', 'approved_by_user_id', id, { approved_by_user_id: user.id })
    await safeUpdate(admin, 'inspections_rrhh_deletion_log', 'deleted_by_user_id', id, { deleted_by_user_id: user.id })
    await safeUpdate(admin, 'inspections_gsh', 'inspector_user_id', id, { inspector_user_id: user.id })
    await safeUpdate(admin, 'inspections_gsh', 'approved_by_user_id', id, { approved_by_user_id: user.id })
    await safeUpdate(admin, 'inspections_gsh', 'deleted_by_user_id', id, { deleted_by_user_id: user.id })
    await safeUpdate(admin, 'profiles', 'supervisor_id', id, { supervisor_id: null })

    const { error: deleteProfileError } = await admin.from('profiles').delete().eq('id', id)
    if (deleteProfileError && !isMissingDbObjectError(deleteProfileError)) {
      throw new Error(`profiles.id: ${getErrorMessage(deleteProfileError)}`)
    }

    const { error: deleteAuthError } = await admin.auth.admin.deleteUser(id)
    if (deleteAuthError) {
      throw new Error(deleteAuthError.message)
    }
  } catch (error) {
    return new Response(`Error al hacer hard reset del usuario: ${getErrorMessage(error)}`, { status: 400 })
  }

  await admin.from('audit_log').insert({
    entity_type: 'user',
    entity_id: id,
    action: 'DELETE',
    actor_id: user.id,
    metadata: {
      hard_delete: true,
      target_email: targetUser.email,
      target_label: targetLabel,
      replacement_admin_id: user.id,
      comment_descriptor: deletionDescriptor,
    },
  })

  return new Response('Hard reset completado')
}
