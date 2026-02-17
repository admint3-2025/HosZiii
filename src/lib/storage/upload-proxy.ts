/**
 * Proxy de upload — sube archivos a Supabase Storage a través del servidor Next.js.
 * Esto evita que el navegador (especialmente en móvil) necesite conectarse directamente
 * a la IP/puerto interna de Supabase.
 */
export async function uploadViaProxy(
  file: File | Blob,
  bucket: string,
  path: string,
  options?: { upsert?: boolean }
): Promise<{ success: boolean; path?: string; publicUrl?: string; error?: string }> {
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('bucket', bucket)
    formData.append('path', path)
    if (options?.upsert) {
      formData.append('upsert', '1')
    }

    const response = await fetch('/api/storage/upload', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
      return { success: false, error: data.error || `Error ${response.status}` }
    }

    const data = await response.json()
    return {
      success: true,
      path: data.path,
      publicUrl: data.publicUrl,
    }
  } catch (error) {
    console.error('[uploadViaProxy] Error:', error)
    return { success: false, error: 'Error de conexión al subir archivo' }
  }
}
