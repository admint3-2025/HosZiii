import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// GET: Listar certificados del usuario o todos (admin)
export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const user_id = searchParams.get('user_id')
  const course_id = searchParams.get('course_id')
  const verification_code = searchParams.get('verification_code')

  // Verificar si es admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile && ['admin', 'corporate_admin'].includes(profile.role)

  // Búsqueda por código de verificación (público para validar certificados)
  if (verification_code) {
    const { data: certificate, error } = await supabase
      .from('academy_certificates')
      .select(`
        id, certificate_number, issued_at, expires_at, final_score,
        user_name, course_title, verification_code
      `)
      .eq('verification_code', verification_code)
      .single()

    if (error || !certificate) {
      return NextResponse.json({ error: 'Certificado no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ 
      certificate,
      verified: true,
      message: 'Certificado válido'
    })
  }

  let query = supabase
    .from('academy_certificates')
    .select(`
      *,
      course:academy_courses(id, title, slug, thumbnail_url)
    `)
    .order('issued_at', { ascending: false })

  // Filtrar por usuario
  if (user_id && isAdmin) {
    query = query.eq('user_id', user_id)
  } else if (!isAdmin) {
    query = query.eq('user_id', user.id)
  }

  // Filtrar por curso
  if (course_id) {
    query = query.eq('course_id', course_id)
  }

  const { data: certificates, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ certificates })
}

// POST: Generar certificado (manual o automático)
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await request.json()
  const { enrollment_id, user_id, course_id } = body

  // Determinar enrollment
  let targetEnrollment = null

  if (enrollment_id) {
    const { data: enrollment } = await supabase
      .from('academy_enrollments')
      .select('*, course:academy_courses(title), user:profiles(full_name)')
      .eq('id', enrollment_id)
      .single()

    targetEnrollment = enrollment
  } else if (user_id && course_id) {
    const { data: enrollment } = await supabase
      .from('academy_enrollments')
      .select('*, course:academy_courses(title), user:profiles(full_name)')
      .eq('user_id', user_id)
      .eq('course_id', course_id)
      .single()

    targetEnrollment = enrollment
  }

  if (!targetEnrollment) {
    return NextResponse.json({ error: 'Inscripción no encontrada' }, { status: 404 })
  }

  // Verificar que el curso esté completado
  if (targetEnrollment.status !== 'completed') {
    return NextResponse.json({ 
      error: 'El curso no ha sido completado' 
    }, { status: 400 })
  }

  // Verificar si ya existe un certificado
  const { data: existingCert } = await supabase
    .from('academy_certificates')
    .select('id, certificate_number')
    .eq('enrollment_id', targetEnrollment.id)
    .single()

  if (existingCert) {
    return NextResponse.json({ 
      error: 'Ya existe un certificado para esta inscripción',
      certificate: existingCert 
    }, { status: 400 })
  }

  // Obtener datos del emisor
  const { data: issuer } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  // Generar número de certificado y código de verificación
  const year = new Date().getFullYear()
  const { count } = await supabase
    .from('academy_certificates')
    .select('*', { count: 'exact', head: true })

  const certNumber = `CERT-${year}-${String((count || 0) + 1).padStart(6, '0')}`
  const verificationCode = Math.random().toString(36).substring(2, 10).toUpperCase()

  // Crear certificado
  const { data: certificate, error } = await supabase
    .from('academy_certificates')
    .insert({
      user_id: targetEnrollment.user_id,
      course_id: targetEnrollment.course_id,
      enrollment_id: targetEnrollment.id,
      certificate_number: certNumber,
      final_score: targetEnrollment.final_score,
      user_name: targetEnrollment.user?.full_name || 'Usuario',
      course_title: targetEnrollment.course?.title || 'Curso',
      issued_by_name: issuer?.full_name || null,
      issued_by_id: user.id,
      verification_code: verificationCode,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ certificate }, { status: 201 })
}
