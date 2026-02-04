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
  if (typeof v !== 'string') return v
  const trimmed = v.trim().replace(/\s+/g, ' ')
  return trimmed
    .replace(/\bGDL SUR\b/g, 'EGDLS')
    .replace(/\bQRO\b/g, 'EQRO')
    .replace(/\bMTY\b/g, 'EMTY')
    .replace(/\bQTO\b/g, 'EQRO')
    .replace(/\bMYT\b/g, 'EMTY')
}

function isMostlyEmpty(row, from = 1, to = 10) {
  for (let i = from; i <= Math.min(to, row.length - 1); i++) {
    const v = row[i]
    if (v !== '' && v !== null && v !== undefined) return false
  }
  return true
}

function isHeaderRow(row) {
  const first = row?.[0]
  return String(first ?? '').toLowerCase().trim() === 'elemento'
}

function normalizeAreaName(name) {
  if (typeof name !== 'string') return name
  // Fix hotel code labels
  return name
    .replace(/\bGDL SUR\b/g, 'EGDLS')
    .replace(/\bQTO\b/g, 'EQRO')
    .replace(/\bMYT\b/g, 'EMTY')
}

function isHabitacionArea(name) {
  return typeof name === 'string' && name.trim().toLowerCase().startsWith('habitación')
}

function habitacionBaseName(name) {
  if (typeof name !== 'string') return name
  return name.replace(/\s*\(\d+\)\s*$/g, '').trim()
}

const rawAreas = []
let currentArea = null
let currentParentArea = null

for (let i = 0; i < rows.length; i++) {
  const row = rows[i].map(norm)
  const first = row[0]
  if (!first) continue

  const lower = String(first).toLowerCase()
  if (lower === 'elemento') continue
  if (lower.includes('total acumulado')) continue

  // Some sections include a subgroup label in column A and the first item text in column B,
  // followed by the table header row (Elemento/Existencia/...). In that case we treat the
  // subgroup as its own area to avoid emitting it as an item.
  const nextRow = i + 1 < rows.length ? rows[i + 1].map(norm) : null
  const nextFirstLower = nextRow ? String(nextRow[0] ?? '').toLowerCase().trim() : ''
  const second = row[1]
  const hasSecondText = typeof second === 'string' && second.trim().length > 0
  if (
    currentParentArea &&
    typeof first === 'string' &&
    hasSecondText &&
    nextFirstLower === 'elemento'
  ) {
    const subgroup = first
    // Column B can contain notes in the Excel; items are always taken from column A
    // in the Elemento table. So we create the subgroup area and let the following
    // table rows contribute the real items.
    const subgroupArea = { name: `${currentParentArea.name} / ${subgroup}`, items: [] }
    currentArea = subgroupArea
    rawAreas.push(subgroupArea)
    continue
  }

  // Treat a row as an area header if it is followed by the table header row.
  // This happens in the Excel for some sections (notably some habitaciones)
  // where the title row may also include notes in other columns.
  const isAreaHeader =
    typeof first === 'string' &&
    (nextRow ? isHeaderRow(nextRow) : false || isMostlyEmpty(row, 1, 22))

  if (isAreaHeader) {
    currentArea = { name: first, items: [] }
    currentParentArea = currentArea
    rawAreas.push(currentArea)
    continue
  }

  if (currentArea && typeof first === 'string') {
    currentArea.items.push(first)
  }
}

// Filter empties
const nonEmptyAreas = rawAreas.filter(a => a.items.length > 0)

// Drop exact duplicates (same area name and identical item list).
// The source Excel repeats some habitación blocks multiple times.
const seenByName = new Map()
const dedupedAreas = []
for (const a of nonEmptyAreas) {
  const key = JSON.stringify(a.items)
  const prevKeys = seenByName.get(a.name)
  if (prevKeys) {
    if (prevKeys.has(key)) continue
    prevKeys.add(key)
  } else {
    seenByName.set(a.name, new Set([key]))
  }
  dedupedAreas.push(a)
}

// Normalize names (codes) and merge duplicated habitaciones into a single area.
const normalizedAreas = dedupedAreas.map(a => ({
  name: normalizeAreaName(a.name),
  items: a.items,
}))

const mergedHabitaciones = []
const habitacionIndex = new Map()
for (const area of normalizedAreas) {
  if (!isHabitacionArea(area.name)) {
    mergedHabitaciones.push(area)
    continue
  }

  const base = habitacionBaseName(area.name)
  const existingIdx = habitacionIndex.get(base)
  if (existingIdx === undefined) {
    habitacionIndex.set(base, mergedHabitaciones.length)
    mergedHabitaciones.push({ name: base, items: [...area.items] })
    continue
  }

  const existing = mergedHabitaciones[existingIdx]
  const seen = new Set(existing.items)
  for (const item of area.items) {
    if (seen.has(item)) continue
    seen.add(item)
    existing.items.push(item)
  }
}

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
for (const a of mergedHabitaciones) {
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
