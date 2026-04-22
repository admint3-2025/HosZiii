import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

type PdfRgb = [number, number, number]

type TicketDetailSummaryItem = {
  label: string
  value: string
}

export type TicketDetailContextField = {
  label: string
  value: string
}

export type TicketDetailTimelineItem = {
  date: string
  transition: string
  actor: string
  note?: string
}

export type TicketDetailCommentItem = {
  date: string
  author: string
  visibility: 'public' | 'internal'
  body: string
}

export type TicketDetailReportParams = {
  ticketCode: string
  title: string
  moduleLabel: string
  subtitle?: string
  generatedAt?: Date
  generatedBy?: string
  logo?: {
    dataUrl: string
    type?: 'PNG' | 'JPEG'
  }
  summary: TicketDetailSummaryItem[]
  contextFields: TicketDetailContextField[]
  description: string
  resolution?: string | null
  timeline: TicketDetailTimelineItem[]
  comments: TicketDetailCommentItem[]
  commentsTruncated?: boolean
}

const COLORS = {
  pageBg: [248, 250, 252] as PdfRgb,
  headerBg: [15, 23, 42] as PdfRgb,
  headerAccent: [225, 29, 72] as PdfRgb,
  headerText: [255, 255, 255] as PdfRgb,
  headerMuted: [191, 219, 254] as PdfRgb,
  cardBg: [255, 255, 255] as PdfRgb,
  cardBorder: [226, 232, 240] as PdfRgb,
  cardLabel: [71, 85, 105] as PdfRgb,
  cardValue: [15, 23, 42] as PdfRgb,
  sectionText: [15, 23, 42] as PdfRgb,
  sectionMuted: [100, 116, 139] as PdfRgb,
  tableHeadBg: [30, 41, 59] as PdfRgb,
  tableHeadText: [255, 255, 255] as PdfRgb,
  tableBorder: [226, 232, 240] as PdfRgb,
  tableZebra: [248, 250, 252] as PdfRgb,
}

const CARD_ACCENTS: PdfRgb[] = [
  [15, 23, 42],
  [14, 116, 144],
  [5, 150, 105],
  [202, 138, 4],
  [225, 29, 72],
  [99, 102, 241],
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

function sanitizeForPdf(value: string): string {
  if (!value) return ''
  let text = String(value)
  // Normalize unicode
  try {
    text = text.normalize('NFKC')
  } catch {}
  // Smart quotes -> ASCII
  text = text
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2026]/g, '...')
  // Strip markdown bold/italic markers
  text = text.replace(/\*\*/g, '').replace(/__/g, '').replace(/\*/g, '').replace(/(^|\s)_([^_]+)_(?=\s|$)/g, '$1$2')
  // Remove emojis and symbols in supplementary planes or pictographs
  text = text.replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
  text = text.replace(/[\u{2600}-\u{27BF}]/gu, '')
  text = text.replace(/[\u{FE00}-\u{FE0F}]/gu, '')
  text = text.replace(/[\u{200B}-\u{200F}\u{2028}-\u{202F}\u{2060}-\u{206F}]/gu, '')
  // Replace any remaining non WinAnsi (outside 0x20..0xFF) with space
  text = text.replace(/[^\x09\x0A\x0D\x20-\xFF]/g, ' ')
  return text
}

