/**
 * Helper para obtener el filtro de ubicaciones en reportes según el rol del usuario
 * 
 * - Admins y auditores: ven todos los reportes sin filtro
 * - Supervisores con can_view_all_reports=true: ven todos los reportes
 * - Supervisores con can_view_all_reports=false: solo ven datos de sus sedes asignadas
 * - Otros roles (agentes, requesters): ven datos solo de sus sedes asignadas
 */

import { createSupabaseServerClient, getSafeServerUser } from '@/lib/supabase/server'

export type ReportsLocationFilter = {
  shouldFilter: boolean
  locationIds: string[]
  role: string | null
  hasFullAccess: boolean
}

export async function getReportsLocationFilter(): Promise<ReportsLocationFilter> {
  const user = await getSafeServerUser()
  
  if (!user) {
    return {
      shouldFilter: true,
      locationIds: [],
      role: null,
      hasFullAccess: false
    }
  }

  const supabase = await createSupabaseServerClient()

  // Obtener perfil del usuario
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, location_id, can_view_all_reports')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return {
      shouldFilter: true,
      locationIds: [],
      role: null,
      hasFullAccess: false
    }
  }

  // Admins y auditores tienen acceso completo
  if (profile.role === 'admin' || profile.role === 'auditor') {
    return {
      shouldFilter: false,
      locationIds: [],
      role: profile.role,
      hasFullAccess: true
    }
  }

  // Supervisores con permiso especial tienen acceso completo
  if (profile.role === 'supervisor' && profile.can_view_all_reports === true) {
    return {
      shouldFilter: false,
      locationIds: [],
      role: profile.role,
      hasFullAccess: true
    }
  }

  // Supervisores sin permiso especial: filtrar por sus sedes
  if (profile.role === 'supervisor') {
    const locationIds: string[] = []

    // Obtener sedes asignadas desde user_locations
    const { data: userLocs } = await supabase
      .from('user_locations')
      .select('location_id')
      .eq('user_id', user.id)

    if (userLocs && userLocs.length > 0) {
      locationIds.push(...userLocs.map(ul => ul.location_id))
    }

    // Incluir también la location_id del perfil si existe
    if (profile.location_id && !locationIds.includes(profile.location_id)) {
      locationIds.push(profile.location_id)
    }

    return {
      shouldFilter: true,
      locationIds,
      role: profile.role,
      hasFullAccess: false
    }
  }

  // Para otros roles (agentes, requesters): filtrar por sus sedes asignadas
  const locationIds: string[] = []

  // Obtener sedes asignadas desde user_locations
  const { data: userLocs } = await supabase
    .from('user_locations')
    .select('location_id')
    .eq('user_id', user.id)

  if (userLocs && userLocs.length > 0) {
    locationIds.push(...userLocs.map(ul => ul.location_id))
  }

  // Incluir también la location_id del perfil si existe
  if (profile.location_id && !locationIds.includes(profile.location_id)) {
    locationIds.push(profile.location_id)
  }

  return {
    shouldFilter: true,
    locationIds,
    role: profile.role,
    hasFullAccess: false
  }
}
