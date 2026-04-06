import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  formatPlanningCurrency,
  formatPlanningDate,
  PLANNING_MONTHS,
  type PlanningAlertFlag,
  type PlanningExportBundle,
  type PlanningExportRow,
} from '@/lib/planificacion/export'

function compactCurrency(amount: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
    notation: amount >= 1000000 ? 'compact' : 'standard',
  }).format(amount)
}

function reportModeLabel(bundle: PlanningExportBundle) {
  return bundle.reportMode === 'alerts' ? 'PDF de alertas criticas' : 'PDF informativo'
}

function planCellText(bundle: PlanningExportBundle, row: PlanningExportRow) {
  const lines = [row.plan.nombre]
  if (row.entityLabel) {
    lines.push(row.entityLabel)
  }

  if (bundle.reportMode === 'alerts') {
    const summaryBits: string[] = []
    if (row.criticalCount > 0) summaryBits.push(`Criticos: ${row.criticalCount}`)
    if (row.warningCount > 0) summaryBits.push(`Alertas: ${row.warningCount}`)
    if (row.nextDueDate) summaryBits.push(`Sig: ${formatPlanningDate(row.nextDueDate)}`)
    if (summaryBits.length > 0) {
      lines.push(summaryBits.join(' | '))
    }
  } else if (row.nextDueDate) {
    lines.push(`Siguiente: ${formatPlanningDate(row.nextDueDate)}`)
  }

  return lines.join('\n')
}

function stateCellText(bundle: PlanningExportBundle, row: PlanningExportRow) {
  if (bundle.reportMode !== 'alerts') return row.plan.estado
  if (row.criticalCount > 0) return `${row.plan.estado}\n${row.criticalCount} crit`
  if (row.warningCount > 0) return `${row.plan.estado}\n${row.warningCount} alerta`
  return row.plan.estado
}

function monthCellText(bundle: PlanningExportBundle, row: PlanningExportRow, month: number) {
  const cell = row.matrix.get(month)
  if (!cell) return '-'

  const lines: string[] = []
  if (bundle.reportMode === 'alerts') {
    const flag = row.monthlyAlertFlags.get(month)
    if (flag === 'RED') lines.push('CRIT')
    if (flag === 'YELLOW') lines.push('WARN')
  }

  lines.push(`${cell.count} evt`)
  lines.push(compactCurrency(cell.budget))
  return lines.join('\n')
}

