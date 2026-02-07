import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { InspectionRRHH } from './inspections-rrhh.service'

// Nota: jspdf-autotable v5 expone `autoTable(doc, options)` y adjunta `doc.lastAutoTable`.

export class InspectionRRHHPDFGenerator {
  private doc: jsPDF
  private pageWidth: number
  private pageHeight: number
  private margin: number
  private currentY: number
  private logoDataUrl?: string
  private logoFormat?: 'PNG' | 'JPEG' | 'WEBP'
  private brandLogoDataUrl?: string
  private brandLogoFormat?: 'PNG' | 'JPEG' | 'WEBP'

  private readonly systemLogoUrl: string | null
  private readonly brandLogoUrl: string | null
  private readonly brandLogoKey: string | null

  private readonly evidenceImageCache = new Map<string, { dataUrl: string; format: 'PNG' | 'JPEG' | 'WEBP' }>()

  // Logo corporativo
  private static readonly LOGO_URL = 'https://systemach-sas.com/logo_ziii/ZIII%20logo.png'
  private static readonly BRAND_LOGO_URL = 'https://systemach-sas.com/logo_ziii/alzendhlogo.png'

  constructor(options?: { systemLogoUrl?: string | null; brandLogoUrl?: string | null; brandLogoKey?: string | null }) {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })
    this.pageWidth = this.doc.internal.pageSize.getWidth()
    this.pageHeight = this.doc.internal.pageSize.getHeight()
    this.margin = 15
    this.currentY = this.margin

    this.systemLogoUrl = options?.systemLogoUrl ?? InspectionRRHHPDFGenerator.LOGO_URL
    this.brandLogoUrl = options?.brandLogoUrl ?? null
    this.brandLogoKey = options?.brandLogoKey ?? null
  }

  private async fetchImageAsDataUrl(url: string): Promise<{ dataUrl: string; format: 'PNG' | 'JPEG' | 'WEBP' }> {
    const res = await fetch(url)
    if (!res.ok) throw new Error('image fetch failed')

    const blob = await res.blob()
    const mime = (blob.type || '').toLowerCase()

    if (!mime.startsWith('image/')) {
      throw new Error('not an image')
    }

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
      reader.onerror = () => reject(new Error('image read failed'))
      reader.readAsDataURL(blob)
    })

    return { dataUrl, format }
  }

  private async loadLogo(): Promise<void> {
    if (this.logoDataUrl) return

    if (!this.systemLogoUrl) return

    try {
      // Intento directo (si el host permite CORS)
      const { dataUrl, format } = await this.fetchImageAsDataUrl(this.systemLogoUrl)
      this.logoDataUrl = dataUrl
      this.logoFormat = format
      return
    } catch {
      // Fallback: proxy same-origin para evitar bloqueos CORS
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(this.systemLogoUrl)}`
      try {
        const { dataUrl, format } = await this.fetchImageAsDataUrl(proxyUrl)
        this.logoDataUrl = dataUrl
        this.logoFormat = format
      } catch {
        // Si falla, seguimos sin logo (se renderiza el fallback)
      }
    }
  }

  private async loadBrandLogo(): Promise<void> {
    if (this.brandLogoDataUrl) return

    const resolvedUrl = this.brandLogoKey
      ? `/api/brand-logo?brand=${encodeURIComponent(this.brandLogoKey)}`
      : this.brandLogoUrl ?? InspectionRRHHPDFGenerator.BRAND_LOGO_URL

    if (!resolvedUrl) return

    // Logo fijo para este formato (con fallback de proxy por CORS)
    try {
      const { dataUrl, format } = await this.fetchImageAsDataUrl(resolvedUrl)
      this.brandLogoDataUrl = dataUrl
      this.brandLogoFormat = format
      return
    } catch {
      // Si es un endpoint same-origin (/api/brand-logo), no usamos proxy.
      if (resolvedUrl.startsWith('/')) return

      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(resolvedUrl)}`
      try {
        const { dataUrl, format } = await this.fetchImageAsDataUrl(proxyUrl)
        this.brandLogoDataUrl = dataUrl
        this.brandLogoFormat = format
      } catch {
        // Si falla, seguimos sin logo de marca
      }
    }
  }

  /**
   * Genera el PDF de una inspección
   */
  async generate(inspection: InspectionRRHH): Promise<Blob> {
    await this.loadLogo()
    await this.loadBrandLogo()
    this.addHeader(inspection)
    this.addStatusBanner(inspection)
    this.addKPISummary(inspection)
    this.addPerformanceChart(inspection)
    await this.addAreasDetail(inspection)
    this.addGeneralComments(inspection)
    this.addFooter(inspection)

    return this.doc.output('blob')
  }

  /**
   * Descarga directamente el PDF
   */
  async download(inspection: InspectionRRHH, filename?: string): Promise<void> {
    const fname = filename || `Inspeccion_${inspection.property_code}_${new Date(inspection.inspection_date).toISOString().split('T')[0]}.pdf`
    await this.generate(inspection)
    this.doc.save(fname)
  }

  private getReportTitle(inspection: InspectionRRHH): string {
    const department = inspection.department?.trim?.() ?? ''
    const normalizedDepartment = department
      ? department.replace(/\s+/g, ' ').toUpperCase()
      : 'RECURSOS HUMANOS'

    return `INSPECCIÓN DE ${normalizedDepartment}`
  }

  private addHeader(inspection: InspectionRRHH): void {
    const logoX = this.margin
    const logoY = this.currentY
    const logoSize = 22

    // Logo de marca (derecha) (solo aplica a ciertos hoteles)
    const brandLogoX = this.pageWidth - this.margin - logoSize
    const brandLogoY = logoY

    const textLeftX = logoX + logoSize + 5
    const textRightX = brandLogoX - 4
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

    // Logo de marca (derecha)
    if (this.brandLogoDataUrl) {
      try {
        this.doc.addImage(this.brandLogoDataUrl, this.brandLogoFormat || 'PNG', brandLogoX, brandLogoY, logoSize, logoSize)
      } catch {
        // silencioso
      }
    }

    // Título (auto-ajusta para no montarse con el status)
    this.doc.setTextColor(30, 41, 59)
    this.doc.setFont('helvetica', 'bold')
    const title = this.getReportTitle(inspection)
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

    this.currentY = logoY + logoSize + 10
    this.addSeparator()
  }

  private addStatusBanner(inspection: InspectionRRHH): void {
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

    const pillW = 70
    const pillH = 10
    const x = (this.pageWidth - pillW) / 2
    const y = this.currentY

    this.doc.setDrawColor(226, 232, 240)
    this.doc.setLineWidth(0.4)
    this.doc.setFillColor(statusColor[0], statusColor[1], statusColor[2])
    this.doc.roundedRect(x, y, pillW, pillH, 4, 4, 'FD')

    this.doc.setTextColor(255, 255, 255)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(11)
    this.doc.text(statusText, this.pageWidth / 2, y + 6.8, { align: 'center' })

    this.currentY = y + pillH + 8
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

    kpis.forEach((kpi) => {
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
    this.doc.text('DESEMPEÑO POR ÁREAS', this.margin, this.currentY)
    this.currentY += 8

    // Datos
    const total = Math.max(1, inspection.total_items || 0)
    const cumple = inspection.items_cumple || 0
    const noCumple = inspection.items_no_cumple || 0
    const na = inspection.items_na || 0
    const pending = inspection.items_pending || 0

    const evaluated = Math.min(total, cumple + noCumple + na)
    const coveragePct = Math.round((evaluated / total) * 100)
    const complianceBase = cumple + noCumple
    const compliancePct = complianceBase > 0 ? Math.round((cumple / complianceBase) * 100) : 0

    // Ensure pending is considered in report computations (avoid unused-var lint)
    const pendingPct = total > 0 ? Math.round((pending / total) * 100) : 0
    void pendingPct

    const areas = inspection.areas || []
    const totalAreas = Math.max(1, areas.length || inspection.total_areas || 0)

    const getAreaColor = (score: number): readonly [number, number, number] =>
      score >= 9
        ? ([16, 185, 129] as const)
        : score >= 8
          ? ([59, 130, 246] as const)
          : score >= 7
            ? ([245, 158, 11] as const)
            : ([239, 68, 68] as const)

    let criticalCount = 0
    for (const area of inspection.areas || []) {
      for (const item of area.items || []) {
        if (typeof item.calif_valor === 'number' && item.calif_valor > 0 && item.calif_valor < 8) {
          criticalCount += 1
        }
      }
    }

    // Conteo por banda de score (para leyenda)
    const areaBands = {
      excellent: { label: 'Excelente (≥9)', color: [16, 185, 129] as const, count: 0 },
      good: { label: 'Bueno (8–8.99)', color: [59, 130, 246] as const, count: 0 },
      regular: { label: 'Regular (7–7.99)', color: [245, 158, 11] as const, count: 0 },
      critical: { label: 'Crítico (<7)', color: [239, 68, 68] as const, count: 0 }
    }

    for (const area of areas) {
      const score = area.calculated_score || 0
      if (score >= 9) areaBands.excellent.count += 1
      else if (score >= 8) areaBands.good.count += 1
      else if (score >= 7) areaBands.regular.count += 1
      else areaBands.critical.count += 1
    }

    const legendBands = [
      areaBands.excellent,
      areaBands.good,
      areaBands.regular,
      areaBands.critical
    ].filter((b) => b.count > 0)

    // Layout: donut + leyenda + métricas
    const sectionHeight = 44
    const cardX = this.margin
    const cardY = this.currentY
    const cardW = this.pageWidth - 2 * this.margin
    const cardH = sectionHeight

    // Card container
    this.doc.setFillColor(248, 250, 252)
    this.doc.setDrawColor(226, 232, 240)
    this.doc.setLineWidth(0.5)
    this.doc.roundedRect(cardX, cardY, cardW, cardH, 2, 2, 'FD')

    // Donut
    const cx = cardX + 26
    const cy = cardY + 22
    const radius = 14.5
    const thickness = 6

    const anyDoc = this.doc as any
    if (typeof anyDoc.setLineCap === 'function') anyDoc.setLineCap(1)
    if (typeof anyDoc.setLineJoin === 'function') anyDoc.setLineJoin(1)

    // Base ring
    this.doc.setDrawColor(226, 232, 240)
    this.doc.setLineWidth(thickness)
    this.doc.circle(cx, cy, radius, 'S')

    // Colored segments (un segmento por área)
    let cursor = -90 // start at top
    const sweepPerArea = 360 / totalAreas
    if (areas.length > 0) {
      for (const area of areas) {
        const score = area.calculated_score || 0
        const color = getAreaColor(score)
        this.drawArcSegment(cx, cy, radius, cursor, cursor + sweepPerArea, color, thickness)
        cursor += sweepPerArea
      }
    } else {
      // Fallback: si no vienen áreas cargadas, mostramos el anillo completo en gris
      this.drawArcSegment(cx, cy, radius, -90, 270, [203, 213, 225] as const, thickness)
    }

    // Inner cutout (helps hide segment joins and makes it feel like a donut)
    const innerRadius = Math.max(1, radius - thickness / 2 + 0.4)
    this.doc.setFillColor(255, 255, 255)
    this.doc.circle(cx, cy, innerRadius, 'F')

    // Center text
    this.doc.setTextColor(30, 41, 59)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(8)
    this.doc.text('ÁREAS', cx, cy - 4, { align: 'center' })
    this.doc.setFontSize(14)
    this.doc.text(String(areas.length || inspection.total_areas || 0), cx, cy + 3.5, { align: 'center' })
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(100, 116, 139)
    this.doc.setFontSize(7)
    this.doc.text(`Prom: ${(inspection.average_score || 0).toFixed(1)}`, cx, cy + 9, { align: 'center' })

    // Métricas (derecha)
    const rightX = cardX + 52
    const rightY = cardY + 10
    const lineGap = 7

    this.doc.setTextColor(30, 41, 59)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(9)
    this.doc.text('Resumen', rightX, rightY)

    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(71, 85, 105)
    this.doc.setFontSize(8)

    // Cobertura
    this.doc.text('Cobertura:', rightX, rightY + lineGap)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(30, 41, 59)
    this.doc.text(`${coveragePct}%`, rightX + 18, rightY + lineGap)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(100, 116, 139)
    this.doc.text(`(${evaluated}/${total})`, rightX + 28, rightY + lineGap)

    // Cumplimiento
    this.doc.setTextColor(71, 85, 105)
    this.doc.text('Cumplimiento:', rightX, rightY + lineGap * 2)
    const complianceColor = compliancePct >= 80 ? ([16, 185, 129] as const) : ([239, 68, 68] as const)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(complianceColor[0], complianceColor[1], complianceColor[2])
    this.doc.text(`${compliancePct}%`, rightX + 22, rightY + lineGap * 2)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(100, 116, 139)
    this.doc.text(`(base: ${complianceBase})`, rightX + 32, rightY + lineGap * 2)

    // Críticos
    this.doc.setTextColor(71, 85, 105)
    this.doc.text('Críticos (<8):', rightX, rightY + lineGap * 3)
    this.doc.setFont('helvetica', 'bold')
    if (criticalCount > 0) this.doc.setTextColor(239, 68, 68)
    else this.doc.setTextColor(16, 185, 129)
    this.doc.text(String(criticalCount), rightX + 24, rightY + lineGap * 3)

    // Leyenda (derecha)
    const legendX = cardX + cardW - 62
    let legendY = cardY + 11

    this.doc.setTextColor(30, 41, 59)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(9)
    this.doc.text('Detalle', legendX, legendY)
    legendY += 6

    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(8)
    for (const band of legendBands) {
      const pct = Math.round((band.count / totalAreas) * 100)
      const [r, g, b] = band.color
      this.doc.setFillColor(r, g, b)
      this.doc.circle(legendX + 1.5, legendY - 1.5, 1.2, 'F')
      this.doc.setTextColor(71, 85, 105)
      this.doc.text(`${band.label}: ${band.count} (${pct}%)`, legendX + 5, legendY)
      legendY += 5
    }

    this.currentY = cardY + cardH + 6
    this.addSeparator()
  }

  private drawArcSegment(
    cx: number,
    cy: number,
    radius: number,
    startDeg: number,
    endDeg: number,
    color: readonly [number, number, number],
    thickness: number
  ): void {
    const step = 1 // más suave (reduce el efecto de "rayitas")
    const [r, g, b] = color
    this.doc.setDrawColor(r, g, b)
    this.doc.setLineWidth(thickness)

    const toRad = (deg: number) => (deg * Math.PI) / 180
    const final = Math.max(startDeg, endDeg)

    for (let a = startDeg; a < final; a += step) {
      const a1 = toRad(a)
      const a2 = toRad(Math.min(final, a + step))
      const x1 = cx + radius * Math.cos(a1)
      const y1 = cy + radius * Math.sin(a1)
      const x2 = cx + radius * Math.cos(a2)
      const y2 = cy + radius * Math.sin(a2)
      this.doc.line(x1, y1, x2, y2)
    }
  }

  private async getEvidenceImage(url: string): Promise<{ dataUrl: string; format: 'PNG' | 'JPEG' | 'WEBP' } | null> {
    if (!url) return null
    const cached = this.evidenceImageCache.get(url)
    if (cached) return cached
    try {
      const img = await this.fetchImageAsDataUrl(url)
      this.evidenceImageCache.set(url, img)
      return img
    } catch {
      return null
    }
  }

  private async addAreasDetail(inspection: InspectionRRHH): Promise<void> {
    // Título de sección
    this.doc.setTextColor(30, 41, 59)
    this.doc.setFontSize(11)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('DETALLE POR ÁREA', this.margin, this.currentY)
    this.currentY += 6

    for (let areaIdx = 0; areaIdx < inspection.areas.length; areaIdx++) {
      const area = inspection.areas[areaIdx]
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

      const thumbsByRowIdx = new Map<number, Array<{ dataUrl: string; format: 'PNG' | 'JPEG' | 'WEBP' }>>()
      await Promise.all(
        (area.items || []).map(async (item: any, rowIdx: number) => {
          const evidences = (item?.evidences || [])
            .slice()
            .sort((a: any, b: any) => Number(a?.slot ?? 0) - Number(b?.slot ?? 0))
            .slice(0, 2)

          const thumbs: Array<{ dataUrl: string; format: 'PNG' | 'JPEG' | 'WEBP' }> = []
          for (const ev of evidences) {
            const url = String(ev?.signed_url || '')
            if (!url) continue
            const img = await this.getEvidenceImage(url)
            if (img) thumbs.push(img)
          }
          if (thumbs.length > 0) thumbsByRowIdx.set(rowIdx, thumbs)
        })
      )

      // Tabla de items
      const tableData = area.items.map((item) => [
        item.descripcion,
        item.cumplimiento_valor || '-',
        item.cumplimiento_valor === 'Cumple' ? item.calif_valor.toString() : item.cumplimiento_valor === 'N/A' ? 'N/A' : '-',
        item.comentarios_valor || '-',
        ''
      ])

      autoTable(this.doc, {
        startY: this.currentY,
        head: [['Descripción', 'Cumplimiento', 'Calif.', 'Comentarios', 'Evidencias']],
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
          0: { cellWidth: 60 },
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 15, halign: 'center' },
          3: { cellWidth: 50 },
          4: { cellWidth: 30, halign: 'center' }
        },
        margin: { left: this.margin, right: this.margin },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 4) {
            data.cell.styles.minCellHeight = 18
            data.cell.text = ['']
          }
        },
        didDrawCell: (data) => {
          if (data.section !== 'body' || data.column.index !== 4) return
          const thumbs = thumbsByRowIdx.get(data.row.index)
          if (!thumbs || thumbs.length === 0) return

          const thumbSize = 14
          const gap = 1
          const totalW = thumbs.length === 1 ? thumbSize : thumbSize * 2 + gap
          const startX = data.cell.x + Math.max(0, (data.cell.width - totalW) / 2)
          const startY = data.cell.y + Math.max(0, (data.cell.height - thumbSize) / 2)

          thumbs.slice(0, 2).forEach((img, i) => {
            const x = startX + i * (thumbSize + gap)
            try {
              this.doc.addImage(img.dataUrl, img.format, x, startY, thumbSize, thumbSize)
            } catch {
              // silencioso
            }
          })
        }
      })

      this.currentY = ((this.doc as any).lastAutoTable?.finalY ?? this.currentY + 20) + 5
    }

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
