export type PdfImageFormat = 'PNG' | 'JPEG' | 'WEBP'

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('image read failed'))
    reader.readAsDataURL(blob)
  })
}

export async function fetchImageAsDataUrl(url: string): Promise<{ dataUrl: string; format: PdfImageFormat }> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`image fetch failed: ${response.status}`)
  }

  const blob = await response.blob()
  const mime = (blob.type || '').toLowerCase()

  if (!mime.startsWith('image/')) {
    throw new Error('not an image')
  }

  const format: PdfImageFormat = mime.includes('png')
    ? 'PNG'
    : mime.includes('webp')
      ? 'WEBP'
      : 'JPEG'

  return {
    dataUrl: await blobToDataUrl(blob),
    format,
  }
}

export async function compressDataUrlImage(
  dataUrl: string,
  options?: { maxDim?: number; quality?: number; forceJpeg?: boolean }
): Promise<{ dataUrl: string; format: 'PNG' | 'JPEG' }> {
  const { maxDim = 300, quality = 0.82, forceJpeg = false } = options ?? {}

  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width || maxDim, img.height || maxDim))
      const width = Math.max(1, Math.round((img.width || maxDim) * scale))
      const height = Math.max(1, Math.round((img.height || maxDim) * scale))
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('no canvas ctx'))
        return
      }

      const isPng = dataUrl.startsWith('data:image/png')
      const useJpeg = forceJpeg || !isPng
      if (useJpeg) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)
      }

      ctx.drawImage(img, 0, 0, width, height)

      if (useJpeg) {
        resolve({ dataUrl: canvas.toDataURL('image/jpeg', quality), format: 'JPEG' })
        return
      }

      resolve({ dataUrl: canvas.toDataURL('image/png'), format: 'PNG' })
    }

    img.onerror = () => reject(new Error('image load failed'))
    img.src = dataUrl
  })
}

export async function loadOptimizedPdfImage(
  url: string,
  options?: { maxDim?: number; quality?: number; forceJpeg?: boolean }
): Promise<{ dataUrl: string; format: 'PNG' | 'JPEG' }> {
  const { dataUrl } = await fetchImageAsDataUrl(url)
  return compressDataUrlImage(dataUrl, options)
}