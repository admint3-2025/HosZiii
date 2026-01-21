import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getReportsLocationFilter } from '@/lib/supabase/reports-filter'
import { toCsv } from '@/lib/reports/csv'
import { formatMaintenanceTicketCode } from '@/lib/tickets/code'

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

  const { data: profile } = await supabase
    .from('profiles')
    .select('role,asset_category')
    .eq('id', user.id)
    .single()

  const canManageMaintenance = profile?.role === 'admin' || profile?.asset_category === 'MAINTENANCE'
  if (!canManageMaintenance) return new Response('Forbidden', { status: 403 })

  const locationFilter = await getReportsLocationFilter()

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')?.trim() || ''
  const status = searchParams.get('status')?.trim() || ''
  const priority = searchParams.get('priority')?.trim() || ''
  const location = searchParams.get('location')?.trim() || ''
  const assigned = searchParams.get('assigned')?.trim() || ''
  const from = searchParams.get('from')?.trim() || ''
  const to = searchParams.get('to')?.trim() || ''

  let query = supabase
    .from('tickets_maintenance')
    .select(
      `
      id,
      ticket_number,
      title,
      status,
      priority,
      support_level,
      created_at,
      updated_at,
      location_id,
      requester_id,
      created_by
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
      const raw = s.substring(1).trim().toUpperCase()
      if (raw.startsWith('MANT-')) {
        query = query.eq('ticket_number', raw)
      } else {
        query = query.or(`ticket_number.ilike.%${raw}%,title.ilike.%${search}%`)
      }
    } else {
      query = query.or(`title.ilike.%${search}%`)
    }
  }

  if (status) query = query.eq('status', status)
  if (priority) {
    const p = parseInt(priority)
    if (!isNaN(p)) query = query.eq('priority', p)
  }
  if (location) query = query.eq('location_id', location)

  if (assigned === 'assigned') {
    query = query.not('assigned_to', 'is', null)
  } else if (assigned === 'unassigned') {
    query = query.is('assigned_to', null)
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

  const { data: rawTickets, error } = await query.order('created_at', { ascending: false }).range(0, 4999)
  if (error) return new Response(error.message, { status: 500 })

  const tickets = rawTickets ?? []

  const locationIds = [...new Set(tickets.map((t: any) => t.location_id).filter(Boolean))]
  const { data: locations } = locationIds.length
    ? await supabase.from('locations').select('id,code,name').in('id', locationIds)
    : { data: [] as any[] }
  const locationMap = new Map((locations ?? []).map((l: any) => [l.id, l]))

  const userIds = [
    ...new Set(
      tickets
        .flatMap((t: any) => [t.requester_id || t.created_by])
        .filter(Boolean),
    ),
  ]

  const users = await fetchProfilesSafe(supabase, userIds)
  const userMap = new Map(users.map((u: any) => [u.id, u]))

  const headers = [
    'ticket_code',
    'ticket_number',
    'title',
    'status',
    'priority',
    'support_level',
    'requester_name',
    'location_code',
    'location_name',
    'created_at',
  ]

  const rows = tickets.map((t: any) => {
    const requesterId = t.requester_id || t.created_by
    const requester = requesterId ? userMap.get(requesterId) : null
    const loc = t.location_id ? locationMap.get(t.location_id) : null

    return [
      formatMaintenanceTicketCode({ ticket_number: t.ticket_number, created_at: t.created_at }),
      t.ticket_number,
      t.title ?? '',
      t.status ?? '',
      t.priority ?? '',
      t.support_level ?? '',
      requester?.full_name || requester?.email || '',
      loc?.code || '',
      loc?.name || '',
      t.created_at ? new Date(t.created_at).toISOString() : '',
    ]
  })

  const csvBody = toCsv(headers, rows)
  const bom = '\uFEFF'
  const nowDate = new Date().toISOString().slice(0, 10)
  const filename = `maintenance-all-tickets-${nowDate}.csv`

  return new Response(bom + csvBody, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
