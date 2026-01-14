import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import QRCode from 'qrcode'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const supabase = await createSupabaseServerClient()

    // Obtener usuario actual
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener información completa del activo
    const { data: asset, error } = await supabase
      .from('assets')
      .select(`
        *,
        asset_location:locations!location_id(id, name, code),
        assigned_user:profiles!assigned_to(id, full_name, email)
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error || !asset) {
      return NextResponse.json({ error: 'Activo no encontrado' }, { status: 404 })
    }

    // Obtener estadísticas del activo
    const { data: statsRows } = await supabase
      .rpc('get_asset_detail_stats', { p_asset_id: id })
    
    const rawStats = Array.isArray(statsRows) && statsRows.length > 0 ? statsRows[0] as any : null

    // Construir datos completos para el QR
    const qrData = {
      id: asset.id,
      etiqueta: asset.asset_tag,
      tipo: asset.asset_type,
      estado: asset.status,
      marca: asset.brand || 'N/A',
      modelo: asset.model || 'N/A',
      serie: asset.serial_number || 'N/A',
      departamento: asset.department || 'N/A',
      sede: asset.asset_location ? `${asset.asset_location.code} - ${asset.asset_location.name}` : 'N/A',
      ubicacion: asset.location || 'N/A',
      responsable: asset.assigned_user?.full_name || 'Sin asignar',
      compra: asset.purchase_date || 'N/A',
      garantia: asset.warranty_end_date || 'N/A',
      tickets_totales: rawStats?.total_tickets ?? 0,
      tickets_abiertos: rawStats?.open_tickets ?? 0,
      cambios_sede: rawStats?.location_change_count ?? 0,
      cambios_usuario: rawStats?.assignment_change_count ?? 0,
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/assets/${id}`
    }

    // Generar QR con todos los datos en formato JSON
    const qrString = JSON.stringify(qrData, null, 2)
    const qrCode = await QRCode.toDataURL(qrString, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 800,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })

    // Retornar el QR como imagen
    const base64Data = qrCode.replace(/^data:image\/png;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="QR_${asset.asset_tag}.png"`,
        'Cache-Control': 'no-cache'
      }
    })
  } catch (error) {
    console.error('Error generating QR:', error)
    return NextResponse.json(
      { error: 'Error al generar código QR' },
      { status: 500 }
    )
  }
}
