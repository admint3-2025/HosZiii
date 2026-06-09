import { createSupabaseServerClient } from '@/lib/supabase/server'
import { loadZiiiLogoDataUrl } from '@/lib/pdf/ziii-logo'
import {
  generateTicketDetailPdf,
  type TicketDetailContextField,
  type TicketDetailTimelineItem,
  type TicketDetailCommentItem,
} from '@/lib/pdf/ticket-detail-report'
import { translateTicketPriorityEs, translateTicketStatusEs } from '@/lib/pdf/tickets-report'
import { formatTicketCode, formatMaintenanceTicketCode } from '@/lib/tickets/code'
import { getCategoryPathLabel } from '@/lib/categories/path'

export const runtime = 'nodejs'

type TicketType = 'IT' | 'MAINTENANCE'

type ProfileLite = {
  id: string
  full_name: string | null
  email?: string | null
}

type ViewerProfile = {
  role?: string | null
  full_name?: string | null
  is_corporate?: boolean | null
}

const TECHNICAL_ROLES = new Set([
  'admin',
  'corporate_admin',
  'supervisor',
  'agent',
  'agent_l1',
  'agent_l2',
  'tech_l1',
  'tech_l2',
  'maintenance_tech',
  'maintenance_supervisor',
])

function parseTicketType(raw: string | null): TicketType {
  const value = String(raw || '').trim().toUpperCase()
  return value === 'MAINTENANCE' ? 'MAINTENANCE' : 'IT'
}

function formatDateTimeMx(value?: string | null): string {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString('es-MX', {
      timeZone: 'America/Mexico_City',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return String(value)
  }
}

function toStatusLabel(status: unknown): string {
  const raw = String(status ?? '').trim().toUpperCase()
  if (!raw) return '-'

  const map: Record<string, string> = {
    ON_HOLD: 'EN ESPERA',
    WAITING_THIRD_PARTY: 'ESPERANDO A TERCEROS',
  }

  return map[raw] ?? translateTicketStatusEs(raw)
}

function toPriorityLabel(priority: unknown): string {
  const raw = String(priority ?? '').trim().toUpperCase()
  if (!raw) return '-'

  const numericMap: Record<string, string> = {
    '1': 'LOW',
    '2': 'MEDIUM',
    '3': 'HIGH',
    '4': 'URGENT',
  }

  return translateTicketPriorityEs(numericMap[raw] ?? raw)
}

function toDaysOpenLabel(createdAt?: string | null, closedAt?: string | null): string {
  if (!createdAt) return '-'

  const start = new Date(createdAt).getTime()
  const end = closedAt ? new Date(closedAt).getTime() : Date.now()

  if (Number.isNaN(start) || Number.isNaN(end)) return '-'

  const days = Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)))
  return `${days} dias`
}

function uniqueIds(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim())))]
}

async function fetchProfilesSafe(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userIds: string[],
): Promise<ProfileLite[]> {
  if (!userIds.length) return []

  const primary = await supabase.from('profiles').select('id,full_name,email').in('id', userIds)
  if (!primary.error) return (primary.data ?? []) as ProfileLite[]

  const fallback = await supabase.from('profiles').select('id,full_name').in('id', userIds)
  return (fallback.data ?? []) as ProfileLite[]
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  return handleRequest(request, {
    ticketId: String(searchParams.get('ticketId') || '').trim(),
    ticketType: parseTicketType(searchParams.get('ticketType')),
  })
}

export async function POST(request: Request) {
  let body: any = {}
  try {
    body = await request.json()
  } catch {
    return new Response('Invalid JSON body', { status: 400 })
  }

  return handleRequest(request, {
    ticketId: String(body?.ticketId || '').trim(),
    ticketType: parseTicketType(body?.ticketType ?? null),
    logoOverride:
      typeof body?.logoDataUrl === 'string' && body.logoDataUrl.startsWith('data:')
        ? {
            dataUrl: body.logoDataUrl,
            type: body?.logoType === 'JPEG' ? 'JPEG' : 'PNG',
          }
        : null,
  })
}

