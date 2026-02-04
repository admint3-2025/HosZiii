import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// GET: Listar módulos de un curso
export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const course_id = searchParams.get('course_id')

  if (!course_id) {
    return NextResponse.json({ error: 'course_id es requerido' }, { status: 400 })
  }

  const { data: modules, error } = await supabase
    .from('academy_modules')
    .select(`
      *,
      content:academy_content(id, title, content_type, sort_order, is_active),
      quizzes:academy_quizzes(id, title, quiz_type)
    `)
    .eq('course_id', course_id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Ordenar contenido de cada módulo
  modules?.forEach(m => {
    if (m.content) {
      m.content.sort((a: any, b: any) => a.sort_order - b.sort_order)
    }
  })

  return NextResponse.json({ modules })
}

// POST: Crear módulo (solo admin)
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'corporate_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 })
  }

  const body = await request.json()
  const { course_id, title, description, sort_order, estimated_duration_minutes, is_required } = body

  if (!course_id || !title) {
    return NextResponse.json({ error: 'course_id y title son requeridos' }, { status: 400 })
  }

  // Obtener siguiente sort_order si no se especifica
  let finalSortOrder = sort_order
  if (finalSortOrder === undefined) {
    const { data: lastModule } = await supabase
      .from('academy_modules')
      .select('sort_order')
      .eq('course_id', course_id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()

    finalSortOrder = (lastModule?.sort_order || 0) + 1
  }

  const { data: module, error } = await supabase
    .from('academy_modules')
    .insert({
      course_id,
      title,
      description,
      sort_order: finalSortOrder,
      estimated_duration_minutes: estimated_duration_minutes || 15,
      is_required: is_required !== false,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ module }, { status: 201 })
}
