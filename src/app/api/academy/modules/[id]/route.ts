import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET: Obtener módulo con contenido
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data: module, error } = await supabase
    .from('academy_modules')
    .select(`
      *,
      course:academy_courses(id, title, slug, is_published),
      content:academy_content(*),
      quizzes:academy_quizzes(id, title, quiz_type, passing_score, time_limit_minutes, max_attempts)
    `)
    .eq('id', id)
    .eq('is_active', true)
    .single()

  if (error || !module) {
    return NextResponse.json({ error: 'Módulo no encontrado' }, { status: 404 })
  }

  // Obtener progreso del usuario
  const { data: progress } = await supabase
    .from('academy_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('module_id', id)
    .single()

  // Ordenar contenido
  if (module.content) {
    module.content.sort((a: any, b: any) => a.sort_order - b.sort_order)
  }

  return NextResponse.json({
    module: {
      ...module,
      user_progress: progress || null,
    },
  })
}

// PATCH: Actualizar módulo (solo admin)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
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
  const allowedFields = ['title', 'description', 'sort_order', 'estimated_duration_minutes', 'is_required', 'is_active']

  const updateData: Record<string, any> = {}
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field]
    }
  }

  const { data: module, error } = await supabase
    .from('academy_modules')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ module })
}

// DELETE: Desactivar módulo
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
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

  const { error } = await supabase
    .from('academy_modules')
    .update({ is_active: false })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