function clipText(value: string, maxLength: number): string {
  const normalized = sanitizeForPdf(value).replace(/\s+/g, ' ').trim()
  if (!normalized) return '-'
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 1)}...`
}

function sanitizeMultiline(value: string, maxLength: number): string {
  const cleaned = sanitizeForPdf(value).replace(/[\t\r]+/g, ' ').replace(/ {2,}/g, ' ').trim()
  if (!cleaned) return '-'
  if (cleaned.length <= maxLength) return cleaned
  return `${cleaned.slice(0, maxLength - 1)}...`
}

function nextAutoTableY(doc: jsPDF, fallback: number): number {
  const state = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable
  return typeof state?.finalY === 'number' ? state.finalY : fallback
}

function drawSummaryCards(
  doc: jsPDF,
  items: TicketDetailSummaryItem[],
  startY: number,
  pageW: number,
  leftMargin: number,
  rightMargin: number,
): number {
  if (!items.length) return startY

  const columns = Math.min(3, Math.max(items.length, 1))
  const gapX = 10
  const gapY = 10
  const cardW = (pageW - leftMargin - rightMargin - gapX * (columns - 1)) / columns
  const cardH = 56
  const rows = Math.ceil(items.length / columns)

  items.forEach((item, index) => {
    const row = Math.floor(index / columns)
    const col = index % columns
    const x = leftMargin + col * (cardW + gapX)
    const y = startY + row * (cardH + gapY)

    setFill(doc, COLORS.cardBg)
    setDraw(doc, COLORS.cardBorder)
    doc.setLineWidth(0.75)
    doc.roundedRect(x, y, cardW, cardH, 10, 10, 'FD')

    const accent = CARD_ACCENTS[index % CARD_ACCENTS.length]
    setFill(doc, accent)
    doc.roundedRect(x, y, 7, cardH, 10, 10, 'F')

    setText(doc, COLORS.cardLabel)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text(clipText(item.label.toUpperCase(), 28), x + 15, y + 19)

    setText(doc, COLORS.cardValue)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text(clipText(item.value, 44), x + 15, y + 40)
  })

  return startY + rows * cardH + (rows - 1) * gapY + 12
}

function drawSectionTitle(doc: jsPDF, title: string, subtitle: string | null, y: number, pageW: number, rightMargin: number): number {
  setText(doc, COLORS.sectionText)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12.5)
  doc.text(title, 24, y)

  if (subtitle) {
    setText(doc, COLORS.sectionMuted)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.8)
    doc.text(clipText(subtitle, 80), pageW - rightMargin, y, { align: 'right' })
  }

  setDraw(doc, COLORS.tableBorder)
  doc.setLineWidth(1)
  doc.line(24, y + 7, pageW - rightMargin, y + 7)

  return y + 14
}

function drawFooter(doc: jsPDF, generatedBy: string, generatedAt: Date) {
  const pages = doc.getNumberOfPages()
  const width = doc.internal.pageSize.getWidth()
  const height = doc.internal.pageSize.getHeight()

  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page)

    setDraw(doc, COLORS.tableBorder)
    doc.setLineWidth(0.8)
    doc.line(24, height - 28, width - 24, height - 28)

    setText(doc, COLORS.sectionMuted)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(`Generado por: ${clipText(generatedBy, 52)}`, 24, height - 15)
    doc.text(`Fecha: ${generatedAt.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}`, width / 2, height - 15, { align: 'center' })
    doc.text(`Pagina ${page}/${pages}`, width - 24, height - 15, { align: 'right' })
  }
}

export function generateTicketDetailPdf(params: TicketDetailReportParams): Uint8Array<ArrayBuffer> {
  const generatedAt = params.generatedAt ?? new Date()
  const generatedBy = params.generatedBy?.trim() || 'Sistema ZIII'

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  })

  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const leftMargin = 24
  const rightMargin = 24

  setFill(doc, COLORS.pageBg)
  doc.rect(0, 0, pageW, pageH, 'F')

  const headerH = 108
  setFill(doc, COLORS.headerBg)
  doc.rect(0, 0, pageW, headerH, 'F')
  setFill(doc, COLORS.headerAccent)
  doc.rect(0, 0, 8, headerH, 'F')

  if (params.logo?.dataUrl) {
    try {
      // Fit logo inside a generous box preserving aspect ratio
      const boxW = 130
      const boxH = 64
      const padding = 6
      let drawW = boxW
      let drawH = boxH

      try {
        const props = doc.getImageProperties(params.logo.dataUrl)
        if (props && props.width > 0 && props.height > 0) {
          const scale = Math.min(boxW / props.width, boxH / props.height)
          drawW = props.width * scale
          drawH = props.height * scale
        }
      } catch {
        // Fallback to box dimensions if metadata not available
      }

      const boxX = pageW - rightMargin - boxW
      const boxY = (headerH - boxH) / 2
      const imgX = boxX + (boxW - drawW) / 2
      const imgY = boxY + (boxH - drawH) / 2

      setFill(doc, [255, 255, 255])
      setDraw(doc, [226, 232, 240])
      doc.roundedRect(boxX - padding, boxY - padding, boxW + padding * 2, boxH + padding * 2, 10, 10, 'FD')
      doc.addImage(params.logo.dataUrl, params.logo.type ?? 'PNG', imgX, imgY, drawW, drawH)
    } catch {
      // Ignore logo rendering errors without blocking report creation.
    }
  }

  setText(doc, COLORS.headerAccent)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.text('REPORTE EJECUTIVO DE TICKET', leftMargin, 24)

  setText(doc, COLORS.headerText)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Detalle Integral de Ticket', leftMargin, 44)

  setText(doc, COLORS.headerMuted)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.text(clipText(`${params.moduleLabel} | ${params.ticketCode}`, 70), leftMargin, 62)

  const subtitle = params.subtitle?.trim() || params.title
  const subtitleLines = doc.splitTextToSize(clipText(subtitle, 170), pageW - leftMargin - rightMargin - 80)
  setText(doc, COLORS.headerText)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(subtitleLines, leftMargin, 81)

  let y = headerH + 16

  y = drawSummaryCards(doc, params.summary, y, pageW, leftMargin, rightMargin)

  y = drawSectionTitle(doc, 'Contexto Operativo', null, y, pageW, rightMargin)

  autoTable(doc, {
    startY: y,
    head: [['Campo', 'Detalle']],
    body: params.contextFields.map((field) => [clipText(field.label, 45), clipText(field.value, 170)]),
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 6,
      valign: 'middle',
      lineColor: COLORS.tableBorder,
      lineWidth: 0.35,
      textColor: COLORS.sectionText,
    },
    headStyles: {
      fillColor: COLORS.tableHeadBg,
      textColor: COLORS.tableHeadText,
      fontStyle: 'bold',
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: COLORS.tableZebra,
    },
    columnStyles: {
      0: { cellWidth: 160, fontStyle: 'bold' },
      1: { cellWidth: pageW - leftMargin - rightMargin - 160 },
    },
    margin: { left: leftMargin, right: rightMargin },
  })

  y = nextAutoTableY(doc, y) + 18
  y = drawSectionTitle(doc, 'Descripcion y Resolucion', null, y, pageW, rightMargin)

  const descriptionRows: string[][] = [[sanitizeMultiline(params.description || 'Sin descripcion registrada.', 2500)]]

  if (params.resolution?.trim()) {
    descriptionRows.push([`Resolucion registrada:\n${sanitizeMultiline(params.resolution, 2500)}`])
  }

  autoTable(doc, {
    startY: y,
    head: [['Detalle']],
    body: descriptionRows,
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 7,
      valign: 'top',
      lineColor: COLORS.tableBorder,
      lineWidth: 0.35,
      textColor: COLORS.sectionText,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: COLORS.tableHeadBg,
      textColor: COLORS.tableHeadText,
      fontStyle: 'bold',
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: COLORS.tableZebra,
    },
    margin: { left: leftMargin, right: rightMargin },
  })

  y = nextAutoTableY(doc, y) + 18
  y = drawSectionTitle(doc, 'Historial de Estados', params.timeline.length ? `${params.timeline.length} eventos` : 'Sin eventos registrados', y, pageW, rightMargin)

  const timelineRows = params.timeline.length
    ? params.timeline.map((item) => [
        clipText(item.date, 30),
        clipText(item.transition, 48),
        clipText(item.actor, 42),
        clipText(item.note || '-', 100),
      ])
    : [['-', 'Sin historial disponible', '-', '-']]

  autoTable(doc, {
    startY: y,
    head: [['Fecha', 'Cambio', 'Responsable', 'Nota']],
    body: timelineRows,
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 5.2,
      valign: 'middle',
      lineColor: COLORS.tableBorder,
      lineWidth: 0.35,
      textColor: COLORS.sectionText,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: COLORS.tableHeadBg,
      textColor: COLORS.tableHeadText,
      fontStyle: 'bold',
      fontSize: 8.2,
    },
    alternateRowStyles: {
      fillColor: COLORS.tableZebra,
    },
    columnStyles: {
      0: { cellWidth: 88 },
      1: { cellWidth: 138, fontStyle: 'bold' },
      2: { cellWidth: 116 },
      3: { cellWidth: pageW - leftMargin - rightMargin - 342 },
    },
    margin: { left: leftMargin, right: rightMargin },
  })

  y = nextAutoTableY(doc, y) + 18
  const commentsSubtitle = params.commentsTruncated
    ? `${params.comments.length} comentarios incluidos (recortado para PDF)`
    : `${params.comments.length} comentarios incluidos`
  y = drawSectionTitle(doc, 'Comentarios y Trazabilidad', commentsSubtitle, y, pageW, rightMargin)

  const commentsRows = params.comments.length
    ? params.comments.map((comment) => [
        clipText(comment.date, 28),
        clipText(comment.author, 32),
        comment.visibility === 'internal' ? 'Interno' : 'Publico',
        sanitizeMultiline(comment.body, 1200),
      ])
    : [['-', '-', '-', 'Sin comentarios registrados para este ticket.']]

  autoTable(doc, {
    startY: y,
    head: [['Fecha', 'Autor', 'Tipo', 'Comentario']],
    body: commentsRows,
    styles: {
      font: 'helvetica',
      fontSize: 7.8,
      cellPadding: 4.8,
      valign: 'top',
      lineColor: COLORS.tableBorder,
      lineWidth: 0.35,
      textColor: COLORS.sectionText,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: COLORS.tableHeadBg,
      textColor: COLORS.tableHeadText,
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: COLORS.tableZebra,
    },
    columnStyles: {
      0: { cellWidth: 82, overflow: 'linebreak' },
      1: { cellWidth: 100, overflow: 'linebreak' },
      2: { cellWidth: 62, halign: 'center' },
      3: { cellWidth: pageW - leftMargin - rightMargin - 244, overflow: 'linebreak' },
    },
    margin: { left: leftMargin, right: rightMargin, bottom: 34 },
  })

  drawFooter(doc, generatedBy, generatedAt)

  const arrayBuffer = doc.output('arraybuffer') as ArrayBuffer
  return new Uint8Array(arrayBuffer)
}
