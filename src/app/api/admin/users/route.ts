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
  // If empty object, treat as null (DB default applies)
  if (Object.keys(result).length === 0) return null
  return result as HubModules
}

function isValidEmail(email: unknown): email is string {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
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

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdminLike = profile?.role === 'admin'
  if (!isAdminLike) return new Response('Forbidden', { status: 403 })

  const admin = createSupabaseAdminClient()

  const { data: listed, error: listErr } = await admin.auth.admin.listUsers({ perPage: 200 })
  if (listErr) return new Response(listErr.message, { status: 500 })

  const authUsers = listed.users ?? []
  const ids = authUsers.map((u) => u.id)

  const { data: profiles, error: profErr } = await admin
    .from('profiles')
    // Select only essential columns that exist in all DB versions
    .select(`
      id, role, full_name, department, phone, building, floor, position,
      supervisor_id, location_id, asset_category, allowed_departments,
      can_view_beo, can_manage_assets, is_it_supervisor, is_maintenance_supervisor,
      hub_visible_modules,
      locations(code,name)
    `)
    .in('id', ids)

  if (profErr) return new Response(profErr.message, { status: 500 })

  // Cargar todas las ubicaciones activas
  const { data: locations } = await admin
    .from('locations')
    .select('id,name,code')
    .eq('is_active', true)
    .order('name')

  // Cargar sedes de user_locations para cada usuario
  const { data: userLocations, error: userLocsErr } = await admin
    .from('user_locations')
    .select('user_id,location_id,locations(code,name)')
    .in('user_id', ids)
  
  if (userLocsErr) {
    console.error('Error cargando user_locations:', userLocsErr)
  }

  // Crear mapa de sedes por usuario
  const userLocationsMap = new Map<string, Array<{code: string, name: string}>>()
  if (userLocations) {
    for (const ul of userLocations) {
      if (!userLocationsMap.has(ul.user_id)) {
        userLocationsMap.set(ul.user_id, [])
      }
      const loc = (ul as any).locations
      if (loc?.code) {
        userLocationsMap.get(ul.user_id)!.push({ code: loc.code, name: loc.name })
      }
    }
  }

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))

  const users = authUsers.map((u) => {
    const p = profileMap.get(u.id) as any
    let userLocs = userLocationsMap.get(u.id) || []
    
    // Fallback: si no hay sedes en user_locations, usar location_id del profile
    if (userLocs.length === 0 && p?.location_id) {
      const locationData = locations?.find(loc => loc.id === p.location_id)
      if (locationData) {
        userLocs = [{ code: locationData.code, name: locationData.name }]
      }
    }
    
    return {
      id: u.id,
      email: (u as any).email ?? null,
      created_at: (u as any).created_at ?? null,
      last_sign_in_at: (u as any).last_sign_in_at ?? null,
      banned_until: (u as any).banned_until ?? null,
      role: (p?.role as any) ?? null,
      full_name: (p?.full_name as any) ?? null,
      department: (p?.department as any) ?? null,
      phone: (p?.phone as any) ?? null,
      building: (p?.building as any) ?? null,
      floor: (p?.floor as any) ?? null,
      position: (p?.position as any) ?? null,
      supervisor_id: (p?.supervisor_id as any) ?? null,
      location_id: (p?.location_id as any) ?? null,
      location_code: (p?.locations as any)?.code ?? null,
      location_name: (p?.locations as any)?.name ?? null,
      location_codes: userLocs.map(l => l.code),
      location_names: userLocs.map(l => l.name),
      asset_category: (p?.asset_category as any) ?? null,
      allowed_departments: (p?.allowed_departments as any) ?? null,
      can_view_beo: (p?.can_view_beo as any) ?? false,
      can_manage_assets: (p?.can_manage_assets as any) ?? false,
      is_it_supervisor: (p?.is_it_supervisor as any) ?? false,
      is_maintenance_supervisor: (p?.is_maintenance_supervisor as any) ?? false,
      hub_visible_modules: (p?.hub_visible_modules as any) ?? null,
    }
  })

  return Response.json({ users, locations: locations ?? [] })
}

