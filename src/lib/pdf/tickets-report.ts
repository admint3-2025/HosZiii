import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

type PdfRgb = [number, number, number]

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

export type TicketPdfSignature = {
  title: string
  name?: string | null
  role?: string
}

export type TicketPdfTheme = Partial<{
  pageBg: PdfRgb
  headerBg: PdfRgb
  headerAccent: PdfRgb
  headerText: PdfRgb
  headerMutedText: PdfRgb
  summaryCardBg: PdfRgb
  summaryBorder: PdfRgb
  summaryLabel: PdfRgb
  summaryValue: PdfRgb
  sectionText: PdfRgb
  sectionMutedText: PdfRgb
  tableHeadBg: PdfRgb
  tableHeadText: PdfRgb
  tableBorder: PdfRgb
  tableZebra: PdfRgb
}>

const DEFAULT_THEME: Required<TicketPdfTheme> = {
  pageBg: [248, 250, 252],
  headerBg: [15, 23, 42],
  headerAccent: [225, 29, 72],
  headerText: [255, 255, 255],
  headerMutedText: [203, 213, 225],
  summaryCardBg: [255, 255, 255],
  summaryBorder: [226, 232, 240],
  summaryLabel: [71, 85, 105],
  summaryValue: [15, 23, 42],
  sectionText: [15, 23, 42],
  sectionMutedText: [100, 116, 139],
  tableHeadBg: [30, 41, 59],
  tableHeadText: [255, 255, 255],
  tableBorder: [226, 232, 240],
  tableZebra: [248, 250, 252],
}

const SUMMARY_ACCENTS: PdfRgb[] = [
  [71, 85, 105],
  [245, 158, 11],
  [16, 185, 129],
  [225, 29, 72],
]

function setFill(doc: jsPDF, color: PdfRgb) {
  doc.setFillColor(color[0], color[1], color[2])
}

function setDraw(doc: jsPDF, color: PdfRgb) {
  doc.setDrawColor(color[0], color[1], color[2])
}

function setText(doc: jsPDF, color: PdfRgb) {
  doc.setTextColor(color[0], color[1], color[2])
}

function getStatusPalette(status: string): { bg: PdfRgb; text: PdfRgb } {
  const value = String(status || '').toUpperCase()

  if (value.includes('CERRADO') || value.includes('RESUELTO')) {
    return { bg: [220, 252, 231], text: [22, 101, 52] }
  }
  if (value.includes('PROGRESO') || value.includes('ASIGNADO')) {
    return { bg: [254, 249, 195], text: [133, 77, 14] }
  }
  if (value.includes('ABIERTO') || value.includes('NUEVO')) {
    return { bg: [243, 232, 255], text: [107, 33, 168] }
  }
  if (value.includes('ESPERA') || value.includes('REQUIERE')) {
    return { bg: [255, 237, 213], text: [154, 52, 18] }
  }
  if (value.includes('CANCELADO')) {
    return { bg: [241, 245, 249], text: [71, 85, 105] }
  }

  return { bg: [241, 245, 249], text: [30, 41, 59] }
}

