import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET: Obtener intento con respuestas
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data: attempt, error } = await supabase
    .from('academy_quiz_attempts')
    .select(`
      *,
      quiz:academy_quizzes(id, title, passing_score, show_correct_answers)
    `)
    .eq('id', id)
    .single()

  if (error || !attempt) {
    return NextResponse.json({ error: 'Intento no encontrado' }, { status: 404 })
  }

  // Verificar que el intento pertenece al usuario
  if (attempt.user_id !== user.id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'corporate_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 })
    }
  }

  return NextResponse.json({ attempt })
}

// PATCH: Enviar respuestas o finalizar intento
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await request.json()
  const { answers, action } = body

  // Obtener intento
  const { data: attempt, error: attemptError } = await supabase
    .from('academy_quiz_attempts')
    .select('*, quiz:academy_quizzes(passing_score)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (attemptError || !attempt) {
    return NextResponse.json({ error: 'Intento no encontrado' }, { status: 404 })
  }

  if (attempt.status !== 'in_progress') {
    return NextResponse.json({ error: 'Este intento ya fue enviado' }, { status: 400 })
  }

  const updateData: Record<string, any> = {}

  // Actualizar respuestas
  if (answers) {
    const currentAnswers = attempt.answers || {}
    updateData.answers = { ...currentAnswers, ...answers }
  }

  // Enviar quiz para calificación
  if (action === 'submit') {
    const finalAnswers = answers ? { ...(attempt.answers || {}), ...answers } : attempt.answers

    // Obtener preguntas para calificar
    const { data: questions } = await supabase
      .from('academy_quiz_questions')
      .select('id, options, points')
      .eq('quiz_id', attempt.quiz_id)
      .eq('is_active', true)

    if (!questions) {
      return NextResponse.json({ error: 'No se pudieron obtener las preguntas' }, { status: 500 })
    }

    // Calificar respuestas
    let pointsEarned = 0
    const pointsPossible = questions.reduce((sum, q) => sum + (q.points || 1), 0)
    const gradedAnswers: Record<string, any> = {}

    for (const question of questions) {
      const userAnswer = finalAnswers[question.id]
      const selectedOptions = userAnswer?.selected_options || []

      // Encontrar opciones correctas
      const correctOptions = (question.options || [])
        .filter((opt: any) => opt.is_correct)
        .map((opt: any) => opt.id)

      // Verificar si la respuesta es correcta
      const isCorrect =
        correctOptions.length === selectedOptions.length &&
        correctOptions.every((opt: string) => selectedOptions.includes(opt))

      if (isCorrect) {
        pointsEarned += question.points || 1
      }

      gradedAnswers[question.id] = {
        selected_options: selectedOptions,
        is_correct: isCorrect,
      }
    }

    // Calcular puntaje porcentual
    const score = pointsPossible > 0 ? Math.round((pointsEarned / pointsPossible) * 100 * 100) / 100 : 0
    const passingScore = attempt.quiz?.passing_score || 70
    const passed = score >= passingScore

    // Calcular tiempo transcurrido
    const startedAt = new Date(attempt.started_at)
    const submittedAt = new Date()
    const timeSpentSeconds = Math.floor((submittedAt.getTime() - startedAt.getTime()) / 1000)

    updateData.answers = gradedAnswers
    updateData.score = score
    updateData.points_earned = pointsEarned
    updateData.points_possible = pointsPossible
    updateData.passed = passed
    updateData.status = 'graded'
    updateData.submitted_at = submittedAt.toISOString()
    updateData.time_spent_seconds = timeSpentSeconds
  }

  // Actualizar intento
  const { data: updatedAttempt, error } = await supabase
    .from('academy_quiz_attempts')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Si fue enviado y aprobado, marcar módulo como completo
  if (action === 'submit' && updatedAttempt.passed) {
    // Obtener módulo del quiz
    const { data: quiz } = await supabase
      .from('academy_quizzes')
      .select('module_id')
      .eq('id', attempt.quiz_id)
      .single()

    if (quiz?.module_id) {
      // Actualizar progreso del módulo
      await supabase
        .from('academy_progress')
        .upsert({
          user_id: user.id,
          module_id: quiz.module_id,
          enrollment_id: attempt.enrollment_id,
          status: 'completed',
          completed_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,module_id',
        })
    }
  }

  return NextResponse.json({ attempt: updatedAttempt })
}
