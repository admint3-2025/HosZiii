import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET: Obtener curso por ID con módulos y contenido
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Verificar si es admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile && ['admin', 'corporate_admin'].includes(profile.role)

  // Obtener curso
  let courseQuery = supabase
    .from('academy_courses')
    .select(`
      *,
      area:academy_areas(id, name, slug, icon, color),
      modules:academy_modules(
        id, title, description, sort_order, estimated_duration_minutes, is_required, is_active,
        content:academy_content(id, title, content_type, sort_order),
        quizzes:academy_quizzes(id, title, quiz_type, passing_score)
      )
    `)
    .eq('id', id)
    .eq('is_active', true)

  if (!isAdmin) {
    courseQuery = courseQuery.eq('is_published', true)
  }

  const { data: course, error } = await courseQuery.single()

  if (error || !course) {
    return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 })
  }

  // Obtener inscripción del usuario actual
  const { data: enrollment } = await supabase
    .from('academy_enrollments')
    .select('*')
    .eq('user_id', user.id)
    .eq('course_id', id)
    .single()

  // Obtener progreso del usuario
  const { data: progress } = await supabase
    .from('academy_progress')
    .select('*')
    .eq('user_id', user.id)
    .in('module_id', (course.modules || []).map((m: any) => m.id))

  // Calcular progreso
  const totalModules = course.modules?.length || 0
  const completedModules = progress?.filter((p: any) => p.status === 'completed').length || 0
  const progressPercentage = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0

  // Ordenar módulos
  if (course.modules) {
    course.modules.sort((a: any, b: any) => a.sort_order - b.sort_order)
    course.modules.forEach((m: any) => {
      if (m.content) m.content.sort((a: any, b: any) => a.sort_order - b.sort_order)
    })
  }

  return NextResponse.json({
    course: {
      ...course,
      enrollment,
      progress: progress || [],
      progress_percentage: progressPercentage,
      modules_completed: completedModules,
      total_modules: totalModules,
    },
  })
}

// PATCH: Actualizar curso (solo admin)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Verificar permisos
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'corporate_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 })
  }

  const body = await request.json()
  const allowedFields = [
    'area_id', 'title', 'description', 'thumbnail_url', 'difficulty_level',
    'estimated_duration_minutes', 'is_mandatory', 'is_published', 'is_active',
    'prerequisites', 'target_roles', 'target_locations', 'passing_score',
    'allow_retakes', 'max_retakes', 'certificate_template'
  ]

  const updateData: Record<string, any> = {}
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field]
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No hay datos para actualizar' }, { status: 400 })
  }

  const { data: course, error } = await supabase
    .from('academy_courses')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      area:academy_areas(id, name, slug, icon, color)
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ course })
}

// DELETE: Desactivar curso (solo admin)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Verificar permisos
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'corporate_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 })
  }

  // Soft delete
  const { error } = await supabase
    .from('academy_courses')
    .update({ is_active: false, is_published: false })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
