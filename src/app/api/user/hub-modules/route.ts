import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, getSafeServerUser } from '@/lib/supabase/server'

type HubModuleId = 'it-helpdesk' | 'mantenimiento' | 'corporativo' | 'academia' | 'politicas' | 'ama-de-llaves' | 'administracion'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
    const user = await getSafeServerUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { modules } = body

    if (!modules || typeof modules !== 'object') {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    // Validar estructura de modules — acepta subconjuntos, default true para ausentes
    const validModuleIds: HubModuleId[] = ['it-helpdesk', 'mantenimiento', 'corporativo', 'academia', 'politicas', 'ama-de-llaves', 'administracion']
    const sanitized: Record<string, boolean> = {}
    for (const key of validModuleIds) {
      sanitized[key] = modules[key] === false ? false : true
    }

    // Actualizar en la base de datos
    const { error } = await supabase
      .from('profiles')
      .update({ hub_visible_modules: sanitized })
      .eq('id', user.id)

    if (error) {
      console.error('Error actualizando hub_visible_modules:', error)
      return NextResponse.json({ error: 'Error al guardar preferencias' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error en /api/user/hub-modules:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
