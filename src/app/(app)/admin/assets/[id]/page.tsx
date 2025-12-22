import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import AssetDetailView from './ui/AssetDetailView'
import AssetTicketHistory from './ui/AssetTicketHistory'

export default async function AssetDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createSupabaseServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard')
  }

  // Load asset with creator info
  const { data: asset } = await supabase
    .from('assets')
    .select(`
      *,
      created_by_profile:profiles!assets_created_by_fkey(full_name)
    `)
    .eq('id', params.id)
    .is('deleted_at', null)
    .single()

  if (!asset) {
    redirect('/admin/assets')
  }

  // Load ticket history - query tickets directly with joins
  const { data: tickets } = await supabase
    .from('tickets')
    .select(`
      id,
      ticket_number,
      title,
      status,
      priority,
      created_at,
      closed_at,
      requester:profiles!tickets_requester_id_fkey(full_name),
      assigned:profiles!tickets_assigned_agent_id_fkey(full_name)
    `)
    .eq('asset_id', params.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const ticketHistory = tickets?.map((t: any) => ({
    ticket_id: t.id,
    ticket_number: t.ticket_number,
    ticket_title: t.title,
    ticket_status: t.status,
    ticket_priority: t.priority,
    ticket_created_at: t.created_at,
    ticket_closed_at: t.closed_at,
    requester_name: t.requester?.full_name || null,
    assigned_name: t.assigned?.full_name || null,
  })) || []

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <a
          href="/admin/assets"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </a>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Detalle del activo</h1>
          <p className="text-gray-600 text-lg font-mono">{asset.asset_tag}</p>
        </div>
      </div>

      <AssetDetailView asset={asset} />
      <AssetTicketHistory history={ticketHistory} />
    </div>
  )
}
