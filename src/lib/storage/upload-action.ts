'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { buildStorageObjectUrl } from './public-url'

/**
 * Server Action para subir archivos a Supabase Storage.
 * Los Server Actions respetan el `bodySizeLimit: '15mb'` de next.config.ts,
 * a diferencia de los API route handlers que tienen un límite más bajo (~4.5MB).
 *
 * Se invoca desde el cliente enviando FormData con:
 * - file: File
 * - bucket: string
 * - path: string
 * - upsert: '1' | '0'
 */
export async function uploadToStorage(formData: FormData): Promise<{
  success: boolean
  path?: string
  publicUrl?: string
  error?: string
}> {
  try {
    const supabase = await createSupabaseServerClient()

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'No autenticado' }
    }

    const file = formData.get('file') as File | null
    const bucket = formData.get('bucket') as string | null
    const path = formData.get('path') as string | null
    const upsert = formData.get('upsert') === '1'

    if (!file || !bucket || !path) {
      return { success: false, error: 'Faltan parámetros: file, bucket, path' }
    }

    // Validar bucket permitido
    const allowedBuckets = [
      'ticket-attachments',
      'maintenance-attachments',
      'asset-images',
      'inspection-evidences',
      'disposal-documents',
    ]
    if (!allowedBuckets.includes(bucket)) {
      return { success: false, error: 'Bucket no permitido' }
    }

    // Validar tamaño (15MB max)
    if (file.size > 15 * 1024 * 1024) {
      return { success: false, error: 'Archivo demasiado grande. Máximo 15MB.' }
    }

    // Convertir File a Buffer para subir desde el servidor
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Subir a Supabase Storage desde el servidor
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, {
        cacheControl: '3600',
        upsert,
        contentType: file.type || 'application/octet-stream',
      })

    if (uploadError) {
      console.error(`[uploadToStorage] Error subiendo a ${bucket}/${path}:`, uploadError)
      return { success: false, error: uploadError.message }
    }

    return {
      success: true,
      path,
      publicUrl: buildStorageObjectUrl(bucket, path) ?? undefined,
    }
  } catch (error) {
    console.error('[uploadToStorage] Error inesperado:', error)
    return { success: false, error: 'Error inesperado al subir archivo' }
  }
}
