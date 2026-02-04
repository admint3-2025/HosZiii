import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// GET: Listar quizzes
export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const module_id = searchParams.get('module_id')
  const course_id = searchParams.get('course_id')

  let query = supabase
    .from('academy_quizzes')
    .select(`
      *,
      questions:academy_quiz_questions(count)
    `)
    .eq('is_active', true)

  if (module_id) {
    query = query.eq('module_id', module_id)
  }

  if (course_id) {
    query = query.or(`course_id.eq.${course_id},module_id.in.(select id from academy_modules where course_id='${course_id}')`)
  }

  const { data: quizzes, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Formatear respuesta
  const formattedQuizzes = (quizzes || []).map(q => ({
    ...q,
    questions_count: q.questions?.[0]?.count || 0,
  }))

  return NextResponse.json({ quizzes: formattedQuizzes })
}

// POST: Crear quiz (solo admin)
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
  const {
    module_id,
    course_id,
    title,
    description,
    quiz_type = 'module',
    time_limit_minutes,
    passing_score = 70,
    randomize_questions = false,
    randomize_answers = false,
    show_correct_answers = true,
    max_attempts,
  } = body

  if (!title) {
    return NextResponse.json({ error: 'El título es requerido' }, { status: 400 })
  }

  if (!module_id && !course_id) {
    return NextResponse.json({ error: 'Se requiere module_id o course_id' }, { status: 400 })
  }

  const { data: quiz, error } = await supabase
    .from('academy_quizzes')
    .insert({
      module_id,
      course_id,
      title,
      description,
      quiz_type,
      time_limit_minutes,
      passing_score,
      randomize_questions,
      randomize_answers,
      show_correct_answers,
      max_attempts,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ quiz }, { status: 201 })
}
