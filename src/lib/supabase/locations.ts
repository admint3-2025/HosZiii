/**
 * Utilidades para manejo de ubicaciones/sedes multisede
 */

import { createSupabaseServerClient, getSafeServerUser } from './server'

export type Location = {
  id: string
  name: string
  code: string
  address: string | null
  city: string | null
  state: string | null
  country: string | null
  phone: string | null
  email: string | null
  manager_name: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Obtiene todas las ubicaciones activas
 */
export async function getAllLocations(): Promise<Location[]> {
  const supabase = await createSupabaseServerClient()
  
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('is_active', true)
    .order('name')
  
  if (error) {
    console.error('Error fetching locations:', error)
    return []
  }
  
  return data as Location[]
}

/**
 * Obtiene la ubicación de un usuario específico
 */
export async function getUserLocation(userId: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .select('location_id')
    .eq('id', userId)
    .single()
  
  if (error) {
    console.error('Error fetching user location:', error)
    return null
  }
  
  return data?.location_id || null
}

/**
 * Verifica si el usuario es admin (puede ver todas las sedes)
 */
export async function isAdminUser(userId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()
  
  if (error) {
    console.error('Error checking admin status:', error)
    return false
  }
  
  return data?.role === 'admin'
}

/**
 * Obtiene el filtro de ubicación para queries
 * - Si es admin: null (sin filtro, ve todas las sedes)
 * - Si es supervisor/técnico: array de location_ids de user_locations + profiles.location_id
 * - Si no tiene sedes asignadas: array vacío
 */
export async function getLocationFilter(): Promise<string[] | null> {
  const user = await getSafeServerUser()
  if (!user) return null
  
  const supabase = await createSupabaseServerClient()
  
  // Verificar si es admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, location_id')
    .eq('id', user.id)
    .single()
  
  if (profile?.role === 'admin') return null // Admin ve todo
  
  // Cargar sedes desde user_locations
  const { data: userLocs } = await supabase
    .from('user_locations')
    .select('location_id')
    .eq('user_id', user.id)
  
  const locationIds = userLocs?.map(ul => ul.location_id).filter(Boolean) || []
  
  // Incluir también location_id del perfil si existe y no está ya en el array
  if (profile?.location_id && !locationIds.includes(profile.location_id)) {
    locationIds.push(profile.location_id)
  }
  
  return locationIds.length > 0 ? locationIds : []
}

/**
 * Aplica el filtro de ubicación a una query de Supabase
 * Uso: await applyLocationFilter(supabase.from('tickets').select('*'))
 */
export async function applyLocationFilter<T>(
  query: any
): Promise<any> {
  const locationIds = await getLocationFilter()
  
  if (locationIds === null) {
    // Admin: sin filtro
    return query
  }
  
  if (Array.isArray(locationIds) && locationIds.length > 0) {
    // Múltiples sedes: usar .in()
    return query.in('location_id', locationIds)
  }
  
  // Sin sedes asignadas: query imposible (ningún resultado)
  return query.eq('location_id', 'none')
}

/**
 * Obtiene información detallada de una ubicación
 */
export async function getLocationById(locationId: string): Promise<Location | null> {
  const supabase = await createSupabaseServerClient()
  
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('id', locationId)
    .single()
  
  if (error) {
    console.error('Error fetching location:', error)
    return null
  }
  
  return data as Location
}
