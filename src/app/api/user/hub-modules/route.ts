import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, getSafeServerUser } from '@/lib/supabase/server'

type HubModuleId = 'it-helpdesk' | 'mantenimiento' | 'corporativo' | 'academia' | 'administracion'

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

    // Validar estructura de modules
    const validModuleIds: HubModuleId[] = ['it-helpdesk', 'mantenimiento', 'corporativo', 'academia', 'administracion']
    for (const key of validModuleIds) {
      if (typeof modules[key] !== 'boolean') {
        return NextResponse.json({ error: `Valor inválido para módulo: ${key}` }, { status: 400 })
      }
    }

    // Actualizar en la base de datos
    const { error } = await supabase
      .from('profiles')
      .update({ hub_visible_modules: modules })
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
