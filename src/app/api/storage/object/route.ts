import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED_BUCKETS = [
  'ticket-attachments',
  'maintenance-attachments',
  'asset-images',
  'inspection-evidences',
  'disposal-documents',
]

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const bucket = request.nextUrl.searchParams.get('bucket')
    const path = request.nextUrl.searchParams.get('path')

    if (!bucket || !path) {
      return NextResponse.json({ error: 'Missing bucket or path' }, { status: 400 })
    }

    if (!ALLOWED_BUCKETS.includes(bucket)) {
      return NextResponse.json({ error: 'Bucket no permitido' }, { status: 400 })
    }

    const admin = createSupabaseAdminClient()
    const { data, error } = await admin.storage.from(bucket).download(path)

    if (error || !data) {
      console.error(`[storage/object] Error descargando ${bucket}/${path}:`, error)
      const status = error?.message?.toLowerCase().includes('not found') ? 404 : 500
      return NextResponse.json({ error: error?.message || 'No se pudo obtener el archivo' }, { status })
    }

    const body = await data.arrayBuffer()
    const headers = new Headers({
      'Content-Type': data.type || 'application/octet-stream',
      'Cache-Control': 'private, max-age=3600',
      'Content-Disposition': 'inline',
    })

    if (data.size) {
      headers.set('Content-Length', String(data.size))
    }

    return new NextResponse(body, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error('[storage/object] Error inesperado:', error)
    return NextResponse.json({ error: 'Error inesperado al obtener archivo' }, { status: 500 })
  }
}