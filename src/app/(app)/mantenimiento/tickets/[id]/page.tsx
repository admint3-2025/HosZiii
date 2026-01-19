import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import MaintenanceTicketDetail from './ui/MaintenanceTicketDetail'
import MaintenanceBanner from '../../ui/MaintenanceBanner'
import { formatMaintenanceTicketCode as formatTicketCode } from '@/lib/tickets/code'

export default async function MaintenanceTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const adminClient = createSupabaseAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role,asset_category')
    .eq('id', user.id)
    .single()

  // Obtener ticket básico primero
  const { data: ticket, error } = await supabase
    .from('tickets_maintenance')
    .select('*')
    .eq('id', id)
    .single()

  console.log('[MaintenanceTicketDetail] Query result:', { ticket, error, id })

  if (error || !ticket) {
    console.error('[MaintenanceTicketDetail] Ticket not found or error:', error)
    return notFound()
  }

  // Obtener ubicación si existe location_id
  let ticketLocation = null
  if (ticket.location_id) {
    const { data: loc } = await supabase
      .from('locations')
      .select('id, code, name')
      .eq('id', ticket.location_id)
      .single()
    ticketLocation = loc
  }

  // Obtener activo si existe asset_id
  let ticketAsset = null
  if (ticket.asset_id) {
    const { data: asset } = await supabase
      .from('assets_maintenance')
      .select('id, asset_code, category, brand, model, serial_number, status, location_id')
      .eq('id', ticket.asset_id)
      .single()

    if (asset) {
      // Normalizar al shape que espera el componente client (asset_tag/asset_type)
      ticketAsset = {
        id: asset.id,
        asset_tag: asset.asset_code,
        asset_type: asset.category,
        brand: asset.brand,
        model: asset.model,
        serial_number: asset.serial_number,
        status: asset.status,
        location: ticketLocation,
      }
    }
  }

  // Agregar las relaciones al ticket
  const ticketWithRelations = {
    ...ticket,
    locations: ticketLocation,
    asset: ticketAsset,
  }

  // Obtener información de usuarios relacionados
  const userIds = [
    ticket.requester_id,
    ticket.assigned_to,
    ticket.closed_by,
  ].filter(Boolean)

  const usersMap = new Map()
  
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

  // Obtener comentarios
  const { data: comments } = await supabase
    .from('maintenance_ticket_comments')
    .select('id, body, visibility, created_at, author_id')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true })

  // Obtener información de autores de comentarios
  const commentsWithAuthors = []
  for (const comment of comments || []) {
    let author = usersMap.get(comment.author_id)
    if (!author && comment.author_id) {
      try {
        const { data: authUser } = await adminClient.auth.admin.getUserById(comment.author_id)
        if (authUser?.user) {
          author = {
            id: authUser.user.id,
            email: authUser.user.email,
            full_name: authUser.user.user_metadata?.full_name || authUser.user.email?.split('@')[0],
          }
          usersMap.set(comment.author_id, author)
        }
      } catch (err) {
        console.error(`Error obteniendo autor ${comment.author_id}:`, err)
      }
    }
    commentsWithAuthors.push({ ...comment, author })
  }

  const bannerTitle = ticket.ticket_number
    ? formatTicketCode({ ticket_number: ticket.ticket_number, created_at: ticket.created_at })
    : 'Ticket de Mantenimiento'

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-amber-50 to-orange-50 p-6 space-y-4">
      <MaintenanceBanner
        title={bannerTitle}
        subtitle={ticket.title || 'Detalle de mantenimiento'}
        icon={
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m6 2a8 8 0 11-16 0 8 8 0 0116 0zm-6 6v4m-2-2h4" />
          </svg>
        }
      >
        <Link 
          href="/mantenimiento/tickets" 
          className="inline-flex items-center gap-2 text-white/90 hover:text-white text-sm font-medium transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver a solicitudes
        </Link>
      </MaintenanceBanner>

      <MaintenanceTicketDetail
        ticket={ticketWithRelations}
        comments={commentsWithAuthors}
        currentUserId={user?.id || null}
        userRole={profile?.role || 'user'}
        userAssetCategory={profile?.asset_category || null}
        asset={ticketAsset}
        requester={usersMap.get(ticket.requester_id)}
        assignedAgent={ticket.assigned_to ? usersMap.get(ticket.assigned_to) : null}
        closedByUser={ticket.closed_by ? usersMap.get(ticket.closed_by) : null}
      />
    </main>
  )
}
