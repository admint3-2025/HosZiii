import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * POST /api/storage/upload
 * 
 * Proxy de upload a Supabase Storage.
 * El navegador envía el archivo al servidor Next.js, que a su vez lo sube a Supabase Storage
 * usando la URL interna (accesible desde el servidor pero no desde el navegador móvil externo).
 * 
 * FormData esperado:
 * - file: File
 * - bucket: string (nombre del bucket: 'ticket-attachments', 'maintenance-attachments', etc.)
 * - path: string (ruta dentro del bucket, e.g. 'ticketId/timestamp-random.jpg')
 * - upsert: '1' | '0' (opcional, default '0')
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const bucket = formData.get('bucket') as string | null
    const path = formData.get('path') as string | null
    const upsert = formData.get('upsert') === '1'

    if (!file || !bucket || !path) {
      return NextResponse.json(
        { error: 'Faltan parámetros: file, bucket, path' },
        { status: 400 }
      )
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
      return NextResponse.json(
        { error: 'Bucket no permitido' },
        { status: 400 }
      )
    }

    // Validar tamaño (15MB max, consistente con next.config bodySizeLimit)
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Archivo demasiado grande. Máximo 15MB.' },
        { status: 400 }
      )
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
      console.error(`[storage/upload] Error subiendo a ${bucket}/${path}:`, uploadError)
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      )
    }

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)

    return NextResponse.json({
      success: true,
      path,
      publicUrl: urlData?.publicUrl || null,
    })
  } catch (error) {
    console.error('[storage/upload] Error inesperado:', error)
    return NextResponse.json(
      { error: 'Error inesperado al subir archivo' },
      { status: 500 }
    )
  }
}
