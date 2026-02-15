'use client'

import { useState, useMemo, useRef, useCallback } from 'react'
import type { RoomStatus } from './HousekeepingDashboard'

// ──── Types ────
export type RoomType = 'standard' | 'doble' | 'suite' | 'accesible' | 'conectada'

export interface ManagedRoom {
  id: string
  number: string
  floor: number
  type: RoomType
  status: RoomStatus
  notes: string | null
  hasIncident: boolean
  assignedTo: string | null
  lastCleaned: string | null
}

interface Props {
  rooms: ManagedRoom[]
  locationId: string
  onRefresh: () => void
}

// ──── Constants ────
const ROOM_TYPES: { value: RoomType; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'doble', label: 'Doble' },
  { value: 'suite', label: 'Suite' },
  { value: 'accesible', label: 'Accesible' },
  { value: 'conectada', label: 'Conectada' },
]

const ROOM_STATUSES: { value: RoomStatus; label: string; color: string }[] = [
  { value: 'limpia', label: 'Limpia', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'sucia', label: 'Sucia', color: 'bg-red-100 text-red-700' },
  { value: 'en_limpieza', label: 'En Limpieza', color: 'bg-amber-100 text-amber-700' },
  { value: 'mantenimiento', label: 'Mantenimiento', color: 'bg-orange-100 text-orange-700' },
  { value: 'inspeccion', label: 'Inspección', color: 'bg-violet-100 text-violet-700' },
  { value: 'bloqueada', label: 'Bloqueada', color: 'bg-slate-200 text-slate-600' },
]

const TYPE_BADGE: Record<RoomType, string> = {
  standard: 'bg-slate-100 text-slate-600',
  doble: 'bg-blue-100 text-blue-700',
  suite: 'bg-amber-100 text-amber-700',
  accesible: 'bg-green-100 text-green-700',
  conectada: 'bg-purple-100 text-purple-700',
}

