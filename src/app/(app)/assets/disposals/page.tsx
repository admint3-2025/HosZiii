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
    .select('*')
    .order('requested_at', { ascending: false })
  
  // Enriquecer con datos de solicitante y revisor
  const enrichedRequests = await Promise.all((requests || []).map(async (req) => {
    // Extraer datos del snapshot
    const assetSnapshot = req.asset_snapshot as any
    const asset = assetSnapshot ? {
      id: assetSnapshot.id,
      asset_tag: assetSnapshot.asset_tag,
      asset_type: assetSnapshot.asset_type,
      brand: assetSnapshot.brand,
      model: assetSnapshot.model,
      serial_number: assetSnapshot.serial_number,
      image_url: assetSnapshot.image_url,
      location: {
        name: assetSnapshot.location_name,
        code: null
      }
    } : null
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
      asset,
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header con degradado */}
        <div className="mb-8">
          <Link 
            href="/assets" 
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors mb-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver a Activos
          </Link>
          
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl shadow-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Solicitudes de Baja</h1>
              <p className="text-slate-600 mt-1">Gestiona las autorizaciones de baja de activos</p>
            </div>
          </div>
        </div>

        {/* Stats Cards con diseño moderno */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Pendientes */}
          <div className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-amber-100 hover:shadow-md transition-all duration-200">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-400/20 to-amber-500/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                  PENDIENTES
                </span>
              </div>
              <div className="text-4xl font-bold text-amber-600 mb-1">{pendingCount}</div>
              <div className="text-sm text-slate-600">Esperando aprobación</div>
            </div>
          </div>

          {/* Aprobadas */}
          <div className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-green-100 hover:shadow-md transition-all duration-200">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-400/20 to-green-500/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full">
                  APROBADAS
                </span>
              </div>
              <div className="text-4xl font-bold text-green-600 mb-1">{approvedCount}</div>
              <div className="text-sm text-slate-600">Bajas autorizadas</div>
            </div>
          </div>

          {/* Rechazadas */}
          <div className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-red-100 hover:shadow-md transition-all duration-200">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-400/20 to-red-500/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-red-600 bg-red-50 px-3 py-1 rounded-full">
                  RECHAZADAS
                </span>
              </div>
              <div className="text-4xl font-bold text-red-600 mb-1">{rejectedCount}</div>
              <div className="text-sm text-slate-600">Solicitudes denegadas</div>
            </div>
          </div>
        </div>

        {/* Lista con diseño mejorado */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
          <DisposalActionsClient requests={enrichedRequests} />
        </div>
      </div>
    </div>
  )
}
