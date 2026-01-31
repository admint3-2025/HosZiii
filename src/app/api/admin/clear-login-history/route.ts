import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const admin = createSupabaseAdminClient()

    // Verificar que el usuario sea admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Primero obtener todos los IDs
    const { data: allRecords, error: fetchError } = await admin
      .from('login_audits')
      .select('id')

    if (fetchError) {
      return NextResponse.json(
        { error: 'Error obteniendo registros: ' + fetchError.message },
        { status: 500 }
      )
    }

    // Si no hay registros, retorna éxito
    if (!allRecords || allRecords.length === 0) {
      return NextResponse.json({ success: true, message: 'Historial ya estaba vacío', deleted: 0 })
    }

    // Obtener todos los IDs y borrar en lotes
    const ids = allRecords.map((r: any) => r.id)
    const { error: deleteError } = await admin
      .from('login_audits')
      .delete()
      .in('id', ids)

    if (deleteError) {
      return NextResponse.json(
        { error: 'Error eliminando historial: ' + deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Historial de sesiones eliminado correctamente',
      deleted: ids.length
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error: ' + error?.message },
      { status: 500 }
    )
  }
}
