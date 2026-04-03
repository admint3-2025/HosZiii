const PUBLIC_STORAGE_SEGMENT = '/storage/v1/object/public/'
const SIGNED_STORAGE_SEGMENT = '/storage/v1/object/sign/'
const STORAGE_OBJECT_ROUTE = '/api/storage/object'
const FALLBACK_URL_ORIGIN = 'http://localhost'

function parseUrl(url: string): URL | null {
  try {
    return new URL(url, FALLBACK_URL_ORIGIN)
  } catch {
    return null
  }
}

function extractBucketAndPath(pathname: string): { bucket: string; path: string } | null {
  for (const prefix of [PUBLIC_STORAGE_SEGMENT, SIGNED_STORAGE_SEGMENT]) {
    const index = pathname.indexOf(prefix)
    if (index === -1) continue

    const remaining = pathname.slice(index + prefix.length)
    const slashIndex = remaining.indexOf('/')
    if (slashIndex <= 0) return null

    const bucket = decodeURIComponent(remaining.slice(0, slashIndex))
    const path = decodeURIComponent(remaining.slice(slashIndex + 1))
    if (!bucket || !path) return null

    return { bucket, path }
  }

  return null
}

function encodeStoragePath(path: string): string {
  return path
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

export function buildStorageObjectUrl(bucket: string, path: string): string | null {
  if (!bucket || !path) return null

  const params = new URLSearchParams({
    bucket,
    path,
  })

  return `${STORAGE_OBJECT_ROUTE}?${params.toString()}`
}

export function buildSupabaseStoragePublicUrl(bucket: string, path: string): string | null {
  return buildStorageObjectUrl(bucket, encodeStoragePath(path))
}

export function normalizeSupabaseStorageUrl(url: string | null | undefined): string | null {
  if (!url) return null

  const trimmed = url.trim()
  if (!trimmed) return null

  const parsed = parseUrl(trimmed)
  if (!parsed) return trimmed

  if (parsed.pathname === STORAGE_OBJECT_ROUTE) {
    const bucket = parsed.searchParams.get('bucket')
    const path = parsed.searchParams.get('path')
    return buildStorageObjectUrl(bucket || '', path || '') || trimmed
  }

  const extracted = extractBucketAndPath(parsed.pathname)
  if (extracted) {
    return buildStorageObjectUrl(extracted.bucket, extracted.path) || trimmed
  }

  return trimmed
}

export function getSupabaseStoragePathFromUrl(url: string | null | undefined, bucket: string): string | null {
  const normalizedUrl = normalizeSupabaseStorageUrl(url)
  if (!normalizedUrl || !bucket) return null

  const parsed = parseUrl(normalizedUrl)
  if (parsed) {
    if (parsed.pathname === STORAGE_OBJECT_ROUTE) {
      const routeBucket = parsed.searchParams.get('bucket')
      const routePath = parsed.searchParams.get('path')
      if (routeBucket === bucket && routePath) {
        return routePath
      }
    }

    const extracted = extractBucketAndPath(parsed.pathname)
    if (extracted?.bucket === bucket) {
      return extracted.path
    }
  }

  if (!normalizedUrl.includes('://') && !normalizedUrl.startsWith('/')) {
    return decodeURIComponent(normalizedUrl)
  }

  const marker = `/${bucket}/`
  const parts = normalizedUrl.split(marker)
  if (parts.length < 2) return null

  return decodeURIComponent(parts[parts.length - 1].split('?')[0] || '') || null
}