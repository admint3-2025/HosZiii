import { NextResponse } from 'next/server'
import dns from 'node:dns/promises'
import net from 'node:net'

export const dynamic = 'force-dynamic'

export const runtime = 'nodejs'

const MAX_IMAGE_BYTES = 3 * 1024 * 1024 // 3MB
const FETCH_TIMEOUT_MS = 8_000

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => Number(p))
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) return false
  const [a, b] = parts

  if (a === 10) return true
  if (a === 127) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  return false
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase()
  if (normalized === '::1') return true
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true // unique local
  if (normalized.startsWith('fe80:')) return true // link-local
  return false
}

async function assertPublicHost(hostname: string): Promise<void> {
  const lower = hostname.toLowerCase()

  if (lower === 'localhost' || lower.endsWith('.local')) {
    throw new Error('Host not allowed')
  }

  // If user passes an IP directly, reject private ranges.
  const ipType = net.isIP(lower)
  if (ipType === 4 && isPrivateIPv4(lower)) throw new Error('Host not allowed')
  if (ipType === 6 && isPrivateIPv6(lower)) throw new Error('Host not allowed')
  if (ipType !== 0) return

  // Resolve A/AAAA and reject any private address.
  const records = await dns.lookup(hostname, { all: true, verbatim: true })
  for (const record of records) {
    if (record.family === 4 && isPrivateIPv4(record.address)) throw new Error('Host not allowed')
    if (record.family === 6 && isPrivateIPv6(record.address)) throw new Error('Host not allowed')
  }
}

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

  // Do not allow credentials in URL.
  if (target.username || target.password) {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 })
  }

  // Restrict ports to default http/https.
  const port = target.port ? Number(target.port) : (target.protocol === 'https:' ? 443 : 80)
  if (![80, 443].includes(port)) {
    return NextResponse.json({ error: 'Port not allowed' }, { status: 403 })
  }

  try {
    await assertPublicHost(target.hostname)
  } catch {
    return NextResponse.json({ error: 'Host not allowed' }, { status: 403 })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(target.toString(), {
      // Avoid passing through any cookies/credentials.
      cache: 'no-store',
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        'User-Agent': 'ZIII-helpdesk/1.0 (+nextjs)'
      }
    })
  } catch {
    clearTimeout(timeout)
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 502 })
  } finally {
    clearTimeout(timeout)
  }

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 502 })
  }

  const contentType = res.headers.get('content-type') || 'application/octet-stream'
  if (!contentType.toLowerCase().startsWith('image/')) {
    return NextResponse.json({ error: 'Fetched content is not an image' }, { status: 502 })
  }
  const body = await res.arrayBuffer()
  if (body.byteLength > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: 'Image too large' }, { status: 413 })
  }

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      // Reasonable caching; in dev this is fine too.
      'Cache-Control': 'public, max-age=86400'
    }
  })
}
