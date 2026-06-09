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

  // Solo administradores pueden exportar auditoría
  if (profile?.role !== 'admin') {
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

  // Función helper para traducir acciones
  const translateAction = (action: string) => {
    const translations: Record<string, string> = {
      'CREATE': 'Creación',
      'UPDATE': 'Actualización',
      'DELETE': 'Eliminación',
      'EXPORT': 'Exportación',
      'ASSIGN': 'Asignación',
      'COMMENT': 'Comentario',
      'CLOSE': 'Cierre',
      'REOPEN': 'Reapertura',
    }
    return translations[action] || action
  }

  // Función helper para traducir tipos de entidad
  const translateEntityType = (type: string) => {
    const translations: Record<string, string> = {
      'ticket': 'Ticket',
      'user': 'Usuario',
      'asset': 'Activo',
      'report': 'Reporte',
      'comment': 'Comentario',
    }
    return translations[type] || type
  }

  // Función helper para extraer detalles relevantes del metadata
  const extractMetadataDetails = (metadata: any, action: string, entityType: string) => {
    if (!metadata) return ''
    
    const details: string[] = []
    
    // Para tickets
    if (entityType === 'ticket') {
      if (metadata.title) details.push(`Título: ${metadata.title}`)
      if (metadata.status) details.push(`Estado: ${metadata.status}`)
      if (metadata.priority !== undefined) details.push(`Prioridad: P${metadata.priority}`)
      if (metadata.assigned_to_name) details.push(`Asignado a: ${metadata.assigned_to_name}`)
    }
    
    // Para usuarios
    if (entityType === 'user') {
      if (metadata.updates?.full_name) details.push(`Nombre: ${metadata.updates.full_name}`)
      if (metadata.updates?.role) details.push(`Rol: ${metadata.updates.role}`)
      if (metadata.email) details.push(`Email: ${metadata.email}`)
      if (metadata.updates?.active !== undefined) details.push(`Estado: ${metadata.updates.active ? 'Activo' : 'Desactivado'}`)
      if (metadata.hard_delete) {
        if (metadata.target_label) details.push(`Hard reset: ${metadata.target_label}`)
        if (metadata.target_email) details.push(`Email eliminado: ${metadata.target_email}`)
        if (metadata.target_role) details.push(`Rol previo: ${metadata.target_role}`)
        if (metadata.cleanup_summary?.tickets_requester_reassigned) {
          details.push(`Tickets reasignados: ${metadata.cleanup_summary.tickets_requester_reassigned}`)
        }
        if (metadata.cleanup_summary?.ticket_comments_reassigned) {
          details.push(`Comentarios IT reasignados: ${metadata.cleanup_summary.ticket_comments_reassigned}`)
        }
        if (metadata.cleanup_summary?.maintenance_comments_reassigned) {
          details.push(`Comentarios mantto reasignados: ${metadata.cleanup_summary.maintenance_comments_reassigned}`)
        }
      }
    }
    
    // Para activos
    if (entityType === 'asset') {
      if (metadata.asset_tag) details.push(`Tag: ${metadata.asset_tag}`)
      if (metadata.asset_type) details.push(`Tipo: ${metadata.asset_type}`)
      if (metadata.status) details.push(`Estado: ${metadata.status}`)
      if (metadata.location_id) details.push(`Ubicación: ${metadata.location_id}`)
    }
    
    // Para comentarios
    if (action === 'COMMENT' && metadata.comment) {
      const preview = metadata.comment.length > 100 
        ? metadata.comment.substring(0, 100) + '...' 
        : metadata.comment
      details.push(`Comentario: ${preview}`)
    }
    
    return details.length > 0 ? details.join(' | ') : ''
  }

  const headers = [
    'Fecha y Hora',
    'Acción',
    'Tipo de Entidad',
    'ID Entidad',
    'Usuario Responsable',
    'Email',
    'Detalles',
  ]

  const rows = (audit ?? []).map((a) => {
    const actor = a.actor_id ? userMap.get(a.actor_id) : null
    const timestamp = a.created_at ? new Date(a.created_at).toLocaleString('es-MX', { 
      timeZone: 'America/Mexico_City',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }) : ''
    
    return [
      timestamp,
      translateAction(a.action),
      translateEntityType(a.entity_type),
      a.entity_id || '',
      actor?.full_name || 'Sistema',
      actor?.email || '',
      extractMetadataDetails(a.metadata, a.action, a.entity_type),
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