async function handleRequest(
  request: Request,
  params: {
    ticketId: string
    ticketType: TicketType
    logoOverride?: { dataUrl: string; type: 'PNG' | 'JPEG' } | null
  },
) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return new Response('Unauthorized', { status: 401 })

    const { ticketId, ticketType, logoOverride } = params

    if (!ticketId) {
      return new Response('ticketId is required', { status: 400 })
    }

    const { data: viewerProfile } = await supabase
      .from('profiles')
      .select('role,full_name,is_corporate')
      .eq('id', user.id)
      .maybeSingle()

    const role = String((viewerProfile as ViewerProfile | null)?.role ?? '').trim()
    const canSeeInternalComments =
      TECHNICAL_ROLES.has(role) || Boolean((viewerProfile as ViewerProfile | null)?.is_corporate)

    const isMaintenance = ticketType === 'MAINTENANCE'

    const { data: ticket, error: ticketError } = isMaintenance
      ? await supabase
          .from('tickets_maintenance')
          .select(
            `
            id,
            ticket_number,
            title,
            description,
            status,
            priority,
            support_level,
            created_at,
            updated_at,
            closed_at,
            resolution,
            requester_id,
            assigned_to,
            closed_by,
            location_id,
            service_area,
            impact,
            urgency,
            hk_room_id
          `,
          )
          .eq('id', ticketId)
          .is('deleted_at', null)
          .maybeSingle()
      : await supabase
          .from('tickets')
          .select(
            `
            id,
            ticket_number,
            title,
            description,
            status,
            priority,
            support_level,
            created_at,
            updated_at,
            closed_at,
            resolution,
            requester_id,
            assigned_agent_id,
            closed_by,
            location_id,
            category_id,
            hk_room_id
          `,
          )
          .eq('id', ticketId)
          .is('deleted_at', null)
          .maybeSingle()

    if (ticketError) {
      return new Response(ticketError.message, { status: 500 })
    }

    if (!ticket) {
      return new Response('Ticket not found or not allowed', { status: 404 })
    }

    const requesterId = String((ticket as any).requester_id || '') || null
    const assigneeId = isMaintenance
      ? (String((ticket as any).assigned_to || '') || null)
      : (String((ticket as any).assigned_agent_id || '') || null)
    const closedById = String((ticket as any).closed_by || '') || null

    const commentTable = isMaintenance ? 'maintenance_ticket_comments' : 'ticket_comments'
    const attachmentsTable = isMaintenance ? 'ticket_attachments_maintenance' : 'ticket_attachments'

    let commentsQuery = supabase
      .from(commentTable)
      .select('body,visibility,created_at,author_id')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })
      .range(0, 299)

    if (!canSeeInternalComments) {
      commentsQuery = commentsQuery.eq('visibility', 'public')
    }

    const { data: rawComments } = await commentsQuery

    const { data: timelineRows } = isMaintenance
      ? { data: [] as any[] }
      : await supabase
          .from('ticket_status_history')
          .select('from_status,to_status,created_at,note,actor_id')
          .eq('ticket_id', ticketId)
          .order('created_at', { ascending: true })
          .range(0, 299)

    const locationId = String((ticket as any).location_id || '') || null
    const hkRoomId = String((ticket as any).hk_room_id || '') || null

    const [{ data: location }, { data: room }, { count: attachmentCount }] = await Promise.all([
      locationId
        ? supabase.from('locations').select('id,code,name').eq('id', locationId).maybeSingle()
        : Promise.resolve({ data: null as any }),
      hkRoomId
        ? supabase.from('hk_rooms').select('id,number,floor').eq('id', hkRoomId).maybeSingle()
        : Promise.resolve({ data: null as any }),
      supabase.from(attachmentsTable).select('id', { count: 'exact', head: true }).eq('ticket_id', ticketId),
    ])

    let categoryLabel = 'Sin categoria'
    if (!isMaintenance) {
      const categoryId = String((ticket as any).category_id || '') || null
      if (categoryId) {
        const { data: cats } = await supabase.from('categories').select('id,name,parent_id')
        categoryLabel = getCategoryPathLabel(cats ?? [], categoryId) || 'Sin categoria'
      }
    }

    const comments = (rawComments ?? []) as Array<{
      body: string | null
      visibility: 'public' | 'internal' | null
      created_at: string
      author_id: string | null
    }>

    const historyRows = (timelineRows ?? []) as Array<{
      from_status: string | null
      to_status: string | null
      created_at: string
      note: string | null
      actor_id: string | null
    }>

    const profileIds = uniqueIds([
      requesterId,
      assigneeId,
      closedById,
      ...comments.map((comment) => comment.author_id),
      ...historyRows.map((row) => row.actor_id),
    ])

    const profiles = await fetchProfilesSafe(supabase, profileIds)
    const profileMap = new Map(profiles.map((profile) => [profile.id, profile]))

    const resolvePerson = (id?: string | null): string => {
      if (!id) return 'Sin registro'
      const profile = profileMap.get(id)
      return profile?.full_name || profile?.email || 'Usuario'
    }

    const ticketCode = isMaintenance
      ? formatMaintenanceTicketCode({
          ticket_number: (ticket as any).ticket_number,
          created_at: (ticket as any).created_at,
        })
      : formatTicketCode({
          ticket_number: (ticket as any).ticket_number,
          created_at: (ticket as any).created_at,
        })

    const contextFields: TicketDetailContextField[] = [
      { label: 'Modulo', value: isMaintenance ? 'Mantenimiento' : 'Helpdesk IT' },
      { label: 'Codigo de ticket', value: ticketCode },
      { label: 'Estado actual', value: toStatusLabel((ticket as any).status) },
      { label: 'Prioridad', value: toPriorityLabel((ticket as any).priority) },
      { label: 'Nivel de soporte', value: `N${(ticket as any).support_level || 1}` },
      {
        label: 'Sede',
        value: location ? `${String((location as any).code || '-')}` + ` - ${String((location as any).name || 'Sin sede')}` : 'Sin sede',
      },
      {
        label: 'Habitacion',
        value: room ? `Habitacion ${String((room as any).number || '-')} | Piso ${String((room as any).floor || '-')}` : '-',
      },
      { label: 'Solicitante', value: resolvePerson(requesterId) },
      { label: 'Asignado a', value: resolvePerson(assigneeId) },
      {
        label: 'Categoria / Area',
        value: isMaintenance
          ? String((ticket as any).service_area || 'Sin area')
          : categoryLabel,
      },
      {
        label: 'Impacto / Urgencia',
        value: isMaintenance
          ? `${String((ticket as any).impact || '-')}` + ` / ${String((ticket as any).urgency || '-')}`
          : '-',
      },
      { label: 'Creado', value: formatDateTimeMx((ticket as any).created_at) },
      { label: 'Ultima actualizacion', value: formatDateTimeMx((ticket as any).updated_at) },
      { label: 'Cerrado', value: formatDateTimeMx((ticket as any).closed_at) },
      { label: 'Cerrado por', value: resolvePerson(closedById) },
    ]

    const timeline: TicketDetailTimelineItem[] = historyRows.map((row) => ({
      date: formatDateTimeMx(row.created_at),
      transition: `${toStatusLabel(row.from_status || 'NEW')} -> ${toStatusLabel(row.to_status || '-')}`,
      actor: resolvePerson(row.actor_id),
      note: row.note || undefined,
    }))

    if (!timeline.length) {
      timeline.push({
        date: formatDateTimeMx((ticket as any).created_at),
        transition: 'Creacion del ticket',
        actor: resolvePerson(requesterId),
      })

      if ((ticket as any).closed_at) {
        timeline.push({
          date: formatDateTimeMx((ticket as any).closed_at),
          transition: `Cierre (${toStatusLabel((ticket as any).status)})`,
          actor: resolvePerson(closedById),
        })
      }
    }

    const commentsForPdfSource = comments.slice(0, 140)
    const commentsForPdf: TicketDetailCommentItem[] = commentsForPdfSource.map((comment) => ({
      date: formatDateTimeMx(comment.created_at),
      author: resolvePerson(comment.author_id),
      visibility: comment.visibility === 'internal' ? 'internal' : 'public',
      body: String(comment.body || ''),
    }))

    const summary = [
      { label: 'Estado', value: toStatusLabel((ticket as any).status) },
      { label: 'Prioridad', value: toPriorityLabel((ticket as any).priority) },
      { label: 'Nivel', value: `N${(ticket as any).support_level || 1}` },
      { label: 'Antiguedad', value: toDaysOpenLabel((ticket as any).created_at, (ticket as any).closed_at) },
      { label: 'Comentarios', value: String(comments.length) },
      { label: 'Adjuntos', value: String(attachmentCount || 0) },
    ]

    const logo = logoOverride ?? (await loadZiiiLogoDataUrl())

    const pdf = generateTicketDetailPdf({
      ticketCode,
      title: String((ticket as any).title || 'Ticket sin titulo'),
      subtitle: String((ticket as any).title || 'Ticket sin titulo'),
      moduleLabel: isMaintenance ? 'Mantenimiento' : 'Helpdesk IT',
      generatedAt: new Date(),
      generatedBy: (viewerProfile as ViewerProfile | null)?.full_name || user.email || 'Sistema ZIII',
      logo: logo ?? undefined,
      summary,
      contextFields,
      description: String((ticket as any).description || 'Sin descripcion registrada.'),
      resolution: String((ticket as any).resolution || '') || null,
      timeline,
      comments: commentsForPdf,
      commentsTruncated: comments.length > commentsForPdf.length,
    })

    const safeCode = ticketCode.replace(/[^a-zA-Z0-9-_]/g, '_')
    const datePart = new Date().toISOString().slice(0, 10)
    const filename = `${isMaintenance ? 'ticket-mantenimiento' : 'ticket-it'}-${safeCode}-${datePart}.pdf`

    return new Response(new Blob([pdf], { type: 'application/pdf' }), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[ticket-detail-pdf] Unexpected error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
