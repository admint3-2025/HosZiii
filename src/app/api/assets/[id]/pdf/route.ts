import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import jsPDF from 'jspdf'
import QRCode from 'qrcode'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const supabase = await createSupabaseServerClient()

    // Obtener usuario actual
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener información completa del activo
    const { data: asset, error } = await supabase
      .from('assets')
      .select(`
        *,
        asset_location:locations!location_id(id, name, code),
        assigned_user:profiles!assigned_to(id, full_name, email)
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error || !asset) {
      return NextResponse.json({ error: 'Activo no encontrado' }, { status: 404 })
    }

    // Obtener estadísticas del activo
    const { data: statsRows } = await supabase
      .rpc('get_asset_detail_stats', { p_asset_id: id })
    
    const rawStats = Array.isArray(statsRows) && statsRows.length > 0 ? statsRows[0] as any : null

    // Generar QR pequeño para incluir en el PDF
    const qrData = {
      id: asset.id,
      etiqueta: asset.asset_tag,
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/assets/${id}`
    }
    const qrCode = await QRCode.toDataURL(JSON.stringify(qrData), {
      errorCorrectionLevel: 'M',
      width: 200
    })

    // Crear PDF
    const doc = new jsPDF()
    
    // Membrete - Encabezado con logo y título
    doc.setFillColor(41, 128, 185) // Azul corporativo
    doc.rect(0, 0, 210, 35, 'F')
    
    // Logo/Título del sistema
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text('ZIII HoS', 15, 20)
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Sistema de Gestión de Activos', 15, 27)
    
    // Fecha de generación
    doc.setFontSize(8)
    doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 150, 27, { align: 'right' })
    
    // Línea decorativa
    doc.setDrawColor(41, 128, 185)
    doc.setLineWidth(0.5)
    doc.line(15, 38, 195, 38)
    
    // Título del documento
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Hoja de Vida del Activo', 105, 50, { align: 'center' })
    
    // Estado del activo (badge)
    let yPos = 60
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Estado:', 15, yPos)
    
    // Color según estado
    let statusColor: [number, number, number] = [128, 128, 128]
    let statusText = asset.status
    if (asset.status === 'OPERATIONAL') {
      statusColor = [46, 204, 113]
      statusText = 'Operacional'
    } else if (asset.status === 'MAINTENANCE') {
      statusColor = [241, 196, 15]
      statusText = 'En Mantenimiento'
    } else if (asset.status === 'OUT_OF_SERVICE') {
      statusColor = [231, 76, 60]
      statusText = 'Fuera de Servicio'
    } else if (asset.status === 'RETIRED') {
      statusColor = [149, 165, 166]
      statusText = 'Retirado'
    }
    
    doc.setFillColor(...statusColor)
    doc.roundedRect(40, yPos - 4, 35, 6, 1, 1, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.text(statusText, 57.5, yPos, { align: 'center' })
    
    // QR Code en la esquina superior derecha
    doc.addImage(qrCode, 'PNG', 160, 45, 35, 35)
    
    yPos = 85
    
    // Sección: Información General
    doc.setFillColor(236, 240, 241)
    doc.rect(15, yPos, 180, 8, 'F')
    doc.setTextColor(52, 73, 94)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('INFORMACIÓN GENERAL', 17, yPos + 5.5)
    
    yPos += 12
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    
    const leftCol = 15
    const rightCol = 110
    const lineHeight = 8
    
    // Columna izquierda
    doc.setFont('helvetica', 'bold')
    doc.text('Etiqueta:', leftCol, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(asset.asset_tag || 'N/A', leftCol + 25, yPos)
    
    doc.setFont('helvetica', 'bold')
    doc.text('Tipo:', rightCol, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text((asset.asset_type || 'N/A').replace(/_/g, ' '), rightCol + 15, yPos)
    
    yPos += lineHeight
    doc.setFont('helvetica', 'bold')
    doc.text('Marca:', leftCol, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(asset.brand || 'N/A', leftCol + 25, yPos)
    
    doc.setFont('helvetica', 'bold')
    doc.text('Modelo:', rightCol, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(asset.model || 'N/A', rightCol + 15, yPos)
    
    yPos += lineHeight
    doc.setFont('helvetica', 'bold')
    doc.text('N° de Serie:', leftCol, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(asset.serial_number || 'N/A', leftCol + 25, yPos)
    
    doc.setFont('helvetica', 'bold')
    doc.text('Departamento:', rightCol, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(asset.department || 'N/A', rightCol + 30, yPos)
    
    yPos += lineHeight + 5
    
    // Sección: Ubicación
    doc.setFillColor(236, 240, 241)
    doc.rect(15, yPos, 180, 8, 'F')
    doc.setTextColor(52, 73, 94)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('UBICACIÓN', 17, yPos + 5.5)
    
    yPos += 12
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    
    doc.setFont('helvetica', 'bold')
    doc.text('Sede:', leftCol, yPos)
    doc.setFont('helvetica', 'normal')
    const sedeText = asset.asset_location 
      ? `${asset.asset_location.code} - ${asset.asset_location.name}`
      : 'N/A'
    doc.text(sedeText, leftCol + 15, yPos)
    
    yPos += lineHeight
    doc.setFont('helvetica', 'bold')
    doc.text('Ubicación Física:', leftCol, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(asset.location || 'N/A', leftCol + 35, yPos)
    
    yPos += lineHeight
    doc.setFont('helvetica', 'bold')
    doc.text('Responsable:', leftCol, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(asset.assigned_user?.full_name || 'Sin asignar', leftCol + 30, yPos)
    
    yPos += lineHeight + 5
    
    // Sección: Compra y Garantía
    doc.setFillColor(236, 240, 241)
    doc.rect(15, yPos, 180, 8, 'F')
    doc.setTextColor(52, 73, 94)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('COMPRA Y GARANTÍA', 17, yPos + 5.5)
    
    yPos += 12
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    
    doc.setFont('helvetica', 'bold')
    doc.text('Fecha de Compra:', leftCol, yPos)
    doc.setFont('helvetica', 'normal')
    const purchaseDate = asset.purchase_date 
      ? new Date(asset.purchase_date).toLocaleDateString('es-ES')
      : 'N/A'
    doc.text(purchaseDate, leftCol + 40, yPos)
    
    doc.setFont('helvetica', 'bold')
    doc.text('Fin de Garantía:', rightCol, yPos)
    doc.setFont('helvetica', 'normal')
    const warrantyDate = asset.warranty_end_date
      ? new Date(asset.warranty_end_date).toLocaleDateString('es-ES')
      : 'N/A'
    doc.text(warrantyDate, rightCol + 35, yPos)
    
    yPos += lineHeight + 5
    
    // Sección: Especificaciones Técnicas (si aplica)
    if (
      (asset.asset_type === 'DESKTOP' || asset.asset_type === 'LAPTOP') &&
      (asset.processor || asset.ram_gb || asset.storage_gb || asset.os)
    ) {
      doc.setFillColor(236, 240, 241)
      doc.rect(15, yPos, 180, 8, 'F')
      doc.setTextColor(52, 73, 94)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('ESPECIFICACIONES TÉCNICAS', 17, yPos + 5.5)
      
      yPos += 12
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(10)
      
      if (asset.processor) {
        doc.setFont('helvetica', 'bold')
        doc.text('Procesador:', leftCol, yPos)
        doc.setFont('helvetica', 'normal')
        doc.text(asset.processor, leftCol + 25, yPos)
        yPos += lineHeight
      }
      
      if (asset.ram_gb) {
        doc.setFont('helvetica', 'bold')
        doc.text('RAM:', leftCol, yPos)
        doc.setFont('helvetica', 'normal')
        doc.text(`${asset.ram_gb} GB`, leftCol + 15, yPos)
      }
      
      if (asset.storage_gb) {
        doc.setFont('helvetica', 'bold')
        doc.text('Almacenamiento:', rightCol, yPos)
        doc.setFont('helvetica', 'normal')
        doc.text(`${asset.storage_gb} GB`, rightCol + 35, yPos)
      }
      
      if (asset.ram_gb || asset.storage_gb) {
        yPos += lineHeight
      }
      
      if (asset.os) {
        doc.setFont('helvetica', 'bold')
        doc.text('Sistema Operativo:', leftCol, yPos)
        doc.setFont('helvetica', 'normal')
        doc.text(asset.os, leftCol + 40, yPos)
        yPos += lineHeight
      }
      
      yPos += 5
    }
    
    // Sección: Estadísticas
    if (rawStats) {
      doc.setFillColor(236, 240, 241)
      doc.rect(15, yPos, 180, 8, 'F')
      doc.setTextColor(52, 73, 94)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('ESTADÍSTICAS', 17, yPos + 5.5)
      
      yPos += 12
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(10)
      
      const totalTickets = rawStats.total_tickets ?? 0
      const openTickets = rawStats.open_tickets ?? 0
      const locationChanges = rawStats.location_change_count ?? 0
      const assignmentChanges = rawStats.assignment_change_count ?? 0
      
      doc.setFont('helvetica', 'bold')
      doc.text('Incidencias:', leftCol, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(`${totalTickets} (${openTickets} abiertas)`, leftCol + 30, yPos)
      
      yPos += lineHeight
      doc.setFont('helvetica', 'bold')
      doc.text('Cambios de Sede:', leftCol, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(`${locationChanges}`, leftCol + 40, yPos)
      
      doc.setFont('helvetica', 'bold')
      doc.text('Cambios de Usuario:', rightCol, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(`${assignmentChanges}`, rightCol + 45, yPos)
      
      yPos += lineHeight + 5
    }
    
    // Sección: Notas (si existen)
    if (asset.notes) {
      if (yPos > 250) { // Nueva página si no hay espacio
        doc.addPage()
        yPos = 20
      }
      
      doc.setFillColor(236, 240, 241)
      doc.rect(15, yPos, 180, 8, 'F')
      doc.setTextColor(52, 73, 94)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('NOTAS', 17, yPos + 5.5)
      
      yPos += 12
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      
      const splitNotes = doc.splitTextToSize(asset.notes, 170)
      doc.text(splitNotes, leftCol, yPos)
      yPos += splitNotes.length * 5 + 5
    }
    
    // Pie de página con marca de agua
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      
      // Línea superior del pie
      doc.setDrawColor(41, 128, 185)
      doc.setLineWidth(0.3)
      doc.line(15, 280, 195, 280)
      
      // Texto del pie
      doc.setFontSize(8)
      doc.setTextColor(128, 128, 128)
      doc.setFont('helvetica', 'italic')
      doc.text(
        'Este documento fue generado automáticamente por ZIII HoS - Sistema de Gestión de Activos',
        105,
        285,
        { align: 'center' }
      )
      doc.text(`Página ${i} de ${pageCount}`, 105, 290, { align: 'center' })
    }
    
    // Convertir a buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
    
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Activo_${asset.asset_tag}_${new Date().toISOString().split('T')[0]}.pdf"`,
        'Cache-Control': 'no-cache'
      }
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json(
      { error: 'Error al generar PDF' },
      { status: 500 }
    )
  }
}
