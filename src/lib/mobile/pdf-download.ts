const TEMP_PDF_DOWNLOAD_ENDPOINT = '/api/pdf/temp-download'

function isNativePdfContext(): boolean {
  if (typeof window === 'undefined') return false

  const hasNativeBridge = typeof (window as any).ReactNativeWebView?.postMessage === 'function'
  const isAppUserAgent = typeof navigator !== 'undefined' && navigator.userAgent.includes('ZIIIHoSApp')

  return hasNativeBridge || isAppUserAgent
}

function toAbsoluteUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url
  if (typeof window === 'undefined') return url
  return new URL(url, window.location.origin).toString()
}

function triggerBrowserLink(url: string, options?: { filename?: string; newTab?: boolean }) {
  if (typeof document === 'undefined') return

  const link = document.createElement('a')
  link.href = url

  if (options?.filename) {
    link.download = options.filename
  }

  if (options?.newTab) {
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
  }

  document.body.appendChild(link)
  link.click()
  link.remove()
}

function postPdfUrlToNative(url: string, filename?: string): boolean {
  if (typeof window === 'undefined') return false

  const nativeBridge = (window as any).ReactNativeWebView
  const nativeDownloadMode = (window as any).__ziiiNativeDownloadMode

  if (nativeDownloadMode !== 'url' || typeof nativeBridge?.postMessage !== 'function') {
    return false
  }

  nativeBridge.postMessage(JSON.stringify({
    type: 'downloadPDFUrl',
    url,
    filename,
  }))

  return true
}

async function createTemporaryPdfUrl(blob: Blob, filename: string): Promise<string> {
  const formData = new FormData()
  formData.append('file', blob, filename)
  formData.append('filename', filename)

  const response = await fetch(TEMP_PDF_DOWNLOAD_ENDPOINT, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`temp download upload failed: ${response.status}`)
  }

  const json = await response.json()
  if (!json?.id) {
    throw new Error('temp download id missing')
  }

  return toAbsoluteUrl(`${TEMP_PDF_DOWNLOAD_ENDPOINT}?id=${encodeURIComponent(String(json.id))}`)
}

export async function downloadPdfBlob(blob: Blob, filename: string): Promise<void> {
  if (isNativePdfContext() && typeof window !== 'undefined') {
    try {
      const downloadUrl = await createTemporaryPdfUrl(blob, filename)
      if (!postPdfUrlToNative(downloadUrl, filename)) {
        window.location.href = downloadUrl
      }
      return
    } catch (error) {
      console.error('[pdf-download] Error preparing native PDF download:', error)
    }
  }

  const objectUrl = URL.createObjectURL(blob)
  triggerBrowserLink(objectUrl, { filename })
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
}

export function openPdfUrl(url: string, filename?: string): void {
  const absoluteUrl = toAbsoluteUrl(url)

  if (isNativePdfContext() && typeof window !== 'undefined') {
    if (!postPdfUrlToNative(absoluteUrl, filename)) {
      window.location.href = absoluteUrl
    }
    return
  }

  triggerBrowserLink(absoluteUrl, { newTab: true })
}

export function downloadPdfUrl(url: string, filename?: string): void {
  openPdfUrl(url, filename)
}