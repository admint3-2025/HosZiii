import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  formatPlanningCurrency,
  PLANNING_MONTHS,
  type PlanningExportBundle,
} from '@/lib/planificacion/export'

function compactCurrency(amount: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
    notation: amount >= 1000000 ? 'compact' : 'standard',
  }).format(amount)
}

export function generatePlanningAnnualReportPdf(params: {
  bundle: PlanningExportBundle
  logo?: {
    dataUrl: string
    type?: 'PNG' | 'JPEG'
    width?: number
    height?: number
  }
}): Uint8Array<ArrayBuffer> {
  const { bundle, logo } = params
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a3',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginLeft = 28
  const marginRight = 28
  const logoWidth = logo?.width ?? 42
  const logoHeight = logo?.height ?? 42
  const hasLogo = Boolean(logo?.dataUrl)
  const headerTextX = marginLeft + (hasLogo ? logoWidth + 14 : 0)

  doc.setFillColor(15, 23, 42)
  doc.rect(0, 0, pageWidth, 82, 'F')
  doc.setTextColor(255, 255, 255)

  if (hasLogo && logo) {
    try {
      doc.addImage(logo.dataUrl, logo.type ?? 'PNG', marginLeft, 20, logoWidth, logoHeight)
    } catch {
      // ignore logo rendering failures
    }
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(21)
  doc.text('Plan anual por departamento', headerTextX, 38)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(203, 213, 225)
  doc.text(`Vista ${bundle.year} | ${bundle.filters.departmentLabel} | ${bundle.filters.locationLabel}`, headerTextX, 58)
  doc.text(
    `Generado ${bundle.generatedAt.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}`,
    pageWidth - marginRight,
    38,
    { align: 'right' },
  )
  doc.text(bundle.profile.fullName ?? 'Usuario del sistema', pageWidth - marginRight, 58, { align: 'right' })

  let currentY = 102
  const summary = [
    { label: 'Planes activos', value: String(bundle.summary.activePlans) },
    { label: 'Eventos del año', value: String(bundle.summary.totalEvents) },
    { label: 'Presupuesto', value: formatPlanningCurrency(bundle.summary.totalPlanned) },
    { label: 'Alertas críticas', value: String(bundle.summary.totalCritical) },
  ]

  const cardGap = 12
  const cardWidth = (pageWidth - marginLeft - marginRight - cardGap * (summary.length - 1)) / summary.length

  summary.forEach((item, index) => {
    const x = marginLeft + index * (cardWidth + cardGap)
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(x, currentY, cardWidth, 54, 10, 10, 'F')
    doc.setTextColor(71, 85, 105)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(item.label, x + 12, currentY + 18)
    doc.setTextColor(15, 23, 42)
    doc.setFontSize(18)
    doc.text(item.value, x + 12, currentY + 40)
  })

  currentY += 74

  const head = [[
    'Plan / entidad',
    'Sede',
    'Depto',
    'Estado',
    ...PLANNING_MONTHS,
    'Total anual',
  ]]

  const body = bundle.rows.map((row) => {
    const monthCells = Array.from({ length: 12 }, (_, index) => {
      const cell = row.matrix.get(index + 1)
      return cell ? `${cell.count} evt\n${compactCurrency(cell.budget)}` : '-'
    })

    return [
      `${row.plan.nombre}\n${row.plan.entidad?.nombre ?? 'Sin entidad'} | ${row.plan.responsable?.nombre ?? 'Sin proveedor'}`,
      row.locationLabel,
      row.department.shortLabel,
      row.plan.estado,
      ...monthCells,
      formatPlanningCurrency(row.annualBudget),
    ]
  })

  autoTable(doc, {
    startY: currentY,
    head,
    body,
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 4,
      overflow: 'linebreak',
      valign: 'middle',
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 245 },
      1: { cellWidth: 112 },
      2: { cellWidth: 76, halign: 'center' },
      3: { cellWidth: 68, halign: 'center' },
      4: { cellWidth: 54, halign: 'center' },
      5: { cellWidth: 54, halign: 'center' },
      6: { cellWidth: 54, halign: 'center' },
      7: { cellWidth: 54, halign: 'center' },
      8: { cellWidth: 54, halign: 'center' },
      9: { cellWidth: 54, halign: 'center' },
      10: { cellWidth: 54, halign: 'center' },
      11: { cellWidth: 54, halign: 'center' },
      12: { cellWidth: 54, halign: 'center' },
      13: { cellWidth: 54, halign: 'center' },
      14: { cellWidth: 54, halign: 'center' },
      15: { cellWidth: 54, halign: 'center' },
      16: { cellWidth: 92, halign: 'right' },
    },
    margin: { left: marginLeft, right: marginRight, bottom: 32 },
    didDrawPage: (hookData) => {
      const totalPages = doc.getNumberOfPages()
      doc.setFontSize(9)
      doc.setTextColor(100, 116, 139)
      doc.text(
        `Página ${hookData.pageNumber} de ${totalPages}`,
        pageWidth - marginRight,
        pageHeight - 14,
        { align: 'right' },
      )
    },
  })

  const arrayBuffer = doc.output('arraybuffer') as ArrayBuffer
  return new Uint8Array(arrayBuffer)
}