export async function POST(request: Request) {
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

  const email = body?.email
  const fullName = typeof body?.full_name === 'string' ? body.full_name.trim() : ''
  const role = body?.role
  const department = typeof body?.department === 'string' ? body.department.trim() : ''
  const phone = typeof body?.phone === 'string' ? body.phone.trim() : ''
  const building = typeof body?.building === 'string' ? body.building.trim() : ''
  const floor = typeof body?.floor === 'string' ? body.floor.trim() : ''
  const position = typeof body?.position === 'string' ? body.position.trim() : ''
  const locationIds = Array.isArray(body?.location_ids) ? body.location_ids.filter((id: unknown) => typeof id === 'string') : []
  const assetCategory = typeof body?.asset_category === 'string' && body.asset_category.trim() !== '' ? body.asset_category.trim() : null
  const allowedDepartments = Array.isArray(body?.allowed_departments) && body.allowed_departments.length > 0 ? body.allowed_departments : null
  const canViewBeo = Boolean(body?.can_view_beo)
  const canManageAssets = Boolean(body?.can_manage_assets)
  const hubModules = parseHubModules(body?.hub_visible_modules)
  const invite = body?.invite !== false
  const password = typeof body?.password === 'string' ? body.password : null

  if (!isValidEmail(email)) return new Response('Invalid email', { status: 400 })
  if (!isValidRole(role)) return new Response('Invalid role', { status: 400 })
  if (!invite) {
    if (!password || password.length < 8) {
      return new Response('Password requerido (mínimo 8 caracteres) cuando no se envía invitación.', {
        status: 400,
      })
    }
  }

  const admin = createSupabaseAdminClient()

  // Create user in Auth (invite by default)
  const created = invite
    ? await admin.auth.admin.inviteUserByEmail(email, {
        data: fullName ? { full_name: fullName } : undefined,
      })
    : await admin.auth.admin.createUser({
        email,
        password: password ?? undefined,
        email_confirm: true,
        user_metadata: fullName ? { full_name: fullName } : undefined,
      })

  if (created.error || !created.data.user) {
    return new Response(created.error?.message ?? 'Failed to create user', { status: 400 })
  }

  const newUserId = created.data.user.id

  // Ensure profile exists with proper role
  const baseProfilePayload: Record<string, any> = {
    id: newUserId,
    full_name: fullName || null,
    role,
    department: department || null,
    phone: phone || null,
    building: building || null,
    floor: floor || null,
    position: position || null,
    location_id: locationIds[0] || null, // Sede principal (retrocompatibilidad)
    asset_category: assetCategory,
    allowed_departments: allowedDepartments,
    can_view_beo: canViewBeo,
    can_manage_assets: canManageAssets,
  }

  const payloadWithHubModules = hubModules ? { ...baseProfilePayload, hub_visible_modules: hubModules } : baseProfilePayload
  const { error: upsertErr } = await admin.from('profiles').upsert(payloadWithHubModules)

  // Backward-compat: if DB migration wasn't applied yet, retry without hub_visible_modules.
  if (upsertErr && hubModules && isMissingHubModulesColumnError(upsertErr)) {
    const { error: retryErr } = await admin.from('profiles').upsert(baseProfilePayload)
    if (retryErr) {
      return new Response(`User created, but profile update failed: ${retryErr.message}`, { status: 500 })
    }
    // Continue: admin will behave as admin-like but without hub visibility config until migration is applied.
  } else if (upsertErr) {
    return new Response(`User created, but profile update failed: ${upsertErr.message}`, { status: 500 })
  }

  // Insertar sedes en user_locations (múltiples sedes)
  if (locationIds.length > 0) {
    const userLocations = locationIds.map((locId: string) => ({
      user_id: newUserId,
      location_id: locId
    }))
    
    const { error: locErr } = await admin.from('user_locations').insert(userLocations)
    if (locErr) {
      console.error('[CREATE USER] Error inserting user_locations:', locErr)
      // No bloqueamos la operación, solo registramos el error
    }
  }

  // Best-effort audit (won't block)
  await admin.from('audit_log').insert({
    entity_type: 'user',
    entity_id: newUserId,
    action: 'CREATE',
    actor_id: user.id,
    metadata: {
      email,
      role,
      department,
      location_ids: locationIds,
      invite,
    },
  })

  return Response.json({
    id: newUserId,
    email,
    role,
    invite,
  })
}
