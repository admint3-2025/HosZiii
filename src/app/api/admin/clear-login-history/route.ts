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

    // Contar registros actuales
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

    // Eliminar en lotes para evitar "URI too long"
    const BATCH_SIZE = 500
    let totalDeleted = 0

    while (true) {
      const { data: batch, error: fetchError } = await admin
        .from('login_audits')
        .select('id')
        .limit(BATCH_SIZE)

      if (fetchError) {
        return NextResponse.json(
          { error: 'Error obteniendo lote: ' + fetchError.message },
          { status: 500 }
        )
      }

      if (!batch || batch.length === 0) break

      const ids = batch.map((r: any) => r.id)
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

      totalDeleted += ids.length
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Historial de sesiones eliminado correctamente',
      deleted: totalDeleted
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error: ' + error?.message },
      { status: 500 }
    )
  }
}
