import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// POST: Agregar pregunta a un quiz
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
    quiz_id,
    question_text,
    question_type = 'multiple_choice',
    options = [],
    explanation,
    points = 1,
    sort_order,
  } = body

  if (!quiz_id || !question_text) {
    return NextResponse.json({ error: 'quiz_id y question_text son requeridos' }, { status: 400 })
  }

  // Validar opciones
  if (!options || options.length < 2) {
    return NextResponse.json({ error: 'Se requieren al menos 2 opciones' }, { status: 400 })
  }

  // Asegurar que al menos una opción sea correcta
  const hasCorrect = options.some((opt: any) => opt.is_correct)
  if (!hasCorrect) {
    return NextResponse.json({ error: 'Al menos una opción debe ser correcta' }, { status: 400 })
  }

  // Generar IDs para opciones si no tienen
  const optionsWithIds = options.map((opt: any, idx: number) => ({
    id: opt.id || `opt_${Date.now()}_${idx}`,
    text: opt.text,
    is_correct: opt.is_correct || false,
  }))

  // Obtener siguiente sort_order
  let finalSortOrder = sort_order
  if (finalSortOrder === undefined) {
    const { data: lastQuestion } = await supabase
      .from('academy_quiz_questions')
      .select('sort_order')
      .eq('quiz_id', quiz_id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()

    finalSortOrder = (lastQuestion?.sort_order || 0) + 1
  }

  const { data: question, error } = await supabase
    .from('academy_quiz_questions')
    .insert({
      quiz_id,
      question_text,
      question_type,
      options: optionsWithIds,
      explanation,
      points,
      sort_order: finalSortOrder,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ question }, { status: 201 })
}

// GET: Listar preguntas de un quiz (solo admin ve respuestas correctas)
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

  // Verificar si es admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile && ['admin', 'corporate_admin'].includes(profile.role)

  const { data: questions, error } = await supabase
    .from('academy_quiz_questions')
    .select('*')
    .eq('quiz_id', quiz_id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Ocultar respuestas correctas si no es admin
  const formattedQuestions = (questions || []).map(q => {
    if (!isAdmin) {
      return {
        ...q,
        options: (q.options || []).map((opt: any) => ({
          id: opt.id,
          text: opt.text,
        })),
        explanation: null,
      }
    }
    return q
  })

  return NextResponse.json({ questions: formattedQuestions })
}
