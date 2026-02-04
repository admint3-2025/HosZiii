import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// POST: Actualizar progreso de un módulo
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await request.json()
  const { module_id, content_id, action, time_spent } = body

  if (!module_id) {
    return NextResponse.json({ error: 'module_id es requerido' }, { status: 400 })
  }

  // Obtener módulo y verificar que existe
  const { data: module, error: moduleError } = await supabase
    .from('academy_modules')
    .select('id, course_id')
    .eq('id', module_id)
    .single()

  if (moduleError || !module) {
    return NextResponse.json({ error: 'Módulo no encontrado' }, { status: 404 })
  }

  // Obtener o crear inscripción
  let { data: enrollment } = await supabase
    .from('academy_enrollments')
    .select('id, status')
    .eq('user_id', user.id)
    .eq('course_id', module.course_id)
    .single()

  if (!enrollment) {
    // Auto-inscribir si el curso está publicado
    const { data: newEnrollment, error: enrollError } = await supabase
      .from('academy_enrollments')
      .insert({
        user_id: user.id,
        course_id: module.course_id,
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (enrollError || !newEnrollment) {
      return NextResponse.json({ error: 'Error al inscribirse' }, { status: 500 })
    }
    enrollment = newEnrollment
  }

  // Actualizar estado de inscripción si es necesario
  if (enrollment!.status === 'enrolled') {
    await supabase
      .from('academy_enrollments')
      .update({ status: 'in_progress', started_at: new Date().toISOString() })
      .eq('id', enrollment!.id)
  }

  // Obtener o crear progreso
  let { data: progress } = await supabase
    .from('academy_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('module_id', module_id)
    .single()

  if (!progress) {
    const { data: newProgress, error: progressError } = await supabase
      .from('academy_progress')
      .insert({
        user_id: user.id,
        module_id,
        enrollment_id: enrollment!.id,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        content_progress: {},
      })
      .select()
      .single()

    if (progressError) {
      return NextResponse.json({ error: 'Error al crear progreso' }, { status: 500 })
    }
    progress = newProgress
  }

  // Actualizar según la acción
  const contentProgress = progress.content_progress || {}
  let updateData: Record<string, any> = {}

  if (content_id && action) {
    // Actualizar progreso de contenido específico
    const contentItem = contentProgress[content_id] || { viewed: false, completed: false, time_spent: 0 }

    if (action === 'view') {
      contentItem.viewed = true
      contentItem.last_viewed_at = new Date().toISOString()
    } else if (action === 'complete') {
      contentItem.viewed = true
      contentItem.completed = true
    }

    if (time_spent) {
      contentItem.time_spent = (contentItem.time_spent || 0) + time_spent
    }

    contentProgress[content_id] = contentItem
    updateData.content_progress = contentProgress

    if (progress.status === 'not_started') {
      updateData.status = 'in_progress'
      updateData.started_at = new Date().toISOString()
    }
  }

  if (time_spent) {
    updateData.time_spent_seconds = (progress.time_spent_seconds || 0) + time_spent
  }

  // Verificar si el módulo está completo
  if (action === 'complete_module') {
    updateData.status = 'completed'
    updateData.completed_at = new Date().toISOString()
  }

  if (Object.keys(updateData).length > 0) {
    const { data: updatedProgress, error: updateError } = await supabase
      .from('academy_progress')
      .update(updateData)
      .eq('id', progress.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    progress = updatedProgress
  }

  // Verificar si el curso está completo
  await checkCourseCompletion(supabase, user.id, module.course_id, enrollment!.id)

  return NextResponse.json({ progress })
}

// Función auxiliar para verificar si el curso está completo
async function checkCourseCompletion(supabase: any, userId: string, courseId: string, enrollmentId: string) {
  // Obtener todos los módulos requeridos del curso
  const { data: modules } = await supabase
    .from('academy_modules')
    .select('id')
    .eq('course_id', courseId)
    .eq('is_required', true)
    .eq('is_active', true)

  if (!modules || modules.length === 0) return

  // Obtener progreso del usuario
  const { data: progress } = await supabase
    .from('academy_progress')
    .select('module_id, status')
    .eq('user_id', userId)
    .in('module_id', modules.map((m: any) => m.id))

  const completedModules = (progress || []).filter((p: any) => p.status === 'completed').length

  if (completedModules >= modules.length) {
    // Verificar si hay quiz final y si fue aprobado
    const { data: finalQuiz } = await supabase
      .from('academy_quizzes')
      .select('id')
      .eq('course_id', courseId)
      .eq('quiz_type', 'final')
      .eq('is_active', true)
      .single()

    let coursePassed = true
    let finalScore = null

    if (finalQuiz) {
      // Verificar si el quiz fue aprobado
      const { data: attempt } = await supabase
        .from('academy_quiz_attempts')
        .select('passed, score')
        .eq('user_id', userId)
        .eq('quiz_id', finalQuiz.id)
        .eq('passed', true)
        .order('score', { ascending: false })
        .limit(1)
        .single()

      if (!attempt) {
        coursePassed = false
      } else {
        finalScore = attempt.score
      }
    }

    if (coursePassed) {
      // Marcar curso como completado
      await supabase
        .from('academy_enrollments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          final_score: finalScore,
        })
        .eq('id', enrollmentId)
    }
  }
}

// GET: Obtener progreso de módulos para un curso
export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const course_id = searchParams.get('course_id')
  const module_id = searchParams.get('module_id')

  let query = supabase
    .from('academy_progress')
    .select(`
      *,
      module:academy_modules(id, title, course_id)
    `)
    .eq('user_id', user.id)

  if (course_id) {
    // Obtener módulos del curso primero
    const { data: modules } = await supabase
      .from('academy_modules')
      .select('id')
      .eq('course_id', course_id)

    if (modules && modules.length > 0) {
      query = query.in('module_id', modules.map(m => m.id))
    }
  }

  if (module_id) {
    query = query.eq('module_id', module_id)
  }

  const { data: progress, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ progress })
}
