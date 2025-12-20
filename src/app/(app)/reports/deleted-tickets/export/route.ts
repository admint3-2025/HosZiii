import { createSupabaseServerClient } from '@/lib/supabase/server'
import { toCsv } from '@/lib/reports/csv'

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role
  const allowed = role === 'auditor' || role === 'supervisor' || role === 'admin'
  if (!allowed) {
    return new Response('Forbidden', { status: 403 })
  }

  const { data: deletedTickets } = await supabase
    .from('tickets')
    .select(
      `
      id,
      ticket_number,
      title,
      status,
      priority,
      created_at,
      deleted_at,
      deleted_by,
      deleted_reason
    `,
    )
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })
    .range(0, 4999)

  const userIds = [...new Set((deletedTickets ?? []).map((t) => t.deleted_by).filter(Boolean))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id,full_name,email')
    .in('id', userIds)

  const userMap = new Map((profiles ?? []).map((p) => [p.id, p]))

  const headers = [
    'ticket_number',
    'title',
    'status',
    'priority',
    'created_at',
    'deleted_at',
    'deleted_by_name',
    'deleted_by_email',
    'deleted_reason',
  ]

  const rows = (deletedTickets ?? []).map((t) => {
    const deletedBy = t.deleted_by ? userMap.get(t.deleted_by) : null
    return [
      t.ticket_number,
      t.title,
      t.status,
      t.priority,
      t.created_at ? new Date(t.created_at).toISOString() : '',
      t.deleted_at ? new Date(t.deleted_at).toISOString() : '',
      deletedBy?.full_name || '',
      deletedBy?.email || '',
      t.deleted_reason || '',
    ]
  })

  const csvBody = toCsv(headers, rows)
  const bom = '\uFEFF'
  const nowDate = new Date().toISOString().slice(0, 10)
  const filename = `deleted-tickets-${nowDate}.csv`

  await supabase.from('audit_log').insert({
    entity_type: 'report',
    entity_id: user.id,
    action: 'EXPORT',
    actor_id: user.id,
    metadata: {
      report: 'deleted-tickets',
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
