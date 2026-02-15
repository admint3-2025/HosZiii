'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getCategoryPathLabel } from '@/lib/categories/path'
import { inferServiceAreaFromCategoryPath, type TicketServiceArea } from '@/lib/tickets/service-area'
import { notifyMaintenanceTicketCreated } from '@/lib/email/maintenance-ticket-notifications'

type CreateMaintenanceTicketInput = {
  title: string
  description: string
  service_area?: TicketServiceArea
  category_id: string | null
  impact: number
  urgency: number
  priority: number
  support_level: number
  requester_id?: string
  location_id?: string
  asset_id?: string | null
  hk_room_id?: string | null
  remote_connection_type?: string | null
  remote_connection_id?: string | null
  remote_connection_password?: string | null
}

export async function createMaintenanceTicket(input: CreateMaintenanceTicketInput) {
  const supabase = await createSupabaseServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autenticado' }
  }

  // Verificar rol del usuario actual y que tenga acceso a mantenimiento
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role, asset_category, location_id')
    .eq('id', user.id)
    .single()

  // Validar acceso a mantenimiento
  // Cualquier usuario autenticado puede crear tickets de mantenimiento
  // (supervisores/agentes de IT pueden crear como solicitantes)
  if (!currentProfile) {
    return { error: 'No tienes permisos para crear tickets de mantenimiento.' }
  }

  // Solo admin o agentes/supervisores de MANTENIMIENTO pueden crear tickets de mantenimiento para otros
  const canCreateForOthers = currentProfile && 
    (currentProfile.role === 'admin' || 
     (['agent_l1', 'agent_l2', 'supervisor'].includes(currentProfile.role) && currentProfile.asset_category === 'MAINTENANCE'))

  if (input.requester_id && !canCreateForOthers) {
    return { error: 'No tienes permisos para crear tickets de mantenimiento para otros usuarios.' }
  }

  // Determinar el solicitante: si es admin/supervisor/técnico y especificó requester_id, usarlo; sino, usar el usuario actual
  const requesterId = input.requester_id || user.id

  // Validar que el solicitante tenga una sede asignada
  const { data: requesterProfile } = await supabase
    .from('profiles')
    .select('location_id, full_name, email')
    .eq('id', requesterId)
    .single()

  // Resolver location_id del ticket con fallbacks (para admins)
  // Si el admin envió location_id explícitamente, usarlo con máxima prioridad
  let resolvedLocationId: string | null = input.location_id || (requesterProfile?.location_id ?? null)

  // Si el solicitante no tiene sede pero se seleccionó un activo, heredar la sede del activo
  if (!resolvedLocationId && input.asset_id) {
    const admin = createSupabaseAdminClient()
    const { data: asset } = await admin
      .from('assets_maintenance')
      .select('location_id')
      .eq('id', input.asset_id)
      .maybeSingle()

    resolvedLocationId = (asset as any)?.location_id ?? null
  }

  // Si sigue sin sede, usar la sede del usuario actual (si existe)
  if (!resolvedLocationId) {
    resolvedLocationId = (currentProfile as any)?.location_id ?? null
  }

  const currentRole = String((currentProfile as any)?.role || '').toLowerCase()
  const isAdmin = currentRole === 'admin' || currentRole === 'corporate_admin'

  if (!resolvedLocationId && !isAdmin) {
    const who = requesterProfile?.full_name || requesterProfile?.email || requesterId
    return {
      error:
        `El solicitante seleccionado (${who}) no tiene sede asignada (profiles.location_id). ` +
        `Pídele al administrador asignarle una sede o selecciona un activo con sede para heredarla.`,
    }
  }

  // Compute category path once (used for service_area + notification)
  const { data: categories } = await supabase.from('categories').select('id,name,parent_id')
  const categoryPath = getCategoryPathLabel(categories ?? [], input.category_id)

  // Generar ticket_number con formato estricto: MANT-DDMMAA-XXXX
  // El campo es UNIQUE global, así que se reintenta si hay colisión.
  const admin = createSupabaseAdminClient()

  function getMexicoDdmmyy(now: Date): { dd: string; mm: string; yy: string } {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Mexico_City',
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    }).formatToParts(now)

    const dd = parts.find((p) => p.type === 'day')?.value ?? '01'
    const mm = parts.find((p) => p.type === 'month')?.value ?? '01'
    const yy = parts.find((p) => p.type === 'year')?.value ?? '00'
    return { dd, mm, yy }
  }

  async function getNextMaintenanceTicketCode(): Promise<string> {
    const { dd, mm, yy } = getMexicoDdmmyy(new Date())
    const datePart = `${dd}${mm}${yy}`
    const prefix = `MANT-${datePart}-`

    const { data: lastTicket, error: lastErr } = await admin
      .from('tickets_maintenance')
      .select('ticket_number')
      .ilike('ticket_number', `${prefix}%`)
      .order('ticket_number', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastErr) {
      console.warn('[Maintenance Ticket Create] ⚠️ No se pudo obtener el último ticket del día:', lastErr)
    }

    const lastCode = String((lastTicket as any)?.ticket_number || '')
    const lastSeqMatch = lastCode.match(/-(\d{4})$/)
    const lastSeq = lastSeqMatch ? parseInt(lastSeqMatch[1], 10) : 0
    const nextSeq = (Number.isFinite(lastSeq) ? lastSeq : 0) + 1
    const seq = String(nextSeq).padStart(4, '0')

    return `${prefix}${seq}`
  }

  // Convertir priority numérico a texto según el constraint de la tabla
  const priorityMap: Record<number, string> = {
    1: 'CRITICAL',
    2: 'HIGH', 
    3: 'MEDIUM',
    4: 'LOW',
    5: 'LOW'
  }
  const priorityText = priorityMap[input.priority] || 'MEDIUM'

  const ticketDataBase: any = {
    title: input.title,
    description: input.description,
    category_id: input.category_id,
    priority: priorityText,
    status: 'NEW',
    requester_id: requesterId, // Siempre incluir el requester (input.requester_id || user.id)
    // Admin puede crear sin sede si no hay forma de inferirla
    location_id: resolvedLocationId,
  }

  // If asset_id is provided, link the ticket to an asset
  if (input.asset_id) {
    console.log('[Maintenance Ticket Create] 📦 Asset ID recibido:', input.asset_id)
    ticketDataBase.asset_id = input.asset_id
  } else {
    console.log('[Maintenance Ticket Create] ⚠️ NO se recibió asset_id en input')
  }

  // If hk_room_id is provided (room incident), link the ticket to a HK room
  if (input.hk_room_id) {
    ticketDataBase.hk_room_id = input.hk_room_id
  }

  let ticket: any = null
  let error: any = null
  const maxAttempts = 5

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const ticketNumber = await getNextMaintenanceTicketCode()
    const ticketData: any = { ...ticketDataBase, ticket_number: ticketNumber }
    console.log(
      `[Maintenance Ticket Create] 📝 Intento ${attempt}/${maxAttempts} - insert ticket_number=${ticketNumber}:`,
      JSON.stringify(ticketData, null, 2)
    )

    const res = await supabase
      .from('tickets_maintenance')
      .insert(ticketData)
      .select('id, ticket_number, title, description, priority, category_id, requester_id, asset_id, location_id, assigned_to, created_at')
      .single()

    ticket = res.data
    error = res.error

    if (!error) break

    const msg = String(error?.message || '')
    const code = String(error?.code || '')
    const isDuplicateTicketNumber = code === '23505' && msg.includes('ticket_number')
    if (isDuplicateTicketNumber && attempt < maxAttempts) {
      console.warn('[Maintenance Ticket Create] 🔁 Colisión ticket_number, reintentando...', { code, msg })
      continue
    }

    break
  }

  if (error) {
    console.error('[Maintenance Ticket Create] ❌ Error al insertar:', error)
    return { error: error.message }
  }

  if (!ticket) {
    return { error: 'Error creando ticket de mantenimiento' }
  }

  console.log('[Maintenance Ticket Create] ✅ Ticket insertado:', ticket.id, 'con asset_id:', ticket.asset_id)

  // Ensure asset_id persisted (paranoia: enforce after insert). If the user insert didn't set it, enforce via admin.
  if (input.asset_id) {
    console.log('[Maintenance Ticket Create] 🔍 Verificando asset_id. Esperado:', input.asset_id, 'Recibido:', ticket.asset_id)
    
    if (ticket.asset_id !== input.asset_id) {
      console.log('[Maintenance Ticket Create] 🔧 Asset no guardado, forzando con admin client...')
      const admin = createSupabaseAdminClient()
      const { error: fixErr } = await admin
        .from('tickets_maintenance')
        .update({ asset_id: input.asset_id })
        .eq('id', ticket.id)

      if (fixErr) {
        console.error('[Maintenance Ticket Create] ❌ Error al actualizar asset_id:', fixErr.message)
      } else {
        console.log('[Maintenance Ticket Create] ✅ Asset_id actualizado via admin')
      }

      const { data: check, error: checkErr } = await admin
        .from('tickets_maintenance')
        .select('asset_id')
        .eq('id', ticket.id)
        .single()

      if (checkErr) {
        console.error('[Maintenance Ticket Create] ❌ Error al verificar asset_id:', checkErr.message)
      } else {
        console.log('[Maintenance Ticket Create] 🔍 Verificación final - asset_id en DB:', check?.asset_id)
      }

      if (check?.asset_id) {
        ticket.asset_id = check.asset_id
      }

      if (input.asset_id && ticket.asset_id !== input.asset_id) {
        console.error('[Maintenance Ticket Create] ❌ FALLO CRÍTICO: No se pudo asociar el activo')
        return { error: 'No se pudo asociar el activo al ticket. Por favor, asócialo manualmente desde el detalle del ticket.' }
      }
    } else {
      console.log('[Maintenance Ticket Create] ✅ Asset_id guardado correctamente en el insert')
    }
  }

  // Send notification (await to ensure it's attempted, but don't block on failure)
  try {
    console.log('[Maintenance Ticket Created] Enviando notificaciones para ticket:', ticket.ticket_number)
    
    // Obtener información de la ubicación y del asignado (si existe)
    let locationName: string | undefined
    let locationCode: string | undefined
    let assignedToName: string | undefined
    
    if (ticket.location_id) {
      const { data: location } = await supabase
        .from('locations')
        .select('name, code')
        .eq('id', ticket.location_id)
        .single()
      
      if (location) {
        locationName = location.name
        locationCode = location.code
      }
    }
    
    if (ticket.assigned_to) {
      const { data: assignedProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', ticket.assigned_to)
        .single()
      
      assignedToName = assignedProfile?.full_name || undefined
    }
    
    // Usar el nuevo helper de notificaciones de mantenimiento
    await notifyMaintenanceTicketCreated({
      ticketId: ticket.id,
      ticketNumber: String(ticket.ticket_number),
      title: ticket.title,
      description: ticket.description,
      priority: input.priority,
      category: categoryPath || undefined,
      requesterId: ticket.requester_id,
      actorId: user.id,
      locationName,
      locationCode,
      createdAt: ticket.created_at,
      assignedToName,
    })
    
    console.log('[Maintenance Ticket Created] ✓ Notificaciones enviadas exitosamente')
  } catch (err) {
    console.error('[Maintenance Ticket Created] ✗ Error enviando notificaciones:', err)
  }

  return { success: true, ticketId: ticket.id }
}
