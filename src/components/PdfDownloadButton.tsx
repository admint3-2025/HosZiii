'use client'

import type { ReactNode } from 'react'
import { downloadPdfUrl } from '@/lib/mobile/pdf-download'

type Props = {
  href: string
  filename?: string
  className?: string
  title?: string
  children: ReactNode
}

export default function PdfDownloadButton({ href, filename, className, title, children }: Props) {
  return (
    <button
      type="button"
      className={className}
      title={title}
      onClick={() => downloadPdfUrl(href, filename)}
    >
      {children}
    </button>
  )
}