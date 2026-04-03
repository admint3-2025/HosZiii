import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { generateQRCode, getAssetQRContent } from '@/lib/qr/generator'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { downloadPdfBlob } from '@/lib/mobile/pdf-download'

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

// Generar código de verificación único
function generateVerificationCode(data: DisposalData): string {
  const now = new Date()
  const timestamp = now.getTime().toString(36).toUpperCase()
  const assetHash = data.assetTag.replace(/[^A-Z0-9]/gi, '').slice(0, 4).toUpperCase().padEnd(4, 'X')
  const serial = data.serialNumber.replace(/[^A-Z0-9]/gi, '').slice(-4).toUpperCase().padEnd(4, '0')
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `ZIII-${assetHash}-${serial}-${timestamp}-${random}`
}

// Generar folio consecutivo
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

// Función auxiliar para construir el PDF
async function buildPDF(data: DisposalData, folio: string, verificationCode: string, generatedAt: string, pdfDownloadUrl?: string): Promise<jsPDF> {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  let y = 15

  // ═══════════════════════════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════════════════════════
  
  doc.setFillColor(30, 64, 175)
  doc.rect(0, 0, pageWidth, 32, 'F')
  
  doc.setFillColor(59, 130, 246)
  doc.rect(0, 32, pageWidth, 3, 'F')

  // Logo ZIII
  try {
    let logoBase64 = ''
    try {
      const logoResponse = await fetch('/ziii-logo.png')
      const logoBlob = await logoResponse.blob()
      logoBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(logoBlob)
      })
    } catch {
      const logoResponse = await fetch('https://ziii.com.mx/logos/1ZIIIlogo.png')
      const logoBlob = await logoResponse.blob()
      logoBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(logoBlob)
      })
    }
    
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', margin, 4, 24, 24)
    }
  } catch (error) {
    console.error('Error loading logo:', error)
  }
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('ZIII HOS', margin + 28, 14)
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Sistema de Gestión de Activos', margin + 28, 21)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('SOLICITUD DE BAJA DE ACTIVO', pageWidth - margin, 12, { align: 'right' })
  
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
  // HISTORIAL DE INCIDENCIAS
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
  // PÁGINA 2: FIRMAS Y QR
  // ═══════════════════════════════════════════════════════════════
  
  doc.addPage()
  y = 20

  // ═══════════════════════════════════════════════════════════════
  // AUTORIZACIONES
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
    
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(180, 180, 180)
    doc.setLineWidth(0.3)
    doc.roundedRect(x, y, boxWidth, boxHeight, 2, 2, 'FD')
    
    doc.setFillColor(30, 64, 175)
    doc.circle(x + 8, y + 8, 5, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text(String(i + 1), x + 8, y + 9.5, { align: 'center' })
    
    doc.setTextColor(30, 64, 175)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text(sig.role, x + 15, y + 9)
    
    doc.setTextColor(120, 120, 120)
    doc.setFontSize(6)
    doc.setFont('helvetica', 'normal')
    doc.text(sig.desc, x + 15, y + 14)
    
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.5)
    doc.line(x + 5, y + boxHeight - 18, x + boxWidth - 5, y + boxHeight - 18)
    
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
  
  doc.setFillColor(240, 249, 255)
  doc.setDrawColor(59, 130, 246)
  doc.setLineWidth(0.3)
  doc.roundedRect(margin, y, pageWidth - margin * 2, 70, 2, 2, 'FD')
  
  doc.setTextColor(30, 64, 175)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('CÓDIGOS DE IDENTIFICACIÓN Y VERIFICACIÓN', margin + 4, y + 6)
  
  // QR del Activo (izquierda)
  const leftX = margin + 10
  const qrSize = 45
  try {
    const qrContent = getAssetQRContent({
      assetTag: data.assetTag,
      assetType: data.assetType,
      brand: data.brand,
      model: data.model,
      serialNumber: data.serialNumber,
      status: 'DADO DE BAJA'
    })
    const qrImage = await generateQRCode(qrContent, { size: 400, margin: 1, errorCorrectionLevel: 'H' })
    
    doc.addImage(qrImage, 'PNG', leftX, y + 10, qrSize, qrSize)
    
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
  
  // Código de Verificación (centro)
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
  
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(`Folio: ${folio}`, centerX, y + 30, { align: 'center' })
  doc.text(`Generado: ${generatedAt}`, centerX, y + 35, { align: 'center' })
  
  doc.setFontSize(6)
  doc.text('Este documento es válido con firmas autorizadas', centerX, y + 42, { align: 'center' })
  doc.text('Conserve este documento para registros contables', centerX, y + 47, { align: 'center' })
  
  // QR del Documento (derecha) - CON URL DE DESCARGA
  const rightX = pageWidth - margin - 55
  try {
    // Si tenemos URL de descarga, usarla; si no, usar datos JSON
    const docQRContent = pdfDownloadUrl || JSON.stringify({
      type: 'disposal',
      folio,
      assetTag: data.assetTag,
      date: data.requestDate,
      code: verificationCode
    })
    
    const docQrImage = await generateQRCode(docQRContent, { size: 400, margin: 1, errorCorrectionLevel: 'H' })
    doc.addImage(docQrImage, 'PNG', rightX, y + 10, qrSize, qrSize)
    
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text('QR Documento', rightX + qrSize / 2, y + qrSize + 12, { align: 'center' })
  } catch (error) {
    console.warn('Error al generar QR del documento:', error)
  }

  y += 75

  // ═══════════════════════════════════════════════════════════════
  // PIE DE PÁGINA
  // ═══════════════════════════════════════════════════════════════
  
  const addFooter = (pageNum: number, totalPages: number) => {
    const footerY = pageHeight - 12
    
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
  
  addFooter(2, 2)
  doc.setPage(1)
  addFooter(1, 2)
  doc.setPage(2)

  return doc
}

// Función principal exportada
export async function generateDisposalPDF(data: DisposalData, requestId?: string): Promise<{ url: string; fileName: string }> {
  // Generar códigos únicos
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
  
  const fileName = `${folio}-${data.assetTag.replace(/[^A-Z0-9]/gi, '-')}.pdf`
  let pdfUrl = ''

  // Si tenemos requestId, generar PDF, subirlo, y regenerar con QR de descarga
  if (requestId) {
    try {
      // PASO 1: Generar PDF inicial sin URL de descarga
      const tempDoc = await buildPDF(data, folio, verificationCode, generatedAt)
      const tempBlob = tempDoc.output('blob')
      
      // PASO 2: Subir a Supabase Storage
      const supabase = createSupabaseBrowserClient()
      const storagePath = `disposals/${folio}/${fileName}`
      
      const { error: uploadError } = await supabase.storage
        .from('disposal-documents')
        .upload(storagePath, tempBlob, {
          contentType: 'application/pdf',
          upsert: true
        })
      
      if (!uploadError) {
        // PASO 3: Obtener URL pública usando la URL base del entorno
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        if (supabaseUrl) {
          // Construir URL correcta para Supabase local o remoto
          pdfUrl = `${supabaseUrl}/storage/v1/object/public/disposal-documents/${storagePath}`
        } else {
          // Fallback: usar getPublicUrl()
          const { data: urlData } = supabase.storage
            .from('disposal-documents')
            .getPublicUrl(storagePath)
          pdfUrl = urlData.publicUrl
        }
        
        // PASO 4: Regenerar PDF con URL en el QR
        const finalDoc = await buildPDF(data, folio, verificationCode, generatedAt, pdfUrl)
        const finalBlob = finalDoc.output('blob')
        
        // PASO 5: Actualizar PDF en Storage con versión que tiene QR de descarga
        await supabase.storage
          .from('disposal-documents')
          .upload(storagePath, finalBlob, {
            contentType: 'application/pdf',
            upsert: true
          })
        
        // PASO 6: Descargar el PDF final
        await downloadPdfBlob(finalBlob, fileName)
      } else {
        console.error('Error uploading to Supabase:', uploadError)
        // Si falla, descargar el PDF temporal
        await downloadPdfBlob(tempBlob, fileName)
      }
    } catch (error) {
      console.error('Error en proceso de PDF:', error)
      // Fallback: generar PDF sin URL
      const doc = await buildPDF(data, folio, verificationCode, generatedAt)
      await downloadPdfBlob(doc.output('blob'), fileName)
    }
  } else {
    // Sin requestId, generar PDF sin URL de descarga
    const doc = await buildPDF(data, folio, verificationCode, generatedAt)
    await downloadPdfBlob(doc.output('blob'), fileName)
  }

  return { url: pdfUrl, fileName }
}
