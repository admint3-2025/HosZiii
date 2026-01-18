import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import DisposalActionsClient from './ui/DisposalActionsClient'

export default async function DisposalsPage() {
  // La validación de rol está en /admin/layout.tsx
  
  // Obtener todas las solicitudes con datos completos
  const adminClient = createSupabaseAdminClient()
  
  const { data: requests } = await adminClient
    .from('asset_disposal_requests')
    .select(`
      *,
      asset:assets(
        id, asset_tag, asset_type, brand, model, serial_number, image_url,
        location:locations(name, code)
      )
    `)
    .order('requested_at', { ascending: false })
  
  // Enriquecer con datos de solicitante y revisor
  const enrichedRequests = await Promise.all((requests || []).map(async (req) => {
    // Obtener solicitante
    const { data: requesterProfile } = await adminClient
      .from('profiles')
      .select('full_name')
      .eq('id', req.requested_by)
      .single()
    
    const { data: requesterUser } = await adminClient.auth.admin.getUserById(req.requested_by)
    
    // Obtener tickets relacionados con el activo
    const { data: tickets } = await adminClient
      .from('tickets')
      .select('id, ticket_number, title, status, priority, created_at, closed_at')
      .eq('asset_id', req.asset_id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(10)
    
    // Obtener historial de cambios
    const { data: changes } = await adminClient
      .from('asset_changes')
      .select('*')
      .eq('asset_id', req.asset_id)
      .order('changed_at', { ascending: false })
      .limit(10)
    
    // Obtener revisor si existe
    let reviewerName = null
    if (req.reviewed_by) {
      const { data: reviewerProfile } = await adminClient
        .from('profiles')
        .select('full_name')
        .eq('id', req.reviewed_by)
        .single()
      reviewerName = reviewerProfile?.full_name
    }
    
    return {
      ...req,
      requester_name: requesterProfile?.full_name || 'Usuario',
      requester_email: requesterUser?.user?.email || '',
      reviewer_name: reviewerName,
      tickets: tickets || [],
      changes: changes || []
    }
  }))
  
  const pendingCount = enrichedRequests.filter(r => r.status === 'pending').length
  const approvedCount = enrichedRequests.filter(r => r.status === 'approved').length
  const rejectedCount = enrichedRequests.filter(r => r.status === 'rejected').length

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/assets" className="text-sm text-gray-500 hover:text-gray-700">
            ← Volver a Activos
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900 mt-2">Solicitudes de Baja</h1>
          <p className="text-sm text-gray-500 mt-1">Gestiona las autorizaciones de baja de activos</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-semibold text-amber-600">{pendingCount}</div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pendientes</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-semibold text-green-600">{approvedCount}</div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Aprobadas</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-semibold text-red-600">{rejectedCount}</div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Rechazadas</div>
          </div>
        </div>

        {/* Lista */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <DisposalActionsClient requests={enrichedRequests} />
        </div>
      </div>
    </div>
  )
}
