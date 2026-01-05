import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getCategoryPathLabel } from '@/lib/categories/path'
import { toCsv } from '@/lib/reports/csv'

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { data: rawTickets } = await supabase
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

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id,full_name,email')
    .in('id', allUserIds)

  const userMap = new Map((profiles ?? []).map((p) => [p.id, p]))

  const headers = [
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
      t.ticket_number,
      t.title,
      t.status,
      t.priority,
      t.support_level,
      getCategoryPathLabel(categories ?? [], t.category_id) || '',
      requester?.full_name || '',
      requester?.email || '',
      agent?.full_name || '',
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
