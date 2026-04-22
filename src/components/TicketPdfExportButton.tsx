'use client'

import { useState, type ReactNode } from 'react'
import { downloadPdfBlob } from '@/lib/mobile/pdf-download'

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
  filename,
  className,
  title,
  children,
}: Props) {
  const [open, setOpen] = useState(false)
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoType, setLogoType] = useState<'PNG' | 'JPEG'>('PNG')
  const [generating, setGenerating] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const isMaint = ticketType === 'MAINTENANCE'

  function handleLogoFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target?.result as string
      setLogoDataUrl(result)
      setLogoPreview(result)
      const isJpeg =
        file.type === 'image/jpeg' ||
        file.name.toLowerCase().endsWith('.jpg') ||
        file.name.toLowerCase().endsWith('.jpeg')
      setLogoType(isJpeg ? 'JPEG' : 'PNG')
    }
    reader.readAsDataURL(file)
  }

  function resetLogo() {
    setLogoDataUrl(null)
    setLogoPreview(null)
  }

  function closeModal() {
    if (generating) return
    setOpen(false)
    setMessage(null)
  }

  async function handleGenerate() {
    setGenerating(true)
    setMessage(null)
    try {
      const res = await fetch('/api/reports/ticket-detail-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId,
          ticketType,
          logoDataUrl: logoDataUrl || undefined,
          logoType: logoDataUrl ? logoType : undefined,
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        setMessage('Error al generar el PDF: ' + text)
        return
      }

      const blob = await res.blob()
      const disp = res.headers.get('Content-Disposition') || ''
      const match = disp.match(/filename="([^"]+)"/)
      const resolvedName = match?.[1] || filename || 'reporte-ticket.pdf'

      await downloadPdfBlob(blob, resolvedName)
      setOpen(false)
    } catch (err) {
      console.error('[TicketPdfExportButton] error:', err)
      setMessage('Ocurrio un error al generar el PDF.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <>
      <button type="button" className={className} title={title} onClick={() => setOpen(true)}>
        {children}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <h3 className="text-sm font-bold text-slate-800">Descargar PDF ejecutivo</h3>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Cerrar"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600 mb-2">
                  Logo en el PDF (opcional)
                </p>
                <div className="flex items-start gap-3">
                  <label
                    className={`flex-1 cursor-pointer rounded-lg border-2 border-dashed px-3 py-3 text-center transition-colors ${
                      isMaint
                        ? 'border-slate-300 hover:border-orange-400'
                        : 'border-slate-300 hover:border-rose-400'
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={handleLogoFile}
                      className="hidden"
                    />
                    <svg className="mx-auto mb-1 h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-[10px] text-slate-500">
                      {logoDataUrl ? 'Cambiar imagen' : 'Subir logo (PNG/JPG)'}
                    </span>
                  </label>
                  {logoPreview ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="h-14 w-14 rounded border border-slate-200 bg-slate-50 object-contain p-1"
                      />
                      <button
                        type="button"
                        onClick={resetLogo}
                        className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white"
                        aria-label="Quitar logo"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded border-2 border-dashed border-slate-200">
                      <span className="text-center text-[9px] leading-tight text-slate-300">
                        Sin<br />logo
                      </span>
                    </div>
                  )}
                </div>
                <p className="mt-1.5 text-[10px] text-slate-400">
                  Sin logo se usara el logo ZIII predeterminado.
                </p>
              </div>

              {message ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
                  {message}
                </div>
              ) : null}

              <div className="flex gap-2 border-t border-slate-200 pt-3">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={generating}
                  className="rounded-md border border-slate-300 px-4 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generating}
                  className={`flex-1 inline-flex items-center justify-center gap-2 rounded-md px-4 py-1.5 text-[11px] font-bold text-white shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                    isMaint
                      ? 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700'
                      : 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700'
                  }`}
                >
                  {generating ? (
                    <>
                      <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Generando PDF...
                    </>
                  ) : (
                    <>
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Descargar PDF
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
