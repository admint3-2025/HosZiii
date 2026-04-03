const PUBLIC_STORAGE_SEGMENT = '/storage/v1/object/public/'
const SIGNED_STORAGE_SEGMENT = '/storage/v1/object/sign/'

function getPublicSupabaseOrigin(): string | null {
  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!publicUrl) return null

  try {
    return new URL(publicUrl).origin
  } catch {
    return null
  }
}

function encodeStoragePath(path: string): string {
  return path
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

export function buildSupabaseStoragePublicUrl(bucket: string, path: string): string | null {
  const publicOrigin = getPublicSupabaseOrigin()
  if (!publicOrigin || !bucket || !path) return null

  return `${publicOrigin}${PUBLIC_STORAGE_SEGMENT}${encodeURIComponent(bucket)}/${encodeStoragePath(path)}`
}

export function normalizeSupabaseStorageUrl(url: string | null | undefined): string | null {
  if (!url) return null

  const trimmed = url.trim()
  if (!trimmed) return null

  const publicOrigin = getPublicSupabaseOrigin()
  if (!publicOrigin) return trimmed

  try {
    const parsed = new URL(trimmed)
    if (!parsed.pathname.includes('/storage/v1/object/')) {
      return trimmed
    }
    if (parsed.origin === publicOrigin) {
      return parsed.toString()
    }
    return `${publicOrigin}${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return trimmed
  }
}

export function getSupabaseStoragePathFromUrl(url: string | null | undefined, bucket: string): string | null {
  const normalizedUrl = normalizeSupabaseStorageUrl(url)
  if (!normalizedUrl || !bucket) return null

  try {
    const parsed = new URL(normalizedUrl)
    const encodedBucket = encodeURIComponent(bucket)
    const publicPrefix = `${PUBLIC_STORAGE_SEGMENT}${encodedBucket}/`
    const signedPrefix = `${SIGNED_STORAGE_SEGMENT}${encodedBucket}/`

    if (parsed.pathname.includes(publicPrefix)) {
      return decodeURIComponent(parsed.pathname.split(publicPrefix)[1] || '') || null
    }
    if (parsed.pathname.includes(signedPrefix)) {
      return decodeURIComponent(parsed.pathname.split(signedPrefix)[1] || '') || null
    }
  } catch {
    // Fallback below for malformed or non-standard URLs.
  }

  const marker = `/${bucket}/`
  const parts = normalizedUrl.split(marker)
  if (parts.length < 2) return null

  return decodeURIComponent(parts[parts.length - 1].split('?')[0] || '') || null
}