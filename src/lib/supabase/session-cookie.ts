/**
 * Session cookie utilities for Supabase authentication.
 * Handles parsing and validation of session cookies stored in the browser/request.
 */

import type { Session } from '@supabase/supabase-js'

interface CookieItem {
  name: string
  value: string
}

/**
 * Parse a session from chunked cookies.
 * Supabase can split session data across multiple cookies (ziii-session.0, ziii-session.1, etc.)
 * to work around 4KB cookie size limits.
 * Sessions can be stored as base64-encoded JSON (prefixed with "base64-").
 */
export function getSupabaseSessionFromCookies(
  cookies: CookieItem[] | { getAll(): CookieItem[] },
  cookiePrefix: string,
): Session | null {
  const cookieList = Array.isArray(cookies) ? cookies : cookies.getAll()

  // Collect all chunks
  const chunks: Record<number, string> = {}

  for (const cookie of cookieList) {
    if (cookie.name.startsWith(cookiePrefix)) {
      const chunkMatch = cookie.name.match(new RegExp(`^${cookiePrefix}(?:\\.(\\d+))?$`))
      if (chunkMatch) {
        const chunkIndex = chunkMatch[1] ? parseInt(chunkMatch[1], 10) : 0
        chunks[chunkIndex] = cookie.value
      }
    }
  }

  // If no chunks found, return null
  if (Object.keys(chunks).length === 0) {
    return null
  }

  // Reconstruct the session from chunks (sorted by index)
  const sortedIndices = Object.keys(chunks)
    .map(Number)
    .sort((a, b) => a - b)

  let sessionJson = sortedIndices.map((i) => chunks[i]).join('')

  // Handle base64-encoded sessions
  // Supabase stores session as base64: string (prefixed with "base64-")
  if (sessionJson.startsWith('base64-')) {
    try {
      sessionJson = Buffer.from(sessionJson.slice(7), 'base64').toString('utf-8')
    } catch {
      return null
    }
  } else {
    // Try to decode from base64 if it looks like base64
    try {
      const decoded = Buffer.from(sessionJson, 'base64').toString('utf-8')
      // Only use decoded if it parses as valid JSON
      if (decoded.startsWith('{') || decoded.startsWith('[')) {
        sessionJson = decoded
      }
    } catch {
      // If base64 decode fails, assume it's already plain JSON
    }
  }

  try {
    const session = JSON.parse(sessionJson) as Session
    return session
  } catch {
    return null
  }
}

/**
 * Check if a session has expired.
 * Compares the `expires_at` timestamp with the current time.
 */
export function isSessionExpired(session: Session | null): boolean {
  if (!session) {
    return true
  }

  // expires_at is in seconds since epoch
  const expiresAt = session.expires_at
  if (!expiresAt) {
    // If there's no expiry, consider it not expired
    return false
  }

  const now = Math.floor(Date.now() / 1000)
  return now >= expiresAt
}
