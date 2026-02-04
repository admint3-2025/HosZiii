import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// POST: Inscribirse a un curso
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await request.json()
  const { course_id, user_id, expires_at } = body

  if (!course_id) {
    return NextResponse.json({ error: 'course_id es requerido' }, { status: 400 })
  }

  // Verificar si el curso existe y está publicado
  const { data: course, error: courseError } = await supabase
    .from('academy_courses')
    .select('id, is_published, is_active')
    .eq('id', course_id)
    .single()

  if (courseError || !course) {
    return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 })
  }

  if (!course.is_published || !course.is_active) {
    return NextResponse.json({ error: 'Curso no disponible' }, { status: 400 })
  }

  // Determinar usuario a inscribir
  const targetUserId = user_id || user.id

  // Si es admin inscribiendo a otro usuario, verificar permisos
  if (user_id && user_id !== user.id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'corporate_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'No tienes permisos para inscribir otros usuarios' }, { status: 403 })
    }
  }

  // Verificar si ya está inscrito
  const { data: existingEnrollment } = await supabase
    .from('academy_enrollments')
    .select('id, status')
    .eq('user_id', targetUserId)
    .eq('course_id', course_id)
    .single()

  if (existingEnrollment) {
    return NextResponse.json({ 
      error: 'El usuario ya está inscrito en este curso',
      enrollment: existingEnrollment 
    }, { status: 400 })
  }

  // Crear inscripción
  const { data: enrollment, error } = await supabase
    .from('academy_enrollments')
    .insert({
      user_id: targetUserId,
      course_id,
      enrolled_by: user_id && user_id !== user.id ? user.id : null,
      status: 'enrolled',
      expires_at: expires_at || null,
    })
    .select(`
      *,
      course:academy_courses(id, title, slug)
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ enrollment }, { status: 201 })
}

// GET: Obtener inscripciones del usuario actual o admin ve todas
export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const user_id = searchParams.get('user_id')
  const course_id = searchParams.get('course_id')
  const status = searchParams.get('status')

  // Verificar si es admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile && ['admin', 'corporate_admin'].includes(profile.role)

  let query = supabase
    .from('academy_enrollments')
    .select(`
      *,
      course:academy_courses(id, title, slug, thumbnail_url, difficulty_level, estimated_duration_minutes),
      user:profiles(id, full_name)
    `)
    .order('enrolled_at', { ascending: false })

  // Filtrar por usuario
  if (user_id && isAdmin) {
    query = query.eq('user_id', user_id)
  } else if (!isAdmin) {
    query = query.eq('user_id', user.id)
  }

  // Filtrar por curso
  if (course_id) {
    query = query.eq('course_id', course_id)
  }

  // Filtrar por estado
  if (status) {
    query = query.eq('status', status)
  }

  const { data: enrollments, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ enrollments })
}
