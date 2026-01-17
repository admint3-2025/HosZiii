import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const ALLOWED_HOSTS = new Set(['integrational3.com.mx'])

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const urlParam = searchParams.get('url')

  if (!urlParam) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 })
  }

  let target: URL
  try {
    target = new URL(urlParam)
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 })
  }

  if (target.protocol !== 'https:' && target.protocol !== 'http:') {
    return NextResponse.json({ error: 'Invalid protocol' }, { status: 400 })
  }

  if (!ALLOWED_HOSTS.has(target.hostname)) {
    return NextResponse.json({ error: 'Host not allowed' }, { status: 403 })
  }

  const res = await fetch(target.toString(), {
    // Avoid passing through any cookies/credentials.
    cache: 'no-store',
    headers: {
      'User-Agent': 'ZIII-helpdesk/1.0 (+nextjs)'
    }
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 502 })
  }

  const contentType = res.headers.get('content-type') || 'application/octet-stream'
  const body = await res.arrayBuffer()

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      // Reasonable caching; in dev this is fine too.
      'Cache-Control': 'public, max-age=86400'
    }
  })
}
