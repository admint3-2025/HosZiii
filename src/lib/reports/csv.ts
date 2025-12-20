type CsvCell = string | number | boolean | null | undefined

function escapeCsvCell(value: CsvCell): string {
  if (value === null || value === undefined) return ''
  const stringValue = typeof value === 'string' ? value : String(value)
  const mustQuote = /[",\r\n]/.test(stringValue)
  const escaped = stringValue.replace(/"/g, '""')
  return mustQuote ? `"${escaped}"` : escaped
}

export function toCsv(headers: string[], rows: CsvCell[][]): string {
  const headerLine = headers.map(escapeCsvCell).join(',')
  const lines = rows.map((row) => row.map(escapeCsvCell).join(','))
  return [headerLine, ...lines].join('\r\n')
}
