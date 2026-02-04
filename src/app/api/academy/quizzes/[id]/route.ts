import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET: Obtener quiz con preguntas para tomarlo
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const include_answers = searchParams.get('include_answers') === 'true'

  // Verificar si es admin (para ver respuestas correctas)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile && ['admin', 'corporate_admin'].includes(profile.role)

  // Obtener quiz
  const { data: quiz, error: quizError } = await supabase
    .from('academy_quizzes')
    .select(`
      *,
      module:academy_modules(id, title, course_id),
      course:academy_courses(id, title)
    `)
    .eq('id', id)
    .eq('is_active', true)
    .single()

  if (quizError || !quiz) {
    return NextResponse.json({ error: 'Quiz no encontrado' }, { status: 404 })
  }

  // Obtener preguntas
  let questionsQuery = supabase
    .from('academy_quiz_questions')
    .select('*')
    .eq('quiz_id', id)
    .eq('is_active', true)

  if (!quiz.randomize_questions) {
    questionsQuery = questionsQuery.order('sort_order', { ascending: true })
  }

  const { data: questions, error: questionsError } = await questionsQuery

  if (questionsError) {
    return NextResponse.json({ error: questionsError.message }, { status: 500 })
  }

  // Formatear preguntas (ocultar respuestas correctas si no es admin)
  let formattedQuestions = (questions || []).map(q => {
    let options = q.options || []

    // Randomizar opciones si está configurado
    if (quiz.randomize_answers) {
      options = [...options].sort(() => Math.random() - 0.5)
    }

    // Ocultar respuestas correctas si no es admin
    if (!isAdmin && !include_answers) {
      options = options.map((opt: any) => ({
        id: opt.id,
        text: opt.text,
      }))
    }

    return {
      ...q,
      options,
      // Solo incluir explicación si es admin
      explanation: isAdmin ? q.explanation : null,
    }
  })

  // Randomizar orden de preguntas si está configurado
  if (quiz.randomize_questions) {
    formattedQuestions = formattedQuestions.sort(() => Math.random() - 0.5)
  }

  // Obtener intentos previos del usuario
  const { data: attempts } = await supabase
    .from('academy_quiz_attempts')
    .select('id, attempt_number, score, passed, status, submitted_at')
    .eq('user_id', user.id)
    .eq('quiz_id', id)
    .order('attempt_number', { ascending: false })

  const attemptsCount = attempts?.length || 0
  const bestAttempt = attempts?.reduce((best: any, current: any) => {
    if (!best || (current.score && current.score > (best.score || 0))) {
      return current
    }
    return best
  }, null)

  // Verificar si puede tomar el quiz
  let canTake = true
  let reason = null

  if (quiz.max_attempts && attemptsCount >= quiz.max_attempts) {
    canTake = false
    reason = 'Has alcanzado el máximo de intentos permitidos'
  }

  // Verificar si hay un intento en progreso
  const inProgressAttempt = attempts?.find((a: any) => a.status === 'in_progress')

  return NextResponse.json({
    quiz: {
      ...quiz,
      questions: formattedQuestions,
      questions_count: formattedQuestions.length,
      total_points: formattedQuestions.reduce((sum: number, q: any) => sum + (q.points || 1), 0),
      user_attempts: attempts || [],
      attempts_count: attemptsCount,
      best_score: bestAttempt?.score || null,
      passed: bestAttempt?.passed || false,
      can_take: canTake,
      cannot_take_reason: reason,
      in_progress_attempt: inProgressAttempt || null,
    },
  })
}

// PATCH: Actualizar quiz (solo admin)
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
  const allowedFields = [
    'title', 'description', 'quiz_type', 'time_limit_minutes', 'passing_score',
    'randomize_questions', 'randomize_answers', 'show_correct_answers', 'max_attempts', 'is_active'
  ]

  const updateData: Record<string, any> = {}
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field]
    }
  }

  const { data: quiz, error } = await supabase
    .from('academy_quizzes')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ quiz })
}

// DELETE: Desactivar quiz
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
    .from('academy_quizzes')
    .update({ is_active: false })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
