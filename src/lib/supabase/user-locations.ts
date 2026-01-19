/**
 * Utilidad client-side para obtener las sedes de un usuario
 * Lógica unificada para IT y Mantenimiento
 * 
 * Reglas de negocio:
 * - Usuario normal (requester): solo su sede asignada (profiles.location_id)
 * - Supervisor: todas sus sedes (user_locations + profiles.location_id)
 * - Admin/Admin Corporativo: al crear tickets actúan como usuario de su sede (profiles.location_id)
 * - Admin ve TODO cuando está en modo gestión
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type UserLocationInfo = {
  userId: string
  role: string
  /** Sede principal del perfil */
  primaryLocationId: string | null
  /** Todas las sedes del usuario (incluyendo la principal) */
  allLocationIds: string[]
  /** True si el usuario puede ver todas las sedes (admin en modo gestión) */
  canViewAllLocations: boolean
}

/**
 * Obtiene información de sedes para un usuario en contexto client-side
 * 
 * @param supabase - Cliente de Supabase browser
 * @param userId - ID del usuario
 * @returns Información de sedes del usuario
 */
export async function getUserLocationInfo(
  supabase: SupabaseClient,
  userId: string
): Promise<UserLocationInfo | null> {
  try {
    // 1. Obtener perfil del usuario
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, location_id')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      console.error('[getUserLocationInfo] Error obteniendo perfil:', profileError)
      return null
    }

    const role = profile.role as string
    const primaryLocationId = profile.location_id as string | null

    // 2. Obtener sedes adicionales desde user_locations
    const { data: userLocs, error: locsError } = await supabase
      .from('user_locations')
      .select('location_id')
      .eq('user_id', userId)

    if (locsError) {
      console.error('[getUserLocationInfo] Error obteniendo user_locations:', locsError)
    }

    // 3. Combinar sedes
    const allLocationIds: string[] = []
    
    // Agregar sedes de user_locations
    if (userLocs) {
      for (const ul of userLocs) {
        if (ul.location_id && !allLocationIds.includes(ul.location_id)) {
          allLocationIds.push(ul.location_id)
        }
      }
    }
    
    // Agregar sede principal si no está ya incluida
    if (primaryLocationId && !allLocationIds.includes(primaryLocationId)) {
      allLocationIds.push(primaryLocationId)
    }

    // 4. Determinar si puede ver todas las sedes
    // Solo admin en modo gestión (no cuando crea tickets)
    const canViewAllLocations = role === 'admin'

    return {
      userId,
      role,
      primaryLocationId,
      allLocationIds,
      canViewAllLocations,
    }
  } catch (error) {
    console.error('[getUserLocationInfo] Error inesperado:', error)
    return null
  }
}

/**
 * Obtiene los IDs de sedes para filtrar activos según el contexto
 * 
 * @param supabase - Cliente de Supabase browser
 * @param userId - ID del usuario actual
 * @param mode - 'ticket' para crear tickets (admin actúa como usuario), 'management' para gestión de inventario
 * @returns Array de location_ids para filtrar, o null si puede ver todo
 */
export async function getLocationIdsForAssetFilter(
  supabase: SupabaseClient,
  userId: string,
  mode: 'ticket' | 'management' = 'ticket'
): Promise<string[] | null> {
  const info = await getUserLocationInfo(supabase, userId)
  if (!info) {
    console.error('[getLocationIdsForAssetFilter] ❌ No se pudo obtener info del usuario')
    return []
  }

  const { role, allLocationIds, canViewAllLocations } = info

  console.log('[getLocationIdsForAssetFilter] 🔍 Usuario:', userId, 'Rol:', role, 'Modo:', mode)

  // Admin siempre ve todo (sin filtro de sedes)
  if (['admin', 'corporate_admin'].includes(role)) {
    console.log('[getLocationIdsForAssetFilter] ✅ Admin detectado - retornando NULL (sin filtro)')
    return null // null = sin filtro, ve todos los activos
  }

  // Supervisor siempre ve todas sus sedes asignadas
  if (role === 'supervisor') {
    return allLocationIds.length > 0 ? allLocationIds : []
  }

  // Usuario normal (requester, agent_l1, agent_l2): solo sus sedes asignadas
  return allLocationIds.length > 0 ? allLocationIds : []
}

/**
 * Aplica filtro de sedes a una query de Supabase para activos
 * 
 * @param query - Query de Supabase
 * @param locationIds - Array de location_ids o null para sin filtro
 * @returns Query modificada con el filtro aplicado
 */
export function applyLocationFilterToQuery<T>(
  query: any,
  locationIds: string[] | null
): any {
  if (locationIds === null) {
    // Sin filtro: admin en modo gestión
    return query
  }

  if (locationIds.length === 0) {
    // Sin sedes asignadas: query imposible
    return query.eq('location_id', 'impossible-match-no-locations')
  }

  if (locationIds.length === 1) {
    // Una sola sede: usar .eq()
    return query.eq('location_id', locationIds[0])
  }

  // Múltiples sedes: usar .in()
  return query.in('location_id', locationIds)
}
