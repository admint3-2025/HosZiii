'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import QRCode from 'qrcode'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import AssetEditForm from './AssetEditForm'
import DisposalRequestModal from './DisposalRequestModal'

type Location = {
  id: string
  name: string
  code: string
}

type Ticket = {
  id: string
  ticket_number: string
  title: string
  status: string
  priority: number
  created_at: string
  closed_at: string | null
}

type Asset = {
  id: string
  asset_tag: string
  asset_type: string
  status: string
  serial_number: string | null
  model: string | null
  brand: string | null
  department: string | null
  purchase_date: string | null
  warranty_end_date: string | null
  location: string | null
  location_id: string | null
  asset_location?: { id: string; name: string; code: string } | null
  assigned_to: string | null
  notes: string | null
  created_at: string
  updated_at: string
  processor: string | null
  ram_gb: number | null
  storage_gb: number | null
  os: string | null
  image_url: string | null
}

type AssetStats = {
  totalTickets: number
  openTickets: number
  locationChangeCount: number
  lastLocationChangeAt: string | null
  assignmentChangeCount: number
  lastAssignmentChangeAt: string | null
}

type AssetChange = {
  id: string
  field_name: string
  old_value: string | null
  new_value: string | null
  changed_at: string
  changed_by_name: string | null
  changed_by_email: string | null
  change_type: string
}

