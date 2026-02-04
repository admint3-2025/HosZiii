import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// GET: Listar contenido de un módulo
export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const module_id = searchParams.get('module_id')

  if (!module_id) {
    return NextResponse.json({ error: 'module_id es requerido' }, { status: 400 })
  }

  const { data: content, error } = await supabase
    .from('academy_content')
    .select('*')
    .eq('module_id', module_id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ content })
}

// POST: Crear contenido (solo admin)
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
    title,
    content_type,
    video_url,
    video_provider,
    video_duration_seconds,
    document_url,
    document_type,
    text_content,
    embed_url,
    image_url,
    image_caption,
    sort_order,
    is_downloadable,
  } = body

  if (!module_id || !title || !content_type) {
    return NextResponse.json({ error: 'module_id, title y content_type son requeridos' }, { status: 400 })
  }

  // Validar content_type
  const validTypes = ['video', 'document', 'text', 'embed', 'image']
  if (!validTypes.includes(content_type)) {
    return NextResponse.json({ error: 'Tipo de contenido inválido' }, { status: 400 })
  }

  // Obtener siguiente sort_order
  let finalSortOrder = sort_order
  if (finalSortOrder === undefined) {
    const { data: lastContent } = await supabase
      .from('academy_content')
      .select('sort_order')
      .eq('module_id', module_id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()

    finalSortOrder = (lastContent?.sort_order || 0) + 1
  }

  const { data: content, error } = await supabase
    .from('academy_content')
    .insert({
      module_id,
      title,
      content_type,
      video_url,
      video_provider,
      video_duration_seconds,
      document_url,
      document_type,
      text_content,
      embed_url,
      image_url,
      image_caption,
      sort_order: finalSortOrder,
      is_downloadable: is_downloadable || false,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ content }, { status: 201 })
}
