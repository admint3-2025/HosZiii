import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { InspectionRRHH, InspectionRRHHArea } from './inspections-rrhh.service'

// Nota: jspdf-autotable v5 expone `autoTable(doc, options)` y adjunta `doc.lastAutoTable`.

export class InspectionRRHHPDFGenerator {
  private doc: jsPDF
  private pageWidth: number
  private pageHeight: number
  private margin: number
  private currentY: number
  private logoDataUrl?: string
  private logoFormat?: 'PNG' | 'JPEG' | 'WEBP'

  // Logo corporativo
  private static readonly LOGO_URL = 'https://integrational3.com.mx/logorigen/ZIII%20logo.png'

  constructor() {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })
    this.pageWidth = this.doc.internal.pageSize.getWidth()
    this.pageHeight = this.doc.internal.pageSize.getHeight()
    this.margin = 15
    this.currentY = this.margin
  }

  private async loadLogo(): Promise<void> {
    if (this.logoDataUrl) return

    const tryFetch = async (url: string) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error('logo fetch failed')

      const blob = await res.blob()
      const mime = (blob.type || '').toLowerCase()

      const format: 'PNG' | 'JPEG' | 'WEBP' = mime.includes('png')
        ? 'PNG'
        : mime.includes('jpeg') || mime.includes('jpg')
          ? 'JPEG'
          : mime.includes('webp')
            ? 'WEBP'
            : 'PNG'

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error('logo read failed'))
        reader.readAsDataURL(blob)
      })

      this.logoDataUrl = dataUrl
      this.logoFormat = format
    }

    try {
      // Intento directo (si el host permite CORS)
      await tryFetch(InspectionRRHHPDFGenerator.LOGO_URL)
      return
    } catch {
      // Fallback: proxy same-origin para evitar bloqueos CORS
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(InspectionRRHHPDFGenerator.LOGO_URL)}`
      try {
        await tryFetch(proxyUrl)
      } catch {
        // Si falla, seguimos sin logo (se renderiza el fallback)
      }
    }
  }

  /**
   * Genera el PDF de una inspección RRHH
   */
  async generate(inspection: InspectionRRHH): Promise<Blob> {
    await this.loadLogo()
    this.addHeader(inspection)
    this.addKPISummary(inspection)
    this.addPerformanceChart(inspection)
    this.addAreasDetail(inspection)
    this.addGeneralComments(inspection)
    this.addFooter(inspection)

    return this.doc.output('blob')
  }

  /**
   * Descarga directamente el PDF
   */
  async download(inspection: InspectionRRHH, filename?: string): Promise<void> {
    const fname = filename || `Inspeccion_RRHH_${inspection.property_code}_${new Date(inspection.inspection_date).toISOString().split('T')[0]}.pdf`
    await this.generate(inspection)
    this.doc.save(fname)
  }

  private addHeader(inspection: InspectionRRHH): void {
    const logoX = this.margin
    const logoY = this.currentY
    const logoSize = 22

    const statusBoxWidth = 35
    const textLeftX = logoX + logoSize + 5
    const textRightX = this.pageWidth - this.margin - statusBoxWidth - 4
    const maxTextWidth = Math.max(10, textRightX - textLeftX)

    const ellipsizeToWidth = (text: string, maxWidth: number): string => {
      if (this.doc.getTextWidth(text) <= maxWidth) return text

      const ellipsis = '…'
      const available = Math.max(0, maxWidth - this.doc.getTextWidth(ellipsis))
      if (available <= 0) return ellipsis

      let low = 0
      let high = text.length
      while (low < high) {
        const mid = Math.ceil((low + high) / 2)
        const candidate = text.slice(0, mid)
        if (this.doc.getTextWidth(candidate) <= available) low = mid
        else high = mid - 1
      }

      return `${text.slice(0, Math.max(0, low))}${ellipsis}`
    }

    if (this.logoDataUrl) {
      try {
        this.doc.addImage(this.logoDataUrl, this.logoFormat || 'PNG', logoX, logoY, logoSize, logoSize)
      } catch {
        // Fallback visual
        this.doc.setFillColor(59, 130, 246)
        this.doc.rect(logoX, logoY, logoSize, logoSize, 'F')
        this.doc.setTextColor(255, 255, 255)
        this.doc.setFontSize(14)
        this.doc.setFont('helvetica', 'bold')
        this.doc.text('ZIII', logoX + logoSize / 2, logoY + logoSize / 2 + 2, { align: 'center' })
      }
    } else {
      // Fallback si el logo no se pudo cargar
      this.doc.setFillColor(59, 130, 246)
      this.doc.rect(logoX, logoY, logoSize, logoSize, 'F')
      this.doc.setTextColor(255, 255, 255)
      this.doc.setFontSize(14)
      this.doc.setFont('helvetica', 'bold')
      this.doc.text('ZIII', logoX + logoSize / 2, logoY + logoSize / 2 + 2, { align: 'center' })
    }

    // Título (auto-ajusta para no montarse con el status)
    this.doc.setTextColor(30, 41, 59)
    this.doc.setFont('helvetica', 'bold')
    const title = 'INSPECCIÓN DE RECURSOS HUMANOS'
    let titleFontSize = 18
    this.doc.setFontSize(titleFontSize)
    while (titleFontSize > 12 && this.doc.getTextWidth(title) > maxTextWidth) {
      titleFontSize -= 1
      this.doc.setFontSize(titleFontSize)
    }
    this.doc.text(title, textLeftX, logoY + 8)

    // Info de la propiedad
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(100, 116, 139)
    const propertyLine = `${inspection.property_code} • ${inspection.property_name}`
    this.doc.text(ellipsizeToWidth(propertyLine, maxTextWidth), textLeftX, logoY + 14)

    // Fecha y inspector
    const dateStr = new Date(inspection.inspection_date).toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
    this.doc.text(ellipsizeToWidth(`Fecha: ${dateStr}`, maxTextWidth), textLeftX, logoY + 18)
    this.doc.text(ellipsizeToWidth(`Inspector: ${inspection.inspector_name}`, maxTextWidth), textLeftX, logoY + 22)

    // Estado
    const statusText = {
      draft: 'Borrador',
      completed: 'Completada',
      approved: 'Aprobada',
      rejected: 'Rechazada'
    }[inspection.status] || inspection.status

    const statusColor = {
      draft: [203, 213, 225] as const,
      completed: [16, 185, 129] as const,
      approved: [59, 130, 246] as const,
      rejected: [239, 68, 68] as const
    }[inspection.status] || ([203, 213, 225] as const)

    const [r, g, b] = statusColor
    this.doc.setFillColor(r, g, b)
    this.doc.roundedRect(this.pageWidth - this.margin - statusBoxWidth, logoY, statusBoxWidth, 8, 2, 2, 'F')
    this.doc.setTextColor(255, 255, 255)
    this.doc.setFontSize(9)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(statusText, this.pageWidth - this.margin - 17.5, logoY + 5, { align: 'center' })

    this.currentY = logoY + logoSize + 10
    this.addSeparator()
  }

  private addKPISummary(inspection: InspectionRRHH): void {
    const boxHeight = 22
    const boxWidth = (this.pageWidth - 2 * this.margin - 9) / 4
    let x = this.margin

    // KPIs
    const kpis = [
      {
        label: 'Promedio Global',
        value: `${Math.round((inspection.average_score || 0) * 10)}%`,
        color: [59, 130, 246] as const,
        subtitle: `${inspection.total_areas || 0} áreas`
      },
      {
        label: 'Cobertura',
        value: `${inspection.coverage_percentage || 0}%`,
        color: [100, 116, 139] as const,
        subtitle: `${inspection.items_cumple! + inspection.items_no_cumple! + inspection.items_na!}/${inspection.total_items} evaluados`
      },
      {
        label: 'Cumplimiento',
        value: `${inspection.compliance_percentage || 0}%`,
        color: inspection.compliance_percentage! >= 80 ? ([16, 185, 129] as const) : ([239, 68, 68] as const),
        subtitle: `${inspection.items_cumple} cumplen`
      },
      {
        label: 'Incumplimientos',
        value: `${inspection.items_no_cumple || 0}`,
        color: inspection.items_no_cumple! > 0 ? ([239, 68, 68] as const) : ([16, 185, 129] as const),
        subtitle: `${inspection.items_na || 0} N/A`
      }
    ]

    kpis.forEach((kpi, idx) => {
      // Box
      this.doc.setDrawColor(226, 232, 240)
      this.doc.setLineWidth(0.5)
      this.doc.roundedRect(x, this.currentY, boxWidth, boxHeight, 2, 2)

      // Label
      this.doc.setTextColor(100, 116, 139)
      this.doc.setFontSize(8)
      this.doc.setFont('helvetica', 'bold')
      this.doc.text(kpi.label.toUpperCase(), x + boxWidth / 2, this.currentY + 5, { align: 'center' })

      // Value
      const [r, g, b] = kpi.color
      this.doc.setTextColor(r, g, b)
      this.doc.setFontSize(20)
      this.doc.setFont('helvetica', 'bold')
      this.doc.text(kpi.value, x + boxWidth / 2, this.currentY + 13, { align: 'center' })

      // Subtitle
      this.doc.setTextColor(148, 163, 184)
      this.doc.setFontSize(7)
      this.doc.setFont('helvetica', 'normal')
      this.doc.text(kpi.subtitle, x + boxWidth / 2, this.currentY + 18, { align: 'center' })

      x += boxWidth + 3
    })

    this.currentY += boxHeight + 8
  }

  private addPerformanceChart(inspection: InspectionRRHH): void {
    // Título de sección
    this.doc.setTextColor(30, 41, 59)
    this.doc.setFontSize(11)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('DISTRIBUCIÓN DE CUMPLIMIENTO', this.margin, this.currentY)
    this.currentY += 8

    // Datos
    const total = inspection.total_items || 1
    const cumple = inspection.items_cumple || 0
    const noCumple = inspection.items_no_cumple || 0
    const na = inspection.items_na || 0
    const pending = inspection.items_pending || 0

    const segments = [
      { label: 'Cumple', value: cumple, color: [16, 185, 129] as const, pct: Math.round((cumple / total) * 100) },
      { label: 'No Cumple', value: noCumple, color: [239, 68, 68] as const, pct: Math.round((noCumple / total) * 100) },
      { label: 'Sin evaluar', value: pending, color: [203, 213, 225] as const, pct: Math.round((pending / total) * 100) },
      { label: 'N/A', value: na, color: [245, 158, 11] as const, pct: Math.round((na / total) * 100) }
    ].filter((s) => s.value > 0)

    // Gráfico de barras horizontales
    const barHeight = 8
    const maxWidth = this.pageWidth - 2 * this.margin - 50
    let y = this.currentY

    segments.forEach((seg) => {
      // Label
      this.doc.setTextColor(71, 85, 105)
      this.doc.setFontSize(9)
      this.doc.setFont('helvetica', 'normal')
      this.doc.text(seg.label, this.margin, y + 5)

      // Bar background
      this.doc.setFillColor(241, 245, 249)
      this.doc.roundedRect(this.margin + 30, y, maxWidth, barHeight, 1, 1, 'F')

      // Bar fill
      const fillWidth = (seg.pct / 100) * maxWidth
      const [r, g, b] = seg.color
      this.doc.setFillColor(r, g, b)
      this.doc.roundedRect(this.margin + 30, y, fillWidth, barHeight, 1, 1, 'F')

      // Value
      this.doc.setTextColor(30, 41, 59)
      this.doc.setFontSize(9)
      this.doc.setFont('helvetica', 'bold')
      this.doc.text(`${seg.pct}%`, this.margin + 32 + maxWidth, y + 5.5)

      y += barHeight + 4
    })

    this.currentY = y + 5
    this.addSeparator()
  }

  private addAreasDetail(inspection: InspectionRRHH): void {
    // Título de sección
    this.doc.setTextColor(30, 41, 59)
    this.doc.setFontSize(11)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('DETALLE POR ÁREA', this.margin, this.currentY)
    this.currentY += 6

    inspection.areas.forEach((area, areaIdx) => {
      // Check page break
      if (this.currentY > this.pageHeight - 60) {
        this.doc.addPage()
        this.currentY = this.margin
      }

      // Nombre del área y score
      const score = area.calculated_score || 0
      const scoreColor = score >= 9 ? ([16, 185, 129] as const) : score >= 8 ? ([59, 130, 246] as const) : score >= 7 ? ([245, 158, 11] as const) : ([239, 68, 68] as const)

      this.doc.setFillColor(248, 250, 252)
      this.doc.roundedRect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 10, 2, 2, 'F')

      this.doc.setTextColor(30, 41, 59)
      this.doc.setFontSize(10)
      this.doc.setFont('helvetica', 'bold')
      this.doc.text(`${areaIdx + 1}. ${area.area_name}`, this.margin + 3, this.currentY + 6)

      // Score badge
      const [r, g, b] = scoreColor
      this.doc.setFillColor(r, g, b)
      this.doc.roundedRect(this.pageWidth - this.margin - 20, this.currentY + 2, 18, 6, 1, 1, 'F')
      this.doc.setTextColor(255, 255, 255)
      this.doc.setFontSize(9)
      this.doc.setFont('helvetica', 'bold')
      this.doc.text(score.toFixed(2), this.pageWidth - this.margin - 11, this.currentY + 6, { align: 'center' })

      this.currentY += 12

      // Tabla de items
      const tableData = area.items.map((item) => [
        item.descripcion,
        item.cumplimiento_valor || '-',
        item.cumplimiento_valor === 'Cumple' ? item.calif_valor.toString() : item.cumplimiento_valor === 'N/A' ? 'N/A' : '-',
        item.comentarios_valor || '-'
      ])

      autoTable(this.doc, {
        startY: this.currentY,
        head: [['Descripción', 'Cumplimiento', 'Calif.', 'Comentarios']],
        body: tableData,
        theme: 'plain',
        styles: {
          fontSize: 8,
          cellPadding: 2,
          textColor: [71, 85, 105],
          lineColor: [226, 232, 240],
          lineWidth: 0.1
        },
        headStyles: {
          fillColor: [241, 245, 249],
          textColor: [71, 85, 105],
          fontStyle: 'bold',
          fontSize: 8
        },
        columnStyles: {
          0: { cellWidth: 70 },
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 15, halign: 'center' },
          3: { cellWidth: 60 }
        },
        margin: { left: this.margin, right: this.margin }
      })

      this.currentY = ((this.doc as any).lastAutoTable?.finalY ?? this.currentY + 20) + 5
    })

    this.addSeparator()
  }

  private addGeneralComments(inspection: InspectionRRHH): void {
    if (!inspection.general_comments || inspection.general_comments.trim() === '') return

    // Check page break
    if (this.currentY > this.pageHeight - 50) {
      this.doc.addPage()
      this.currentY = this.margin
    }

    // Título
    this.doc.setTextColor(30, 41, 59)
    this.doc.setFontSize(11)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('COMENTARIOS GENERALES', this.margin, this.currentY)
    this.currentY += 6

    // Box de comentarios
    this.doc.setDrawColor(226, 232, 240)
    this.doc.setFillColor(249, 250, 251)
    this.doc.setLineWidth(0.5)

    const lines = this.doc.splitTextToSize(inspection.general_comments, this.pageWidth - 2 * this.margin - 6)
    const boxHeight = lines.length * 5 + 6

    this.doc.roundedRect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, boxHeight, 2, 2, 'FD')

    this.doc.setTextColor(71, 85, 105)
    this.doc.setFontSize(9)
    this.doc.setFont('helvetica', 'normal')
    this.doc.text(lines, this.margin + 3, this.currentY + 5)

    this.currentY += boxHeight + 5
  }

  private addFooter(inspection: InspectionRRHH): void {
    const footerY = this.pageHeight - 15

    // Línea separadora
    this.doc.setDrawColor(226, 232, 240)
    this.doc.setLineWidth(0.5)
    this.doc.line(this.margin, footerY - 5, this.pageWidth - this.margin, footerY - 5)

    // Texto
    this.doc.setTextColor(148, 163, 184)
    this.doc.setFontSize(7)
    this.doc.setFont('helvetica', 'normal')

    const timestamp = new Date().toLocaleString('es-MX')
    this.doc.text(`Generado: ${timestamp}`, this.margin, footerY)

    if (inspection.id) {
      this.doc.text(`ID: ${inspection.id}`, this.pageWidth - this.margin, footerY, { align: 'right' })
    }

    // Número de página
    const pageCount = this.doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i)
      this.doc.text(
        `Página ${i} de ${pageCount}`,
        this.pageWidth / 2,
        this.pageHeight - 10,
        { align: 'center' }
      )
    }
  }

  private addSeparator(): void {
    this.doc.setDrawColor(226, 232, 240)
    this.doc.setLineWidth(0.3)
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY)
    this.currentY += 6
  }
}
