import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { generateQRCode, getAssetQRContent } from '@/lib/qr/generator'

// Logo ZIII embebido en base64 (SVG)
const LOGO_BASE64 = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj48cmVjdCB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgZmlsbD0iIzI1NjNlYiIgcng9IjY0Ii8+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTEzMiAxMzJIMzcyQzM4MiAxMzIgMzkwIDE0MCAzOTAgMTUwQzM5MCAxNjAgMzgyIDE2OCAzNzIgMTY4SDIzMkwzODQgMzI4QzM5MSAzMzYgMzkwIDM0OCAzODIgMzU1QzM3NCAzNjIgMzYyIDM2MSAzNTUgMzUzTDIwMCAxOTBWMzQ0SDM0MEMzNTAgMzQ0IDM1OCAzNTIgMzU4IDM2MkMzNTggMzcyIDM1MCAzODAgMzQwIDM4MEgxMzJDMTIyIDM4MCAxMTQgMzcyIDExNCAzNjJWMTUwQzExNCAxNDAgMTIyIDEzMiAxMzIgMTMyWiIvPjxyZWN0IGZpbGw9IiNmZmYiIHg9IjMwMiIgeT0iMjU2IiB3aWR0aD0iMjQiIGhlaWdodD0iMTA4IiByeD0iMTIiLz48cmVjdCBmaWxsPSIjZmZmIiB4PSIzMzYiIHk9IjIzNiIgd2lkdGg9IjI0IiBoZWlnaHQ9IjEyOCIgcng9IjEyIi8+PHJlY3QgZmlsbD0iI2RkZCIgeD0iMzcwIiB5PSIyMTQiIHdpZHRoPSIyNCIgaGVpZ2h0PSIxNTAiIHJ4PSIxMiIvPjwvc3ZnPg=='

interface DisposalData {
  id?: string
  assetId?: string
  assetCode?: string
  assetTag: string
  assetType: string
  brand: string
  model: string
  serialNumber: string
  location: string
  department: string
  assignedUser: string
  status: string
  purchaseDate: string
  warrantyDate: string
  reason: string
  requesterName: string
  requestDate: string
  approverName?: string
  approvalDate?: string
  approvalNotes?: string
  tickets: Array<{ number: number; title: string; status: string; date: string }>
  changes: Array<{ field: string; from: string; to: string; date: string; by: string }>
}

// Generar código de verificación único basado en datos del documento
function generateVerificationCode(data: DisposalData): string {
  const now = new Date()
  const timestamp = now.getTime().toString(36).toUpperCase()
  const assetHash = data.assetTag.replace(/[^A-Z0-9]/gi, '').slice(0, 4).toUpperCase().padEnd(4, 'X')
  const serial = data.serialNumber.replace(/[^A-Z0-9]/gi, '').slice(-4).toUpperCase().padEnd(4, '0')
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `ZIII-${assetHash}-${serial}-${timestamp}-${random}`
}

// Generar folio consecutivo basado en timestamp con precisión de milisegundos
function generateFolio(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hour = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  const sec = String(now.getSeconds()).padStart(2, '0')
  const ms = String(now.getMilliseconds()).padStart(3, '0')
  return `BAJA-${year}${month}${day}-${hour}${min}${sec}${ms}`
}

