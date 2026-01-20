const MX_TZ = 'America/Mexico_City'

function getMexicoDateParts(date: Date): { dd: string; mm: string; yyyy: string; yy: string } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: MX_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(date)

  const dd = parts.find((p) => p.type === 'day')?.value ?? '01'
  const mm = parts.find((p) => p.type === 'month')?.value ?? '01'
  const yyyy = parts.find((p) => p.type === 'year')?.value ?? '2000'
  const yy = yyyy.slice(-2)
  return { dd, mm, yyyy, yy }
}

function pad4(value: string | number): string {
  const digits = String(value).replace(/\D/g, '')
  return digits.padStart(4, '0').slice(-4)
}

function normalizeUpper(value: unknown): string {
  return String(value ?? '').trim().toUpperCase()
}

export function formatTicketCode(params: { ticket_number: string | number; created_at: string | null }): string {
  const { ticket_number, created_at } = params

  const raw = normalizeUpper(ticket_number)
  if (raw.includes('-') && /^\d{8}-\d{4}$/.test(raw)) {
    // Ya es un código YYYYMMDD-XXXX
    return raw
  }

  const date = created_at ? new Date(created_at) : new Date()
  const { yyyy, mm, dd } = getMexicoDateParts(date)
  const seq = pad4(raw)

  return `${yyyy}${mm}${dd}-${seq}`
}

/**
 * Formatea el código de ticket de MANTENIMIENTO con el prefijo MANT-
 * Formato estricto: MANT-DDMMAA-XXXX
 */
export function formatMaintenanceTicketCode(params: { ticket_number: string | number; created_at: string | null }): string {
  const { ticket_number, created_at } = params

  const raw = normalizeUpper(ticket_number)

  // Si ya está en el formato estricto, devolver tal cual
  if (/^MANT-\d{6}-\d{4}$/.test(raw)) {
    return raw
  }

  // Normalizar formatos legacy/rotos:
  // - MANT-YYYYMMDD-XXXX
  // - MANT-YYYYMMDD-<muchos_digitos>
  // - MANT-DDMMAA-<muchos_digitos>
  const legacy8 = raw.match(/^MANT-(\d{8})-(\d{4,})$/)
  if (legacy8) {
    const yyyymmdd = legacy8[1]
    const seq = pad4(legacy8[2])
    const yyyy = yyyymmdd.slice(0, 4)
    const mm = yyyymmdd.slice(4, 6)
    const dd = yyyymmdd.slice(6, 8)
    const yy = yyyy.slice(-2)
    return `MANT-${dd}${mm}${yy}-${seq}`
  }

  const legacy6 = raw.match(/^MANT-(\d{6})-(\d{4,})$/)
  if (legacy6) {
    const ddmmyy = legacy6[1]
    const seq = pad4(legacy6[2])
    return `MANT-${ddmmyy}-${seq}`
  }

  // Si viene como secuencia numérica (legacy), reconstruir con created_at
  const date = created_at ? new Date(created_at) : new Date()
  const { dd, mm, yy } = getMexicoDateParts(date)
  const seq = pad4(raw)

  return `MANT-${dd}${mm}${yy}-${seq}`
}

export function extractMaintenanceTicketSequence(ticketNumber: string): number | null {
  const raw = normalizeUpper(ticketNumber)
  const m = raw.match(/^MANT-(?:\d{6}|\d{8})-(\d{4,})$/)
  if (m) {
    const seq = parseInt(pad4(m[1]), 10)
    return Number.isFinite(seq) ? seq : null
  }
  if (/^\d+$/.test(raw)) {
    const n = parseInt(raw, 10)
    return Number.isFinite(n) ? n : null
  }
  return null
}
