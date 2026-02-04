import fs from 'node:fs'
import path from 'node:path'
import XLSX from 'xlsx'

const workbookPath = path.resolve('docs-archived', 'FORMATO VERIFICACION HOTELES ENCORE .xlsx')
const outPath = path.resolve('src', 'lib', 'templates', 'inspection-marketing-template.data.ts')

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

function norm(v) {
  return typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : v
}

function isMostlyEmpty(row, from = 1, to = 10) {
  for (let i = from; i <= Math.min(to, row.length - 1); i++) {
    const v = row[i]
    if (v !== '' && v !== null && v !== undefined) return false
  }
  return true
}

const rawAreas = []
let currentArea = null

for (let i = 0; i < rows.length; i++) {
  const row = rows[i].map(norm)
  const first = row[0]
  if (!first) continue

  const lower = String(first).toLowerCase()
  if (lower === 'elemento') continue
  if (lower.includes('total acumulado')) continue

  if (typeof first === 'string' && isMostlyEmpty(row, 1, 10)) {
    currentArea = { name: first, items: [] }
    rawAreas.push(currentArea)
    continue
  }

  if (currentArea && typeof first === 'string') {
    currentArea.items.push(first)
  }
}

// Filter empties
const nonEmptyAreas = rawAreas.filter(a => a.items.length > 0)

// Dedupe area names to satisfy unique constraint in DB
const usedNames = new Map()
function uniqueName(base) {
  const current = usedNames.get(base) ?? 0
  const next = current + 1
  usedNames.set(base, next)
  if (next === 1) return base
  return `${base} (${next})`
}

const modelEntries = []
for (const a of nonEmptyAreas) {
  const name = uniqueName(a.name)
  modelEntries.push([name, a.items])
}

function toTsStringLiteral(value) {
  return JSON.stringify(value)
}

let content = ''
content += "// AUTO-GENERATED from docs-archived/FORMATO VERIFICACION HOTELES ENCORE .xlsx (sheet: Encore)\n"
content += "// Do not edit manually; re-run: node scripts/generate-marketing-template-from-encore.mjs\n\n"
content += "export const MARKETING_ENCORE_MODEL: Record<string, string[]> = {\n"

for (const [areaName, items] of modelEntries) {
  content += `  ${toTsStringLiteral(areaName)}: [\n`
  for (const item of items) {
    content += `    ${toTsStringLiteral(item)},\n`
  }
  content += '  ],\n'
}

content += '}\n'

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, content, 'utf8')

console.log('Wrote:', outPath)
console.log('Areas:', modelEntries.length)
console.log('Items:', modelEntries.reduce((acc, [, items]) => acc + items.length, 0))
console.log('Range:', XLSX.utils.encode_range(range))
