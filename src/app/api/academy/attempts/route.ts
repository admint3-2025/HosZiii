import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// POST: Iniciar un intento de quiz
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await request.json()
  const { quiz_id } = body

  if (!quiz_id) {
    return NextResponse.json({ error: 'quiz_id es requerido' }, { status: 400 })
  }

  // Obtener quiz
  const { data: quiz, error: quizError } = await supabase
    .from('academy_quizzes')
    .select('id, module_id, course_id, max_attempts, passing_score')
    .eq('id', quiz_id)
    .eq('is_active', true)
    .single()

  if (quizError || !quiz) {
    return NextResponse.json({ error: 'Quiz no encontrado' }, { status: 404 })
  }

  // Verificar intentos previos
  const { data: previousAttempts } = await supabase
    .from('academy_quiz_attempts')
    .select('id, attempt_number, status')
    .eq('user_id', user.id)
    .eq('quiz_id', quiz_id)
    .order('attempt_number', { ascending: false })

  // Verificar si hay un intento en progreso
  const inProgressAttempt = previousAttempts?.find(a => a.status === 'in_progress')
  if (inProgressAttempt) {
    return NextResponse.json({ 
      error: 'Ya tienes un intento en progreso',
      attempt: inProgressAttempt 
    }, { status: 400 })
  }

  // Verificar máximo de intentos
  const attemptsCount = previousAttempts?.length || 0
  if (quiz.max_attempts && attemptsCount >= quiz.max_attempts) {
    return NextResponse.json({ 
      error: 'Has alcanzado el máximo de intentos permitidos' 
    }, { status: 400 })
  }

  // Obtener enrollment si existe
  const courseId = quiz.course_id || null
  let enrollmentId = null

  if (quiz.module_id) {
    const { data: module } = await supabase
      .from('academy_modules')
      .select('course_id')
      .eq('id', quiz.module_id)
      .single()

    if (module) {
      const { data: enrollment } = await supabase
        .from('academy_enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', module.course_id)
        .single()

      enrollmentId = enrollment?.id || null
    }
  } else if (courseId) {
    const { data: enrollment } = await supabase
      .from('academy_enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .single()

    enrollmentId = enrollment?.id || null
  }

  // Obtener total de puntos posibles
  const { data: questions } = await supabase
    .from('academy_quiz_questions')
    .select('points')
    .eq('quiz_id', quiz_id)
    .eq('is_active', true)

  const pointsPossible = questions?.reduce((sum, q) => sum + (q.points || 1), 0) || 0

  // Crear intento
  const { data: attempt, error } = await supabase
    .from('academy_quiz_attempts')
    .insert({
      user_id: user.id,
      quiz_id,
      enrollment_id: enrollmentId,
      attempt_number: attemptsCount + 1,
      status: 'in_progress',
      points_possible: pointsPossible,
      answers: {},
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ attempt }, { status: 201 })
}

// GET: Obtener intentos de un quiz
export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const quiz_id = searchParams.get('quiz_id')

  if (!quiz_id) {
    return NextResponse.json({ error: 'quiz_id es requerido' }, { status: 400 })
  }

  const { data: attempts, error } = await supabase
    .from('academy_quiz_attempts')
    .select('*')
    .eq('user_id', user.id)
    .eq('quiz_id', quiz_id)
    .order('attempt_number', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ attempts })
}
