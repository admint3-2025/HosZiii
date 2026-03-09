import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, getSafeServerUser } from '@/lib/supabase/server'

type HubModuleId = 'it-helpdesk' | 'mantenimiento' | 'corporativo' | 'academia' | 'politicas' | 'ama-de-llaves' | 'administracion' | 'planificacion'
type ModuleAccess = 'user' | 'supervisor'
const ALL_MODULE_IDS: HubModuleId[] = ['it-helpdesk', 'mantenimiento', 'corporativo', 'academia', 'politicas', 'ama-de-llaves', 'administracion', 'planificacion']

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

    // Validar estructura de modules — acepta 'user', 'supervisor' o false por módulo
    const sanitized: Record<string, ModuleAccess | false> = {}
    for (const key of ALL_MODULE_IDS) {
      const v = key === 'planificacion' ? (modules.planificacion ?? modules.ops) : modules[key]
      if (v === 'supervisor') sanitized[key] = 'supervisor'
      else if (v === 'user' || v === true) sanitized[key] = 'user'
      else sanitized[key] = false
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
