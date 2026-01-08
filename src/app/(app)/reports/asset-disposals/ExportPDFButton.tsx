'use client'

import { useState } from 'react'
import { generateDisposalPDF } from '@/lib/pdf/disposal-pdf'

type DisposalRequest = {
  id: string
  asset_id: string
  requested_by: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  asset_snapshot: Record<string, unknown> | null
  tickets_snapshot: unknown[] | null
  changes_snapshot: unknown[] | null
  created_at: string
  updated_at: string
  reviewed_by: string | null
  reviewed_at: string | null
  review_notes: string | null
  requester?: { full_name: string } | null
  reviewer?: { full_name: string } | null
  asset?: { asset_tag: string; asset_type: string } | null
}

interface ExportPDFButtonProps {
  disposal: DisposalRequest
}

function getValue(snapshot: Record<string, unknown> | null, key: string, fallback = '-'): string {
  if (!snapshot) return fallback
  const value = snapshot[key]
  if (value === null || value === undefined || value === '') return fallback
  if (typeof value === 'object' && 'name' in (value as Record<string, unknown>)) {
    return (value as { name: string }).name
  }
  return String(value)
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

export default function ExportPDFButton({ disposal }: ExportPDFButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    setLoading(true)
    try {
      const snapshot = disposal.asset_snapshot as Record<string, unknown> | null

      const tickets = (disposal.tickets_snapshot ?? []) as Array<{
        id: string
        ticket_number: number
        title: string
        status: string
        created_at: string
      }>

      const changes = (disposal.changes_snapshot ?? []) as Array<{
        field_name: string
        old_value: string
        new_value: string
        changed_at: string
        changed_by_name?: string
      }>

      await generateDisposalPDF({
        assetTag: disposal.asset?.asset_tag ?? getValue(snapshot, 'asset_tag'),
        assetType: disposal.asset?.asset_type ?? getValue(snapshot, 'asset_type'),
        brand: getValue(snapshot, 'brand'),
        model: getValue(snapshot, 'model'),
        serialNumber: getValue(snapshot, 'serial_number'),
        location: getValue(snapshot, 'location_name') || getValue(snapshot, 'location'),
        department: getValue(snapshot, 'department'),
        assignedUser: getValue(snapshot, 'assigned_user_name') || getValue(snapshot, 'assigned_to'),
        status: getValue(snapshot, 'status'),
        purchaseDate: formatDate(snapshot?.purchase_date as string),
        warrantyDate: formatDate(snapshot?.warranty_end_date as string),
        reason: disposal.reason,
        requesterName: disposal.requester?.full_name ?? 'Desconocido',
        requestDate: formatDate(disposal.created_at),
        approverName: disposal.reviewer?.full_name,
        approvalDate: disposal.reviewed_at ? formatDate(disposal.reviewed_at) : undefined,
        approvalNotes: disposal.review_notes ?? undefined,
        tickets: tickets.map(t => ({
          number: t.ticket_number ?? 0,
          title: t.title ?? '-',
          status: t.status ?? '-',
          date: formatDate(t.created_at)
        })),
        changes: changes.map(c => ({
          field: c.field_name,
          from: c.old_value || '(vacío)',
          to: c.new_value || '(vacío)',
          date: formatDate(c.changed_at),
          by: c.changed_by_name ?? 'Sistema'
        }))
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-wait rounded transition-colors"
      title="Exportar documento PDF"
    >
      {loading ? (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      )}
      PDF
    </button>
  )
}
