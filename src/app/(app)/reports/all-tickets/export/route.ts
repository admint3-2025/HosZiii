import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getCategoryPathLabel } from '@/lib/categories/path'
import { toCsv } from '@/lib/reports/csv'
import { getReportsLocationFilter } from '@/lib/supabase/reports-filter'
import { formatTicketCode } from '@/lib/tickets/code'

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

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Obtener filtro de ubicación para reportes
  const locationFilter = await getReportsLocationFilter()

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')?.trim() || ''
  const status = searchParams.get('status')?.trim() || ''
  const priority = searchParams.get('priority')?.trim() || ''
  const level = searchParams.get('level')?.trim() || ''
  const location = searchParams.get('location')?.trim() || ''
  const assigned = searchParams.get('assigned')?.trim() || ''
  const from = searchParams.get('from')?.trim() || ''
  const to = searchParams.get('to')?.trim() || ''

  // Construir query base
  let query = supabase
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
      category_id,
      requester_id,
      assigned_agent_id,
      created_at,
      updated_at
    `,
    )
    .is('deleted_at', null)

  // Aplicar filtro de ubicación
  if (locationFilter.shouldFilter && locationFilter.locationIds.length > 0) {
    query = query.in('location_id', locationFilter.locationIds)
  } else if (locationFilter.shouldFilter && locationFilter.locationIds.length === 0) {
    // Usuario sin sedes asignadas: no exportar nada
    query = query.eq('id', '00000000-0000-0000-0000-000000000000')
  }

  if (search) {
    const s = search.toLowerCase()
    if (s.startsWith('#')) {
      const num = parseInt(s.substring(1))
      if (!isNaN(num)) {
        query = query.eq('ticket_number', num)
      }
    } else {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }
  }

  if (status) query = query.eq('status', status)
  if (priority) {
    const p = parseInt(priority)
    if (!isNaN(p)) query = query.eq('priority', p)
  }
  if (level) {
    const lvl = parseInt(level)
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

  const { data: rawTickets } = await query
    .order('created_at', { ascending: false })
    .range(0, 4999)

  const tickets = (rawTickets ?? []).sort((a, b) => {
    const aClosed = a.status === 'CLOSED'
    const bClosed = b.status === 'CLOSED'

    if (aClosed !== bClosed) {
      // Tickets abiertos primero, cerrados al final
      return aClosed ? 1 : -1
    }

    const aCreated = a.created_at ? new Date(a.created_at as string).getTime() : 0
    const bCreated = b.created_at ? new Date(b.created_at as string).getTime() : 0
    return bCreated - aCreated
  })

  const { data: categories } = await supabase.from('categories').select('id,name,parent_id')

  const allUserIds = [
    ...new Set([
      ...tickets.map((t) => t.requester_id),
      ...tickets.map((t) => t.assigned_agent_id).filter(Boolean),
    ]),
  ]

  const filteredUserIds = allUserIds.filter(Boolean)

  const profiles = await fetchProfilesSafe(supabase, filteredUserIds)
  const userMap = new Map((profiles ?? []).map((p: any) => [p.id, p]))

  const headers = [
    'ticket_code',
    'ticket_number',
    'title',
    'status',
    'priority',
    'support_level',
    'category',
    'requester_name',
    'requester_email',
    'assigned_agent_name',
    'assigned_agent_email',
    'created_at',
    'updated_at',
  ]

  const rows = tickets.map((t) => {
    const requester = userMap.get(t.requester_id)
    const agent = t.assigned_agent_id ? userMap.get(t.assigned_agent_id) : null

    return [
      formatTicketCode({ ticket_number: t.ticket_number, created_at: t.created_at }),
      t.ticket_number,
      t.title,
      t.status,
      t.priority,
      t.support_level,
      getCategoryPathLabel(categories ?? [], t.category_id) || '',
      requester?.full_name || requester?.email || '',
      requester?.email || '',
      agent?.full_name || agent?.email || '',
      agent?.email || '',
      t.created_at ? new Date(t.created_at).toISOString() : '',
      t.updated_at ? new Date(t.updated_at).toISOString() : '',
    ]
  })

  const csvBody = toCsv(headers, rows)
  const bom = '\uFEFF'
  const nowDate = new Date().toISOString().slice(0, 10)
  const filename = `all-tickets-${nowDate}.csv`

  // Best-effort audit log (export should still work if RLS blocks insert)
  await supabase.from('audit_log').insert({
    entity_type: 'report',
    entity_id: user.id,
    action: 'EXPORT',
    actor_id: user.id,
    metadata: {
      report: 'all-tickets',
      row_count: rows.length,
      filters: {
        search: search || null,
        status: status || null,
        priority: priority || null,
        level: level || null,
        location: location || null,
        assigned: assigned || null,
        from: from || null,
        to: to || null,
      },
    },
  })

  return new Response(bom + csvBody, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
