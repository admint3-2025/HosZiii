import { uploadToStorage } from '@/lib/storage/upload-action'

/**
 * Proxy de upload — sube archivos a Supabase Storage a través de un Server Action.
 * Esto evita que el navegador (especialmente en móvil) necesite conectarse directamente
 * a la IP/puerto interna de Supabase.
 * 
 * Usa Server Actions en vez de API route handler para respetar el bodySizeLimit de 15MB
 * configurado en next.config.ts (los API route handlers tienen un límite menor ~4.5MB).
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

    const result = await uploadToStorage(formData)
    return result
  } catch (error) {
    console.error('[uploadViaProxy] Error:', error)
    return { success: false, error: 'Error de conexión al subir archivo' }
  }
}
