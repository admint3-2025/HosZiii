import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// GET: Listar cursos con filtros
export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const area_id = searchParams.get('area_id')
  const difficulty = searchParams.get('difficulty')
  const search = searchParams.get('search')
  const is_mandatory = searchParams.get('is_mandatory')
  const include_unpublished = searchParams.get('include_unpublished') === 'true'

  // Verificar si es admin para ver no publicados
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile && ['admin', 'corporate_admin'].includes(profile.role)

  let query = supabase
    .from('academy_courses')
    .select(`
      *,
      area:academy_areas(id, name, slug, icon, color),
      modules:academy_modules(count),
      enrollments:academy_enrollments(count)
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  // Solo admin ve no publicados
  if (!isAdmin || !include_unpublished) {
    query = query.eq('is_published', true)
  }

  // Filtros
  if (area_id) {
    query = query.eq('area_id', area_id)
  }

  if (difficulty) {
    query = query.eq('difficulty_level', difficulty)
  }

  if (is_mandatory === 'true') {
    query = query.eq('is_mandatory', true)
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
  }

  const { data: courses, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Formatear respuesta
  const formattedCourses = (courses || []).map(course => ({
    ...course,
    modules_count: course.modules?.[0]?.count || 0,
    enrollments_count: course.enrollments?.[0]?.count || 0,
  }))

  return NextResponse.json({ courses: formattedCourses })
}

// POST: Crear nuevo curso (solo admin)
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Verificar permisos
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
    area_id,
    title,
    description,
    thumbnail_url,
    difficulty_level = 'basico',
    estimated_duration_minutes = 60,
    is_mandatory = false,
    is_published = false,
    prerequisites = [],
    target_roles = [],
    target_locations = [],
    passing_score = 70,
    allow_retakes = true,
    max_retakes,
  } = body

  if (!title) {
    return NextResponse.json({ error: 'El título es requerido' }, { status: 400 })
  }

  // Generar slug único
  const baseSlug = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  // Verificar si existe
  const { data: existing } = await supabase
    .from('academy_courses')
    .select('slug')
    .like('slug', `${baseSlug}%`)

  let slug = baseSlug
  if (existing && existing.length > 0) {
    slug = `${baseSlug}-${existing.length + 1}`
  }

  const { data: course, error } = await supabase
    .from('academy_courses')
    .insert({
      area_id,
      title,
      slug,
      description,
      thumbnail_url,
      difficulty_level,
      estimated_duration_minutes,
      is_mandatory,
      is_published,
      prerequisites,
      target_roles,
      target_locations,
      passing_score,
      allow_retakes,
      max_retakes,
      created_by: user.id,
    })
    .select(`
      *,
      area:academy_areas(id, name, slug, icon, color)
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ course }, { status: 201 })
}
