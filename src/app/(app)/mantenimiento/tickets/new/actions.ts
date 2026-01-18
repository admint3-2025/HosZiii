'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { notifyTicketCreated } from '@/lib/email/ticket-notifications'
import { getCategoryPathLabel } from '@/lib/categories/path'
import { inferServiceAreaFromCategoryPath, type TicketServiceArea } from '@/lib/tickets/service-area'

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
  asset_id?: string | null
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
    .select('role, asset_category')
    .eq('id', user.id)
    .single()

  // Validar acceso a mantenimiento
  // Cualquier usuario autenticado puede crear tickets de mantenimiento
  // (supervisores/agentes de IT pueden crear como solicitantes)
  if (!currentProfile) {
    return { error: 'No tienes permisos para crear tickets de mantenimiento.' }
  }

  const canCreateForOthers = currentProfile && ['agent_l1', 'agent_l2', 'supervisor', 'admin'].includes(currentProfile.role)

  if (input.requester_id && !canCreateForOthers) {
    return { error: 'No tienes permisos para crear tickets para otros usuarios.' }
  }

  // Determinar el solicitante: si es admin/supervisor/técnico y especificó requester_id, usarlo; sino, usar el usuario actual
  const requesterId = input.requester_id || user.id

  // Validar que el solicitante tenga una sede asignada
  const { data: requesterProfile } = await supabase
    .from('profiles')
    .select('location_id')
    .eq('id', requesterId)
    .single()

  if (!requesterProfile?.location_id) {
    return { error: `El usuario solicitante no tiene una sede asignada. Contacta al administrador para asignarle una sede antes de crear el ticket.` }
  }

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
    location_id: requesterProfile.location_id,
    service_area: input.service_area ?? inferServiceAreaFromCategoryPath(categoryPath),
  }

  // If requester_id is provided, use it (agent creating for another user)
  if (input.requester_id) {
    ticketData.requester_id = input.requester_id
  }

  // If asset_id is provided, link the ticket to an asset
  if (input.asset_id) {
    console.log('[Maintenance Ticket Create] 📦 Asset ID recibido:', input.asset_id)
    ticketData.asset_id = input.asset_id
  } else {
    console.log('[Maintenance Ticket Create] ⚠️ NO se recibió asset_id en input')
  }

  // If remote connection info is provided, save it
  if (input.remote_connection_type) {
    ticketData.remote_connection_type = input.remote_connection_type
    ticketData.remote_connection_id = input.remote_connection_id || null
    ticketData.remote_connection_password = input.remote_connection_password || null
  }

  console.log('[Maintenance Ticket Create] 📝 Datos a insertar:', JSON.stringify(ticketData, null, 2))

  // **IMPORTANTE: Insertar en la tabla tickets_maintenance**
  const { data: ticket, error } = await supabase
    .from('tickets_maintenance')
    .insert(ticketData)
    .select('id, ticket_number, title, description, priority, category_id, requester_id, asset_id')
    .single()

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
    console.log('[Maintenance Ticket Created] Enviando notificación para ticket:', ticket.ticket_number)
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
    console.log('[Maintenance Ticket Created] ✓ Notificación enviada exitosamente')
  } catch (err) {
    console.error('[Maintenance Ticket Created] ✗ Error enviando notificación:', err)
  }

  return { success: true, ticketId: ticket.id }
}
