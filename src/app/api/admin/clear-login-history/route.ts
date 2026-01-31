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

    // Limpiar tabla login_audits
    const { error: deleteError } = await admin
      .from('login_audits')
      .delete()
      .neq('id', '') // Trick para eliminar todos los registros

    if (deleteError) {
      return NextResponse.json(
        { error: 'Error eliminando historial: ' + deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'Historial de sesiones eliminado correctamente' })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error: ' + error?.message },
      { status: 500 }
    )
  }
}
