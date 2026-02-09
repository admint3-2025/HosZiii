/**
 * Sistema de permisos unificado
 * Resuelve el problema de roles múltiples y permisos compuestos
 */

export type Role =
  | 'requester'
  | 'agent_l1'
  | 'agent_l2'
  | 'supervisor'
  | 'auditor'
  | 'corporate_admin'
  | 'admin'

export type Permission =
  | 'view_all_tickets'
  | 'manage_tickets'
  | 'assign_tickets'
  | 'close_tickets'
  | 'escalate_tickets'
  | 'view_reports'
  | 'manage_users'
  | 'manage_assets'
  | 'view_beo'
  | 'view_audit'
  | 'manage_locations'
  | 'delete_tickets'
  | 'supervisor_access' // Nuevo: acceso de supervisor (reportes, asignación, etc)

export interface UserProfile {
  role: Role
  is_it_supervisor?: boolean
  is_maintenance_supervisor?: boolean
  asset_category?: string | null
  hub_visible_modules?: Record<string, boolean> | null
}

/**
 * Verifica si un usuario tiene permisos de supervisor para IT
 * corporate_admin: usa hub_visible_modules['it-helpdesk']
 */
export function isITSupervisor(profile: UserProfile): boolean {
  if (profile.role === 'admin') return true
  if (profile.role === 'supervisor' && profile.asset_category === 'IT') return true
  // corporate_admin: verificar hub_visible_modules (preferido) o is_it_supervisor (legacy)
  if (profile.role === 'corporate_admin') {
    if (profile.hub_visible_modules?.['it-helpdesk'] === true) return true
    if (profile.is_it_supervisor === true) return true
  }
  return false
}

/**
 * Verifica si un usuario tiene permisos de supervisor para Mantenimiento
 * corporate_admin: usa hub_visible_modules['mantenimiento']
 */
export function isMaintenanceSupervisor(profile: UserProfile): boolean {
  if (profile.role === 'admin') return true
  if (profile.role === 'supervisor' && profile.asset_category === 'MAINTENANCE') return true
  // corporate_admin: verificar hub_visible_modules (preferido) o is_maintenance_supervisor (legacy)
  if (profile.role === 'corporate_admin') {
    if (profile.hub_visible_modules?.['mantenimiento'] === true) return true
    if (profile.is_maintenance_supervisor === true) return true
  }
  return false
}

/**
 * Verifica si un rol incluye permisos de supervisor (cualquier área)
 * Requiere el perfil completo para verificar permisos específicos de corporate_admin
 */
export function hasSupervisorPermissions(profile: UserProfile): boolean {
  if (profile.role === 'admin' || profile.role === 'supervisor') return true
  if (profile.role === 'corporate_admin') {
    return profile.is_it_supervisor === true || profile.is_maintenance_supervisor === true
  }
  return false
}

/**
 * Verifica si un rol puede gestionar tickets (agente o superior)
 */
export function canManageTickets(role: Role): boolean {
  return ['agent_l1', 'agent_l2', 'supervisor', 'corporate_admin', 'admin'].includes(role)
}

/**
 * Verifica si un usuario puede asignar/reasignar tickets
 * Requiere perfil para verificar permisos de corporate_admin
 */
export function canAssignTickets(profile: UserProfile): boolean {
  if (['agent_l2', 'supervisor', 'admin'].includes(profile.role)) return true
  if (profile.role === 'corporate_admin') {
    return profile.is_it_supervisor === true || profile.is_maintenance_supervisor === true
  }
  return false
}

/**
 * Verifica si un usuario puede ver todos los tickets (no solo asignados)
 */
export function canViewAllTickets(profile: UserProfile): boolean {
  if (['supervisor', 'admin', 'auditor'].includes(profile.role)) return true
  if (profile.role === 'corporate_admin') {
    return profile.is_it_supervisor === true || profile.is_maintenance_supervisor === true
  }
  return false
}

/**
 * Verifica si un usuario puede acceder a reportes avanzados
 */
export function canViewReports(profile: UserProfile): boolean {
  if (['supervisor', 'admin', 'auditor'].includes(profile.role)) return true
  if (profile.role === 'corporate_admin') {
    return profile.is_it_supervisor === true || profile.is_maintenance_supervisor === true
  }
  return false
}

/**
 * Verifica si un rol puede gestionar usuarios
 */
export function canManageUsers(role: Role): boolean {
  return ['admin'].includes(role)
}

/**
 * Verifica si un usuario puede eliminar tickets
 */
export function canDeleteTickets(profile: UserProfile): boolean {
  if (['admin', 'supervisor'].includes(profile.role)) return true
  if (profile.role === 'corporate_admin') {
    return profile.is_it_supervisor === true || profile.is_maintenance_supervisor === true
  }
  return false
}

/**
 * Verifica si un usuario puede editar activos de tickets
 */
export function canEditTicketAssets(profile: UserProfile): boolean {
  if (['supervisor', 'admin'].includes(profile.role)) return true
  if (profile.role === 'corporate_admin') {
    return profile.is_it_supervisor === true || profile.is_maintenance_supervisor === true
  }
  return false
}

/**
 * Verifica si un usuario tiene un permiso específico
 */
export function hasPermission(profile: UserProfile, permission: Permission): boolean {
  const permissionMap: Record<Permission, (profile: UserProfile) => boolean> = {
    view_all_tickets: canViewAllTickets,
    manage_tickets: (p) => canManageTickets(p.role),
    assign_tickets: canAssignTickets,
    close_tickets: (p) => canManageTickets(p.role),
    escalate_tickets: canAssignTickets,
    view_reports: canViewReports,
    manage_users: (p) => canManageUsers(p.role),
    manage_assets: canEditTicketAssets,
    view_beo: () => true, // Se verifica con can_view_beo en profile
    view_audit: canViewReports,
    manage_locations: (p) => canManageUsers(p.role),
    delete_tickets: canDeleteTickets,
    supervisor_access: hasSupervisorPermissions,
  }

  return permissionMap[permission]?.(profile) ?? false
}

/**
 * Helper para verificar si es admin o tiene permisos equivalentes
 */
export function isAdminLike(role: Role): boolean {
  return ['admin', 'corporate_admin'].includes(role)
}

/**
 * Helper para verificar si es supervisor o tiene permisos equivalentes
 * DEPRECATED: Usar hasSupervisorPermissions con perfil completo
 */
export function isSupervisorLike(profile: UserProfile): boolean {
  return hasSupervisorPermissions(profile)
}
