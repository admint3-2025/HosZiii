import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getLocationFilter } from '@/lib/supabase/locations'
import { redirect } from 'next/navigation'
import AuditTable from './ui/AuditTable'

// Mapeos para traducir términos técnicos
const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Creación',
  UPDATE: 'Modificación',
  SOFT_DELETE: 'Eliminación',
  LOGIN: 'Inicio de sesión',
  LOGOUT: 'Cierre de sesión',
}

const ENTITY_LABELS: Record<string, string> = {
  ticket: 'Ticket/Incidencia',
  user: 'Usuario',
  category: 'Categoría',
  comment: 'Comentario',
  attachment: 'Archivo adjunto',
  asset: 'Activo',
  report: 'Reporte',
}

// Función para formatear cambios de forma legible
function formatChanges(metadata: any, entityType: string): string {
  if (!metadata?.changes) return ''
  
  const changes = metadata.changes
  const parts: string[] = []
  
  // Cambios de activos
  if (entityType === 'asset') {
    if (changes.status) {
      parts.push(`Estado: ${changes.status.from} → ${changes.status.to}`)
    }
    if (changes.location) {
      parts.push(`Sede: ${changes.location.from || 'Sin asignar'} → ${changes.location.to}`)
    }
    if (changes.assigned_to) {
      parts.push(`Responsable: ${changes.assigned_to.from || 'Sin asignar'} → ${changes.assigned_to.to || 'Sin asignar'}`)
    }
  }
  
  return parts.join(' | ')
}

export default async function AuditPage() {
  const supabase = await createSupabaseServerClient()
  const adminClient = createSupabaseAdminClient()
  
  // Verificar que el usuario sea admin o supervisor
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, location_id')
    .eq('id', user.id)
    .single()
  
  if (!profile || (profile.role !== 'admin' && profile.role !== 'supervisor')) {
    redirect('/dashboard')
  }

  // Obtener filtro de ubicación
  const locationFilter = await getLocationFilter()
  
  // Construir query base
  let auditQuery = supabase
    .from('audit_log')
    .select('id,action,entity_type,entity_id,actor_id,metadata,created_at')

  // Para auditoría de tickets, filtrar por ubicación si no es admin
  // Obtenemos los IDs de tickets de la ubicación del usuario
  if (locationFilter) {
    const { data: locationTickets } = await supabase
      .from('tickets')
      .select('id')
      .eq('location_id', locationFilter)
    
    const ticketIds = locationTickets?.map(t => t.id) ?? []
    
    // Filtrar auditoría: solo tickets de la ubicación o acciones no relacionadas con tickets
    if (ticketIds.length > 0) {
      auditQuery = auditQuery.or(`entity_type.neq.ticket,entity_id.in.(${ticketIds.join(',')})`)
    } else {
      auditQuery = auditQuery.neq('entity_type', 'ticket')
    }
  }

  const { data: audit } = await auditQuery
    .order('created_at', { ascending: false })
    .limit(200)

  // Obtener información completa de usuarios actores (con rol)
  const actorIds = [...new Set((audit ?? []).map(a => a.actor_id).filter(Boolean))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id,full_name,email,role')
    .in('id', actorIds)

  const userMap = new Map<string, any>()
  
  // Obtener emails desde auth.users para usuarios que no tienen profile
  for (const actorId of actorIds) {
    const profile = profiles?.find(p => p.id === actorId)
    if (profile) {
      userMap.set(actorId, profile)
    } else {
      // Intentar obtener de auth.users
      try {
        const { data: authUser } = await adminClient.auth.admin.getUserById(actorId)
        if (authUser?.user) {
          userMap.set(actorId, {
            id: actorId,
            email: authUser.user.email,
            full_name: authUser.user.user_metadata?.full_name || authUser.user.email?.split('@')[0],
            role: 'user',
          })
        }
      } catch (err) {
        console.error('Error obteniendo usuario:', err)
      }
    }
  }

  // Estadísticas
  const actionCounts = (audit ?? []).reduce((acc, a) => {
    const label = ACTION_LABELS[a.action] || a.action
    acc[label] = (acc[label] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <main className="p-6 space-y-6">
      {/* Header compacto */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 shadow-md">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-24 -mt-24"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-400/20 rounded-full blur-3xl -ml-24 -mb-24"></div>

        <div className="relative z-10 px-5 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-md">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Auditoría</h1>
                <p className="text-blue-100 text-[11px]">Registro completo de acciones críticas del sistema</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                className="px-2.5 py-1.5 text-[11px] font-semibold rounded-md bg-white/10 text-white border border-white/20 backdrop-blur-sm hover:bg-white/15 transition-colors"
                href="/audit/export-csv"
              >
                CSV
              </a>
              <a
                className="px-2.5 py-1.5 text-[11px] font-semibold rounded-md bg-white/10 text-white border border-white/20 backdrop-blur-sm hover:bg-white/15 transition-colors"
                href="/reports"
              >
                ← Volver
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas compactas */}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(actionCounts).map(([action, count]) => {
          const colorMap: Record<string, string> = {
            'Eliminación': 'bg-red-50 border-red-200 text-red-700',
            'Modificación': 'bg-blue-50 border-blue-200 text-blue-700',
            'Creación': 'bg-green-50 border-green-200 text-green-700',
          }
          const color = colorMap[action] || 'bg-gray-50 border-gray-200 text-gray-700'
          
          return (
            <div key={action} className={`card border ${color}`}>
              <div className="p-3">
                <div className="text-[10px] font-semibold opacity-80 uppercase">{action}</div>
                <div className="text-lg font-bold mt-0.5">{count}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Tabla compacta de auditoría */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <AuditTable 
            audit={audit ?? []}
            userMap={userMap}
          />
        </div>
      </div>

      {/* Nota informativa compacta */}
      <div className="card bg-blue-50 border-blue-200">
        <div className="p-3">
          <div className="flex gap-2.5">
            <div className="text-xl">🔒</div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 text-sm mb-0.5">Política de retención</h3>
              <p className="text-[11px] text-blue-700 leading-relaxed">
                Los registros de auditoría se mantienen indefinidamente para cumplimiento normativo.
                Incluyen timestamp preciso, usuario responsable, tipo de acción y metadata contextual.
                Esta información es inmutable y no puede ser alterada.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
