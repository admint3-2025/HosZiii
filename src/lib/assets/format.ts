export function getAssetTypeValue(asset: unknown): string | null {
  if (!asset || typeof asset !== 'object') return null
  const a = asset as any
  const value = a.asset_type ?? a.category
  return typeof value === 'string' && value.trim() ? value : null
}

export function formatSnakeCaseLabel(value: unknown, fallback = 'No especificado'): string {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  if (!trimmed) return fallback
  return trimmed.replace(/_/g, ' ')
}

export function formatAssetType(asset: unknown, fallback = 'No especificado'): string {
  return formatSnakeCaseLabel(getAssetTypeValue(asset) ?? null, fallback)
}
