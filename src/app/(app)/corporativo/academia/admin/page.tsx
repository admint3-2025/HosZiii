import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AcademyAdminPanel from './ui/AcademyAdminPanel';

export default async function AcademyAdminPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user is admin or corporate_admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'corporate_admin'].includes(profile.role)) {
    redirect('/academia');
  }

  // Get all areas
  const { data: areas } = await supabase
    .from('academy_areas')
    .select('*')
    .order('name');

  // Get all courses with stats
  const { data: courses } = await supabase
    .from('academy_courses')
    .select(`
      *,
      area:academy_areas(id, name),
      modules:academy_modules(count),
      enrollments:academy_enrollments(count)
    `)
    .order('created_at', { ascending: false });

  // Get enrollment stats
  const { count: totalEnrollments } = await supabase
    .from('academy_enrollments')
    .select('*', { count: 'exact', head: true });

  const { count: completedEnrollments } = await supabase
    .from('academy_enrollments')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed');

  const { count: certificatesIssued } = await supabase
    .from('academy_certificates')
    .select('*', { count: 'exact', head: true });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <AcademyAdminPanel
        areas={areas || []}
        courses={courses || []}
        stats={{
          totalCourses: courses?.length || 0,
          totalEnrollments: totalEnrollments || 0,
          completedEnrollments: completedEnrollments || 0,
          certificatesIssued: certificatesIssued || 0,
        }}
      />
    </div>
  );
}
