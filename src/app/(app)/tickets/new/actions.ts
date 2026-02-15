'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { notifyTicketCreated } from '@/lib/email/ticket-notifications'
import { getCategoryPathLabel } from '@/lib/categories/path'
import { inferServiceAreaFromCategoryPath, type TicketServiceArea } from '@/lib/tickets/service-area'

type CreateTicketInput = {
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

export async function createTicket(input: CreateTicketInput) {
  const supabase = await createSupabaseServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autenticado' }
  }

  // Verificar rol del usuario actual y asset_category
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role, location_id, asset_category, hub_visible_modules')
    .eq('id', user.id)
    .single()

  // Solo admin o agentes/supervisores de IT pueden crear tickets IT para otros
  // corporate_admin: verificar hub_visible_modules['it-helpdesk']
  const hubModules = currentProfile?.hub_visible_modules as Record<string, boolean> | null
  const isCorporateAdmin = currentProfile?.role === 'corporate_admin'
  const hasITPermission = currentProfile && (
    currentProfile.role === 'admin' ||
    (isCorporateAdmin && hubModules?.['it-helpdesk'] === true) ||
    (!isCorporateAdmin && ['agent_l1', 'agent_l2', 'supervisor'].includes(currentProfile.role) && currentProfile.asset_category === 'IT')
  )
  const canCreateForOthers = hasITPermission

  if (input.requester_id && !canCreateForOthers) {
    return { error: 'No tienes permisos para crear tickets IT para otros usuarios.' }
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

    // Preferir esquema nuevo (assets_it). Si no existe/fracasa, intentar legacy (assets).
    const { data: a1 } = await admin
      .from('assets_it')
      .select('location_id')
      .eq('id', input.asset_id)
      .maybeSingle()

    resolvedLocationId = (a1 as any)?.location_id ?? null

    if (!resolvedLocationId) {
      const { data: a2 } = await admin
        .from('assets')
        .select('location_id')
        .eq('id', input.asset_id)
        .maybeSingle()
      resolvedLocationId = (a2 as any)?.location_id ?? null
    }
  }

  // Si sigue sin sede, usar la sede del usuario actual (si existe)
  if (!resolvedLocationId) {
    resolvedLocationId = (currentProfile as any)?.location_id ?? null
  }

  // Para no-admins, location_id sigue siendo obligatorio
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

  // Insert ticket with NEW status
  // Compute category path once (used for service_area + notification)
  const { data: categories } = await supabase.from('categories').select('id,name,parent_id')
  const categoryPath = getCategoryPathLabel(categories ?? [], input.category_id)

  const ticketData: any = {
    title: input.title,
    description: input.description,
    category_id: input.category_id,
    impact: input.impact,
    urgency: input.urgency,
    priority: input.priority,
    status: 'NEW',
    support_level: input.support_level,
    // Admin puede crear sin sede si no hay forma de inferirla
    location_id: resolvedLocationId,
    service_area: input.service_area ?? inferServiceAreaFromCategoryPath(categoryPath),
  }

  // If requester_id is provided, use it (agent creating for another user)
  if (input.requester_id) {
    ticketData.requester_id = input.requester_id
  }

  // If asset_id is provided, link the ticket to an asset
  if (input.asset_id) {
    console.log('[Ticket Create] 📦 Asset ID recibido:', input.asset_id)
    ticketData.asset_id = input.asset_id
  } else {
    console.log('[Ticket Create] ⚠️ NO se recibió asset_id en input')
  }

  // If hk_room_id is provided (room incident), link the ticket to a HK room
  if (input.hk_room_id) {
    ticketData.hk_room_id = input.hk_room_id
  }

  // If remote connection info is provided, save it
  if (input.remote_connection_type) {
    ticketData.remote_connection_type = input.remote_connection_type
    ticketData.remote_connection_id = input.remote_connection_id || null
    ticketData.remote_connection_password = input.remote_connection_password || null
  }

  console.log('[Ticket Create] 📝 Datos a insertar:', JSON.stringify(ticketData, null, 2))

  const { data: ticket, error } = await supabase
    .from('tickets')
    .insert(ticketData)
    .select('id, ticket_number, title, description, priority, category_id, requester_id, asset_id')
    .single()

  if (error) {
    console.error('[Ticket Create] ❌ Error al insertar:', error)
    return { error: error.message }
  }

  if (!ticket) {
    return { error: 'Error creando ticket' }
  }

  console.log('[Ticket Create] ✅ Ticket insertado:', ticket.id, 'con asset_id:', ticket.asset_id)

  // Ensure asset_id persisted (paranoia: enforce after insert). If the user insert didn't set it, enforce via admin.
  if (input.asset_id) {
    console.log('[Ticket Create] 🔍 Verificando asset_id. Esperado:', input.asset_id, 'Recibido:', ticket.asset_id)
    
    if (ticket.asset_id !== input.asset_id) {
      console.log('[Ticket Create] 🔧 Asset no guardado, forzando con admin client...')
      const admin = createSupabaseAdminClient()
      const { error: fixErr } = await admin
        .from('tickets')
        .update({ asset_id: input.asset_id })
        .eq('id', ticket.id)

      if (fixErr) {
        console.error('[Ticket Create] ❌ Error al actualizar asset_id:', fixErr.message)
      } else {
        console.log('[Ticket Create] ✅ Asset_id actualizado via admin')
      }

      const { data: check, error: checkErr } = await admin
        .from('tickets')
        .select('asset_id')
        .eq('id', ticket.id)
        .single()

      if (checkErr) {
        console.error('[Ticket Create] ❌ Error al verificar asset_id:', checkErr.message)
      } else {
        console.log('[Ticket Create] 🔍 Verificación final - asset_id en DB:', check?.asset_id)
      }

      if (check?.asset_id) {
        ticket.asset_id = check.asset_id
      }

      if (input.asset_id && ticket.asset_id !== input.asset_id) {
        console.error('[Ticket Create] ❌ FALLO CRÍTICO: No se pudo asociar el activo')
        return { error: 'No se pudo asociar el activo al ticket. Por favor, asócialo manualmente desde el detalle del ticket.' }
      }
    } else {
      console.log('[Ticket Create] ✅ Asset_id guardado correctamente en el insert')
    }
  }

  // Send notification (await to ensure it's attempted, but don't block on failure)
  try {
    console.log('[Ticket Created] Enviando notificación para ticket:', ticket.ticket_number)
    await notifyTicketCreated({
      ticketId: ticket.id,
      ticketNumber: ticket.ticket_number,
      title: ticket.title,
      description: ticket.description,
      priority: ticket.priority,
      category: categoryPath || 'Sin categoría',
      requesterId: ticket.requester_id,
      actorId: user.id, // Usuario que creó el ticket
    })
    console.log('[Ticket Created] ✓ Notificación enviada exitosamente')
  } catch (err) {
    console.error('[Ticket Created] ✗ Error enviando notificación:', err)
  }

  return { success: true, ticketId: ticket.id }
}
