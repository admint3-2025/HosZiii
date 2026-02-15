import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import TicketDetail from './ui/TicketDetail'
import { getCategoryPathLabel } from '@/lib/categories/path'

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const adminClient = createSupabaseAdminClient()

  // Obtener el rol del usuario actual
  const { data: { user } } = await supabase.auth.getUser()
  let userRole = 'user'
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    userRole = profile?.role || 'user'
  }

  const [{ data: ticket }, { data: categories }] = await Promise.all([
    supabase
      .from('tickets')
      .select(`
        *,
        asset_id,
        location:locations!location_id (id, code, name)
      `)
      .eq('id', id)
      .single(),
    supabase.from('categories').select('id,name,parent_id'),
  ])

  if (!ticket) notFound()

  // Obtener asset relacionado (soporta assets_it (nuevo) y assets (legacy))
  let ticketAsset: any = null
  if (ticket.asset_id) {
    try {
      // Preferir esquema nuevo (assets_it)
      const { data: a1 } = await adminClient
        .from('assets_it')
        .select('id, asset_code, category, brand, model, serial_number, status, location_id')
        .eq('id', ticket.asset_id)
        .maybeSingle()

      const raw = a1
        ? {
            id: a1.id,
            asset_tag: a1.asset_code,
            asset_type: a1.category,
            brand: a1.brand,
            model: a1.model,
            serial_number: a1.serial_number,
            status: a1.status,
            location_id: a1.location_id,
          }
        : null

      if (raw) {
        ticketAsset = {
          ...raw,
          asset_location: raw.location_id
            ? ticket.location
            : null,
        }
      } else {
        // Fallback legacy
        const { data: a2 } = await adminClient
          .from('assets')
          .select('id, asset_tag, asset_type, brand, model, serial_number, status, location_id, asset_location:locations!location_id (id, code, name)')
          .eq('id', ticket.asset_id)
          .maybeSingle()
        if (a2) ticketAsset = a2
      }
    } catch (err) {
      console.error('Error obteniendo asset con admin client:', err)
    }
  }

  // Obtener información de usuarios relacionados desde auth.users
  const userIds = [
    ticket.requester_id,
    ticket.assigned_agent_id,
    ticket.closed_by,
  ].filter(Boolean)

  const usersMap = new Map()
  
  // Obtener usuarios desde auth.users usando admin client
  for (const userId of userIds) {
    try {
      const { data: authUser } = await adminClient.auth.admin.getUserById(userId)
      if (authUser?.user) {
        usersMap.set(userId, {
          id: authUser.user.id,
          email: authUser.user.email,
          full_name: authUser.user.user_metadata?.full_name || authUser.user.email?.split('@')[0],
        })
      }
    } catch (err) {
      console.error(`Error obteniendo usuario ${userId}:`, err)
    }
  }

  const { data: comments } = await supabase
    .from('ticket_comments')
    .select(`
      id,
      body,
      visibility,
      created_at,
      author_id,
      ticket_attachments (
        id,
        file_name,
        file_size,
        file_type,
        storage_path,
        created_at
      )
    `)
    .eq('ticket_id', id)
    .order('created_at', { ascending: true })

  // Obtener información de autores de comentarios
  const commentAuthorIds = comments?.map(c => c.author_id).filter(Boolean) ?? []
  for (const authorId of commentAuthorIds) {
    if (!usersMap.has(authorId)) {
      try {
        const { data: authUser } = await adminClient.auth.admin.getUserById(authorId)
        if (authUser?.user) {
          usersMap.set(authorId, {
            id: authUser.user.id,
            email: authUser.user.email,
            full_name: authUser.user.user_metadata?.full_name || authUser.user.email?.split('@')[0],
          })
        }
      } catch (err) {
        console.error(`Error obteniendo autor ${authorId}:`, err)
      }
    }
  }

  // Verificar si hay una solicitud de escalamiento pendiente
  // (comentario con "Solicitud de escalamiento" y el ticket aún es nivel 1)
  const hasEscalationRequest = ticket.support_level === 1 && 
    (comments ?? []).some(c => 
      c.body?.includes('🔔 **Solicitud de escalamiento a Nivel 2**')
    )

  // Obtener habitación vinculada si existe hk_room_id
  let ticketRoom: { id: string; number: string; floor: number } | null = null
  if (ticket.hk_room_id) {
    const { data: room } = await adminClient
      .from('hk_rooms')
      .select('id, number, floor')
      .eq('id', ticket.hk_room_id)
      .single()
    ticketRoom = room
  }

  return (
    <main className="p-6 space-y-4">
      <TicketDetail
        ticket={{
          ...ticket,
          category_path: getCategoryPathLabel(categories ?? [], ticket.category_id),
          requester: usersMap.get(ticket.requester_id),
          assigned_agent: ticket.assigned_agent_id ? usersMap.get(ticket.assigned_agent_id) : null,
          closed_by_user: ticket.closed_by ? usersMap.get(ticket.closed_by) : null,
          current_user_id: user?.id,
          location: ticket.location || null,
          hk_room: ticketRoom,
        }}
        asset={ticketAsset}
        comments={(comments ?? []).map(c => ({
          ...c,
          author: usersMap.get(c.author_id),
        }))}
        currentAgentId={ticket.assigned_agent_id}
        userRole={userRole}
        hasEscalationRequest={hasEscalationRequest}
      />
    </main>
  )
}
