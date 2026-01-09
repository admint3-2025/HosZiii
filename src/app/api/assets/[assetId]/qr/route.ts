import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { generateQRCode, getAssetQRContent } from '@/lib/qr/generator'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const { assetId } = await params
    const supabase = await createSupabaseServerClient()

    // Verificar autenticación
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener activo
    const { data: asset, error } = await supabase
      .from('assets')
      .select('id, asset_code, asset_tag, asset_type, brand, model')
      .eq('id', assetId)
      .single()

    if (error || !asset) {
      return NextResponse.json({ error: 'Activo no encontrado' }, { status: 404 })
    }

    if (!asset.asset_code) {
      return NextResponse.json({ error: 'Activo sin código QR asignado' }, { status: 400 })
    }

    // Generar contenido del QR
    const qrContent = getAssetQRContent(asset.asset_code)

    // Generar imagen QR
    const qrDataUrl = await generateQRCode(qrContent, {
      size: 300,
      margin: 4,
      errorCorrectionLevel: 'H'
    })

    // Convertir data URL a buffer
    const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '')
    const imageBuffer = Buffer.from(base64Data, 'base64')

    // Retornar imagen
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `inline; filename="qr-${asset.asset_code}.png"`,
        'Cache-Control': 'public, max-age=3600'
      }
    })
  } catch (error) {
    console.error('Error generando QR:', error)
    return NextResponse.json({ error: 'Error generando QR code' }, { status: 500 })
  }
}
