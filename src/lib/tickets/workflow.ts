export const STATUS_LABELS: Record<string, string> = {
  NEW: 'Nuevo',
  ASSIGNED: 'Asignado',
  IN_PROGRESS: 'En progreso',
  NEEDS_INFO: 'Requiere información',
  WAITING_THIRD_PARTY: 'Esperando tercero',
  RESOLVED: 'Resuelto',
  CLOSED: 'Cerrado',
}

const ALLOWED: Record<string, string[]> = {
  NEW: ['ASSIGNED', 'IN_PROGRESS', 'NEEDS_INFO', 'WAITING_THIRD_PARTY', 'RESOLVED', 'CLOSED'],
  ASSIGNED: ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'NEEDS_INFO', 'WAITING_THIRD_PARTY', 'RESOLVED', 'CLOSED'],
  IN_PROGRESS: ['ASSIGNED', 'NEEDS_INFO', 'WAITING_THIRD_PARTY', 'RESOLVED', 'CLOSED'],
  NEEDS_INFO: ['ASSIGNED', 'IN_PROGRESS', 'WAITING_THIRD_PARTY', 'RESOLVED'],
  WAITING_THIRD_PARTY: ['ASSIGNED', 'IN_PROGRESS', 'NEEDS_INFO', 'RESOLVED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS', 'ASSIGNED'],
  CLOSED: ['IN_PROGRESS', 'ASSIGNED'],
}

export function isAllowedTransition(fromStatus: string, toStatus: string) {
  // If same status, allow (for reassignment scenarios)
  if (fromStatus === toStatus) return true
  return (ALLOWED[fromStatus] ?? []).includes(toStatus)
}