function alertStyle(flag: PlanningAlertFlag | null) {
  if (flag === 'RED') {
    return {
      fill: [254, 226, 226] as [number, number, number],
      text: [127, 29, 29] as [number, number, number],
    }
  }
  if (flag === 'YELLOW') {
    return {
      fill: [254, 243, 199] as [number, number, number],
      text: [146, 64, 14] as [number, number, number],
    }
  }
  return null
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
  const availableWidth = pageWidth - marginLeft - marginRight
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
  doc.text(reportModeLabel(bundle), headerTextX, 73)
  doc.text(
    `Generado ${bundle.generatedAt.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}`,
    pageWidth - marginRight,
    38,
    { align: 'right' },
  )
  doc.text(bundle.profile.fullName ?? 'Usuario del sistema', pageWidth - marginRight, 58, { align: 'right' })

  let currentY = 116
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

  if (bundle.reportMode === 'alerts') {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(127, 29, 29)
    doc.text('Alertas prioritarias para intervencion', marginLeft, currentY)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139)
    doc.text('Se resaltan primero las brechas criticas segun aging, impacto y fecha de vencimiento.', marginLeft, currentY + 14)

    if (bundle.alerts.criticalItems.length > 0) {
      autoTable(doc, {
        startY: currentY + 24,
        head: [['Plan', 'Sede', 'Departamento', 'Vence', 'Estado', 'Impacto']],
        body: bundle.alerts.criticalItems.map((item) => [
          item.entityLabel ? `${item.planName}\n${item.entityLabel}` : item.planName,
          item.locationLabel,
          item.departmentLabel,
          formatPlanningDate(item.dueDate),
          `${item.alertFlag} | ${item.estado}`,
          formatPlanningCurrency(item.impact),
        ]),
        styles: {
          font: 'helvetica',
          fontSize: 8,
          cellPadding: 4,
          overflow: 'linebreak',
          valign: 'middle',
          textColor: [15, 23, 42],
          lineColor: [254, 202, 202],
          lineWidth: 0.5,
        },
        headStyles: {
          fillColor: [127, 29, 29],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
        },
        alternateRowStyles: {
          fillColor: [254, 242, 242],
        },
        tableWidth: availableWidth,
        columnStyles: {
          0: { cellWidth: 220 },
          1: { cellWidth: 150 },
          2: { cellWidth: 96 },
          3: { cellWidth: 70, halign: 'center' },
          4: { cellWidth: 82, halign: 'center' },
          5: { cellWidth: 84, halign: 'right' },
        },
        margin: { left: marginLeft, right: marginRight },
      })
      currentY = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? currentY) + 18
    } else {
      doc.setFillColor(240, 253, 244)
      doc.roundedRect(marginLeft, currentY + 24, availableWidth, 34, 8, 8, 'F')
      doc.setTextColor(22, 101, 52)
      doc.text('No hay alertas criticas activas para la vista seleccionada.', marginLeft + 12, currentY + 46)
      currentY += 70
    }
  }

  const planColumnWidth = 180
  const providerColumnWidth = 130
  const locationColumnWidth = 96
  const departmentColumnWidth = 56
  const stateColumnWidth = 56
  const annualTotalColumnWidth = 84
  const fixedColumnsWidth =
    planColumnWidth +
    providerColumnWidth +
    locationColumnWidth +
    departmentColumnWidth +
    stateColumnWidth +
    annualTotalColumnWidth
  const monthColumnWidth = Math.max(42, Math.floor((availableWidth - fixedColumnsWidth) / 12))

  const head = [[
    'Plan / entidad',
    'Proveedor responsable',
    'Sede',
    'Depto',
    'Estado',
    ...PLANNING_MONTHS,
    'Total anual',
  ]]

  const body = bundle.rows.map((row) => {
    const monthCells = Array.from({ length: 12 }, (_, index) => monthCellText(bundle, row, index + 1))

    return [
      planCellText(bundle, row),
      row.plan.responsable?.nombre ?? 'Sin proveedor',
      row.locationLabel,
      row.department.shortLabel,
      stateCellText(bundle, row),
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
      fontSize: 7.5,
      cellPadding: 3,
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
      fontSize: 7,
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    tableWidth: availableWidth,
    columnStyles: {
      0: { cellWidth: planColumnWidth },
      1: { cellWidth: providerColumnWidth },
      2: { cellWidth: locationColumnWidth },
      3: { cellWidth: departmentColumnWidth, halign: 'center' },
      4: { cellWidth: stateColumnWidth, halign: 'center' },
      5: { cellWidth: monthColumnWidth, halign: 'center' },
      6: { cellWidth: monthColumnWidth, halign: 'center' },
      7: { cellWidth: monthColumnWidth, halign: 'center' },
      8: { cellWidth: monthColumnWidth, halign: 'center' },
      9: { cellWidth: monthColumnWidth, halign: 'center' },
      10: { cellWidth: monthColumnWidth, halign: 'center' },
      11: { cellWidth: monthColumnWidth, halign: 'center' },
      12: { cellWidth: monthColumnWidth, halign: 'center' },
      13: { cellWidth: monthColumnWidth, halign: 'center' },
      14: { cellWidth: monthColumnWidth, halign: 'center' },
      15: { cellWidth: monthColumnWidth, halign: 'center' },
      16: { cellWidth: monthColumnWidth, halign: 'center' },
      17: { cellWidth: annualTotalColumnWidth, halign: 'right' },
    },
    margin: { left: marginLeft, right: marginRight, bottom: 32 },
    didParseCell: (hookData) => {
      if (hookData.section !== 'body') return

      const row = bundle.rows[hookData.row.index]
      if (!row) return

      if (bundle.reportMode === 'alerts') {
        if (hookData.column.index === 0 || hookData.column.index === 4) {
          const style = alertStyle(row.maxAlertFlag)
          if (style) {
            hookData.cell.styles.fillColor = style.fill
            hookData.cell.styles.textColor = style.text
            hookData.cell.styles.fontStyle = 'bold'
          }
        }

        if (hookData.column.index >= 5 && hookData.column.index <= 16) {
          const month = hookData.column.index - 4
          const style = alertStyle(row.monthlyAlertFlags.get(month) ?? null)
          if (style) {
            hookData.cell.styles.fillColor = style.fill
            hookData.cell.styles.textColor = style.text
            hookData.cell.styles.fontStyle = 'bold'
          }
        }
      }

      if (hookData.column.index === 17 && row.criticalCount > 0) {
        hookData.cell.styles.fontStyle = 'bold'
      }
    },
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