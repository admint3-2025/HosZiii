import { redirect } from 'next/navigation'
import { getSafeServerUser } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import AcademyCatalog from './ui/AcademyCatalog'

export const dynamic = 'force-dynamic'

export default async function AcademiaPage() {
  const user = await getSafeServerUser()
  if (!user) redirect('/login')

  const supabase = createSupabaseAdminClient()

  // Obtener perfil del usuario
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Obtener áreas de aprendizaje
  const { data: areas } = await supabase
    .from('academy_areas')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  // Obtener cursos publicados
  const { data: courses } = await supabase
    .from('academy_courses')
    .select(`
      *,
      area:academy_areas(id, name, slug, icon, color)
    `)
    .eq('is_published', true)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  // Obtener inscripciones del usuario
  const { data: enrollments } = await supabase
    .from('academy_enrollments')
    .select('course_id, status, final_score')
    .eq('user_id', user.id)

  // Mapear enrollments por curso
  const enrollmentMap = new Map(
    (enrollments || []).map(e => [e.course_id, e])
  )

  // Combinar cursos con estado de inscripción
  const coursesWithEnrollment = (courses || []).map(course => ({
    ...course,
    enrollment: enrollmentMap.get(course.id) || null,
  }))

  const isAdmin = ['admin', 'corporate_admin'].includes(profile.role)

  return (
    <AcademyCatalog
      areas={areas || []}
      courses={coursesWithEnrollment}
      isAdmin={isAdmin}
      userName={profile.full_name || 'Usuario'}
    />
  )
}
