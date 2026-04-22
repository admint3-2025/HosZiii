'use client'

import type { ReactNode } from 'react'
import { downloadPdfUrl } from '@/lib/mobile/pdf-download'

type Props = {
  ticketId: string
  ticketType: 'IT' | 'MAINTENANCE'
  locationCode?: string | null
  filename?: string
  className?: string
  title?: string
  children: ReactNode
}

export default function TicketPdfExportButton({
  ticketId,
  ticketType,
  locationCode,
  filename,
  className,
  title,
  children,
}: Props) {
  const handleClick = () => {
    const storageKey = `ticket:pdf:brandLogo:${locationCode || 'default'}`
    const previous =
      typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null

    const input =
      typeof window !== 'undefined'
        ? window.prompt(
            'Logo del cliente para el PDF (opcional).\n\n' +
              '- Escribe una URL https://...\n' +
              '- O una clave interna (ej: alzen)\n' +
              "- O 'none' para no mostrar logo\n\n" +
              'Deja vacio para usar el ultimo/default.',
            previous ?? 'alzen',
          )
        : null

    if (input === null) return // cancelado

    const normalized = (input ?? '').trim()
    const selected = normalized.length > 0 ? normalized : previous ?? 'alzen'

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, selected)
    }

    const lower = selected.toLowerCase()
    const params = new URLSearchParams()
    params.set('ticketId', ticketId)
    params.set('ticketType', ticketType)

    if (lower === 'none') {
      params.set('brandLogoMode', 'none')
    } else if (/^https?:\/\//i.test(selected)) {
      params.set('brandLogoUrl', selected)
    } else {
      params.set('brandLogoKey', selected)
    }

    const href = `/api/reports/ticket-detail-pdf?${params.toString()}`
    downloadPdfUrl(href, filename)
  }

  return (
    <button type="button" className={className} title={title} onClick={handleClick}>
      {children}
    </button>
  )
}
