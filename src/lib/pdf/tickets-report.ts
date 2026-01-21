import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export type TicketPdfRow = {
  code: string
  title: string
  status: string
  priority?: string
  level?: string
  requester?: string
  assignee?: string
  location?: string
  createdAt?: string
}

export type TicketPdfColumnKey = keyof TicketPdfRow

export type TicketPdfColumn = {
  key: TicketPdfColumnKey
  label: string
  width?: number
}

export type TicketPdfSummaryItem = {
  label: string
  value: string
}

export function translateTicketStatusEs(status?: string | null): string {
  const s = String(status ?? '').trim()
  if (!s) return ''

  const key = s.toUpperCase()
  const map: Record<string, string> = {
    NEW: 'NUEVO',
    OPEN: 'ABIERTO',
    ASSIGNED: 'ASIGNADO',
    IN_PROGRESS: 'EN PROGRESO',
    NEEDS_INFO: 'REQUIERE INFORMACIÓN',
    WAITING: 'EN ESPERA',
    WAITING_THIRD_PARTY: 'ESPERANDO A TERCEROS',
    RESOLVED: 'RESUELTO',
    CLOSED: 'CERRADO',
    REOPENED: 'REABIERTO',
    CANCELLED: 'CANCELADO',
    CANCELED: 'CANCELADO',
  }

  return map[key] ?? s
}

export function translateTicketPriorityEs(priority?: string | null): string {
  const s = String(priority ?? '').trim()
  if (!s) return ''

  const key = s.toUpperCase()
  const map: Record<string, string> = {
    LOW: 'BAJA',
    MEDIUM: 'MEDIA',
    HIGH: 'ALTA',
    URGENT: 'URGENTE',
    CRITICAL: 'CRÍTICA',
  }

  return map[key] ?? s
}

export function generateTicketsReportPdf(params: {
  title: string
  subtitle?: string
  summary?: TicketPdfSummaryItem[]
  rows: TicketPdfRow[]
  generatedAt?: Date
  columns?: TicketPdfColumn[]
  logo?: {
    dataUrl: string
    type?: 'PNG' | 'JPEG'
    width?: number
    height?: number
  }
}): Uint8Array<ArrayBuffer> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  })

  const generatedAt = params.generatedAt ?? new Date()

  const pageW = doc.internal.pageSize.getWidth()
  const leftMargin = 24
  const rightMargin = 24

  const logoW = params.logo?.width ?? 34
  const logoH = params.logo?.height ?? 34
  const hasLogo = Boolean(params.logo?.dataUrl)
  const headerTextX = leftMargin + (hasLogo ? logoW + 12 : 0)

  // Header
  doc.setFillColor(59, 130, 246) // blue-500
  doc.rect(0, 0, pageW, 64, 'F')
  doc.setTextColor(255, 255, 255)

  if (hasLogo && params.logo) {
    try {
      doc.addImage(params.logo.dataUrl, params.logo.type ?? 'PNG', leftMargin, 14, logoW, logoH)
    } catch {
      // ignore logo rendering errors to avoid failing the report download
    }
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(params.title, headerTextX, 40)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(
    `Generado: ${generatedAt.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}`,
    pageW - rightMargin,
    40,
    { align: 'right' },
  )

  if (params.subtitle) {
    doc.setTextColor(241, 245, 249) // slate-100
    doc.setFontSize(11)
    doc.text(params.subtitle, headerTextX, 58)
  }

  // Summary cards
  let y = 86
  const summary = params.summary ?? []
  if (summary.length) {
    const cardGap = 12
    const cardW = (pageW - leftMargin - rightMargin - cardGap * (summary.length - 1)) / summary.length
    const cardH = 54

    summary.forEach((s, idx) => {
      const x = leftMargin + idx * (cardW + cardGap)
      doc.setFillColor(241, 245, 249) // slate-100
      doc.roundedRect(x, y, cardW, cardH, 8, 8, 'F')
      doc.setTextColor(71, 85, 105) // slate-600
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text(s.label, x + 12, y + 18)
      doc.setTextColor(15, 23, 42) // slate-900
      doc.setFontSize(18)
      doc.text(s.value, x + 12, y + 42)
    })

    y += cardH + 18
  }

  // Table
  const columns: TicketPdfColumn[] = params.columns ?? [
    { key: 'code', label: '#', width: 80 },
    { key: 'title', label: 'Título', width: 250 },
    { key: 'status', label: 'Estado', width: 80 },
    { key: 'priority', label: 'Prioridad', width: 70 },
    { key: 'requester', label: 'Solicitante', width: 145 },
    { key: 'location', label: 'Sede', width: 65 },
    { key: 'createdAt', label: 'Creado', width: 85 },
  ]

  const head = [columns.map((c) => c.label)]
  const body = params.rows.map((r) => columns.map((c) => (r[c.key] ?? '') as string))

  const availableWidth = pageW - leftMargin - rightMargin
  const requestedWidth = columns.reduce((acc, c) => acc + (c.width ?? 0), 0)
  const scale = requestedWidth > 0 && requestedWidth > availableWidth ? availableWidth / requestedWidth : 1

  const columnStyles = Object.fromEntries(
    columns.map((c, idx) => [idx, c.width ? { cellWidth: Math.floor(c.width * scale) } : {}]),
  )

  autoTable(doc, {
    startY: y,
    head,
    body,
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 4,
      overflow: 'linebreak',
      valign: 'top',
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles,
    margin: { left: leftMargin, right: rightMargin },
  })

  const arrayBuffer = doc.output('arraybuffer') as ArrayBuffer
  return new Uint8Array(arrayBuffer)
}
