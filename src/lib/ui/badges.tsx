const STATUS_LABELS: Record<string, string> = {
  NEW: 'Nuevo',
  ASSIGNED: 'Asignado',
  IN_PROGRESS: 'En progreso',
  NEEDS_INFO: 'Requiere info',
  WAITING_THIRD_PARTY: 'Esperando 3ro',
  RESOLVED: 'Resuelto',
  CLOSED: 'Cerrado',
}

export function StatusBadge({ status }: { status: string }) {
  const classMap: Record<string, string> = {
    NEW: 'badge-primary',
    ASSIGNED: 'badge-primary',
    IN_PROGRESS: 'badge-warning',
    NEEDS_INFO: 'badge-neutral',
    WAITING_THIRD_PARTY: 'badge-neutral',
    RESOLVED: 'badge-success',
    CLOSED: 'badge-neutral',
  }
  const className = classMap[status] ?? 'badge-neutral'
  const label = STATUS_LABELS[status] || status
  return <span className={`badge ${className}`}>{label}</span>
}

export function PriorityBadge({ priority }: { priority: number }) {
  const classMap: Record<number, string> = {
    1: 'badge-danger',
    2: 'badge-warning',
    3: 'badge-primary',
    4: 'badge-neutral',
  }
  const className = classMap[priority] ?? 'badge-neutral'
  return <span className={`badge ${className}`}>P{priority}</span>
}

export function LevelBadge({ level }: { level: number }) {
  return <span className="badge badge-primary">N{level}</span>
}
