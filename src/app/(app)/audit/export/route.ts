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

  const { data: audit } = await supabase
    .from('audit_log')
    .select('id,action,entity_type,entity_id,actor_id,metadata,created_at')
    .order('created_at', { ascending: false })
    .range(0, 4999)

  const actorIds = [...new Set((audit ?? []).map((a) => a.actor_id).filter(Boolean))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id,full_name,email')
    .in('id', actorIds)

  const userMap = new Map((profiles ?? []).map((p) => [p.id, p]))

  const headers = [
    'created_at',
    'action',
    'entity_type',
    'entity_id',
    'actor_name',
    'actor_email',
    'metadata_json',
  ]

  const rows = (audit ?? []).map((a) => {
    const actor = a.actor_id ? userMap.get(a.actor_id) : null
    return [
      a.created_at ? new Date(a.created_at).toISOString() : '',
      a.action,
      a.entity_type,
      a.entity_id,
      actor?.full_name || '',
      actor?.email || '',
      a.metadata ? JSON.stringify(a.metadata) : '',
    ]
  })

  const csvBody = toCsv(headers, rows)
  const bom = '\uFEFF'
  const nowDate = new Date().toISOString().slice(0, 10)
  const filename = `audit-log-${nowDate}.csv`

  await supabase.from('audit_log').insert({
    entity_type: 'report',
    entity_id: user.id,
    action: 'EXPORT',
    actor_id: user.id,
    metadata: {
      report: 'audit-log',
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
