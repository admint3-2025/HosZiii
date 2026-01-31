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

/**
 * Verifica si un rol incluye permisos de supervisor
 * corporate_admin y admin tienen permisos de supervisor por defecto
 */
export function hasSupervisorPermissions(role: Role): boolean {
  return ['supervisor', 'corporate_admin', 'admin'].includes(role)
}

/**
 * Verifica si un rol puede gestionar tickets (agente o superior)
 */
export function canManageTickets(role: Role): boolean {
  return ['agent_l1', 'agent_l2', 'supervisor', 'corporate_admin', 'admin'].includes(role)
}

/**
 * Verifica si un rol puede asignar/reasignar tickets
 */
export function canAssignTickets(role: Role): boolean {
  return ['agent_l2', 'supervisor', 'corporate_admin', 'admin'].includes(role)
}

/**
 * Verifica si un rol puede ver todos los tickets (no solo asignados)
 */
export function canViewAllTickets(role: Role): boolean {
  return ['supervisor', 'corporate_admin', 'admin', 'auditor'].includes(role)
}

/**
 * Verifica si un rol puede acceder a reportes avanzados
 */
export function canViewReports(role: Role): boolean {
  return ['supervisor', 'corporate_admin', 'admin', 'auditor'].includes(role)
}

/**
 * Verifica si un rol puede gestionar usuarios
 */
export function canManageUsers(role: Role): boolean {
  return ['admin'].includes(role)
}

/**
 * Verifica si un rol puede eliminar tickets
 */
export function canDeleteTickets(role: Role): boolean {
  return ['admin', 'supervisor', 'corporate_admin'].includes(role)
}

/**
 * Verifica si un rol puede editar activos de tickets
 */
export function canEditTicketAssets(role: Role): boolean {
  return ['supervisor', 'corporate_admin', 'admin'].includes(role)
}

/**
 * Verifica si un usuario tiene un permiso específico
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  const permissionMap: Record<Permission, (role: Role) => boolean> = {
    view_all_tickets: canViewAllTickets,
    manage_tickets: canManageTickets,
    assign_tickets: canAssignTickets,
    close_tickets: canManageTickets,
    escalate_tickets: canAssignTickets,
    view_reports: canViewReports,
    manage_users: canManageUsers,
    manage_assets: canEditTicketAssets,
    view_beo: () => true, // Se verifica con can_view_beo en profile
    view_audit: canViewReports,
    manage_locations: canManageUsers,
    delete_tickets: canDeleteTickets,
    supervisor_access: hasSupervisorPermissions,
  }

  return permissionMap[permission]?.(role) ?? false
}

/**
 * Helper para verificar si es admin o tiene permisos equivalentes
 */
export function isAdminLike(role: Role): boolean {
  return ['admin', 'corporate_admin'].includes(role)
}

/**
 * Helper para verificar si es supervisor o tiene permisos equivalentes
 */
export function isSupervisorLike(role: Role): boolean {
  return hasSupervisorPermissions(role)
}
