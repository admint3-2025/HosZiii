/**
 * Temporary PDF download endpoint for Android WebView.
 *
 * jsPDF.save() creates a blob:// URL which Android WebView cannot download.
 * This route accepts a base64 PDF, stores it briefly in memory, and serves it
 * as a real HTTPS attachment so Android's built-in download listener handles it.
 *
 * POST /api/pdf/temp-download  { data: base64string, filename: string }
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
  data: Buffer
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
    const { data, filename } = await req.json()
    if (!data || typeof data !== 'string') {
      return NextResponse.json({ error: 'data required' }, { status: 400 })
    }
    const id = crypto.randomUUID()
    const buffer = Buffer.from(data, 'base64')
    pdfCache.set(id, {
      data: buffer,
      filename: typeof filename === 'string' && filename ? filename : 'documento.pdf',
      expires: Date.now() + TTL_MS,
    })
    return NextResponse.json({ id })
  } catch {
    return NextResponse.json({ error: 'server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id') ?? ''
  if (!id) return new NextResponse('Not found', { status: 404 })

  const entry = pdfCache.get(id)
  if (!entry || entry.expires < Date.now()) {
    pdfCache.delete(id)
    return new NextResponse('Expired or not found', { status: 410 })
  }

  pdfCache.delete(id) // one-time use

  return new NextResponse(entry.data.buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${entry.filename}"`,
      'Content-Length': String(entry.data.length),
      'Cache-Control': 'no-store',
    },
  })
}
