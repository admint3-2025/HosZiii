import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// PATCH: Actualizar pregunta
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
  const allowedFields = ['question_text', 'question_type', 'options', 'explanation', 'points', 'sort_order', 'is_active']

  const updateData: Record<string, any> = {}
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field]
    }
  }

  // Validar opciones si se actualizan
  if (updateData.options) {
    if (!Array.isArray(updateData.options) || updateData.options.length < 2) {
      return NextResponse.json({ error: 'Se requieren al menos 2 opciones' }, { status: 400 })
    }

    const hasCorrect = updateData.options.some((opt: any) => opt.is_correct)
    if (!hasCorrect) {
      return NextResponse.json({ error: 'Al menos una opción debe ser correcta' }, { status: 400 })
    }

    // Asegurar IDs en opciones
    updateData.options = updateData.options.map((opt: any, idx: number) => ({
      id: opt.id || `opt_${Date.now()}_${idx}`,
      text: opt.text,
      is_correct: opt.is_correct || false,
    }))
  }

  const { data: question, error } = await supabase
    .from('academy_quiz_questions')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ question })
}

// DELETE: Desactivar pregunta
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
    .from('academy_quiz_questions')
    .update({ is_active: false })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
