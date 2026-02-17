import { compressImage } from './compress-image'

/**
 * Proxy de upload — sube archivos a Supabase Storage a través del API route /api/storage/upload.
 * Esto evita que el navegador (especialmente en móvil) necesite conectarse directamente
 * a la IP/puerto interna de Supabase.
 *
 * Las imágenes se comprimen automáticamente en el cliente (Canvas API) antes de enviarlas,
 * lo que reduce fotos de 3-15MB a ~200-500KB y evita problemas de límite de body size.
 */
export async function uploadViaProxy(
  file: File | Blob,
  bucket: string,
  path: string,
  options?: { upsert?: boolean }
): Promise<{ success: boolean; path?: string; publicUrl?: string; error?: string }> {
  try {
    // Comprimir imágenes antes de subir (fotos móvil: 3-15MB → 200-500KB)
    let processedFile: File | Blob = file
    try {
      processedFile = await compressImage(file)
    } catch (compressErr) {
      console.warn('[uploadViaProxy] Compresión falló, usando original:', compressErr)
    }

    const formData = new FormData()
    formData.append('file', processedFile)
    formData.append('bucket', bucket)
    formData.append('path', path)
    if (options?.upsert) {
      formData.append('upsert', '1')
    }

    const resp = await fetch('/api/storage/upload', {
      method: 'POST',
      body: formData,
    })

    if (!resp.ok) {
      const text = await resp.text()
      let errorMsg = `Error HTTP ${resp.status}`
      try {
        const json = JSON.parse(text)
        errorMsg = json.error || errorMsg
      } catch {
        errorMsg = text || errorMsg
      }
      console.error('[uploadViaProxy] Error:', errorMsg)
      return { success: false, error: errorMsg }
    }

    const data = await resp.json()
    return {
      success: true,
      path: data.path,
      publicUrl: data.publicUrl,
    }
  } catch (error) {
    console.error('[uploadViaProxy] Error de red:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error de conexión al subir archivo',
    }
  }
}
