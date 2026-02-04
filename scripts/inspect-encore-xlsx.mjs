import path from 'node:path'
import { fileURLToPath } from 'node:url'
import XLSX from 'xlsx'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const workbookPath = path.resolve(__dirname, '..', 'docs-archived', 'FORMATO VERIFICACION HOTELES ENCORE .xlsx')

const wb = XLSX.readFile(workbookPath, { cellDates: true })
console.log('Workbook:', workbookPath)
console.log('Sheets:', wb.SheetNames)

for (const sheetName of wb.SheetNames) {
  const ws = wb.Sheets[sheetName]
  console.log('\n=== Sheet:', sheetName, '===')

  if (!ws || !ws['!ref']) {
    console.log('Empty sheet (no !ref)')
    continue
  }

  // Excel files with lots of formatting can have gigantic !ref ranges.
  // Derive a compact used range based on cells that actually have values.
  let maxRow = 0
  let maxCol = 0
  let minRow = Number.POSITIVE_INFINITY
  let minCol = Number.POSITIVE_INFINITY

  for (const key of Object.keys(ws)) {
    if (key.startsWith('!')) continue
    const cell = ws[key]
    const value = cell?.v
    if (value === undefined || value === null || value === '') continue
    const { r, c } = XLSX.utils.decode_cell(key)
    if (r > maxRow) maxRow = r
    if (c > maxCol) maxCol = c
    if (r < minRow) minRow = r
    if (c < minCol) minCol = c
  }

  if (!Number.isFinite(minRow) || !Number.isFinite(minCol)) {
    console.log('No populated cells detected')
    continue
  }

  const previewMaxCol = Math.min(maxCol, minCol + 29) // show up to 30 columns
  const previewMaxRow = Math.min(maxRow, minRow + 59) // show up to 60 rows
  const range = { s: { r: minRow, c: minCol }, e: { r: previewMaxRow, c: previewMaxCol } }

  console.log('Detected used range:', XLSX.utils.encode_range({ s: { r: minRow, c: minCol }, e: { r: maxRow, c: maxCol } }))
  console.log('Preview range:', XLSX.utils.encode_range(range))

  const rows = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    raw: true,
    defval: '',
    range
  })

  console.log('Preview rows:', rows.length)
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const trimmed = row.map(v => (typeof v === 'string' ? v.trim() : v))
    const hasContent = trimmed.some(v => v !== '' && v !== null && v !== undefined)
    if (hasContent) console.log(String(minRow + i + 1).padStart(3, '0') + ':', trimmed)
  }
}
