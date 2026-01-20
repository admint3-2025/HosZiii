import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'node:fs'
import path from 'node:path'

export const runtime = 'nodejs'

const BRAND_FILE_MAP: Record<string, { relPath: string; contentType: string }> = {
  alzen: {
    relPath: path.join('archived-docs', 'logos', 'alzendhlogo.png'),
    contentType: 'image/png'
  }
}

export async function GET(req: NextRequest) {
  const brand = (req.nextUrl.searchParams.get('brand') || '').toLowerCase().trim()
  const entry = BRAND_FILE_MAP[brand]

  if (!entry) {
    return NextResponse.json({ error: 'Unknown brand' }, { status: 404 })
  }

  const absPath = path.join(process.cwd(), entry.relPath)

  try {
    const buf = await fs.readFile(absPath)
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': entry.contentType,
        'Cache-Control': 'public, max-age=3600'
      }
    })
  } catch {
    return NextResponse.json({ error: 'Logo not found' }, { status: 404 })
  }
}
