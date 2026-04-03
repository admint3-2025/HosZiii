type SchemaCompatError = {
  message?: string | null
  details?: string | null
  hint?: string | null
}

export const ASSETS_IT_OPTIONAL_COLUMNS = [
  'department',
  'updated_by',
  'processor',
  'ram_gb',
  'storage_gb',
  'os',
  'dynamic_specs',
  'image_url',
] as const

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getMissingColumnName(error: SchemaCompatError | null | undefined, tableName: string): string | null {
  const text = [error?.message, error?.details, error?.hint]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .join(' ')

  if (!text) return null

  const escapedTableName = escapeRegExp(tableName)
  const schemaCacheMatch = text.match(
    new RegExp(`Could not find the '([^']+)' column of '${escapedTableName}' in the schema cache`, 'i')
  )
  if (schemaCacheMatch) return schemaCacheMatch[1]

  const relationMatch = text.match(
    new RegExp(`column ["']?([a-zA-Z0-9_]+)["']? of relation ["']?${escapedTableName}["']? does not exist`, 'i')
  )
  if (relationMatch) return relationMatch[1]

  return null
}

export async function executeWithSchemaCacheFallback<TResult extends { error: SchemaCompatError | null }>(options: {
  tableName: string
  payload: Record<string, any>
  fallbackColumns: readonly string[]
  execute: (payload: Record<string, any>) => Promise<TResult>
}) {
  const currentPayload: Record<string, any> = { ...options.payload }
  const removedColumns: string[] = []

  while (true) {
    const result = await options.execute(currentPayload)
    const missingColumn = getMissingColumnName(result.error, options.tableName)

    if (!missingColumn || !options.fallbackColumns.includes(missingColumn) || removedColumns.includes(missingColumn)) {
      return {
        ...result,
        payload: currentPayload,
        removedColumns,
      }
    }

    delete currentPayload[missingColumn]
    removedColumns.push(missingColumn)
  }
}