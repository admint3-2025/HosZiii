'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { notifyTicketCreated } from '@/lib/email/ticket-notifications'
import { getCategoryPathLabel } from '@/lib/categories/path'

type CreateTicketInput = {
  title: string
  description: string
  category_id: string | null
  impact: number
  urgency: number
  priority: number
  support_level: number
  requester_id?: string
}

export async function createTicket(input: CreateTicketInput) {
  const supabase = await createSupabaseServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autenticado' }
  }

  // Insert ticket with NEW status
  const ticketData: any = {
    title: input.title,
    description: input.description,
    category_id: input.category_id,
    impact: input.impact,
    urgency: input.urgency,
    priority: input.priority,
    status: 'NEW',
    support_level: input.support_level,
  }

  // If requester_id is provided, use it (agent creating for another user)
  if (input.requester_id) {
    ticketData.requester_id = input.requester_id
  }

  const { data: ticket, error } = await supabase
    .from('tickets')
    .insert(ticketData)
    .select('id, ticket_number, title, description, priority, category_id, requester_id')
    .single()

  if (error) {
    return { error: error.message }
  }

  if (!ticket) {
    return { error: 'Error creando ticket' }
  }

  // Get category path for notification
  const { data: categories } = await supabase.from('categories').select('id,name,parent_id')
  const categoryPath = getCategoryPathLabel(categories ?? [], ticket.category_id)

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
    })
    console.log('[Ticket Created] ✓ Notificación enviada exitosamente')
  } catch (err) {
    console.error('[Ticket Created] ✗ Error enviando notificación:', err)
  }

  return { success: true, ticketId: ticket.id }
}
