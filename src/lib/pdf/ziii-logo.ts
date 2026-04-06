import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

export type PdfLogo = {
  dataUrl: string
  type: 'PNG' | 'JPEG'
}

type PdfLogoLoadOptions = {
  boxWidth?: number
  boxHeight?: number
  quality?: number
  forceJpeg?: boolean
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

async function optimizePdfLogo(bytes: Uint8Array, options?: PdfLogoLoadOptions): Promise<PdfLogo | null> {
  const boxWidth = options?.boxWidth ?? 160
  const boxHeight = options?.boxHeight ?? 160
  const quality = options?.quality ?? 82
  const forceJpeg = options?.forceJpeg ?? false

  try {
    const source = sharp(Buffer.from(bytes), { failOn: 'none' }).rotate()
    const metadata = await source.metadata()
    const useJpeg = forceJpeg || !(metadata.hasAlpha ?? false)
    const background = useJpeg
      ? { r: 255, g: 255, b: 255, alpha: 1 }
      : { r: 255, g: 255, b: 255, alpha: 0 }

    const resized = source.resize({
      width: boxWidth,
      height: boxHeight,
      fit: 'contain',
      withoutEnlargement: true,
      background,
    })

    if (useJpeg) {
      const output = await resized
        .flatten({ background: '#ffffff' })
        .jpeg({ quality, mozjpeg: true, progressive: true })
        .toBuffer()

      return { dataUrl: toDataUrl(output, 'JPEG'), type: 'JPEG' }
    }

    const output = await resized
      .png({ compressionLevel: 9, palette: true, effort: 8, quality })
      .toBuffer()

    return { dataUrl: toDataUrl(output, 'PNG'), type: 'PNG' }
  } catch {
    return null
  }
}

export async function loadPdfLogoFromUrl(url: string, options?: PdfLogoLoadOptions): Promise<PdfLogo | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null

    const contentType = (res.headers.get('content-type') || '').toLowerCase()
    if (contentType && !contentType.startsWith('image/')) return null

    const buf = new Uint8Array(await res.arrayBuffer())
    return optimizePdfLogo(buf, options)
  } catch {
    return null
  }
}

export async function loadZiiiLogoDataUrl(options?: PdfLogoLoadOptions): Promise<PdfLogo | null> {
  const candidates = [
    path.join(process.cwd(), 'public', 'ziii-logo.png'),
    path.join(process.cwd(), 'public', 'logo.png'),
    path.join(process.cwd(), 'archived-docs', 'logos', 'ZIII logo.png'),
  ]

  for (const filePath of candidates) {
    try {
      const bytes = await fs.readFile(filePath)
      const optimized = await optimizePdfLogo(bytes, options)
      if (optimized) return optimized

      const type = inferTypeFromPath(filePath)
      return { dataUrl: toDataUrl(bytes, type), type }
    } catch {
      // try next
    }
  }

  // Fallback to the same URL used in the UI
  const url = 'https://ziii.com.mx/logos/1ZIIIlogo.png'
  try {
    return await loadPdfLogoFromUrl(url, options)
  } catch {
    return null
  }
}
