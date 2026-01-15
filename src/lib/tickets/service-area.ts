export type TicketServiceArea = 'it' | 'maintenance' | 'beo'

export function inferServiceAreaFromCategoryPath(categoryPath: string | null | undefined): TicketServiceArea {
  const normalized = (categoryPath ?? '').toLowerCase()

  // Heurística simple y estable (no depende del rol del usuario):
  // si la ruta de categoría indica Mantenimiento, lo marcamos como maintenance.
  if (normalized.includes('mantenimiento') || normalized.includes('mtto')) return 'maintenance'

  return 'it'
}
