import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET: Obtener contenido por ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data: content, error } = await supabase
    .from('academy_content')
    .select(`
      *,
      module:academy_modules(
        id, title, course_id,
        course:academy_courses(id, title, slug)
      )
    `)
    .eq('id', id)
    .eq('is_active', true)
    .single()

  if (error || !content) {
    return NextResponse.json({ error: 'Contenido no encontrado' }, { status: 404 })
  }

  return NextResponse.json({ content })
}

// PATCH: Actualizar contenido (solo admin)
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
    'title', 'content_type', 'video_url', 'video_provider', 'video_duration_seconds',
    'document_url', 'document_type', 'text_content', 'embed_url', 'image_url',
    'image_caption', 'sort_order', 'is_downloadable', 'is_active'
  ]

  const updateData: Record<string, any> = {}
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field]
    }
  }

  const { data: content, error } = await supabase
    .from('academy_content')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ content })
}

// DELETE: Desactivar contenido
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
    .from('academy_content')
    .update({ is_active: false })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
