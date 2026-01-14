export type AvatarSource = {
  fullName?: string | null
  description?: string | null
  email?: string | null
}

function firstGrapheme(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''

  // Prefer Unicode grapheme segmentation when available.
  // Node/modern browsers support Intl.Segmenter.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Segmenter: any = (Intl as any)?.Segmenter
    if (Segmenter) {
      const seg = new Segmenter(undefined, { granularity: 'grapheme' })
      const it = seg.segment(trimmed)[Symbol.iterator]()
      const first = it.next()
      return (first?.value?.segment as string) || ''
    }
  } catch {
    // fall back
  }

  return trimmed[0] || ''
}

/**
 * Returns a single-letter avatar label.
 * Priority: full name -> description -> email -> '?'
 */
export function getAvatarInitial({ fullName, description, email }: AvatarSource): string {
  const candidate =
    (fullName && fullName.trim()) ||
    (description && description.trim()) ||
    (email && email.trim()) ||
    '?'

  const base = candidate === '?' ? '?' : firstGrapheme(candidate)
  return base ? base.toLocaleUpperCase() : '?'
}
