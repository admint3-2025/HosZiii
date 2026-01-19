export type NormalizedAssetCategory = 'IT' | 'MAINTENANCE' | 'UNKNOWN' | null

export function normalizeAssetCategory(input: unknown): NormalizedAssetCategory {
  if (input === null || input === undefined) return null

  const normalized = String(input).trim().toLowerCase()
  if (!normalized) return null

  if (normalized === 'it') return 'IT'

  // Back-compat / UI values
  if (
    normalized === 'maintenance' ||
    normalized === 'mantenimiento' ||
    normalized === 'mtto' ||
    normalized === 'mant'
  ) {
    return 'MAINTENANCE'
  }

  if (normalized === 'maIntenance'.toLowerCase()) return 'MAINTENANCE'
  if (normalized === 'maintenance'.toLowerCase()) return 'MAINTENANCE'

  return 'UNKNOWN'
}

export function isMaintenanceAssetCategory(input: unknown): boolean {
  return normalizeAssetCategory(input) === 'MAINTENANCE'
}

export function isITAssetCategoryOrUnassigned(input: unknown): boolean {
  const normalized = normalizeAssetCategory(input)
  return normalized === 'IT' || normalized === null
}