function getPriorityPalette(priority: string): { bg: PdfRgb; text: PdfRgb } {
  const value = String(priority || '').toUpperCase().trim()

  if (['URGENTE', 'CRITICAL', 'CRÍTICA', '4'].includes(value)) {
    return { bg: [254, 226, 226], text: [153, 27, 27] }
  }
  if (['HIGH', 'ALTA', '3'].includes(value)) {
    return { bg: [255, 237, 213], text: [154, 52, 18] }
  }
  if (['MEDIUM', 'MEDIA', '2'].includes(value)) {
    return { bg: [224, 231, 255], text: [67, 56, 202] }
  }
  if (['LOW', 'BAJA', '1'].includes(value)) {
    return { bg: [241, 245, 249], text: [71, 85, 105] }
  }

  return { bg: [241, 245, 249], text: [30, 41, 59] }
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
  eyebrow?: string
  subtitle?: string
  meta?: string
  tableTitle?: string
  signature?: TicketPdfSignature
  summary?: TicketPdfSummaryItem[]
  rows: TicketPdfRow[]
  generatedAt?: Date
  columns?: TicketPdfColumn[]
  theme?: TicketPdfTheme
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
  const theme = { ...DEFAULT_THEME, ...(params.theme ?? {}) }

  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const leftMargin = 24
  const rightMargin = 24

  const hasLogo = Boolean(params.logo?.dataUrl)
  const logoBoxW = hasLogo ? Math.max((params.logo?.width ?? 34) + 30, 88) : 0
  const logoBoxH = hasLogo ? Math.max((params.logo?.height ?? 34) + 22, 62) : 0
  const headerTextX = leftMargin + (hasLogo ? logoBoxW + 18 : 0)
  const headerRightReserved = 180

  setFill(doc, theme.pageBg)
  doc.rect(0, 0, pageW, pageH, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  const titleLines = doc.splitTextToSize(params.title, pageW - headerTextX - rightMargin - headerRightReserved)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  const subtitleLines = params.subtitle
    ? doc.splitTextToSize(params.subtitle, pageW - headerTextX - rightMargin - headerRightReserved)
    : []

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const metaLines = params.meta
    ? doc.splitTextToSize(params.meta, pageW - headerTextX - rightMargin - headerRightReserved)
    : []

  const headerH = Math.max(
    98,
    24 + (params.eyebrow ? 12 : 0) + titleLines.length * 18 + subtitleLines.length * 12 + metaLines.length * 11 + 20,
  )

  // Header
  setFill(doc, theme.headerBg)
  doc.rect(0, 0, pageW, headerH, 'F')
  setFill(doc, theme.headerAccent)
  doc.rect(0, 0, 8, headerH, 'F')
  setText(doc, theme.headerText)

  if (hasLogo && params.logo) {
    try {
      const logoBoxX = leftMargin
      const logoBoxY = 16
      const logoPaddingX = 10
      const logoPaddingY = 8
      const logoMaxW = logoBoxW - logoPaddingX * 2
      const logoMaxH = logoBoxH - logoPaddingY * 2

      setFill(doc, [255, 255, 255])
      setDraw(doc, [226, 232, 240])
      doc.setLineWidth(0.8)
      doc.roundedRect(logoBoxX, logoBoxY, logoBoxW, logoBoxH, 12, 12, 'FD')

      let renderW = logoMaxW
      let renderH = logoMaxH

      try {
        const imageProps = doc.getImageProperties(params.logo.dataUrl)
        const imageAspect = imageProps.width / Math.max(imageProps.height, 1)
        const boxAspect = logoMaxW / Math.max(logoMaxH, 1)

        if (imageAspect > boxAspect) {
          renderW = logoMaxW
          renderH = renderW / imageAspect
        } else {
          renderH = logoMaxH
          renderW = renderH * imageAspect
        }
      } catch {
        renderW = Math.min(params.logo.width ?? logoMaxW, logoMaxW)
        renderH = Math.min(params.logo.height ?? logoMaxH, logoMaxH)
      }

      const renderX = logoBoxX + (logoBoxW - renderW) / 2
      const renderY = logoBoxY + (logoBoxH - renderH) / 2
      doc.addImage(params.logo.dataUrl, params.logo.type ?? 'PNG', renderX, renderY, renderW, renderH)
    } catch {
      // ignore logo rendering errors to avoid failing the report download
    }
  }

  let headerY = 24

  if (params.eyebrow) {
    setText(doc, theme.headerAccent)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text(String(params.eyebrow).toUpperCase(), headerTextX, headerY)
    headerY += 13
  }

  setText(doc, theme.headerText)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(titleLines, headerTextX, headerY)
  headerY += titleLines.length * 18

  if (subtitleLines.length > 0) {
    headerY += 2
    setText(doc, theme.headerText)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(subtitleLines, headerTextX, headerY)
    headerY += subtitleLines.length * 12
  }

  if (metaLines.length > 0) {
    headerY += 2
    setText(doc, theme.headerMutedText)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(metaLines, headerTextX, headerY)
  }

  setText(doc, theme.headerMutedText)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('GENERADO', pageW - rightMargin, 24, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(
    generatedAt.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }),
    pageW - rightMargin,
    38,
    { align: 'right' },
  )

  // Summary cards
  let y = headerH + 18
  const summary = params.summary ?? []
  if (summary.length) {
    const cardGap = 12
    const cardW = (pageW - leftMargin - rightMargin - cardGap * (summary.length - 1)) / summary.length
    const cardH = 58

    summary.forEach((s, idx) => {
      const x = leftMargin + idx * (cardW + cardGap)
      const accent = SUMMARY_ACCENTS[idx % SUMMARY_ACCENTS.length]

      setFill(doc, theme.summaryCardBg)
      setDraw(doc, theme.summaryBorder)
      doc.setLineWidth(0.75)
      doc.roundedRect(x, y, cardW, cardH, 10, 10, 'FD')

      setFill(doc, accent)
      doc.roundedRect(x, y, 8, cardH, 10, 10, 'F')

      setText(doc, theme.summaryLabel)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      doc.text(s.label.toUpperCase(), x + 18, y + 19)
      setText(doc, theme.summaryValue)
      doc.setFontSize(17)
      doc.text(s.value, x + 18, y + 42)
    })

    y += cardH + 22
  }

  const tableTitle = params.tableTitle ?? 'Detalle de tickets'
  setText(doc, theme.sectionText)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(tableTitle, leftMargin, y)

  setText(doc, theme.sectionMutedText)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(`${params.rows.length} registros`, pageW - rightMargin, y, { align: 'right' })

  setDraw(doc, theme.tableBorder)
  doc.setLineWidth(1)
  doc.line(leftMargin, y + 8, pageW - rightMargin, y + 8)
  y += 18

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
  const body = params.rows.length
    ? params.rows.map((r) => columns.map((c) => (r[c.key] ?? '') as string))
    : [columns.map((c, idx) => (idx === 0 ? 'Sin tickets para los filtros seleccionados' : '') as string)]

  const availableWidth = pageW - leftMargin - rightMargin
  const requestedWidth = columns.reduce((acc, c) => acc + (c.width ?? 0), 0)
  const scale = requestedWidth > 0 && requestedWidth > availableWidth ? availableWidth / requestedWidth : 1

  const columnStyles = Object.fromEntries(
    columns.map((c, idx) => {
      const style: Record<string, unknown> = c.width ? { cellWidth: Math.floor(c.width * scale) } : {}

      if (['status', 'priority', 'createdAt'].includes(c.key)) {
        style.halign = 'center'
      }

      return [idx, style]
    }),
  )

  autoTable(doc, {
    startY: y,
    head,
    body,
    styles: {
      font: 'helvetica',
      fontSize: 7.7,
      cellPadding: 5,
      overflow: 'linebreak',
      valign: 'middle',
      lineColor: theme.tableBorder,
      lineWidth: 0.35,
      textColor: theme.sectionText,
    },
    headStyles: {
      fillColor: theme.tableHeadBg,
      textColor: theme.tableHeadText,
      fontStyle: 'bold',
      fontSize: 8.2,
      cellPadding: 6,
    },
    alternateRowStyles: {
      fillColor: theme.tableZebra,
    },
    columnStyles,
    margin: { left: leftMargin, right: rightMargin, bottom: 26 },
    didParseCell: (hookData) => {
      if (hookData.section !== 'body') return

      const column = columns[hookData.column.index]
      if (!column) return

      const rawValue = String(hookData.cell.raw ?? '')

      if (!params.rows.length) {
        hookData.cell.styles.fontStyle = 'italic'
        hookData.cell.styles.textColor = theme.sectionMutedText
        if (hookData.column.index > 0) {
          hookData.cell.text = ['']
        }
        return
      }

      if (column.key === 'title' || column.key === 'code') {
        hookData.cell.styles.fontStyle = 'bold'
      }

      if (column.key === 'status') {
        const palette = getStatusPalette(rawValue)
        hookData.cell.styles.fillColor = palette.bg
        hookData.cell.styles.textColor = palette.text
        hookData.cell.styles.fontStyle = 'bold'
      }

      if (column.key === 'priority') {
        const palette = getPriorityPalette(rawValue)
        hookData.cell.styles.fillColor = palette.bg
        hookData.cell.styles.textColor = palette.text
        hookData.cell.styles.fontStyle = 'bold'
      }
    },
  })

  if (params.signature) {
    const boxW = 220
    const boxH = 78
    const boxX = pageW - rightMargin - boxW
    const preferredBoxY = pageH - boxH - 18
    const signatureName = params.signature.name?.trim() || ' '
    const signatureRole = params.signature.role?.trim() || 'Responsable de la propiedad'
    const autoTableState = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable
    const finalY = autoTableState?.finalY ?? y
    const needsNewPage = finalY + 18 > preferredBoxY

    if (needsNewPage) {
      doc.addPage()
    }

    const signaturePage = doc.getNumberOfPages()
    const boxY = pageH - boxH - 18

    doc.setPage(signaturePage)
    setFill(doc, [255, 255, 255])
    setDraw(doc, theme.tableBorder)
    doc.setLineWidth(0.9)
    doc.roundedRect(boxX, boxY, boxW, boxH, 10, 10, 'FD')

    setText(doc, theme.sectionMutedText)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text(params.signature.title.toUpperCase(), boxX + 14, boxY + 16)

    setDraw(doc, [148, 163, 184])
    doc.setLineWidth(0.8)
    doc.line(boxX + 16, boxY + 43, boxX + boxW - 16, boxY + 43)

    setText(doc, theme.sectionText)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.text(signatureName, boxX + boxW / 2, boxY + 57, { align: 'center' })

    setText(doc, theme.sectionMutedText)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.text(signatureRole, boxX + boxW / 2, boxY + 69, { align: 'center' })
  }

  const arrayBuffer = doc.output('arraybuffer') as ArrayBuffer
  return new Uint8Array(arrayBuffer)
}
