/**
 * Temporary PDF download endpoint for Android WebView.
 *
 * jsPDF.save() creates a blob:// URL which Android WebView cannot download.
 * This route accepts a multipart-uploaded PDF, stores it briefly in memory,
 * and serves it back as a real HTTPS attachment.
 *
 * POST /api/pdf/temp-download  multipart/form-data(file, filename)
 *   → { id: string }
 *
 * GET  /api/pdf/temp-download?id=<uuid>
 *   → PDF binary with Content-Disposition: attachment
 */

import { NextRequest, NextResponse } from 'next/server'

// Node.js runtime — module-level Map survives between requests in our Docker setup.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TTL_MS = 5 * 60 * 1000 // 5 minutes

interface CacheEntry {
  data: ArrayBuffer
  filename: string
  expires: number
}

const pdfCache = new Map<string, CacheEntry>()

function cleanup() {
  const now = Date.now()
  for (const [k, v] of pdfCache) {
    if (v.expires < now) pdfCache.delete(k)
  }
}

export async function POST(req: NextRequest) {
  cleanup()
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const filename = (formData.get('filename') as string) || 'documento.pdf'
    if (!file) {
      return NextResponse.json({ error: 'file required' }, { status: 400 })
    }
    const id = crypto.randomUUID()
    const data = await file.arrayBuffer()
    pdfCache.set(id, {
      data,
      filename,
      expires: Date.now() + TTL_MS,
    })
    return NextResponse.json({ id })
  } catch {
    return NextResponse.json({ error: 'server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  cleanup()
  const id = req.nextUrl.searchParams.get('id') ?? ''
  if (!id) return new NextResponse('Not found', { status: 404 })

  const entry = pdfCache.get(id)
  if (!entry || entry.expires < Date.now()) {
    pdfCache.delete(id)
    return new NextResponse('Expired or not found', { status: 410 })
  }

  return new NextResponse(entry.data, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${entry.filename}"`,
      'Content-Length': String(entry.data.byteLength),
      'Cache-Control': 'no-store',
    },
  })
}