export async function generateDisposalPDF(data: DisposalData): Promise<void> {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  let y = 15

  // Códigos de seguridad
  const folio = generateFolio()
  const verificationCode = generateVerificationCode(data)
  const generatedAt = new Date().toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })

  // ═══════════════════════════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════════════════════════
  
  // Fondo del header
  doc.setFillColor(30, 64, 175) // blue-800
  doc.rect(0, 0, pageWidth, 32, 'F')
  
  // Línea decorativa
  doc.setFillColor(59, 130, 246) // blue-500
  doc.rect(0, 32, pageWidth, 3, 'F')

  // Logo
  try {
    doc.addImage(LOGO_BASE64, 'SVG', margin, 4, 24, 24)
  } catch {
    // Fallback sin logo
  }
  
  // Título principal
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('ZIII HELPDESK', margin + 28, 14)
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Sistema de Gestión de Activos', margin + 28, 21)

  // Tipo de documento (derecha)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('SOLICITUD DE BAJA DE ACTIVO', pageWidth - margin, 12, { align: 'right' })
  
  // Folio
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Folio: ${folio}`, pageWidth - margin, 20, { align: 'right' })
  doc.text(`Generado: ${generatedAt}`, pageWidth - margin, 26, { align: 'right' })

  y = 42

  // ═══════════════════════════════════════════════════════════════
  // INFORMACIÓN DEL ACTIVO
  // ═══════════════════════════════════════════════════════════════
  
  doc.setTextColor(30, 64, 175)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('INFORMACIÓN DEL ACTIVO', margin, y)
  
  // Línea bajo título
  doc.setDrawColor(30, 64, 175)
  doc.setLineWidth(0.5)
  doc.line(margin, y + 2, margin + 55, y + 2)
  y += 6

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [],
    body: [
      ['Etiqueta', data.assetTag, 'Tipo', data.assetType],
      ['Marca', data.brand, 'Modelo', data.model],
      ['No. Serie', data.serialNumber, 'Estado', data.status],
      ['Sede', data.location, 'Departamento', data.department],
      ['Usuario', data.assignedUser, '', ''],
      ['F. Compra', data.purchaseDate, 'Garantía', data.warrantyDate],
    ],
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 2, textColor: [0, 0, 0] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 25, textColor: [100, 100, 100] },
      1: { cellWidth: 55 },
      2: { fontStyle: 'bold', cellWidth: 25, textColor: [100, 100, 100] },
      3: { cellWidth: 55 },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  })

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8

  // ═══════════════════════════════════════════════════════════════
  // MOTIVO DE LA SOLICITUD
  // ═══════════════════════════════════════════════════════════════
  
  doc.setTextColor(30, 64, 175)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('MOTIVO DE LA SOLICITUD', margin, y)
  doc.line(margin, y + 2, margin + 55, y + 2)
  y += 6

  doc.setTextColor(0, 0, 0)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  
  const reasonLines = doc.splitTextToSize(data.reason, pageWidth - margin * 2 - 6)
  const reasonHeight = Math.max(reasonLines.length * 4 + 6, 15)
  
  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(200, 200, 200)
  doc.roundedRect(margin, y, pageWidth - margin * 2, reasonHeight, 2, 2, 'FD')
  doc.text(reasonLines, margin + 3, y + 5)
  y += reasonHeight + 8

  // ═══════════════════════════════════════════════════════════════
  // DATOS DE LA SOLICITUD
  // ═══════════════════════════════════════════════════════════════
  
  doc.setTextColor(30, 64, 175)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('DATOS DE LA SOLICITUD', margin, y)
  doc.line(margin, y + 2, margin + 55, y + 2)
  y += 6

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [],
    body: [
      ['Solicitante', data.requesterName, 'Fecha Solicitud', data.requestDate],
      ['Revisado por', data.approverName || '—', 'Fecha Revisión', data.approvalDate || '—'],
      ['Observaciones', { content: data.approvalNotes || '—', colSpan: 3 }],
    ],
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 2, textColor: [0, 0, 0] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 25, textColor: [100, 100, 100] },
      1: { cellWidth: 55 },
      2: { fontStyle: 'bold', cellWidth: 30, textColor: [100, 100, 100] },
      3: { cellWidth: 50 },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  })

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8

  // ═══════════════════════════════════════════════════════════════
  // HISTORIAL DE INCIDENCIAS (si existe)
  // ═══════════════════════════════════════════════════════════════
  
  if (data.tickets.length > 0) {
    doc.setTextColor(30, 64, 175)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(`HISTORIAL DE INCIDENCIAS (${data.tickets.length})`, margin, y)
    doc.line(margin, y + 2, margin + 60, y + 2)
    y += 6

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['#', 'Título', 'Estado', 'Fecha']],
      body: data.tickets.slice(0, 10).map(t => [
        t.number.toString(),
        t.title.length > 50 ? t.title.substring(0, 47) + '...' : t.title,
        t.status,
        t.date
      ]),
      theme: 'striped',
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 95 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
      },
    })

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
  }

  // ═══════════════════════════════════════════════════════════════
  // FORZAR NUEVA PÁGINA PARA FIRMAS Y QR CODES
  // ═══════════════════════════════════════════════════════════════
  
  // SIEMPRE iniciar firmas y QR en página 2 para evitar sobreposiciones
  doc.addPage()
  y = 20

  // ═══════════════════════════════════════════════════════════════
  // AUTORIZACIONES - DISEÑO PROFESIONAL
  // ═══════════════════════════════════════════════════════════════
  
  doc.setTextColor(30, 64, 175)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('AUTORIZACIONES', margin, y)
  doc.line(margin, y + 2, margin + 40, y + 2)
  y += 10

  const boxWidth = (pageWidth - margin * 2 - 16) / 3
  const boxHeight = 50
  
  const signatures = [
    { role: 'RESPONSABLE DEL ACTIVO', desc: 'Usuario asignado' },
    { role: 'SUPERVISOR DE ÁREA', desc: 'Validación operativa' },
    { role: 'JEFE DE DEPARTAMENTO', desc: 'Autorización final' },
  ]

  signatures.forEach((sig, i) => {
    const x = margin + i * (boxWidth + 8)
    
    // Caja con borde
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(180, 180, 180)
    doc.setLineWidth(0.3)
    doc.roundedRect(x, y, boxWidth, boxHeight, 2, 2, 'FD')
    
    // Número de autorización
    doc.setFillColor(30, 64, 175)
    doc.circle(x + 8, y + 8, 5, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text(String(i + 1), x + 8, y + 9.5, { align: 'center' })
    
    // Rol
    doc.setTextColor(30, 64, 175)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text(sig.role, x + 15, y + 9)
    
    // Descripción
    doc.setTextColor(120, 120, 120)
    doc.setFontSize(6)
    doc.setFont('helvetica', 'normal')
    doc.text(sig.desc, x + 15, y + 14)
    
    // Línea de firma
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.5)
    doc.line(x + 5, y + boxHeight - 18, x + boxWidth - 5, y + boxHeight - 18)
    
    // Labels
    doc.setTextColor(80, 80, 80)
    doc.setFontSize(6)
    doc.text('Nombre:', x + 5, y + boxHeight - 12)
    doc.line(x + 18, y + boxHeight - 12, x + boxWidth - 5, y + boxHeight - 12)
    
    doc.text('Fecha:', x + 5, y + boxHeight - 6)
    doc.line(x + 16, y + boxHeight - 6, x + boxWidth / 2 - 2, y + boxHeight - 6)
    
    doc.text('Hora:', x + boxWidth / 2 + 2, y + boxHeight - 6)
    doc.line(x + boxWidth / 2 + 12, y + boxHeight - 6, x + boxWidth - 5, y + boxHeight - 6)
  })

  y += boxHeight + 10

  // ═══════════════════════════════════════════════════════════════
  // CÓDIGOS QR Y VERIFICACIÓN
  // ═══════════════════════════════════════════════════════════════
  
  // Recuadro principal más alto para QR más grandes
  doc.setFillColor(240, 249, 255) // blue-50
  doc.setDrawColor(59, 130, 246) // blue-500
  doc.setLineWidth(0.3)
  doc.roundedRect(margin, y, pageWidth - margin * 2, 70, 2, 2, 'FD')
  
  // Título
  doc.setTextColor(30, 64, 175)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('CÓDIGOS DE IDENTIFICACIÓN Y VERIFICACIÓN', margin + 4, y + 6)
  
  // Columna izquierda: QR del Activo (si existe assetId)
  const leftX = margin + 10
  if (data.assetId) {
    try {
      // Generar QR del activo con ALTA CALIDAD - apunta a página de detalle
      const qrContent = getAssetQRContent(data.assetId)
      const qrImage = await generateQRCode(qrContent, { size: 400, margin: 1, errorCorrectionLevel: 'H' })
      
      // QR code más grande y nítido
      const qrSize = 45
      doc.addImage(qrImage, 'PNG', leftX, y + 10, qrSize, qrSize)
      
      // Etiqueta
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.text('QR Activo', leftX + qrSize / 2, y + qrSize + 12, { align: 'center' })
      
      doc.setFont('courier', 'normal')
      doc.setFontSize(6)
      const displayCode = data.assetCode || data.assetTag
      doc.text(displayCode, leftX + qrSize / 2, y + qrSize + 16, { align: 'center' })
    } catch (error) {
      console.warn('No se pudo generar QR del activo:', error)
    }
  }
  
  // Columna central: Código de Verificación del documento
  const centerX = margin + (pageWidth - margin * 2) / 2
  doc.setTextColor(30, 64, 175)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('CÓDIGO DE VERIFICACIÓN', centerX, y + 13, { align: 'center' })
  
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(8)
  doc.setFont('courier', 'bold')
  const vCodeLines = doc.splitTextToSize(verificationCode, 65)
  doc.text(vCodeLines, centerX, y + 19, { align: 'center' })
  
  // Folio del documento
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(`Folio: ${folio}`, centerX, y + 30, { align: 'center' })
  doc.text(`Generado: ${generatedAt}`, centerX, y + 35, { align: 'center' })
  
  // Información adicional
  doc.setFontSize(6)
  doc.text('Este documento es válido con firmas autorizadas', centerX, y + 42, { align: 'center' })
  doc.text('Conserve este documento para registros contables', centerX, y + 47, { align: 'center' })
  
  // Columna derecha: QR del documento (PDF)
  const rightX = pageWidth - margin - 55
  try {
    // QR con datos del documento de baja - ALTA CALIDAD
    const docQRData = JSON.stringify({
      type: 'disposal',
      folio,
      assetTag: data.assetTag,
      date: data.requestDate,
      code: verificationCode
    })
    const docQrImage = await generateQRCode(docQRData, { size: 400, margin: 1, errorCorrectionLevel: 'H' })
    
    const qrSize = 45
    doc.addImage(docQrImage, 'PNG', rightX, y + 10, qrSize, qrSize)
    
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text('QR Documento', rightX + qrSize / 2, y + qrSize + 12, { align: 'center' })
  } catch (error) {
    console.warn('No se pudo generar QR del documento:', error)
  }

  y += 75

  // ═══════════════════════════════════════════════════════════════
  // PIE DE PÁGINA (en ambas páginas)
  // ═══════════════════════════════════════════════════════════════
  
  const addFooter = (pageNum: number, totalPages: number) => {
    const footerY = pageHeight - 12
    
    // Línea separadora
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.3)
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5)
    
    doc.setTextColor(120, 120, 120)
    doc.setFontSize(6)
    doc.setFont('helvetica', 'normal')
    doc.text(
      'DOCUMENTO OFICIAL - Válido únicamente con todas las firmas y sellos correspondientes.',
      margin,
      footerY
    )
    doc.text(
      'Cualquier alteración invalida este documento. Conservar en archivo físico por 5 años.',
      margin,
      footerY + 4
    )
    
    doc.text(`Folio: ${folio}`, pageWidth - margin, footerY, { align: 'right' })
    doc.text(`Pág. ${pageNum} de ${totalPages}`, pageWidth - margin, footerY + 4, { align: 'right' })
  }
  
  // Agregar footer a página 2 (actual)
  addFooter(2, 2)
  
  // Regresar a página 1 para agregar su footer
  doc.setPage(1)
  addFooter(1, 2)
  
  // Volver a página 2 (última página antes de guardar)
  doc.setPage(2)

  // ═══════════════════════════════════════════════════════════════
  // DESCARGAR
  // ═══════════════════════════════════════════════════════════════
  
  const fileName = `${folio}-${data.assetTag.replace(/[^A-Z0-9]/gi, '-')}.pdf`
  doc.save(fileName)
}
