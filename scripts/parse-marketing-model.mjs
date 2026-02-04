import path from 'node:path'
import XLSX from 'xlsx'

const workbookPath = path.resolve('docs-archived', 'FORMATO VERIFICACION HOTELES ENCORE .xlsx')
const wb = XLSX.readFile(workbookPath, { cellDates: true })
const ws = wb.Sheets['Encore']

if (!ws) throw new Error('Sheet "Encore" not found')

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

const range = { s: { r: minRow, c: minCol }, e: { r: maxRow, c: maxCol } }
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '', range })

function isMostlyEmpty(row, from = 1, to = 10) {
  for (let i = from; i <= Math.min(to, row.length - 1); i++) {
    const v = row[i]
    if (v !== '' && v !== null && v !== undefined) return false
  }
  return true
}

function norm(v) {
  return typeof v === 'string' ? v.trim() : v
}

const areas = []
let currentArea = null

for (let i = 0; i < rows.length; i++) {
  const row = rows[i].map(norm)
  const first = row[0]
  if (!first) continue

  // Skip table header rows
  if (String(first).toLowerCase() === 'elemento') continue

  // New area header: text in col A and next 10 cols empty
  if (typeof first === 'string' && isMostlyEmpty(row, 1, 10)) {
    currentArea = { name: first, items: [] }
    areas.push(currentArea)
    continue
  }

  // Total rows
  if (String(first).toLowerCase().includes('total acumulado')) continue

  // Item rows: require an active area and a text element in col A
  if (currentArea && typeof first === 'string') {
    currentArea.items.push(first)
  }
}

console.log('Workbook:', workbookPath)
console.log('Detected range:', XLSX.utils.encode_range(range))
console.log('Areas:', areas.length)
console.log('Total items:', areas.reduce((acc, a) => acc + a.items.length, 0))

for (const a of areas) {
  console.log(`- ${a.name}: ${a.items.length}`)
}

console.log('\nSample items:')
for (const a of areas.slice(0, 3)) {
  console.log(`\n[${a.name}]`)
  for (const item of a.items.slice(0, 8)) console.log('  -', item)
}
