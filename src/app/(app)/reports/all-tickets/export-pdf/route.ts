import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getReportsLocationFilter } from '@/lib/supabase/reports-filter'
import {
  generateTicketsReportPdf,
  translateTicketPriorityEs,
  translateTicketStatusEs,
} from '@/lib/pdf/tickets-report'
import { loadZiiiLogoDataUrl } from '@/lib/pdf/ziii-logo'
import { formatTicketCode } from '@/lib/tickets/code'

export const runtime = 'nodejs'

async function fetchProfilesSafe(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userIds: string[],
): Promise<Array<{ id: string; full_name: string | null; email?: string | null }>> {
  if (!userIds.length) return []

  const primary = await supabase.from('profiles').select('id,full_name,email').in('id', userIds)
  if (!primary.error) return (primary.data ?? []) as any

  const fallback = await supabase.from('profiles').select('id,full_name').in('id', userIds)
  return (fallback.data ?? []) as any
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role
  const allowed = role === 'auditor' || role === 'supervisor' || role === 'admin'
  if (!allowed) return new Response('Forbidden', { status: 403 })

  const locationFilter = await getReportsLocationFilter()

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')?.trim() || ''
  const statusFilter = searchParams.get('status')?.trim() || ''
  const priorityFilter = searchParams.get('priority')?.trim() || ''
  const levelFilter = searchParams.get('level')?.trim() || ''
  const location = searchParams.get('location')?.trim() || ''
  const assigned = searchParams.get('assigned')?.trim() || ''
  const from = searchParams.get('from')?.trim() || ''
  const to = searchParams.get('to')?.trim() || ''

  let query = supabase
    .from('tickets')
    .select(
      `
      id,
      ticket_number,
      title,
      status,
      priority,
      support_level,
      requester_id,
      assigned_agent_id,
      created_at,
      location_id
    `,
    )
    .is('deleted_at', null)

  if (locationFilter.shouldFilter && locationFilter.locationIds.length > 0) {
    query = query.in('location_id', locationFilter.locationIds)
  } else if (locationFilter.shouldFilter && locationFilter.locationIds.length === 0) {
    query = query.eq('id', '00000000-0000-0000-0000-000000000000')
  }

  if (search) {
    const s = search.toLowerCase().trim()
    if (s.startsWith('#')) {
      const num = parseInt(s.substring(1))
      if (!isNaN(num)) {
        query = query.eq('ticket_number', num)
      }
    } else {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }
  }

  if (statusFilter) query = query.eq('status', statusFilter)

  if (priorityFilter) {
    const p = parseInt(priorityFilter)
    if (!isNaN(p)) query = query.eq('priority', p)
  }

  if (levelFilter) {
    const lvl = parseInt(levelFilter)
    if (!isNaN(lvl)) query = query.eq('support_level', lvl)
  }

  if (location) query = query.eq('location_id', location)

  if (assigned === 'assigned') {
    query = query.not('assigned_agent_id', 'is', null)
  } else if (assigned === 'unassigned') {
    query = query.is('assigned_agent_id', null)
  }

  if (from) {
    const fromIso = new Date(`${from}T00:00:00.000Z`).toISOString()
    query = query.gte('created_at', fromIso)
  }
  if (to) {
    const d = new Date(`${to}T00:00:00.000Z`)
    d.setUTCDate(d.getUTCDate() + 1)
    query = query.lt('created_at', d.toISOString())
  }

  const { data: rawTickets, error } = await query.order('created_at', { ascending: false }).range(0, 999)
  if (error) return new Response(error.message, { status: 500 })

  const tickets = rawTickets ?? []

  // Locations
  const locationIds = [...new Set(tickets.map((t: any) => t.location_id).filter(Boolean))]
  const { data: locations } = locationIds.length
    ? await supabase.from('locations').select('id,code,name').in('id', locationIds)
    : { data: [] as any[] }
  const locationMap = new Map((locations ?? []).map((l: any) => [l.id, l]))

  // Users
  const userIds = [
    ...new Set([
      ...tickets.map((t: any) => t.requester_id),
      ...tickets.map((t: any) => t.assigned_agent_id),
    ].filter(Boolean)),
  ]

  const users = await fetchProfilesSafe(supabase, userIds)
  const userMap = new Map(users.map((u: any) => [u.id, u]))

  const byStatus = tickets.reduce((acc: Record<string, number>, t: any) => {
    acc[t.status] = (acc[t.status] || 0) + 1
    return acc
  }, {})

  const summary = [
    { label: 'Total', value: String(tickets.length) },
    { label: 'Nuevos', value: String(byStatus.NEW || 0) },
    { label: 'En progreso', value: String((byStatus.ASSIGNED || 0) + (byStatus.IN_PROGRESS || 0)) },
    { label: 'Cerrados', value: String(byStatus.CLOSED || 0) },
  ]

  const rows = tickets.map((t: any) => {
    const requester = t.requester_id ? userMap.get(t.requester_id) : null
    const agent = t.assigned_agent_id ? userMap.get(t.assigned_agent_id) : null
    const loc = t.location_id ? locationMap.get(t.location_id) : null

    return {
      code: formatTicketCode({ ticket_number: t.ticket_number, created_at: t.created_at }),
      title: t.title ?? '',
      status: translateTicketStatusEs(t.status),
      priority: translateTicketPriorityEs(t.priority),
      level: t.support_level != null ? `N${t.support_level}` : '',
      requester: requester?.full_name || requester?.email || '',
      assignee: agent?.full_name || agent?.email || '',
      location: loc?.code || '',
      createdAt: t.created_at
        ? new Date(t.created_at).toLocaleDateString('es-MX', {
            timeZone: 'America/Mexico_City',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : '',
    }
  })

  const logo = await loadZiiiLogoDataUrl()

  const pdf = generateTicketsReportPdf({
    title: 'Reporte Completo de Tickets (IT)',
    subtitle: 'Tickets activos (máx 1000 registros)',
    summary,
    rows,
    generatedAt: new Date(),
    logo: logo ?? undefined,
    columns: [
      { key: 'code', label: 'Código', width: 110 },
      { key: 'title', label: 'Título', width: 260 },
      { key: 'status', label: 'Estado', width: 80 },
      { key: 'priority', label: 'Prioridad', width: 70 },
      { key: 'level', label: 'Nivel', width: 55 },
      { key: 'requester', label: 'Solicitante', width: 150 },
      { key: 'assignee', label: 'Asignado a', width: 120 },
      { key: 'location', label: 'Sede', width: 70 },
      { key: 'createdAt', label: 'Creado', width: 90 },
    ],
  })

  const pdfBlob = new Blob([pdf], { type: 'application/pdf' })

  const nowDate = new Date().toISOString().slice(0, 10)
  const filename = `all-tickets-${nowDate}.pdf`

  return new Response(pdfBlob, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
