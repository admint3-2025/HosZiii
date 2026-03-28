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

    // Contar registros antes de eliminar
    const { count, error: countError } = await admin
      .from('login_audits')
      .select('id', { count: 'exact', head: true })

    if (countError) {
      return NextResponse.json(
        { error: 'Error obteniendo registros: ' + countError.message },
        { status: 500 }
      )
    }

    if (!count || count === 0) {
      return NextResponse.json({ success: true, message: 'Historial ya estaba vacío', deleted: 0 })
    }

    // Eliminar todos los registros con un filtro ligero (no pone IDs en el URL)
    const { error: deleteError } = await admin
      .from('login_audits')
      .delete()
      .not('id', 'is', null)

    if (deleteError) {
      return NextResponse.json(
        { error: 'Error eliminando historial: ' + deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Historial de sesiones eliminado correctamente',
      deleted: count
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error: ' + error?.message },
      { status: 500 }
    )
  }
}
