import fs from 'node:fs/promises'
import path from 'node:path'

export type PdfLogo = {
  dataUrl: string
  type: 'PNG' | 'JPEG'
}

function toDataUrl(bytes: Uint8Array, type: PdfLogo['type']): string {
  const mime = type === 'PNG' ? 'image/png' : 'image/jpeg'
  const base64 = Buffer.from(bytes).toString('base64')
  return `data:${mime};base64,${base64}`
}

function inferTypeFromPath(filePath: string): PdfLogo['type'] {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.jpg' || ext === '.jpeg') return 'JPEG'
  return 'PNG'
}

export async function loadZiiiLogoDataUrl(): Promise<PdfLogo | null> {
  const candidates = [
    path.join(process.cwd(), 'public', 'ziii-logo.png'),
    path.join(process.cwd(), 'public', 'logo.png'),
    path.join(process.cwd(), 'archived-docs', 'logos', 'ZIII logo.png'),
  ]

  for (const filePath of candidates) {
    try {
      const bytes = await fs.readFile(filePath)
      const type = inferTypeFromPath(filePath)
      return { dataUrl: toDataUrl(bytes, type), type }
    } catch {
      // try next
    }
  }

  // Fallback to the same URL used in the UI
  const url = 'https://systemach-sas.com/logo_ziii/ZIII%20logo.png'
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buf = new Uint8Array(await res.arrayBuffer())
    return { dataUrl: toDataUrl(buf, 'PNG'), type: 'PNG' }
  } catch {
    return null
  }
}