// ──── CSV Parser ────
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []

  // Detect separator (comma, semicolon, tab)
  const firstLine = lines[0]
  const sep = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ','

  const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/^["']|["']$/g, ''))

  return lines.slice(1).map(line => {
    const values = line.split(sep).map(v => v.trim().replace(/^["']|["']$/g, ''))
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = values[i] ?? '' })
    return row
  })
}

// Map CSV headers to our field names
function mapCSVRow(row: Record<string, string>): { number: string; floor: number; room_type: string; notes: string } {
  return {
    number: row['number'] || row['numero'] || row['habitacion'] || row['habitación'] || row['room'] || row['num'] || row['no'] || '',
    floor: Number(row['floor'] || row['piso'] || row['nivel'] || row['planta'] || '1') || 1,
    room_type: (row['room_type'] || row['type'] || row['tipo'] || row['tipo_habitacion'] || row['tipo_habitación'] || 'standard').toLowerCase(),
    notes: row['notes'] || row['notas'] || row['observaciones'] || row['comentarios'] || '',
  }
}

// ──── Component ────
export default function RoomManagementPanel({ rooms, locationId, onRefresh }: Props) {
  // Filters
  const [filterFloor, setFilterFloor] = useState<number | 'all'>('all')
  const [filterType, setFilterType] = useState<RoomType | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Add Room form
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({ number: '', floor: '1', room_type: 'standard' as RoomType, notes: '' })
  const [addBusy, setAddBusy] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  // Edit inline
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ number: '', floor: '', room_type: '' as RoomType, notes: '' })
  const [editBusy, setEditBusy] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Delete
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  // CSV Import
  const [showImport, setShowImport] = useState(false)
  const [importPreview, setImportPreview] = useState<{ number: string; floor: number; room_type: string; notes: string }[] | null>(null)
  const [importBusy, setImportBusy] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Regenerar habitaciones
  const [showRegenConfirm, setShowRegenConfirm] = useState(false)
  const [regenBusy, setRegenBusy] = useState(false)

  // Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  // Filtered + sorted
  const floors = useMemo(() => [...new Set(rooms.map(r => r.floor))].sort((a, b) => a - b), [rooms])

  const filtered = useMemo(() => {
    let result = rooms
    if (filterFloor !== 'all') result = result.filter(r => r.floor === filterFloor)
    if (filterType !== 'all') result = result.filter(r => r.type === filterType)
    if (searchQuery) result = result.filter(r => r.number.includes(searchQuery))
    return result.sort((a, b) => a.floor - b.floor || a.number.localeCompare(b.number, undefined, { numeric: true }))
  }, [rooms, filterFloor, filterType, searchQuery])

  // Stats by type
  const typeStats = useMemo(() => {
    const stats: Record<RoomType, number> = { standard: 0, doble: 0, suite: 0, accesible: 0, conectada: 0 }
    rooms.forEach(r => { if (r.type in stats) stats[r.type as RoomType]++ })
    return stats
  }, [rooms])

  // ─── Handlers ───

  async function handleRegenerate() {
    setRegenBusy(true)
    try {
      const res = await fetch('/api/housekeeping/seed-rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location_id: locationId, force: true }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        showToast(json.message || json.error || 'Error regenerando habitaciones', 'error')
        return
      }
      showToast(json.message, 'success')
      setShowRegenConfirm(false)
      setTimeout(() => onRefresh(), 800)
    } catch (e: any) {
      showToast(e?.message || 'Error de conexión', 'error')
    } finally {
      setRegenBusy(false)
    }
  }

  async function handleAddRoom(e: React.FormEvent) {
    e.preventDefault()
    setAddBusy(true)
    setAddError(null)

    try {
      const res = await fetch('/api/housekeeping/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id: locationId,
          number: addForm.number.trim(),
          floor: Number(addForm.floor),
          room_type: addForm.room_type,
          notes: addForm.notes || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setAddError(json.error || 'Error'); return }
      showToast(`Habitación ${addForm.number} creada`, 'success')
      setAddForm({ number: '', floor: addForm.floor, room_type: 'standard', notes: '' })
      setShowAddForm(false)
      onRefresh()
    } catch (err: any) {
      setAddError(err?.message || 'Error de conexión')
    } finally {
      setAddBusy(false)
    }
  }

  function startEdit(room: ManagedRoom) {
    setEditingId(room.id)
    setEditForm({ number: room.number, floor: String(room.floor), room_type: room.type, notes: room.notes || '' })
    setEditError(null)
  }

  async function handleSaveEdit() {
    if (!editingId) return
    setEditBusy(true)
    setEditError(null)

    try {
      const res = await fetch(`/api/housekeeping/rooms/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: editForm.number.trim(),
          floor: Number(editForm.floor),
          room_type: editForm.room_type,
          notes: editForm.notes || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setEditError(json.error || 'Error'); return }
      showToast(`Habitación ${editForm.number} actualizada`, 'success')
      setEditingId(null)
      onRefresh()
    } catch (err: any) {
      setEditError(err?.message || 'Error de conexión')
    } finally {
      setEditBusy(false)
    }
  }

  async function handleDelete() {
    if (!deletingId) return
    setDeleteBusy(true)

    try {
      const res = await fetch(`/api/housekeeping/rooms/${deletingId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) { showToast(json.error || 'Error eliminando', 'error'); return }
      const room = rooms.find(r => r.id === deletingId)
      showToast(`Habitación ${room?.number || ''} eliminada`, 'success')
      setDeletingId(null)
      onRefresh()
    } catch {
      showToast('Error de conexión', 'error')
    } finally {
      setDeleteBusy(false)
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      if (!text) return

      const parsed = parseCSV(text)
      if (parsed.length === 0) {
        setImportError('No se encontraron filas válidas en el archivo')
        return
      }

      const mapped = parsed.map(mapCSVRow).filter(r => r.number)
      if (mapped.length === 0) {
        setImportError('No se encontraron columnas reconocibles. Usa: number, floor, room_type, notes')
        return
      }

      setImportPreview(mapped)
      setImportError(null)
      setImportResult(null)
    }
    reader.readAsText(file)
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleImport() {
    if (!importPreview || importPreview.length === 0) return
    setImportBusy(true)
    setImportError(null)
    setImportResult(null)

    try {
      const res = await fetch('/api/housekeeping/rooms/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location_id: locationId, rooms: importPreview }),
      })
      const json = await res.json()
      if (!res.ok) {
        setImportError(json.error || 'Error importando')
        return
      }
      setImportResult(json.message)
      showToast(json.message, 'success')
      setImportPreview(null)
      setShowImport(false)
      onRefresh()
    } catch (err: any) {
      setImportError(err?.message || 'Error de conexión')
    } finally {
      setImportBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg border text-sm font-medium animate-in slide-in-from-right duration-300 ${
          toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {toast.type === 'success' ? (
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          ) : (
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          )}
          {toast.message}
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Gestión de Habitaciones</h2>
          <p className="text-xs text-slate-500">
            {rooms.length} habitaciones registradas
            {rooms.length > 0 && (
              <> — {ROOM_TYPES.map(t => typeStats[t.value] > 0 ? `${typeStats[t.value]} ${t.label.toLowerCase()}` : null).filter(Boolean).join(', ')}</>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRegenConfirm(true)}
            className="btn gap-1.5 text-sm bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
            title="Eliminar todas las habitaciones y regenerarlas desde cero"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Regenerar
          </button>
          <button
            onClick={() => { setShowImport(v => !v); setShowAddForm(false) }}
            className="btn btn-secondary gap-1.5 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Importar CSV
          </button>
          <button
            onClick={() => { setShowAddForm(v => !v); setShowImport(false) }}
            className="btn btn-primary gap-1.5 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Agregar Habitación
          </button>
        </div>
      </div>

      {/* ─── Add Room Form ─── */}
      {showAddForm && (
        <div className="card border-indigo-200 bg-indigo-50/30">
          <div className="card-body p-4">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Nueva Habitación</h3>
            <form onSubmit={handleAddRoom} className="flex flex-wrap items-end gap-3">
              <div className="w-28">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Número *</label>
                <input
                  type="text"
                  required
                  value={addForm.number}
                  onChange={e => setAddForm(p => ({ ...p, number: e.target.value }))}
                  className="input w-full"
                  placeholder="101"
                />
              </div>
              <div className="w-20">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Piso *</label>
                <input
                  type="number"
                  required
                  min={0}
                  max={99}
                  value={addForm.floor}
                  onChange={e => setAddForm(p => ({ ...p, floor: e.target.value }))}
                  className="input w-full"
                />
              </div>
              <div className="w-36">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Tipo</label>
                <select
                  value={addForm.room_type}
                  onChange={e => setAddForm(p => ({ ...p, room_type: e.target.value as RoomType }))}
                  className="select w-full"
                >
                  {ROOM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="flex-1 min-w-[120px]">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Notas</label>
                <input
                  type="text"
                  value={addForm.notes}
                  onChange={e => setAddForm(p => ({ ...p, notes: e.target.value }))}
                  className="input w-full"
                  placeholder="Opcional"
                />
              </div>
              <div className="flex items-center gap-2">
                <button type="submit" disabled={addBusy} className="btn btn-primary text-sm">
                  {addBusy ? 'Guardando…' : 'Guardar'}
                </button>
                <button type="button" onClick={() => setShowAddForm(false)} className="btn btn-secondary text-sm">
                  Cancelar
                </button>
              </div>
            </form>
            {addError && (
              <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" /></svg>
                {addError}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ─── CSV Import Panel ─── */}
      {showImport && (
        <div className="card border-blue-200 bg-blue-50/30">
          <div className="card-body p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Importar desde CSV</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Columnas reconocidas: <code className="text-xs bg-slate-100 px-1 rounded">number</code> (o numero, habitacion),{' '}
                  <code className="text-xs bg-slate-100 px-1 rounded">floor</code> (o piso),{' '}
                  <code className="text-xs bg-slate-100 px-1 rounded">room_type</code> (o tipo),{' '}
                  <code className="text-xs bg-slate-100 px-1 rounded">notes</code> (o notas).
                  Separadores: coma, punto y coma o tabulador.
                </p>
              </div>
              <button onClick={() => { setShowImport(false); setImportPreview(null) }} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Download template */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const csv = 'number,floor,room_type,notes\n101,1,standard,\n102,1,doble,Cama king\n201,2,suite,Vista al mar\n202,2,accesible,Baño adaptado'
                  const blob = new Blob([csv], { type: 'text/csv' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url; a.download = 'plantilla_habitaciones.csv'; a.click()
                  URL.revokeObjectURL(url)
                }}
                className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Descargar plantilla CSV
              </button>

              <label className="btn btn-secondary text-sm cursor-pointer gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Seleccionar archivo
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.tsv,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </div>

            {importError && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" /></svg>
                {importError}
              </p>
            )}

            {importResult && (
              <p className="text-xs text-emerald-600 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" /></svg>
                {importResult}
              </p>
            )}

            {/* Preview table */}
            {importPreview && importPreview.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-700">
                    Vista previa: {importPreview.length} habitaciones
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setImportPreview(null) }}
                      className="btn btn-secondary text-xs py-1"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleImport}
                      disabled={importBusy}
                      className="btn btn-primary text-xs py-1 gap-1"
                    >
                      {importBusy ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Importando…
                        </>
                      ) : (
                        <>Importar {importPreview.length} habitaciones</>
                      )}
                    </button>
                  </div>
                </div>

                <div className="max-h-60 overflow-auto rounded-lg border border-slate-200">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">#</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">Número</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">Piso</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">Tipo</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">Notas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {importPreview.slice(0, 50).map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-3 py-1.5 text-slate-400">{i + 1}</td>
                          <td className="px-3 py-1.5 font-medium text-slate-900">{r.number}</td>
                          <td className="px-3 py-1.5">{r.floor}</td>
                          <td className="px-3 py-1.5">
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${TYPE_BADGE[r.room_type as RoomType] || 'bg-slate-100 text-slate-600'}`}>
                              {r.room_type}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-slate-500 max-w-[200px] truncate">{r.notes || '—'}</td>
                        </tr>
                      ))}
                      {importPreview.length > 50 && (
                        <tr><td colSpan={5} className="px-3 py-2 text-center text-slate-400 italic">…y {importPreview.length - 50} más</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Filters ─── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por número..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="input pl-9 w-44"
          />
        </div>
        <select
          value={filterFloor === 'all' ? 'all' : filterFloor}
          onChange={e => setFilterFloor(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className="select w-auto text-sm"
        >
          <option value="all">Todos los pisos</option>
          {floors.map(f => <option key={f} value={f}>Piso {f}</option>)}
        </select>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value as RoomType | 'all')}
          className="select w-auto text-sm"
        >
          <option value="all">Todos los tipos</option>
          {ROOM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label} ({typeStats[t.value]})</option>)}
        </select>

        <span className="text-xs text-slate-400 ml-auto">{filtered.length} de {rooms.length}</span>
      </div>

      {/* ─── Table ─── */}
      {filtered.length > 0 ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Habitación</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Piso</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Tipo</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Estado</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Notas</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wide w-28">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(room => {
                  const isEditing = editingId === room.id
                  const statusCfg = ROOM_STATUSES.find(s => s.value === room.status)

                  return (
                    <tr key={room.id} className={`hover:bg-slate-50 transition-colors ${isEditing ? 'bg-indigo-50/50' : ''}`}>
                      {/* Number */}
                      <td className="px-4 py-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.number}
                            onChange={e => setEditForm(p => ({ ...p, number: e.target.value }))}
                            className="input w-20 py-1 text-sm"
                          />
                        ) : (
                          <span className="font-bold text-slate-900">{room.number}</span>
                        )}
                        {room.hasIncident && !isEditing && (
                          <span className="ml-1.5 inline-flex w-2 h-2 bg-red-500 rounded-full animate-pulse" title="Incidencia activa" />
                        )}
                      </td>
                      {/* Floor */}
                      <td className="px-4 py-2">
                        {isEditing ? (
                          <input
                            type="number"
                            min={0}
                            max={99}
                            value={editForm.floor}
                            onChange={e => setEditForm(p => ({ ...p, floor: e.target.value }))}
                            className="input w-16 py-1 text-sm"
                          />
                        ) : (
                          <span className="text-slate-600">Piso {room.floor}</span>
                        )}
                      </td>
                      {/* Type */}
                      <td className="px-4 py-2">
                        {isEditing ? (
                          <select
                            value={editForm.room_type}
                            onChange={e => setEditForm(p => ({ ...p, room_type: e.target.value as RoomType }))}
                            className="select w-auto py-1 text-sm"
                          >
                            {ROOM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                        ) : (
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${TYPE_BADGE[room.type] || 'bg-slate-100 text-slate-600'}`}>
                            {ROOM_TYPES.find(t => t.value === room.type)?.label || room.type}
                          </span>
                        )}
                      </td>
                      {/* Status */}
                      <td className="px-4 py-2">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${statusCfg?.color || 'bg-slate-100 text-slate-600'}`}>
                          {statusCfg?.label || room.status}
                        </span>
                      </td>
                      {/* Notes */}
                      <td className="px-4 py-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.notes}
                            onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))}
                            className="input w-full py-1 text-sm"
                            placeholder="Notas opcionales"
                          />
                        ) : (
                          <span className="text-xs text-slate-500 max-w-[200px] truncate block">{room.notes || '—'}</span>
                        )}
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-2 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={handleSaveEdit}
                              disabled={editBusy}
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                              title="Guardar"
                            >
                              {editBusy ? (
                                <div className="w-4 h-4 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                              )}
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                              title="Cancelar"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                            {editError && (
                              <span className="text-[10px] text-red-500 ml-1" title={editError}>⚠</span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => startEdit(room)}
                              className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="Editar"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button
                              onClick={() => setDeletingId(room.id)}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                              title="Eliminar"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-body p-6 text-center">
            <p className="text-sm text-slate-500">
              {rooms.length === 0 ? 'No hay habitaciones registradas. Agrega una o importa desde CSV.' : 'No se encontraron habitaciones con estos filtros.'}
            </p>
          </div>
        </div>
      )}

      {/* ─── Delete Confirm Modal ─── */}
      {deletingId && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => !deleteBusy && setDeletingId(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-6 max-w-sm w-full animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Eliminar habitación</h3>
                  <p className="text-xs text-slate-500">
                    ¿Eliminar la habitación <span className="font-bold">{rooms.find(r => r.id === deletingId)?.number}</span>?
                    Esta acción la desactivará del sistema.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setDeletingId(null)}
                  disabled={deleteBusy}
                  className="btn btn-secondary text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteBusy}
                  className="btn text-sm bg-red-600 text-white hover:bg-red-700 border-red-600"
                >
                  {deleteBusy ? 'Eliminando…' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── Regenerate Confirm Modal ─── */}
      {showRegenConfirm && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => !regenBusy && setShowRegenConfirm(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-6 max-w-md w-full animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Regenerar Habitaciones</h3>
                  <p className="text-xs text-slate-500">
                    Esto <span className="font-bold text-red-600">eliminará las {rooms.length} habitaciones actuales</span> y
                    las regenerará automáticamente desde la configuración de la sede
                    (pisos, tipo de hotel, marca).
                  </p>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-xs text-amber-800">
                <p className="font-semibold mb-1">⚠️ Se perderán:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Notas y estados personalizados de habitaciones</li>
                  <li>Vínculos de tickets con habitaciones</li>
                  <li>Asignaciones de personal a habitaciones</li>
                </ul>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowRegenConfirm(false)}
                  disabled={regenBusy}
                  className="btn btn-secondary text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRegenerate}
                  disabled={regenBusy}
                  className="btn text-sm bg-amber-600 text-white hover:bg-amber-700 border-amber-600"
                >
                  {regenBusy ? 'Regenerando…' : 'Sí, regenerar desde cero'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