export default function AssetDetailView({
  asset,
  locations,
  relatedTickets,
  assignedUser,
  stats,
  assetHistory,
  userRole = 'requester',
  pendingDisposalRequest
}: {
  asset: Asset
  locations: Location[]
  relatedTickets: Ticket[]
  assignedUser?: { id: string; full_name: string | null; location_name: string | null } | null
  stats?: AssetStats | null
  assetHistory?: AssetChange[]
  userRole?: string
  pendingDisposalRequest?: {
    id: string
    reason: string
    created_at: string
    requester: { full_name: string | null } | null
  } | null
}) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isChangingStatus, setIsChangingStatus] = useState(false)
  const [showDisposalModal, setShowDisposalModal] = useState(false)
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null)
  const [qrError, setQrError] = useState<string | null>(null)
  const [isGeneratingQr, setIsGeneratingQr] = useState(false)
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)
  const [qrNonce, setQrNonce] = useState(0)

  const isReadOnly = userRole === 'agent_l1' || userRole === 'agent_l2'
  const hasPendingDisposal = !!pendingDisposalRequest

  const handleDelete = async () => {
    if (isReadOnly) {
      alert('No tienes permiso para eliminar activos. Contacta con un supervisor.')
      return
    }

    if (!confirm('¿Estás seguro de que deseas dar de baja este activo? Esta acción se puede revertir desde el panel de administración.')) {
      return
    }

    setIsDeleting(true)
    const supabase = createSupabaseBrowserClient()

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('assets')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user?.id || null
      })
      .eq('id', asset.id)

    if (error) {
      console.error('Error deleting asset:', error)
      alert('Error al dar de baja el activo')
      setIsDeleting(false)
      return
    }

    await supabase.from('audit_log').insert({
      entity_type: 'asset',
      entity_id: asset.id,
      action: 'DELETE',
      actor_id: user?.id,
      metadata: {
        asset_tag: asset.asset_tag,
        asset_type: asset.asset_type,
        previous_status: asset.status,
      },
    })

    router.push('/admin/assets')
    router.refresh()
  }

  const handleQuickStatusChange = async (newStatus: string) => {
    if (isReadOnly) {
      alert('No tienes permiso para cambiar el estado. Contacta con un supervisor.')
      return
    }

    if (!confirm(`¿Cambiar el estado del activo a "${newStatus}"?`)) {
      return
    }

    setIsChangingStatus(true)
    const supabase = createSupabaseBrowserClient()

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('assets')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', asset.id)

    if (error) {
      console.error('Error updating status:', error)
      alert('Error al cambiar el estado')
      setIsChangingStatus(false)
      return
    }

    await supabase.from('audit_log').insert({
      entity_type: 'asset',
      entity_id: asset.id,
      action: 'UPDATE',
      actor_id: user?.id,
      metadata: {
        asset_tag: asset.asset_tag,
        field: 'status',
        old_value: asset.status,
        new_value: newStatus,
      },
    })

    setIsChangingStatus(false)
    router.refresh()
  }

  if (isEditing) {
    // Nota: no hacer return antes de hooks. Este bloque se reubica más abajo.
  }

  // Generar QR (cliente) al cargar el detalle del activo.
  // Evita depender de /api (auth/cookies) y asegura que siempre se renderice en UI.
  useEffect(() => {
    let cancelled = false

    const generateQr = async () => {
      setIsGeneratingQr(true)
      setQrError(null)

      try {
        const baseUrl = typeof window !== 'undefined'
          ? (window.location.origin || process.env.NEXT_PUBLIC_APP_URL || '')
          : ''
        const assetUrl = baseUrl ? `${baseUrl}/admin/assets/${asset.id}` : `/admin/assets/${asset.id}`

        // QR funcional: siempre debe abrir/redireccionar al detalle del activo.
        const dataUrl = await QRCode.toDataURL(assetUrl, {
          errorCorrectionLevel: 'H',
          width: 512,
          margin: 2,
          type: 'image/png',
          color: { dark: '#000000', light: '#FFFFFF' },
        })

        if (!cancelled) {
          setQrImageUrl(dataUrl)
        }
      } catch (error) {
        console.error('Error generating QR:', error)
        if (!cancelled) {
          setQrImageUrl(null)
          setQrError('No se pudo generar el código QR.')
        }
      } finally {
        if (!cancelled) {
          setIsGeneratingQr(false)
        }
      }
    }

    generateQr()
    return () => {
      cancelled = true
    }
  }, [
    asset.id,
    asset.updated_at,
    assignedUser?.id,
    stats?.totalTickets,
    stats?.openTickets,
    stats?.locationChangeCount,
    stats?.assignmentChangeCount,
    qrNonce,
  ])

  if (isEditing) {
    return (
      <AssetEditForm
        asset={asset}
        locations={locations}
        onCancel={() => setIsEditing(false)}
        onSuccess={() => {
          setIsEditing(false)
          router.refresh()
        }}
      />
    )
  }

  const handleDownloadPDF = async () => {
    setIsDownloadingPdf(true)
    try {
      const baseUrl = typeof window !== 'undefined'
        ? (window.location.origin || process.env.NEXT_PUBLIC_APP_URL || '')
        : ''
      const assetUrl = baseUrl ? `${baseUrl}/admin/assets/${asset.id}` : `/admin/assets/${asset.id}`

      const formatDate = (date: string | null | undefined) => {
        if (!date) return 'N/A'
        const d = new Date(date)
        if (Number.isNaN(d.getTime())) return 'N/A'
        return d.toLocaleString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      }

      const formatDateShort = (date: string | null | undefined) => {
        if (!date) return '—'
        const d = new Date(date)
        if (Number.isNaN(d.getTime())) return '—'
        return d.toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit',
        })
      }

      const compact = (value: unknown, max = 42) => {
        if (value === null || value === undefined) return '—'
        const s = String(value).trim()
        if (!s || s === 'N/A') return '—'
        if (s.length <= max) return s
        // Para URLs largas, mantiene inicio+fin.
        if (/^https?:\/\//i.test(s) && max >= 18) {
          const head = Math.max(10, Math.floor(max * 0.55))
          const tail = Math.max(6, max - head - 1)
          return `${s.slice(0, head)}…${s.slice(-tail)}`
        }
        return `${s.slice(0, max - 1)}…`
      }

      const priorityLabel = (p: number) => {
        // Mantener simple: el sistema ya maneja prioridad como número.
        if (p <= 1) return 'P1'
        if (p === 2) return 'P2'
        if (p === 3) return 'P3'
        return `P${p}`
      }

      const qrForPdf =
        qrImageUrl ||
        (await QRCode.toDataURL(assetUrl, {
          errorCorrectionLevel: 'M',
          width: 256,
          margin: 2,
          type: 'image/png',
        }))

      const doc = new jsPDF({ unit: 'mm', format: 'a4' })

      const drawHeader = (subtitle: string) => {
        doc.setFillColor(15, 23, 42) // slate-900
        doc.rect(0, 0, 210, 24, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(16)
        doc.text('ZIII HoS', 15, 15)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.text(subtitle, 15, 20)
        doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 195, 20, { align: 'right' })
      }

      const sectionTitle = (title: string, y: number) => {
        doc.setFillColor(241, 245, 249) // slate-100
        doc.rect(15, y - 5, 180, 8, 'F')
        doc.setTextColor(15, 23, 42)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.text(title.toUpperCase(), 17, y)
      }

      const row = (label: string, value: string, x: number, y: number) => {
        doc.setTextColor(17, 24, 39)
        doc.setFont('helvetica', 'bold')
        doc.text(`${label}:`, x, y)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(31, 41, 55)
        doc.text(value || 'N/A', x + 28, y)
      }

      // Página 1: Hoja de vida (no mezclar con incidencias/historial)
      drawHeader('Hoja de vida del activo')

      // QR
      doc.addImage(qrForPdf, 'PNG', 170, 28, 25, 25)

      // Título
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.text(`Activo: ${asset.asset_tag}`, 15, 36)

      // URL
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(75, 85, 99) // gray-600
      doc.text(assetUrl, 15, 41)

      let y = 55
      sectionTitle('Información general', y)
      y += 10

      row('Etiqueta', asset.asset_tag, 15, y)
      row('Tipo', asset.asset_type.replace(/_/g, ' '), 110, y)
      y += 8
      row('Marca', asset.brand || 'N/A', 15, y)
      row('Modelo', asset.model || 'N/A', 110, y)
      y += 8
      row('Serie', asset.serial_number || 'N/A', 15, y)
      row('Depto.', asset.department || 'N/A', 110, y)
      y += 10

      sectionTitle('Ubicación', y)
      y += 10
      row('Sede', asset.asset_location ? `${asset.asset_location.code} - ${asset.asset_location.name}` : 'N/A', 15, y)
      y += 8
      row('Ubicación', asset.location || 'N/A', 15, y)
      y += 8
      row(
        'Responsable',
        assignedUser
          ? `${assignedUser.location_name ? `[${assignedUser.location_name}] ` : ''}${assignedUser.full_name || ''}`.trim() || 'Sin asignar'
          : 'Sin asignar',
        15,
        y
      )
      y += 10

      sectionTitle('Compra y garantía', y)
      y += 10
      row('Compra', asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString('es-ES') : 'N/A', 15, y)
      row('Garantía', asset.warranty_end_date ? new Date(asset.warranty_end_date).toLocaleDateString('es-ES') : 'N/A', 110, y)
      y += 10

      sectionTitle('Estadísticas', y)
      y += 10
      row('Tickets', `${stats?.totalTickets ?? 0} (${stats?.openTickets ?? 0} abiertas)`, 15, y)
      y += 8
      row('Cambios sede', `${stats?.locationChangeCount ?? 0}`, 15, y)
      row('Cambios usr', `${stats?.assignmentChangeCount ?? 0}`, 110, y)
      y += 12

      if (asset.notes) {
        sectionTitle('Notas', y)
        y += 10
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(31, 41, 55)

        // Evita que Notas invada la página 2 (reservada para incidencias/historial).
        const text = doc.splitTextToSize(asset.notes, 180)
        const lineHeight = 4
        const maxY = 275
        const maxLines = Math.max(0, Math.floor((maxY - y) / lineHeight))
        const clipped = maxLines > 0 ? text.slice(0, maxLines) : []
        if (clipped.length > 0) {
          doc.text(clipped, 15, y)
          if (text.length > clipped.length) {
            doc.setTextColor(107, 114, 128)
            doc.setFont('helvetica', 'italic')
            doc.text('… (Notas truncadas para mantener incidencias e historial en la página 2)', 15, maxY)
          }
        }
      }

      // Página 2: Incidencias e historial (siempre separado)
      doc.addPage()
      drawHeader('Incidencias e historial de cambios')
      y = 35

      const ensureSpace = (minHeight: number) => {
        if (y + minHeight <= 275) return
        doc.addPage()
        drawHeader('Incidencias e historial de cambios')
        y = 35
      }

      const tableCommon = {
        margin: { left: 15, right: 15, top: 30 },
        styles: {
          font: 'helvetica',
          fontSize: 8,
          cellPadding: 1.6,
          overflow: 'linebreak',
          valign: 'top',
        },
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        didDrawPage: () => {
          drawHeader('Incidencias e historial de cambios')
        },
      } as const

      // Incidencias relacionadas (tabla)
      ensureSpace(20)
      sectionTitle('Incidencias relacionadas', y)

      if (!relatedTickets || relatedTickets.length === 0) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(31, 41, 55)
        doc.text('No hay incidencias relacionadas para este activo.', 15, y + 10)
        y += 20
      } else {
        const ticketsSorted = [...relatedTickets].sort((a, b) => {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })

        const ticketBody = ticketsSorted.map(t => [
          compact(t.ticket_number || t.id, 16),
          compact(t.status, 16),
          priorityLabel(t.priority),
          formatDateShort(t.created_at),
          t.closed_at ? formatDateShort(t.closed_at) : '—',
          compact(t.title || 'Sin título', 120),
        ])

        autoTable(doc, {
          ...tableCommon,
          startY: y + 6,
          head: [['Ticket', 'Estado', 'Prio', 'Creado', 'Cerrado', 'Título']],
          body: ticketBody,
          columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 22 },
            2: { cellWidth: 12 },
            3: { cellWidth: 18 },
            4: { cellWidth: 18 },
            5: { cellWidth: 'auto' },
          },
        })

        // @ts-expect-error jspdf-autotable adds lastAutoTable dynamically
        y = (doc.lastAutoTable?.finalY ?? y + 20) + 10
      }

      // Historial de cambios (tabla)
      ensureSpace(24)
      sectionTitle('Historial de cambios', y)

      if (!assetHistory || assetHistory.length === 0) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(31, 41, 55)
        doc.text('No hay cambios registrados para este activo.', 15, y + 10)
        y += 20
      } else {
        const historySorted = [...assetHistory].sort((a, b) => {
          return new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
        })

        const historyBody = historySorted.map(h => {
          const who = h.changed_by_name || h.changed_by_email || 'Sistema'
          const field = (h.field_name || '').replace(/_/g, ' ')
          return [
            formatDateShort(h.changed_at),
            compact(field, 22),
            compact(h.old_value, 36),
            compact(h.new_value, 36),
            compact(who, 22),
          ]
        })

        autoTable(doc, {
          ...tableCommon,
          startY: y + 6,
          head: [['Fecha', 'Campo', 'De', 'A', 'Por']],
          body: historyBody,
          columnStyles: {
            0: { cellWidth: 18 },
            1: { cellWidth: 30 },
            2: { cellWidth: 55 },
            3: { cellWidth: 55 },
            4: { cellWidth: 'auto' },
          },
        })

        // @ts-expect-error jspdf-autotable adds lastAutoTable dynamically
        y = (doc.lastAutoTable?.finalY ?? y + 20) + 6
      }

      // Pie
      const pages = doc.getNumberOfPages()
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i)
        doc.setDrawColor(226, 232, 240)
        doc.line(15, 287, 195, 287)
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(8)
        doc.setTextColor(107, 114, 128)
        doc.text('ZIII HoS - Documento generado automáticamente', 15, 292)
        doc.text(`Página ${i} de ${pages}`, 195, 292, { align: 'right' })
      }

      doc.save(`Activo_${asset.asset_tag}_${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Error al descargar el PDF. Por favor, intenta nuevamente.')
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="btn btn-secondary inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </button>
          {isReadOnly && (
            <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2.5 py-1 rounded border border-gray-200">
              Solo lectura - Contacta con supervisor
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Botones de edición/baja - solo para usuarios con permisos */}
          {!isReadOnly && (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="btn btn-primary inline-flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M16.5 3.964l-9.193 9.193a2 2 0 00-.485.86l-.808 3.233a.5.5 0 00.606.606l3.232-.808a2 2 0 00.861-.485l9.193-9.193a2 2 0 00-2.828-2.828z" />
                </svg>
                Editar
              </button>
              <button
                onClick={() => setShowDisposalModal(true)}
                disabled={isDeleting || hasPendingDisposal}
                className="btn btn-danger inline-flex items-center gap-2"
                title={hasPendingDisposal ? 'Ya existe una solicitud pendiente' : undefined}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {hasPendingDisposal ? 'Baja Pendiente' : 'Solicitar Baja'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="card shadow-sm border border-slate-200">
        <div className="card-body p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-gray-600">Estado:</span>
              {asset.status === 'OPERATIONAL' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-sm font-semibold bg-green-100 text-green-800">
                  <span className="w-2 h-2 rounded-full bg-green-600"></span>
                  Operacional
                </span>
              )}
              {asset.status === 'MAINTENANCE' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-sm font-semibold bg-yellow-100 text-yellow-800">
                  <span className="w-2 h-2 rounded-full bg-yellow-600"></span>
                  En Mantenimiento
                </span>
              )}
              {asset.status === 'OUT_OF_SERVICE' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-sm font-semibold bg-red-100 text-red-800">
                  <span className="w-2 h-2 rounded-full bg-red-600"></span>
                  Fuera de Servicio
                </span>
              )}
              {asset.status === 'RETIRED' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-sm font-semibold bg-gray-100 text-gray-800">
                  <span className="w-2 h-2 rounded-full bg-gray-600"></span>
                  Retirado
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => handleQuickStatusChange('OPERATIONAL')}
                disabled={isReadOnly || isChangingStatus || asset.status === 'OPERATIONAL'}
                className="btn btn-sm btn-outline-success"
                title="Marcar como operacional"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Operacional
              </button>
              <button
                onClick={() => handleQuickStatusChange('MAINTENANCE')}
                disabled={isReadOnly || isChangingStatus || asset.status === 'MAINTENANCE'}
                className="btn btn-sm btn-outline-warning"
                title="Marcar en mantenimiento"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Mantenimiento
              </button>
              <button
                onClick={() => handleQuickStatusChange('OUT_OF_SERVICE')}
                disabled={isReadOnly || isChangingStatus || asset.status === 'OUT_OF_SERVICE'}
                className="btn btn-sm btn-outline-danger"
                title="Marcar fuera de servicio"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Fuera de Servicio
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Banner de solicitud de baja pendiente */}
      {pendingDisposalRequest && (
        <div className="card bg-red-50 border-2 border-red-300 shadow-md">
          <div className="card-body p-4">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-full flex-shrink-0">
                <svg className="w-5 h-5 text-red-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-900">⚠️ Solicitud de Baja Pendiente</h3>
                <p className="text-sm text-red-700 mt-1">
                  Este activo tiene una solicitud de baja esperando autorización de un administrador.
                </p>
                <div className="mt-2 p-2 bg-white/60 rounded border border-red-200">
                  <p className="text-sm text-red-800 italic">&quot;{pendingDisposalRequest.reason}&quot;</p>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-red-600">
                  <span>
                    Solicitado por: <strong>{pendingDisposalRequest.requester?.full_name || 'Usuario'}</strong>
                  </span>
                  <span>
                    {new Date(pendingDisposalRequest.created_at).toLocaleString('es-ES', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Imagen del activo y QR */}
      {(asset.image_url || qrImageUrl || isGeneratingQr || qrError) && (
        <div className="card shadow-sm border border-slate-200">
          <div className="card-body p-4">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h2 className="text-lg font-semibold text-gray-900">Imagen del Activo y Código QR</h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Imagen del activo */}
              {asset.image_url && (
                <div className="flex flex-col">
                  <div className="bg-gray-50 rounded-lg border-2 border-gray-200 p-4 flex items-center justify-center" style={{ minHeight: '320px' }}>
                    <img
                      src={asset.image_url}
                      alt={`Imagen de ${asset.asset_tag}`}
                      className="max-w-full max-h-80 object-contain rounded"
                    />
                  </div>
                  <p className="text-sm text-gray-600 text-center mt-3">
                    <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Fotografía del activo
                  </p>
                </div>
              )}
              
              {/* Código QR */}
              {(qrImageUrl || isGeneratingQr || qrError) && (
                <div className="flex flex-col">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-400 p-6 flex items-center justify-center" style={{ minHeight: '320px' }}>
                    {qrImageUrl ? (
                      <div className="bg-white p-4 rounded-xl shadow-lg">
                        <img
                          src={qrImageUrl}
                          alt={`Código QR de ${asset.asset_tag}`}
                          className="w-64 h-64 object-contain"
                        />
                      </div>
                    ) : isGeneratingQr ? (
                      <div className="bg-white/80 p-6 rounded-xl border border-blue-100 text-center w-full max-w-sm">
                        <div className="mx-auto mb-3 h-10 w-10 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
                        <p className="text-sm font-semibold text-gray-900">Generando QR…</p>
                        <p className="text-xs text-gray-600 mt-1">Incluye información completa del activo.</p>
                      </div>
                    ) : (
                      <div className="bg-white/80 p-6 rounded-xl border border-red-200 text-center w-full max-w-sm">
                        <p className="text-sm font-semibold text-red-700">No se pudo generar el QR</p>
                        <p className="text-xs text-gray-600 mt-1">{qrError || 'Intenta nuevamente.'}</p>
                        <button
                          onClick={() => setQrNonce(n => n + 1)}
                          className="mt-4 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium"
                        >
                          Reintentar
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                      <p className="text-sm font-bold text-gray-900">Código QR - {asset.asset_tag}</p>
                    </div>
                    <p className="text-xs text-gray-600 mb-3">Escanea para ver la información completa del activo</p>
                    <button
                      onClick={handleDownloadPDF}
                      disabled={isDownloadingPdf}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors disabled:opacity-60"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      {isDownloadingPdf ? 'Generando PDF…' : 'Descargar PDF'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {stats && (
        <div className="card shadow-sm border border-slate-200">
          <div className="card-body p-3">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.25 9.75L9 12l2.25 2.25M15 9.75L12.75 12 15 14.25M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-base font-semibold text-gray-900">Estadísticas del activo</h2>
            </div>

            <dl className="grid grid-cols-3 gap-x-4 text-sm">
              <div>
                <dt className="text-xs font-medium text-gray-600">Incidencias totales</dt>
                <dd className="mt-0.5 text-base font-semibold text-gray-900">
                  {stats.totalTickets}
                  <span className="ml-1 text-xs text-gray-500">({stats.openTickets} abiertas)</span>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-600">Cambios de sede</dt>
                <dd className="mt-0.5 text-base font-semibold text-gray-900">
                  {stats.locationChangeCount}
                  <span className="ml-1 text-xs text-gray-500">
                    {stats.lastLocationChangeAt
                      ? new Date(stats.lastLocationChangeAt).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'Sin cambios'}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-600">Cambios de usuario</dt>
                <dd className="mt-0.5 text-base font-semibold text-gray-900">
                  {stats.assignmentChangeCount}
                  <span className="ml-1 text-xs text-gray-500">
                    {stats.lastAssignmentChangeAt
                      ? new Date(stats.lastAssignmentChangeAt).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'Sin cambios'}
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      <div className="card shadow-sm border border-slate-200">
        <div className="card-body p-4">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-base font-semibold text-gray-900">Información del Activo</h2>
          </div>

          <dl className="grid grid-cols-3 gap-x-4 gap-y-2">
            <div>
              <dt className="text-xs font-medium text-gray-600">Etiqueta</dt>
              <dd className="text-sm text-gray-900 font-mono">{asset.asset_tag}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-600">Tipo</dt>
              <dd className="text-sm text-gray-900">{asset.asset_type.replace(/_/g, ' ')}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-600">Número de Serie</dt>
              <dd className="text-sm text-gray-900">{asset.serial_number || 'No especificado'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-600">Marca</dt>
              <dd className="text-sm text-gray-900">{asset.brand || 'No especificada'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-600">Modelo</dt>
              <dd className="text-sm text-gray-900">{asset.model || 'No especificado'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-600">Departamento</dt>
              <dd className="text-sm text-gray-900">{asset.department || 'No especificado'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-600">Responsable</dt>
              <dd className="text-sm text-gray-900">
                {assignedUser
                  ? <span>{assignedUser.location_name ? `[${assignedUser.location_name}] ` : ''}{assignedUser.full_name}</span>
                  : 'Sin asignar'}
              </dd>
            </div>
            {asset.asset_location && (
              <div className="col-span-2">
                <dt className="text-xs font-medium text-gray-600">Sede</dt>
                <dd className="flex items-center gap-1.5 text-sm">
                  <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="font-semibold text-blue-900">{asset.asset_location.code}</span>
                  <span className="text-gray-600">- {asset.asset_location.name}</span>
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs font-medium text-gray-600">Ubicación Física</dt>
              <dd className="text-sm text-gray-900">{asset.location || 'No especificada'}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="card shadow-sm border border-slate-200">
        <div className="card-body p-4">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h2 className="text-base font-semibold text-gray-900">Compra y Garantía</h2>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <dt className="text-xs font-medium text-gray-600">Fecha de Compra</dt>
              <dd className="text-sm text-gray-900">
                {asset.purchase_date
                  ? new Date(asset.purchase_date).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })
                  : 'No especificada'
                }
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-600">Fin de Garantía</dt>
              <dd className="text-sm text-gray-900">
                {asset.warranty_end_date
                  ? new Date(asset.warranty_end_date).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })
                  : 'No especificada'
                }
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-600">Creado</dt>
              <dd className="text-sm text-gray-900">
                {new Date(asset.created_at).toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-600">Última Actualización</dt>
              <dd className="text-sm text-gray-900">
                {new Date(asset.updated_at).toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {(asset.asset_type === 'DESKTOP' || asset.asset_type === 'LAPTOP') &&
       (asset.processor || asset.ram_gb || asset.storage_gb || asset.os) && (
        <div className="card shadow-sm border border-slate-200">
          <div className="card-body p-4">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <h2 className="text-base font-semibold text-gray-900">Especificaciones Técnicas</h2>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
              {asset.processor && (
                <div className="col-span-2">
                  <dt className="text-xs font-medium text-gray-600">Procesador</dt>
                  <dd className="text-sm text-gray-900 font-mono bg-slate-50 px-2 py-1 rounded">
                    {asset.processor}
                  </dd>
                </div>
              )}
              {asset.ram_gb && (
                <div>
                  <dt className="text-xs font-medium text-gray-600">Memoria RAM</dt>
                  <dd className="text-sm text-gray-900">
                    <span className="font-semibold">{asset.ram_gb}</span> GB
                  </dd>
                </div>
              )}
              {asset.storage_gb && (
                <div>
                  <dt className="text-xs font-medium text-gray-600">Almacenamiento</dt>
                  <dd className="text-sm text-gray-900">
                    <span className="font-semibold">{asset.storage_gb}</span> GB
                  </dd>
                </div>
              )}
              {asset.os && (
                <div className="col-span-2">
                  <dt className="text-xs font-medium text-gray-600">Sistema Operativo</dt>
                  <dd className="text-sm text-gray-900 font-mono bg-slate-50 px-2 py-1 rounded">
                    {asset.os}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      )}

      {asset.notes && (
        <div className="card shadow-sm border border-slate-200">
          <div className="card-body p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              <h2 className="text-base font-semibold text-gray-900">Notas</h2>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{asset.notes}</p>
          </div>
        </div>
      )}

      <div className="card shadow-sm border border-slate-200">
        <div className="card-body p-4">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <h2 className="text-base font-semibold text-gray-900">Historial de Incidencias</h2>
            <span className="ml-auto text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
              {relatedTickets.length}
            </span>
          </div>

          {relatedTickets.length > 0 ? (
            <div className="space-y-1.5">
              {relatedTickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/tickets/${ticket.id}`}
                  className="flex items-center gap-3 p-2 bg-gray-50 hover:bg-blue-50 rounded border border-gray-200 hover:border-blue-300 transition-colors group"
                >
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                      #{ticket.ticket_number}
                    </span>
                    {ticket.status === 'NEW' && (
                      <span className="text-xs font-medium text-cyan-700 bg-cyan-100 px-1.5 py-0.5 rounded">Nuevo</span>
                    )}
                    {ticket.status === 'ASSIGNED' && (
                      <span className="text-xs font-medium text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">Asignado</span>
                    )}
                    {ticket.status === 'IN_PROGRESS' && (
                      <span className="text-xs font-medium text-yellow-700 bg-yellow-100 px-1.5 py-0.5 rounded">En Progreso</span>
                    )}
                    {ticket.status === 'RESOLVED' && (
                      <span className="text-xs font-medium text-green-700 bg-green-100 px-1.5 py-0.5 rounded">Resuelto</span>
                    )}
                    {ticket.status === 'CLOSED' && (
                      <span className="text-xs font-medium text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">Cerrado</span>
                    )}
                    {ticket.priority === 1 && <span className="text-sm">🔴</span>}
                    {ticket.priority === 2 && <span className="text-sm">🟠</span>}
                  </div>
                  <p className="text-sm text-gray-900 truncate flex-1 min-w-0">{ticket.title}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 flex-shrink-0">
                    <span>
                      {new Date(ticket.created_at).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'short'
                      })}
                    </span>
                    {ticket.closed_at && (
                      <span className="text-green-600">
                        ✓ {new Date(ticket.closed_at).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short'
                        })}
                      </span>
                    )}
                  </div>
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm text-gray-600 font-medium">No hay incidencias reportadas</p>
              <p className="text-xs text-gray-500 mt-1">Este activo no tiene tickets asociados</p>
            </div>
          )}
        </div>
      </div>

      {assetHistory && assetHistory.length > 0 && (
        <div className="card shadow-sm border border-slate-200">
          <div className="card-body p-4">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-base font-semibold text-gray-900">Historial de Cambios</h2>
              <span className="ml-auto text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                {assetHistory.length} cambios
              </span>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {assetHistory.map((change) => {
                const fieldLabels: Record<string, string> = {
                  status: 'Estado',
                  asset_type: 'Tipo',
                  brand: 'Marca',
                  model: 'Modelo',
                  serial_number: 'Número de Serie',
                  processor: 'Procesador',
                  ram_gb: 'Memoria RAM',
                  storage_gb: 'Almacenamiento',
                  os: 'Sistema Operativo',
                  location_id: 'Sede',
                  assigned_to: 'Responsable',
                  department: 'Departamento',
                  created: 'Creación',
                  deleted: 'Eliminación',
                  image_url: 'Imagen',
                }

                // Función para formatear valores de imagen
                const formatImageValue = (value: string | null): string => {
                  if (!value) return '(vacío)'
                  if (value === 'Sin imagen') return 'Sin imagen'
                  if (value === 'Imagen eliminada') return 'Imagen eliminada'
                  // Si es una URL, mostrar texto amigable
                  if (value.startsWith('http')) return 'Imagen agregada'
                  return value
                }

                // Determinar si es un campo de imagen
                const isImageField = change.field_name === 'image_url'

                return (
                  <div
                    key={change.id}
                    className={`p-3 rounded border ${
                      change.change_type === 'CREATE' ? 'bg-green-50 border-green-200' :
                      change.change_type === 'DELETE' ? 'bg-red-50 border-red-200' :
                      'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                            change.change_type === 'CREATE' ? 'bg-green-200 text-green-800' :
                            change.change_type === 'DELETE' ? 'bg-red-200 text-red-800' :
                            isImageField ? 'bg-purple-200 text-purple-800' :
                            'bg-blue-200 text-blue-800'
                          }`}>
                            {fieldLabels[change.field_name] || change.field_name}
                          </span>
                          {change.change_type === 'UPDATE' && (
                            <span className="text-xs text-gray-600">
                              <span className="text-gray-400">
                                {isImageField ? formatImageValue(change.old_value) : (change.old_value || '(vacío)')}
                              </span>
                              {' → '}
                              <span className="font-semibold text-gray-900">
                                {isImageField ? formatImageValue(change.new_value) : (change.new_value || '(vacío)')}
                              </span>
                            </span>
                          )}
                          {change.change_type === 'CREATE' && (
                            <span className="text-xs text-green-700 font-medium">{change.new_value}</span>
                          )}
                          {change.change_type === 'DELETE' && (
                            <span className="text-xs text-red-700 font-medium">{change.new_value}</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-600">
                          {change.changed_by_name || 'Sistema'} ({change.changed_by_email || 'automático'})
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                        {new Date(change.changed_at).toLocaleString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-xs text-amber-800">
                  <strong>Protección anti-sabotaje:</strong> Todos los cambios quedan registrados con fecha, hora y usuario responsable. Este historial no puede ser modificado ni eliminado.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de solicitud de baja */}
      <DisposalRequestModal
        assetId={asset.id}
        assetTag={asset.asset_tag}
        isOpen={showDisposalModal}
        onClose={() => setShowDisposalModal(false)}
        onSuccess={() => {
          router.refresh()
          alert('Solicitud de baja enviada. Los administradores serán notificados por correo.')
        }}
      />
    </div>
  )
}
