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
    supabase.from('tickets').select('*').eq('id', id).single(),
    supabase.from('categories').select('id,name,parent_id'),
  ])

  if (!ticket) notFound()

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
        }}
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
